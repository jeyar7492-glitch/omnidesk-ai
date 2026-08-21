<?php
/**
 * OmniDesk AI — Manager Command Center View
 *
 * Operational management dashboard: Team workload, SLA compliance,
 * sprint blockers, and pending approvals.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Manager Header Banner ────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Team Manager Command Center</h1>
                <span class="badge badge-brand">Management Hub</span>
            </div>
            <p class="text-muted text-xs">
                Team Workload Distribution &bull; SLA Governance &bull; Sprint Velocity &bull; Operational Blockers
            </p>
        </div>
        <div class="flex items-center gap-2">
            <a href="<?= url('/tasks') ?>" class="btn btn-sm btn-primary">✅ Open Task Boards</a>
        </div>
    </div>
</div>

<!-- ── Operational Manager KPI Tiles ────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Team Capacity</span>
            <span class="kpi-icon-pill">⚡</span>
        </div>
        <div class="kpi-value text-success font-mono">82%</div>
        <div class="kpi-footer text-muted"><span>Balanced workload allocation</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">SLA Compliance</span>
            <span class="kpi-icon-pill">🛡️</span>
        </div>
        <div class="kpi-value text-main font-mono">96.4%</div>
        <div class="kpi-footer text-success font-medium"><span>Exceeds target (95%)</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Active Blockers</span>
            <span class="kpi-icon-pill" style="color: var(--status-danger); background: var(--status-danger-bg);">⚠️</span>
        </div>
        <div class="kpi-value text-danger font-mono">1</div>
        <div class="kpi-footer text-warning font-medium"><span>Cloud provider quota wait</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Pending Approvals</span>
            <span class="kpi-icon-pill">📋</span>
        </div>
        <div class="kpi-value text-warning font-mono">1</div>
        <div class="kpi-footer text-muted"><span>Payment write verification</span></div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
