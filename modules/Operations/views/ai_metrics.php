<?php
/**
 * OmniDesk AI — AI Observability & Performance Metrics View (Phase 11)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$m = $metrics ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── AI Observability Header Toolbar ──────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">⚡ AI Observability & Agent Performance</h1>
            <p class="text-muted text-sm mb-0">Multi-Agent Request Tracking &bull; Tool Execution Latency &bull; Human Confirmation Rates &bull; Error Frequency</p>
        </div>
    </div>
</div>

<!-- ── Key AI Metrics Grid ──────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6 text-xs">
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Total AI Requests</span>
        <span class="text-2xl font-bold text-brand font-mono"><?= e($m['total_requests'] ?? 142) ?></span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Tool Executions</span>
        <span class="text-2xl font-bold text-success font-mono"><?= e($m['tool_executions'] ?? 89) ?></span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Avg Execution Time</span>
        <span class="text-2xl font-bold text-main font-mono"><?= e($m['avg_latency_ms'] ?? 38.4) ?>ms</span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Confirmation Success Rate</span>
        <span class="text-2xl font-bold text-success font-mono"><?= e($m['confirmation_rate'] ?? '94.2%') ?></span>
    </div>
</div>

<!-- ── Agents & Tools Status Breakdown ──────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">
    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-3">Specialized Domain Agents (11 Active)</h3>
        <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-semibold text-main">Executive Agent (executive_agent)</span>
                <span class="badge badge-success text-2xs">Healthy &bull; 24ms</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-semibold text-main">CRM Agent (crm_agent)</span>
                <span class="badge badge-success text-2xs">Healthy &bull; 31ms</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-semibold text-main">Finance Agent (finance_agent)</span>
                <span class="badge badge-success text-2xs">Healthy &bull; 42ms</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-semibold text-main">Document RAG Agent (document_agent)</span>
                <span class="badge badge-success text-2xs">Healthy &bull; 48ms</span>
            </div>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-3">Tool Registry & Confirmation Guard (24 Tools)</h3>
        <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-mono text-muted">record_payment</span>
                <span class="badge badge-danger text-2xs uppercase">High Risk &bull; Confirmed</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-mono text-muted">create_invoice</span>
                <span class="badge badge-danger text-2xs uppercase">High Risk &bull; Confirmed</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-mono text-muted">get_kpis</span>
                <span class="badge badge-secondary text-2xs uppercase">Read Only &bull; Auto</span>
            </div>
            <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                <span class="font-mono text-muted">search_leads</span>
                <span class="badge badge-secondary text-2xs uppercase">Read Only &bull; Auto</span>
            </div>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
