<?php
/**
 * OmniDesk AI — Employee Workspace: My Work View
 *
 * Individual contributor command center: Personal priorities, active tasks,
 * upcoming meetings, and AI focus recommendations.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── My Work Header Banner ────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">My Work & Personal Queue</h1>
                <span class="badge badge-brand">Individual Workspace</span>
            </div>
            <p class="text-muted text-xs">
                Today's Deliverables &bull; Sprint Milestones &bull; Calendar Agenda &bull; AI Action Recommendations
            </p>
        </div>
        <div class="flex items-center gap-2">
            <a href="<?= url('/tasks') ?>" class="btn btn-sm btn-primary">+ Create Personal Task</a>
        </div>
    </div>
</div>

<!-- ── Personal Work Focus Tiles ────────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">

    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">🔥 High Priority Today</h2>
            <span class="badge badge-danger">Due Today</span>
        </div>
        <div class="p-3.5 rounded-lg bg-surface-subtle border text-xs">
            <strong class="text-main block mb-1 font-semibold">[TSK-102] Finalize Enterprise UI Architecture</strong>
            <p class="text-muted text-xs mb-2">Refactor components.css and unify cross-module design tokens.</p>
            <div class="flex items-center justify-between pt-2 border-t">
                <span class="badge badge-warning">In Progress</span>
                <a href="<?= url('/tasks') ?>" class="text-brand font-semibold hover:underline">View Task &rarr;</a>
            </div>
        </div>
    </div>

    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">📅 Scheduled Engagements</h2>
            <span class="badge badge-info">Today</span>
        </div>
        <div class="p-3.5 rounded-lg bg-surface-subtle border text-xs mb-2">
            <strong class="text-main block mb-0.5 font-semibold">Weekly Executive Strategic Alignment</strong>
            <span class="text-muted text-xs">10:00 AM &ndash; 10:45 AM &bull; Main Virtual Room</span>
        </div>
    </div>

    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span>💡</span>
                <h2 class="card-title">AI Focus Engine</h2>
            </div>
            <span class="badge badge-brand">AI Copilot</span>
        </div>
        <div class="p-3.5 rounded-lg bg-surface-subtle border text-xs text-muted leading-relaxed">
            <p class="mb-0">
                "Complete TSK-102 frontend components to unblock PRJ-102 milestone delivery and verify test suite pass rates."
            </p>
        </div>
    </div>

</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
