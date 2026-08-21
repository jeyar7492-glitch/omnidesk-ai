<?php
/**
 * OmniDesk AI — Executive Intelligence View
 *
 * High-level corporate overview: Financial aggregates, revenue health,
 * active deal pipelines, and AI-synthesized executive briefings.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Executive Header Banner ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Executive Review & Strategy Briefing</h1>
                <span class="badge badge-brand">Executive Tier</span>
            </div>
            <p class="text-muted text-xs">
                Consolidated Corporate Intelligence &bull; Revenue Forecasts &bull; Liquidity Health &bull; Multi-Domain Risk Assessment
            </p>
        </div>
        <div class="flex items-center gap-2">
            <a href="<?= url('/ai/command-center') ?>" class="btn btn-sm btn-primary">⚡ Generate AI Briefing</a>
        </div>
    </div>
</div>

<!-- ── Core Executive KPIs ───────────────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Gross Invoiced Volume</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">💰</span>
        </div>
        <div class="kpi-value text-success font-mono">$114,400.00</div>
        <div class="kpi-footer text-muted">
            <span>Collected: <strong class="text-main">$47,000.00</strong> | Outstanding: <strong class="text-warning">$67,400.00</strong></span>
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Realized Net Margin</span>
            <span class="kpi-icon-pill">📈</span>
        </div>
        <div class="kpi-value text-main font-mono">$41,000.00</div>
        <div class="kpi-footer text-success font-medium">
            <span>Gross Expenses: $6,000.00 (Healthy 87.2% Efficiency)</span>
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Weighted Sales Pipeline</span>
            <span class="kpi-icon-pill">👥</span>
        </div>
        <div class="kpi-value text-main font-mono">$342,000.00</div>
        <div class="kpi-footer text-muted">
            <span>5 Active High-Probability Enterprise Deals</span>
        </div>
    </div>
</div>

<!-- ── Strategic AI Executive Summary ────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
            <span class="text-xl">🤖</span>
            <div>
                <h2 class="card-title">Autonomous AI Executive Synthesis</h2>
                <p class="card-subtitle">Real-time ledger and pipeline cross-domain analysis</p>
            </div>
        </div>
        <span class="badge badge-brand">Supervisor Synthesis</span>
    </div>
    <div class="p-4 rounded-lg bg-surface-subtle border text-xs leading-relaxed text-main">
        <p class="mb-2">
            <strong>Executive Summary:</strong> Corporate financial liquidity remains optimal with a net profit margin exceeding 85%. Receivables recovery velocity is on schedule with $47,000.00 collected across Q3 accounts.
        </p>
        <p class="mb-0 text-muted">
            <strong>Recommended Action:</strong> Expedite payment settlement on INV-2026-002 ($35,000.00 due in 7 days) and authorize cloud infrastructure expansion for Apex Dynamics migration.
        </p>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
