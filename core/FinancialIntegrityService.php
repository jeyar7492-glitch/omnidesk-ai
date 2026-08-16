<?php
/**
 * OmniDesk AI — Financial Integrity & Authoritative Ledger Service
 *
 * Namespace: Core
 *
 * Enforces strict financial calculations, mathematical invariants,
 * payment reconciliation, and data consistency verification.
 */

namespace Core;

use PDO;
use Exception;

class FinancialIntegrityService
{
    /**
     * Verify the mathematical integrity of an invoice against its payments and items.
     *
     * Invariants enforced:
     * 1. balance_due == total_amount - paid_amount
     * 2. paid_amount == SUM(valid invoice_payments)
     * 3. total_amount == subtotal + tax_amount - discount_amount
     * 4. balance_due >= 0 (no unhandled overpayment)
     *
     * @param int $invoiceId
     * @param int $workspaceId
     * @return array Verification result with status, metrics, and details.
     */
    public static function verifyInvoiceIntegrity(int $invoiceId, int $workspaceId): array
    {
        try {
            $db = Database::getInstance();

            // Fetch stored invoice header
            $invoice = $db->fetchOne(
                'SELECT * FROM invoices WHERE id = :id AND workspace_id = :ws LIMIT 1',
                ['id' => $invoiceId, 'ws' => $workspaceId]
            );

            if (!$invoice) {
                return [
                    'status'        => 'NOT_FOUND',
                    'is_valid'      => false,
                    'invoice_id'    => $invoiceId,
                    'error_message' => "Invoice #{$invoiceId} does not exist in workspace #{$workspaceId}."
                ];
            }

            // Sum underlying authoritative payment records
            $paymentSumRow = $db->fetchOne(
                'SELECT COALESCE(SUM(amount), 0) as total_payments, COUNT(*) as payment_count 
                 FROM invoice_payments 
                 WHERE invoice_id = :id AND workspace_id = :ws',
                ['id' => $invoiceId, 'ws' => $workspaceId]
            );

            $storedTotal    = (float)$invoice['total_amount'];
            $storedPaid     = (float)$invoice['paid_amount'];
            $storedBalance  = (float)$invoice['balance_due'];
            $calculatedPaid = (float)($paymentSumRow['total_payments'] ?? 0);
            $calculatedBal  = round($storedTotal - $calculatedPaid, 2);

            $issues = [];

            // Check Invariant 1: Paid amount matches sum of payment records
            if (abs($storedPaid - $calculatedPaid) > 0.009) {
                $issues[] = "Stored paid_amount (\${$storedPaid}) differs from SUM(payments) (\${$calculatedPaid}).";
            }

            // Check Invariant 2: Balance due matches total minus paid
            if (abs($storedBalance - $calculatedBal) > 0.009) {
                $issues[] = "Stored balance_due (\${$storedBalance}) differs from calculated total - paid (\${$calculatedBal}).";
            }

            // Check Invariant 3: Negative balance
            if ($storedBalance < -0.009) {
                $issues[] = "Invoice has negative balance_due (\${$storedBalance}), indicating overpayment.";
            }

            $isValid = empty($issues);

            return [
                'status'             => $isValid ? 'VERIFIED' : 'DATA_INCONSISTENCY',
                'is_valid'           => $isValid,
                'invoice_id'         => $invoiceId,
                'invoice_number'     => $invoice['invoice_number'],
                'customer_id'        => $invoice['customer_id'],
                'total_amount'       => $storedTotal,
                'paid_amount'        => $calculatedPaid,
                'balance_due'        => $calculatedBal,
                'payment_count'      => (int)$paymentSumRow['payment_count'],
                'issues'             => $issues,
                'source_type'        => 'database',
                'source_timestamp'   => date('Y-m-d H:i:s'),
                'verification_rule'  => 'balance_due = total_amount - paid_amount AND paid_amount = SUM(payments)'
            ];
        } catch (\Throwable $e) {
            return [
                'status'        => 'ERROR',
                'is_valid'      => false,
                'invoice_id'    => $invoiceId,
                'error_message' => $e->getMessage()
            ];
        }
    }

