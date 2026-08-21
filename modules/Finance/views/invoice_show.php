<?php
/**
 * OmniDesk AI — Invoice Details & Payment Management View
 *
 * Detailed invoice breakdown, line items, payment history, and payment collection modal.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$inv   = $invoice ?? [];
$items = $inv['items'] ?? [];
$pays  = $inv['payments'] ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Invoice Header Toolbar Banner ───────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($inv['invoice_number'] ?? 'Invoice') ?></h1>
                <span class="badge <?= ($inv['status'] ?? '') === 'paid' ? 'badge-success' : 'badge-warning' ?> uppercase"><?= e(str_replace('_', ' ', $inv['status'] ?? 'draft')) ?></span>
            </div>
            <p class="text-muted text-xs">Billed to: <strong class="text-main"><?= e($inv['customer_name'] ?? 'N/A') ?></strong> &bull; Due Date: <strong class="text-main font-mono"><?= e($inv['due_date'] ?? 'N/A') ?></strong></p>
        </div>

        <div class="flex items-center gap-2">
            <?php if (($inv['balance_due'] ?? 0) > 0): ?>
                <button type="button" class="btn btn-sm btn-success" onclick="document.getElementById('recordPaymentModal').classList.add('active')">💳 Record Payment</button>
            <?php endif; ?>
            <a href="<?= url('/finance/invoices/print?id=' . $inv['id']) ?>" target="_blank" class="btn btn-sm btn-secondary">🖨️ Print Invoice</a>
            <a href="<?= url('/finance/invoices') ?>" class="btn btn-sm btn-secondary">&larr; Back to Invoices</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Invoice Breakdown Card -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Line Items Breakdown</h2>
            <span class="badge badge-neutral">Itemized Billing</span>
        </div>

        <div class="table-container border-none shadow-none mb-6">
            <table class="table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Tax Rate</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($items as $it): ?>
                        <tr>
                            <td class="font-semibold text-main"><?= e($it['description']) ?></td>
                            <td class="text-muted"><?= e($it['quantity']) ?></td>
                            <td class="font-mono text-main">$<?= number_format($it['unit_price'], 2) ?></td>
                            <td class="text-muted"><?= e($it['tax_rate']) ?>%</td>
                            <td class="text-right font-mono font-bold text-main">$<?= number_format($it['total'], 2) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Totals Summary Box -->
        <div class="flex justify-end border-t pt-4 text-xs">
            <div class="w-72 space-y-2">
                <div class="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span class="font-mono font-semibold text-main">$<?= number_format($inv['subtotal'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-muted">
                    <span>Tax Total:</span>
                    <span class="font-mono text-main">$<?= number_format($inv['tax_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between font-bold text-sm text-main border-t border-b py-2">
                    <span>Grand Total:</span>
                    <span class="font-mono text-lg">$<?= number_format($inv['total_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-success font-semibold">
                    <span>Cleared Collections:</span>
                    <span class="font-mono">$<?= number_format($inv['paid_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-danger font-extrabold text-sm pt-1">
                    <span>Balance Due:</span>
                    <span class="font-mono">$<?= number_format($inv['balance_due'] ?? 0, 2) ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Payments Log History Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Payment History (<?= count($pays) ?>)</h2>
            <span class="badge badge-brand">Ledger</span>
        </div>
        <div class="space-y-3 text-xs">
            <?php if (!empty($pays)): ?>
                <?php foreach ($pays as $p): ?>
                    <div class="p-3.5 rounded-lg bg-surface-subtle border">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-mono font-bold text-success text-sm">$<?= number_format($p['amount'], 2) ?></span>
                            <span class="badge badge-success text-2xs uppercase">Cleared</span>
                        </div>
                        <div class="text-muted text-2xs flex justify-between">
                            <span>Ref: <?= e($p['payment_number'] ?? 'N/A') ?></span>
                            <span class="font-mono"><?= e($p['payment_date']) ?></span>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-8">No cleared payments recorded for this invoice yet.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- ── Record Payment Modal ─────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="recordPaymentModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Record Payment Settlement</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('recordPaymentModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/payments/record') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <input type="hidden" name="invoice_id" value="<?= e($inv['id']) ?>">

            <div class="p-3 rounded-lg bg-surface-subtle border mb-2">
                <div class="flex justify-between text-muted mb-1">
                    <span>Invoice Balance Due:</span>
                    <strong class="text-danger font-mono">$<?= number_format($inv['balance_due'] ?? 0, 2) ?></strong>
                </div>
            </div>

            <div class="form-group mb-2">
                <label class="form-label" for="pay_amt">Payment Amount ($) *</label>
                <input type="number" id="pay_amt" name="amount" class="form-input" placeholder="0.00" step="0.01" max="<?= e($inv['balance_due'] ?? 0) ?>" value="<?= e($inv['balance_due'] ?? 0) ?>" required>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="pay_method">Payment Method</label>
                    <select id="pay_method" name="payment_method" class="form-select">
                        <option value="bank_transfer">Bank Wire / ACH</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="check">Corporate Check</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="pay_date">Settlement Date</label>
                    <input type="date" id="pay_date" name="payment_date" class="form-input" value="<?= date('Y-m-d') ?>">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('recordPaymentModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-success">Record Payment</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
