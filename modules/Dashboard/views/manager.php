<?php
/**
 * OmniDesk AI — Manager Command Center View (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Manager Header Toolbar ───────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">👔 Manager Command Center</h1>
            <p class="text-muted text-sm mb-0">Team Workload Distribution &bull; SLA Tracking &bull; Project Blockers &bull; Standup Preparation</p>
        </div>
    </div>
</div>

<div class="grid grid-cols-4 gap-4 mb-6 text-xs">
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Team Capacity</span>
        <span class="text-xl font-bold text-success font-mono">82%</span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">SLA Compliance</span>
        <span class="text-xl font-bold text-brand font-mono">96.4%</span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Active Blockers</span>
        <span class="text-xl font-bold text-danger font-mono">1</span>
    </div>
    <div class="card p-4 text-center">
        <span class="text-muted block text-2xs uppercase mb-1">Pending Approvals</span>
        <span class="text-xl font-bold text-warning font-mono">1</span>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
