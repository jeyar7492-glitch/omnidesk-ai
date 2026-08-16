<?php
/**
 * OmniDesk AI — Invoice Details & Payment Management View (Phase 6)
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

<!-- ── Invoice Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($inv['invoice_number'] ?? 'Invoice') ?></h1>
                <span class="badge <?= ($inv['status'] ?? '') === 'paid' ? 'badge-success' : 'badge-warning' ?> uppercase"><?= e(str_replace('_', ' ', $inv['status'] ?? 'draft')) ?></span>
            </div>
            <p class="text-muted text-sm mb-0">Billed to: <?= e($inv['customer_name'] ?? 'N/A') ?> &bull; Due Date: <?= e($inv['due_date'] ?? 'N/A') ?></p>
        </div>

        <div class="flex items-center gap-3">
            <?php if (($inv['balance_due'] ?? 0) > 0): ?>
                <button type="button" class="btn btn-success text-xs py-1.5 px-3" onclick="document.getElementById('recordPaymentModal').classList.add('active')">💳 Record Payment</button>
            <?php endif; ?>
            <a href="<?= url('/finance/invoices/print?id=' . $inv['id']) ?>" target="_blank" class="btn btn-secondary text-xs py-1.5 px-3">🖨️ Print Invoice</a>
            <a href="<?= url('/finance/invoices') ?>" class="btn btn-secondary text-xs py-1.5 px-3">&larr; Back to Invoices</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Invoice Breakdown Card -->
    <div class="col-span-2 card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Line Items Breakdown</h3>
        <div class="table-responsive mb-6">
            <table class="table-custom w-full text-xs">
                <thead>
                    <tr class="border-b text-left text-muted uppercase">
                        <th class="p-2">Description</th>
                        <th class="p-2">Qty</th>
                        <th class="p-2">Unit Price</th>
                        <th class="p-2">Tax Rate</th>
                        <th class="p-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($items as $it): ?>
                        <tr class="border-b">
                            <td class="p-2 font-medium text-main"><?= e($it['description']) ?></td>
                            <td class="p-2 text-muted"><?= e($it['quantity']) ?></td>
                            <td class="p-2 font-mono text-main">$<?= number_format($it['unit_price'], 2) ?></td>
                            <td class="p-2 text-muted"><?= e($it['tax_rate']) ?>%</td>
                            <td class="p-2 text-right font-mono font-bold text-main">$<?= number_format($it['total'], 2) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Totals Summary -->
        <div class="flex justify-end border-t pt-4 text-xs">
            <div class="w-64 space-y-2">
                <div class="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span class="font-mono text-main">$<?= number_format($inv['subtotal'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-muted">
                    <span>Tax Total:</span>
                    <span class="font-mono text-main">$<?= number_format($inv['tax_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between font-bold text-sm text-main border-t border-b py-2">
                    <span>Grand Total:</span>
                    <span class="font-mono">$<?= number_format($inv['total_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-success font-medium">
                    <span>Paid Amount:</span>
                    <span class="font-mono">$<?= number_format($inv['paid_amount'] ?? 0, 2) ?></span>
                </div>
                <div class="flex justify-between text-danger font-bold text-sm">
                    <span>Balance Due:</span>
                    <span class="font-mono">$<?= number_format($inv['balance_due'] ?? 0, 2) ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Payments Log History Card -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Payment History (<?= count($pays) ?>)</h3>
        <div class="space-y-3 text-xs">
            <?php if (!empty($pays)): ?>
                <?php foreach ($pays as $p): ?>
                    <div class="p-3 rounded bg-surface-subtle border">
                        <div class="flex justify-between items-center mb-1">
                            <strong class="text-success font-mono font-bold">$<?= number_format($p['amount'], 2) ?></strong>
                            <span class="text-2xs text-muted"><?= e($p['payment_date']) ?></span>
                        </div>
                        <div class="text-muted text-xs capitalize">Method: <?= e(str_replace('_', ' ', $p['payment_method'])) ?></div>
                        <div class="text-2xs font-mono text-muted">Ref: <?= e($p['reference_number'] ?: 'N/A') ?></div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-6">No payments recorded for this invoice yet.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- ── Record Payment Modal ─────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="recordPaymentModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Record Payment Entry</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('recordPaymentModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/payments/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <input type="hidden" name="invoice_id" value="<?= e($inv['id']) ?>">
            <div>
                <label class="form-label" for="pay_amt">Payment Amount ($) * (Max: $<?= number_format($inv['balance_due'] ?? 0, 2) ?>)</label>
                <input type="number" id="pay_amt" name="amount" class="form-input" value="<?= e($inv['balance_due'] ?? 0) ?>" step="0.01" max="<?= e($inv['balance_due'] ?? 0) ?>" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="pay_method">Payment Method</label>
                    <select id="pay_method" name="payment_method" class="form-input">
                        <option value="bank_transfer">Bank Transfer / Wire</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="upi">UPI / Instant Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="pay_ref">Reference / Txn #</label>
                    <input type="text" id="pay_ref" name="reference_number" class="form-input" placeholder="e.g. WIRE-98124">
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('recordPaymentModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-success">Save Payment Entry</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
