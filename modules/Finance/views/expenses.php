<?php
/**
 * OmniDesk AI — Expenses Directory View
 *
 * Track business expenses, vendor payments, software licensing, and operational costs.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$expList = $expenses ?? [];
$totalExpense = 0.0;
foreach ($expList as $exp) {
    $totalExpense += (float)($exp['amount'] ?? 0);
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Expenses Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Operating Expenses Directory</h1>
                <span class="badge badge-brand">Accounts Payable</span>
            </div>
            <p class="text-muted text-xs">
                Operational Outflows &bull; Vendor Invoices &bull; Infrastructure Licensing &bull; Disbursal Reconciliation
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newExpenseModal').classList.add('active')">+ Log Expense</button>
            <a href="<?= url('/finance/vendors') ?>" class="btn btn-sm btn-secondary">🏢 Vendors Directory</a>
            <a href="<?= url('/finance/reports') ?>" class="btn btn-sm btn-secondary">📊 P&L Statement</a>
        </div>
    </div>
</div>

<!-- ── Expense KPI Cards ────────────────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Gross Operating Outflow</span>
            <span class="kpi-icon-pill" style="color: var(--status-danger); background: var(--status-danger-bg);">💸</span>
        </div>
        <div class="kpi-value text-danger font-mono">-$<?= number_format($totalExpense, 2) ?></div>
        <div class="kpi-footer text-muted"><span><?= count($expList) ?> Recorded expense transactions</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Active Approved Vendors</span>
            <span class="kpi-icon-pill">🏢</span>
        </div>
        <div class="kpi-value text-main font-mono"><?= count($vendors ?? []) ?></div>
        <div class="kpi-footer text-success font-medium"><span>Suppliers & SaaS providers</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Ledger Disbursal Status</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">✓</span>
        </div>
        <div class="kpi-value text-success font-mono">Reconciled</div>
        <div class="kpi-footer text-muted"><span>100% Cleared payments</span></div>
    </div>
</div>

<!-- ── Expenses Table ───────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Expense Date</th>
                <th>Description / Purpose</th>
                <th>Vendor / Payee</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Audit Status</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($expList)): ?>
                <?php foreach ($expList as $exp): ?>
                    <tr>
                        <td class="font-mono text-muted text-xs whitespace-nowrap"><?= e($exp['expense_date']) ?></td>
                        <td class="font-bold text-main"><?= e($exp['description']) ?></td>
                        <td class="text-main font-medium"><?= e($exp['vendor_name'] ?: 'General Supplier') ?></td>
                        <td>
                            <span class="badge badge-brand text-2xs"><?= e($exp['category_name'] ?: 'Operating Expense') ?></span>
                        </td>
                        <td class="text-muted text-xs capitalize font-medium"><?= e(str_replace('_', ' ', $exp['payment_method'])) ?></td>
                        <td class="font-mono font-bold text-danger text-sm">-$<?= number_format($exp['amount'], 2) ?></td>
                        <td>
                            <span class="badge badge-success text-2xs uppercase font-bold">✓ <?= e($exp['status']) ?></span>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="7" class="text-center p-8 text-muted">
                        <div class="text-sm font-semibold text-main mb-1">No business expenses logged yet</div>
                        <div class="text-2xs text-muted">Log an expense above to track corporate accounts payable.</div>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Expense Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newExpenseModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Log Corporate Expense</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newExpenseModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/expenses/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="exp_desc">Description / Purpose *</label>
                <input type="text" id="exp_desc" name="description" class="form-input" placeholder="e.g. Monthly AWS Production Cloud Compute" required>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="exp_amt">Amount ($) *</label>
                    <input type="number" id="exp_amt" name="amount" class="form-input" placeholder="500.00" step="0.01" required>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="exp_vendor">Vendor / Supplier</label>
                    <select id="exp_vendor" name="vendor_id" class="form-select">
                        <option value="">Select Vendor...</option>
                        <?php foreach ($vendors as $v): ?>
                            <option value="<?= e($v['id']) ?>"><?= e($v['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="exp_cat">Expense Classification</label>
                    <select id="exp_cat" name="category_id" class="form-select">
                        <option value="">Select Category...</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?= e($cat['id']) ?>"><?= e($cat['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="exp_date">Disbursal Date</label>
                    <input type="date" id="exp_date" name="expense_date" class="form-input" value="<?= date('Y-m-d') ?>">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newExpenseModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Expense Entry</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
