<?php
/**
 * OmniDesk AI — Task Profile, Checklists & Comments View
 *
 * Detailed task item view: Description, checklists, assignee, due date, and conversation thread.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$t     = $task ?? [];
$chks  = $checklists ?? [];
$comms = $comments ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Task Profile Header Banner ───────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <span class="font-mono text-xs font-bold text-muted uppercase"><?= e($t['code'] ?? 'TSK') ?></span>
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($t['title'] ?? 'Task Details') ?></h1>
                <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $t['status'] ?? 'todo')) ?></span>
                <span class="badge <?= ($t['priority'] ?? '') === 'urgent' ? 'badge-danger' : (($t['priority'] ?? '') === 'high' ? 'badge-warning' : 'badge-neutral') ?> uppercase">
                    <?= e($t['priority'] ?? 'medium') ?>
                </span>
            </div>
            <p class="text-muted text-xs">Project Workspace: <strong class="text-main"><?= e($t['project_name'] ?: 'General') ?></strong> &bull; Assignee: <strong class="text-main"><?= e($t['assignee_name'] ?: 'Unassigned') ?></strong></p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-sm btn-secondary">&larr; Back to Kanban</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Task Meta Overview -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4">
            <h2 class="card-title">Task Specification</h2>
        </div>
        <div class="space-y-3.5 text-xs">
            <div>
                <span class="text-muted block font-medium mb-1">Description:</span>
                <p class="text-main leading-relaxed"><?= e($t['description'] ?: 'No detailed description provided.') ?></p>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Target Due Date:</span>
                <span class="text-main font-mono font-semibold"><?= e($t['due_date'] ?: 'Not scheduled') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Created By:</span>
                <span class="text-main font-medium"><?= e($t['creator_name'] ?: 'System Administrator') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Created Timestamp:</span>
                <span class="text-main font-mono"><?= e($t['created_at'] ?? 'N/A') ?></span>
            </div>
        </div>
    </div>

    <!-- Checklists & Discussion Comments -->
    <div class="col-span-2 space-y-6">
        <!-- Checklist Card -->
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h2 class="card-title">Checklist Deliverables (<?= count($chks) ?>)</h2>
                <span class="badge badge-neutral">Items</span>
            </div>
            <div class="space-y-2.5 text-xs">
                <?php if (!empty($chks)): ?>
                    <?php foreach ($chks as $chk): ?>
                        <div class="p-3 rounded-lg bg-surface-subtle border flex items-center justify-between">
                            <span class="<?= $chk['is_completed'] ? 'line-through text-muted' : 'text-main font-semibold' ?>">
                                <?= e($chk['title']) ?>
                            </span>
                            <span class="badge <?= $chk['is_completed'] ? 'badge-success' : 'badge-neutral' ?> text-2xs">
                                <?= $chk['is_completed'] ? '✓ Completed' : 'Pending' ?>
                            </span>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-6">No sub-task checklist items created for this ticket.</div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Comments Discussion Thread Card -->
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h2 class="card-title">Discussion Thread (<?= count($comms) ?>)</h2>
                <span class="badge badge-brand">Audit Trail</span>
            </div>
            <div class="space-y-3 text-xs mb-6 max-h-64 overflow-y-auto">
                <?php if (!empty($comms)): ?>
                    <?php foreach ($comms as $cm): ?>
                        <div class="p-3.5 rounded-lg bg-surface-subtle border">
                            <div class="flex justify-between items-center mb-1">
                                <strong class="text-main font-semibold"><?= e($cm['user_name']) ?></strong>
                                <span class="text-2xs text-muted font-mono"><?= e($cm['created_at']) ?></span>
                            </div>
                            <p class="text-muted leading-relaxed mb-0"><?= e($cm['comment']) ?></p>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-6">No discussion comments recorded yet.</div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
