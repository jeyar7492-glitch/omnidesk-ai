<?php
/**
 * OmniDesk AI — Project Overview & Task Breakdown View
 *
 * Comprehensive project delivery workspace: Completion tracking,
 * budget telemetry, and linked Kanban work items.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$p = $project ?? [];
$taskList = $tasks ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Project Profile Header Banner ───────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <span class="font-mono text-xs font-bold text-muted uppercase"><?= e($p['code'] ?? 'PRJ') ?></span>
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($p['name'] ?? 'Project Overview') ?></h1>
                <span class="badge <?= ($p['status'] ?? '') === 'completed' ? 'badge-success' : 'badge-brand' ?> capitalize"><?= e(str_replace('_', ' ', $p['status'] ?? 'active')) ?></span>
            </div>
            <p class="text-muted text-xs">Project Lead: <strong class="text-main"><?= e($p['manager_name'] ?: 'Unassigned') ?></strong> &bull; Client: <strong class="text-main"><?= e($p['customer_name'] ?: 'Internal Workspace') ?></strong></p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/tasks/kanban?project_id=' . $p['id']) ?>" class="btn btn-sm btn-primary">📋 Project Kanban</a>
            <a href="<?= url('/projects') ?>" class="btn btn-sm btn-secondary">&larr; Back to Projects</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Project KPI Metrics Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4">
            <h2 class="card-title">Project Telemetry</h2>
        </div>
        <div class="space-y-4 text-xs">
            <div>
                <div class="flex justify-between font-semibold mb-1">
                    <span class="text-muted">Calculated Velocity:</span>
                    <span class="text-main font-mono"><?= e($p['progress'] ?? 0) ?>%</span>
                </div>
                <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border">
                    <div class="h-full bg-brand rounded-full" style="width: <?= e($p['progress'] ?? 0) ?>%"></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="p-3.5 rounded-lg bg-surface-subtle border">
                    <span class="text-muted block font-medium">Total Tasks</span>
                    <strong class="text-main text-xl font-mono"><?= e($p['total_tasks'] ?? 0) ?></strong>
                </div>
                <div class="p-3.5 rounded-lg bg-surface-subtle border">
                    <span class="text-muted block font-medium">Completed</span>
                    <strong class="text-success text-xl font-mono"><?= e($p['completed_tasks'] ?? 0) ?></strong>
                </div>
            </div>

            <div>
                <span class="text-muted block font-medium mb-0.5">Approved Budget:</span>
                <span class="text-2xl font-mono font-extrabold text-main">$<?= number_format($p['budget'] ?? 0, 2) ?></span>
            </div>
        </div>
    </div>

    <!-- Project Tasks List Card -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Linked Work Items (<?= count($taskList) ?>)</h2>
            <a href="<?= url('/tasks/kanban?project_id=' . $p['id']) ?>" class="text-xs text-brand font-semibold hover:underline">Open Kanban Board &rarr;</a>
        </div>

        <div class="table-container border-none shadow-none">
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Task Title</th>
                        <th>Status</th>
                        <th>Assignee</th>
                        <th class="text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($taskList)): ?>
                        <?php foreach ($taskList as $t): ?>
                            <tr>
                                <td class="font-mono font-bold text-2xs text-muted"><?= e($t['code']) ?></td>
                                <td class="font-semibold text-main"><?= e($t['title']) ?></td>
                                <td>
                                    <span class="badge badge-neutral text-2xs uppercase"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                                </td>
                                <td class="text-muted font-medium"><?= e($t['assignee_name'] ?: 'Unassigned') ?></td>
                                <td class="text-right">
                                    <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="btn btn-sm btn-secondary">View Task</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="5" class="text-center p-8 text-muted">No task items created in this project workspace yet.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
