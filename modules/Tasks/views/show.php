<?php
/**
 * OmniDesk AI — Task Profile, Checklists & Comments View (Phase 5)
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

<!-- ── Task Profile Header ──────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <span class="font-mono text-xs font-bold text-muted uppercase"><?= e($t['code'] ?? 'TSK') ?></span>
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($t['title'] ?? 'Task Details') ?></h1>
                <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $t['status'] ?? 'todo')) ?></span>
                <span class="badge <?= ($t['priority'] ?? '') === 'urgent' ? 'badge-danger' : 'badge-secondary' ?> uppercase"><?= e($t['priority'] ?? 'medium') ?></span>
            </div>
            <p class="text-muted text-sm mb-0">Project Workspace: <?= e($t['project_name'] ?: 'General') ?> &bull; Assignee: <?= e($t['assignee_name'] ?: 'Unassigned') ?></p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-secondary text-xs py-1.5 px-3">&larr; Back to Kanban</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Task Meta Overview -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Task Overview</h3>
        <div class="space-y-3 text-xs">
            <div>
                <span class="text-muted block font-medium">Description:</span>
                <p class="text-main mt-1"><?= e($t['description'] ?: 'No description provided.') ?></p>
            </div>
            <div>
                <span class="text-muted block font-medium">Due Date:</span>
                <span class="text-main font-semibold"><?= e($t['due_date'] ?: 'Not set') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Created By:</span>
                <span class="text-main"><?= e($t['creator_name'] ?: 'System') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Created Date:</span>
                <span class="text-main"><?= e($t['created_at'] ?? 'N/A') ?></span>
            </div>
        </div>
    </div>

    <!-- Checklists & Discussion Comments -->
    <div class="col-span-2 space-y-6">
        <!-- Checklist Card -->
        <div class="card p-6">
            <h3 class="font-semibold text-base border-b pb-3 mb-4">Task Checklist Items (<?= count($chks) ?>)</h3>
            <div class="space-y-2 text-xs">
                <?php if (!empty($chks)): ?>
                    <?php foreach ($chks as $chk): ?>
                        <div class="p-2 rounded bg-surface-subtle border flex items-center justify-between">
                            <span class="<?= $chk['is_completed'] ? 'line-through text-muted' : 'text-main font-medium' ?>">
                                <?= e($chk['title']) ?>
                            </span>
                            <span class="badge <?= $chk['is_completed'] ? 'badge-success' : 'badge-secondary' ?> text-2xs">
                                <?= $chk['is_completed'] ? 'Completed' : 'Pending' ?>
                            </span>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-4">No checklist items added for this task.</div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Comments Discussion Thread Card -->
        <div class="card p-6">
            <h3 class="font-semibold text-base border-b pb-3 mb-4">Discussion Thread (<?= count($comms) ?>)</h3>
            <div class="space-y-3 text-xs mb-6">
                <?php if (!empty($comms)): ?>
                    <?php foreach ($comms as $cm): ?>
                        <div class="p-3 rounded bg-surface-subtle border">
                            <div class="flex justify-between items-center mb-1">
                                <strong class="text-main"><?= e($cm['user_name']) ?></strong>
                                <span class="text-2xs text-muted"><?= e($cm['created_at']) ?></span>
                            </div>
                            <p class="text-muted mb-0"><?= e($cm['comment']) ?></p>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-4">No comments posted yet.</div>
                <?php endif; ?>
            </div>

            <!-- Post Comment Form -->
            <form action="<?= url('/tasks/comment') ?>" method="POST" class="space-y-2 text-xs">
                <?= csrf_field() ?>
                <input type="hidden" name="task_id" value="<?= e($t['id']) ?>">
                <textarea name="comment" class="form-input" rows="2" placeholder="Write a comment..." required></textarea>
                <div class="text-right">
                    <button type="submit" class="btn btn-primary text-xs py-1.5 px-3">Post Comment</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
