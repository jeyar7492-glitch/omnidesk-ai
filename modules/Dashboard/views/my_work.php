<?php
/**
 * OmniDesk AI — Employee Workspace: My Work (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── My Work Header Toolbar ───────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">👤 My Work Dashboard</h1>
            <p class="text-muted text-sm mb-0">Personal Assignments &bull; Today's Priorities &bull; Upcoming Deadlines &bull; Assigned Tasks</p>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-3">🔥 High Priority Today</h3>
        <div class="p-3 rounded bg-surface-subtle border mb-2 text-xs">
            <strong class="text-main block mb-1">[TSK-102] Build 6-Column Task Kanban Board</strong>
            <span class="badge badge-warning text-2xs">Due Today</span>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-3">📅 Scheduled Meetings</h3>
        <div class="p-3 rounded bg-surface-subtle border mb-2 text-xs">
            <strong class="text-main block mb-1">Weekly Executive & Engineering Sync</strong>
            <span class="text-muted text-2xs">10:00 AM - 10:45 AM</span>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="font-semibold text-sm mb-3">💡 AI Focus Recommendation</h3>
        <div class="p-3 rounded bg-surface-subtle border text-xs">
            <p class="text-muted mb-0">"Complete TSK-102 drag handlers first to unblock Project PRJ-102 milestone."</p>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