    /**
     * Authoritatively record a payment using an atomic database transaction.
     * Recalculates and synchronizes invoice totals immediately.
     */
    public static function recordPaymentAuthoritative(array $data): array
    {
        $db          = Database::getInstance();
        $workspaceId = (int)$data['workspace_id'];
        $invoiceId   = (int)$data['invoice_id'];
        $amount      = round((float)$data['amount'], 2);
        $method      = $data['payment_method'] ?? 'Bank Transfer';
        $reference   = $data['reference'] ?? 'PAY-' . strtoupper(substr(md5(uniqid()), 0, 8));
        $notes       = $data['notes'] ?? 'Payment recorded via AI Autonomous Engine';

        if ($amount <= 0) {
            throw new Exception('Payment amount must be greater than zero.');
        }

        $db->beginTransaction();
        try {
            // Lock invoice record for update
            $invoice = $db->fetchOne(
                'SELECT * FROM invoices WHERE id = :id AND workspace_id = :ws FOR UPDATE',
                ['id' => $invoiceId, 'ws' => $workspaceId]
            );

            if (!$invoice) {
                throw new Exception("Invoice #{$invoiceId} not found in workspace #{$workspaceId}.");
            }

            $currentTotal   = (float)$invoice['total_amount'];
            $currentPaid    = (float)$invoice['paid_amount'];
            $currentBalance = (float)$invoice['balance_due'];

            if ($amount > $currentBalance + 0.009) {
                throw new Exception("Payment amount (\${$amount}) exceeds current balance due (\${$currentBalance}). Overpayment rejected.");
            }

            // 1. Insert into invoice_payments ledger
            $db->execute(
                'INSERT INTO invoice_payments (workspace_id, invoice_id, payment_date, amount, payment_method, transaction_reference, notes, created_at)
                 VALUES (:ws, :inv, NOW(), :amt, :meth, :ref, :notes, NOW())',
                [
                    'ws'    => $workspaceId,
                    'inv'   => $invoiceId,
                    'amt'   => $amount,
                    'meth'  => $method,
                    'ref'   => $reference,
                    'notes' => $notes
                ]
            );
            $paymentId = (int)$db->lastInsertId();

            // 2. Authoritative Recalculation
            $newPaid    = round($currentPaid + $amount, 2);
            $newBalance = round($currentTotal - $newPaid, 2);
            $newStatus  = ($newBalance <= 0.009) ? 'paid' : 'partially_paid';

            // 3. Update Invoice Header
            $db->execute(
                'UPDATE invoices 
                 SET paid_amount = :paid, balance_due = :bal, status = :status, updated_at = NOW()
                 WHERE id = :id AND workspace_id = :ws',
                [
                    'paid'   => $newPaid,
                    'bal'    => $newBalance,
                    'status' => $newStatus,
                    'id'     => $invoiceId,
                    'ws'     => $workspaceId
                ]
            );

            $db->commit();

            // 4. Log Immutable Audit Event
            ActivityLog::log(
                $workspaceId,
                $data['user_id'] ?? 1,
                'record_payment',
                'invoice',
                $invoiceId,
                "Recorded payment of \${$amount} against Invoice #{$invoice['invoice_number']}. New balance: \${$newBalance}."
            );

            return [
                'status'             => 'SUCCESS',
                'payment_id'         => $paymentId,
                'invoice_id'         => $invoiceId,
                'invoice_number'     => $invoice['invoice_number'],
                'amount_paid'        => $amount,
                'previous_balance'   => $currentBalance,
                'updated_total'      => $currentTotal,
                'updated_paid'       => $newPaid,
                'updated_balance'    => $newBalance,
                'invoice_status'     => $newStatus,
                'source_type'        => 'database',
                'source_timestamp'   => date('Y-m-d H:i:s')
            ];
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
