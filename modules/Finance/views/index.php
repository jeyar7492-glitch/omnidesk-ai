<?php
/**
 * OmniDesk AI — Finance Dashboard Overview
 *
 * Financial metrics, billed receivables, collections, expenses, and ledger integrity.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$m = $metrics ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Finance Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Finance & Ledger Management</h1>
                <span class="badge badge-brand">Financial Control</span>
            </div>
            <p class="text-muted text-xs">
                Invoiced Receivables &bull; Payment Collections &bull; Corporate Expenses &bull; Mathematical Ledger Reconciliation
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/finance/invoices') ?>" class="btn btn-sm btn-primary">📄 Invoices Directory</a>
            <a href="<?= url('/finance/expenses') ?>" class="btn btn-sm btn-secondary">💸 Expenses Log</a>
            <a href="<?= url('/finance/reports') ?>" class="btn btn-sm btn-secondary">📊 P&L Reports</a>
        </div>
    </div>
</div>

<!-- ── 4 Finance KPI Cards Grid ─────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Gross Billed Volume</span>
            <span class="kpi-icon-pill">💰</span>
        </div>
        <div class="kpi-value text-main font-mono">$<?= number_format($m['gross_revenue'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-muted"><span>Total Invoiced Receivables</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Cleared Collections</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">🏆</span>
        </div>
        <div class="kpi-value text-success font-mono">$<?= number_format($m['total_paid'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium"><span>Reconciled Payments</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Outstanding Receivables</span>
            <span class="kpi-icon-pill" style="color: var(--status-warning); background: var(--status-warning-bg);">⏳</span>
        </div>
        <div class="kpi-value text-warning font-mono">$<?= number_format($m['outstanding_due'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-warning font-medium"><span>Pending Due Balance</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Realized Net Margin</span>
            <span class="kpi-icon-pill">📈</span>
        </div>
        <div class="kpi-value text-brand font-mono">$<?= number_format($m['net_profit'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium"><span>Collected less Expenses</span></div>
    </div>
</div>

<!-- ── Recent Invoices & Expenses Row ───────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">
    <!-- Recent Invoices Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Recent Invoices</h2>
            <a href="<?= url('/finance/invoices') ?>" class="text-xs text-brand font-semibold hover:underline">View All &rarr;</a>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($invoices)): ?>
                <?php foreach ($invoices as $inv): ?>
                    <div class="p-3.5 rounded-lg bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-bold text-main">
                                <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="hover:underline">
                                    <?= e($inv['invoice_number']) ?>
                                </a>
                            </div>
                            <div class="text-muted text-xs mt-0.5"><?= e($inv['customer_name']) ?></div>
                        </div>
                        <div class="text-right">
                            <div class="font-mono font-bold text-main">$<?= number_format($inv['total_amount'], 2) ?></div>
                            <span class="badge <?= $inv['status'] === 'paid' ? 'badge-success' : 'badge-warning' ?> text-2xs uppercase">
                                <?= e($inv['status']) ?>
                            </span>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-8">No recent invoices logged.</div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Recent Expenses Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Recent Operating Expenses</h2>
            <a href="<?= url('/finance/expenses') ?>" class="text-xs text-brand font-semibold hover:underline">View All &rarr;</a>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($expenses)): ?>
                <?php foreach ($expenses as $exp): ?>
                    <div class="p-3.5 rounded-lg bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-bold text-main"><?= e($exp['category']) ?></div>
                            <div class="text-muted text-xs mt-0.5"><?= e($exp['description']) ?> &bull; <?= e($exp['date']) ?></div>
                        </div>
                        <div class="font-mono font-bold text-danger">-$<?= number_format($exp['amount'], 2) ?></div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-8">No operating expenses recorded.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
