<?php
/**
 * OmniDesk AI — Executive Intelligence View (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Executive Header Toolbar ─────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">🏛️ Executive Intelligence Dashboard</h1>
            <p class="text-muted text-sm mb-0">Daily & Weekly Business Reviews &bull; Financial Aggregates &bull; Revenue Forecasts &bull; Operational Health</p>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-2">Gross Invoiced Revenue</h3>
        <div class="text-2xl font-bold text-success font-mono">$114,400.00</div>
        <p class="text-2xs text-muted mt-1">Paid Collections: $47,000.00 | Outstanding: $67,400.00</p>
    </div>
    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-2">Realized Net Profit</h3>
        <div class="text-2xl font-bold text-brand font-mono">$41,000.00</div>
        <p class="text-2xs text-muted mt-1">Gross Expenses: $6,000.00</p>
    </div>
    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-2">Sales Pipeline Value</h3>
        <div class="text-2xl font-bold text-main font-mono">$342,000.00</div>
        <p class="text-2xs text-muted mt-1">5 Active Sales Opportunities</p>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
