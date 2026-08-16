<?php
/**
 * OmniDesk AI — Task Deadline Calendar View (Phase 5)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$taskList = $tasks ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Calendar Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Task Deadline Calendar</h1>
            <p class="text-muted text-sm mb-0">Visual deadline schedule of all project tasks and milestones</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-primary text-xs py-1.5 px-3">📋 Task Kanban</a>
            <a href="<?= url('/tasks') ?>" class="btn btn-secondary text-xs py-1.5 px-3">List View</a>
        </div>
    </div>
</div>

<!-- ── Calendar Deadlines Card ──────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <h3 class="font-semibold text-base border-b pb-3 mb-4">Scheduled Task Deadlines</h3>
    <div class="grid grid-cols-3 gap-4 text-xs">
        <?php if (!empty($taskList)): ?>
            <?php foreach ($taskList as $t): ?>
                <div class="p-3 rounded bg-surface-subtle border flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-mono text-2xs font-bold text-muted"><?= e($t['code']) ?></span>
                            <span class="badge badge-info text-2xs uppercase"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                        </div>
                        <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="font-semibold text-main hover:underline text-xs block mb-1">
                            <?= e($t['title']) ?>
                        </a>
                        <div class="text-muted text-2xs"><?= e($t['project_name']) ?></div>
                    </div>
                    <div class="pt-2 border-t mt-3 flex justify-between items-center text-2xs">
                        <span class="text-muted">Due: <strong class="text-main"><?= e($t['due_date'] ?: 'No deadline') ?></strong></span>
                        <span class="text-muted">👤 <?= e($t['assignee_name'] ?: 'Unassigned') ?></span>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="col-span-3 text-center text-muted py-8">No scheduled task deadlines found.</div>
        <?php endif; ?>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
