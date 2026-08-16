<?php
/**
 * OmniDesk AI — Project Overview & Task Breakdown View (Phase 5)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$p = $project ?? [];
$taskList = $tasks ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Project Profile Header ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <span class="font-mono text-xs font-bold text-muted uppercase"><?= e($p['code'] ?? 'PRJ') ?></span>
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($p['name'] ?? 'Project Overview') ?></h1>
                <span class="badge <?= ($p['status'] ?? '') === 'completed' ? 'badge-success' : 'badge-brand' ?> capitalize"><?= e(str_replace('_', ' ', $p['status'] ?? 'active')) ?></span>
            </div>
            <p class="text-muted text-sm mb-0">Project Manager: <?= e($p['manager_name'] ?: 'Unassigned') ?> &bull; Client: <?= e($p['customer_name'] ?: 'Internal Workspace') ?></p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/tasks/kanban?project_id=' . $p['id']) ?>" class="btn btn-primary text-xs py-1.5 px-3">📋 Project Kanban</a>
            <a href="<?= url('/projects') ?>" class="btn btn-secondary text-xs py-1.5 px-3">&larr; Back to Projects</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Project KPI Metrics Card -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Project Metrics</h3>
        <div class="space-y-4 text-xs">
            <div>
                <div class="flex justify-between font-semibold mb-1">
                    <span class="text-muted">Calculated Progress:</span>
                    <span class="text-main"><?= e($p['progress'] ?? 0) ?>%</span>
                </div>
                <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border">
                    <div class="h-full bg-brand rounded-full" style="width: <?= e($p['progress'] ?? 0) ?>%"></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="p-3 rounded bg-surface-subtle border">
                    <span class="text-muted block">Total Tasks</span>
                    <strong class="text-main text-lg font-mono"><?= e($p['total_tasks'] ?? 0) ?></strong>
                </div>
                <div class="p-3 rounded bg-surface-subtle border">
                    <span class="text-muted block">Completed</span>
                    <strong class="text-success text-lg font-mono"><?= e($p['completed_tasks'] ?? 0) ?></strong>
                </div>
            </div>

            <div>
                <span class="text-muted block font-medium">Approved Budget:</span>
                <span class="text-xl font-mono font-bold text-main">$<?= number_format($p['budget'] ?? 0, 2) ?></span>
            </div>
        </div>
    </div>

    <!-- Project Tasks List Card -->
    <div class="col-span-2 card p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Project Work Items (<?= count($taskList) ?>)</h3>
            <a href="<?= url('/tasks/kanban?project_id=' . $p['id']) ?>" class="text-xs text-brand hover:underline">Open Kanban Board &rarr;</a>
        </div>

        <div class="table-responsive">
            <table class="table-custom w-full text-xs">
                <thead>
                    <tr class="border-b text-left text-muted uppercase">
                        <th class="p-2">Code</th>
                        <th class="p-2">Title</th>
                        <th class="p-2">Status</th>
                        <th class="p-2">Assignee</th>
                        <th class="p-2 text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($taskList)): ?>
                        <?php foreach ($taskList as $t): ?>
                            <tr class="border-b hover:bg-surface-subtle">
                                <td class="p-2 font-mono font-bold text-2xs text-muted"><?= e($t['code']) ?></td>
                                <td class="p-2 font-semibold text-main"><?= e($t['title']) ?></td>
                                <td class="p-2">
                                    <span class="badge badge-secondary text-2xs uppercase"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                                </td>
                                <td class="p-2 text-muted"><?= e($t['assignee_name'] ?: 'Unassigned') ?></td>
                                <td class="p-2 text-right">
                                    <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="btn btn-secondary text-2xs py-1 px-2">View</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="5" class="text-center p-6 text-muted">No tasks created under this project workspace yet.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
