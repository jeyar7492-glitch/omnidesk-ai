<?php
/**
 * OmniDesk AI — Financial P&L Reports View (Phase 6)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$m = $metrics ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Reports Header Toolbar ───────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Financial P&L & Cash Flow Statement</h1>
            <p class="text-muted text-sm mb-0">Profit and Loss accounting overview, cash flow analysis, and revenue retention</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" onclick="window.print()" class="btn btn-secondary text-xs py-1.5 px-3">🖨️ Print P&L Report</button>
        </div>
    </div>
</div>

<!-- ── P&L Statement Card ───────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <h3 class="font-semibold text-base border-b pb-3 mb-4">Profit & Loss Summary</h3>

    <div class="space-y-4 text-xs max-w-xl">
        <div class="flex justify-between items-center py-2 border-b">
            <span class="text-main font-semibold">Gross Invoiced Revenue:</span>
            <span class="font-mono text-base font-bold text-main">$<?= number_format($m['gross_revenue'] ?? 0, 2) ?></span>
        </div>

        <div class="flex justify-between items-center py-2 border-b text-muted pl-4">
            <span>Collected Cash Receivables:</span>
            <span class="font-mono text-success">$<?= number_format($m['total_paid'] ?? 0, 2) ?></span>
        </div>

        <div class="flex justify-between items-center py-2 border-b text-muted pl-4">
            <span>Outstanding Pending Receivables:</span>
            <span class="font-mono text-danger">$<?= number_format($m['outstanding_due'] ?? 0, 2) ?></span>
        </div>

        <div class="flex justify-between items-center py-2 border-b text-danger font-semibold">
            <span>Total Business Expenses:</span>
            <span class="font-mono text-base">-$<?= number_format($m['total_expenses'] ?? 0, 2) ?></span>
        </div>

        <div class="flex justify-between items-center py-3 border-t-2 border-b-2 text-sm font-bold bg-surface-subtle p-3 rounded">
            <span class="text-main">Net Realized Profit (Collected - Expenses):</span>
            <span class="font-mono text-xl text-brand">$<?= number_format($m['net_profit'] ?? 0, 2) ?></span>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
