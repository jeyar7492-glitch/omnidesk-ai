<?php
/**
 * OmniDesk AI — Finance Dashboard Overview (Phase 6)
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
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">Finance & Invoicing Engine</h1>
                <span class="badge badge-success">Accounting Active</span>
            </div>
            <p class="text-muted text-sm mb-0">Financial Metrics, Invoice Billed Receivables, Expenses & Profit Analysis</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/finance/invoices') ?>" class="btn btn-primary text-xs py-1.5 px-3">📄 Invoices Directory</a>
            <a href="<?= url('/finance/expenses') ?>" class="btn btn-secondary text-xs py-1.5 px-3">💸 Expenses Log</a>
            <a href="<?= url('/finance/reports') ?>" class="btn btn-secondary text-xs py-1.5 px-3">📊 P&L Reports</a>
        </div>
    </div>
</div>

<!-- ── KPI Metric Cards Grid ───────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Gross Invoiced Revenue</div>
        <div class="text-2xl font-bold text-main mb-1">$<?= number_format($m['gross_revenue'] ?? 0, 2) ?></div>
        <div class="text-xs text-muted">Total Invoiced Billed</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Total Paid Collections</div>
        <div class="text-2xl font-bold text-success mb-1">$<?= number_format($m['total_paid'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium">Cleared Payments</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Outstanding Receivables</div>
        <div class="text-2xl font-bold text-danger mb-1">$<?= number_format($m['outstanding_due'] ?? 0, 2) ?></div>
        <div class="text-xs text-danger font-medium">Pending Collections</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Net Realized Profit</div>
        <div class="text-2xl font-bold text-brand mb-1">$<?= number_format($m['net_profit'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium">Collected minus Expenses</div>
    </div>
</div>

<!-- ── Recent Invoices & Expenses Row ───────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">
    <!-- Recent Invoices Card -->
    <div class="card p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Recent Invoices</h3>
            <a href="<?= url('/finance/invoices') ?>" class="text-xs text-brand hover:underline">View All &rarr;</a>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($invoices)): ?>
                <?php foreach ($invoices as $inv): ?>
                    <div class="p-3 rounded bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-bold text-main">
                                <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="hover:underline">
                                    <?= e($inv['invoice_number']) ?>
                                </a>
                            </div>
                            <div class="text-muted text-xs"><?= e($inv['customer_name']) ?></div>
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
                <div class="text-muted text-center py-6">No recent invoices logged.</div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Recent Expenses Card -->
    <div class="card p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Recent Business Expenses</h3>
            <a href="<?= url('/finance/expenses') ?>" class="text-xs text-brand hover:underline">View All &rarr;</a>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($expenses)): ?>
                <?php foreach ($expenses as $exp): ?>
                    <div class="p-3 rounded bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-bold text-main"><?= e($exp['description']) ?></div>
                            <div class="text-muted text-xs"><?= e($exp['vendor_name'] ?: 'General Vendor') ?> &bull; <?= e($exp['category_name'] ?: 'Expense') ?></div>
                        </div>
                        <div class="font-mono font-bold text-danger">-$<?= number_format($exp['amount'], 2) ?></div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-6">No recent expenses logged.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
