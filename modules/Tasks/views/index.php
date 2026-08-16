<?php
/**
 * OmniDesk AI — Global Tasks Directory View (Phase 5)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Tasks Header Toolbar ─────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Global Tasks Directory</h1>
            <p class="text-muted text-sm mb-0">Tabular listing of all workspace tasks, priorities, assignees, and target deadlines</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-primary text-xs py-1.5 px-3">📋 View Task Kanban</a>
            <a href="<?= url('/tasks/calendar') ?>" class="btn btn-secondary text-xs py-1.5 px-3">📅 Calendar</a>
        </div>
    </div>
</div>

<!-- ── Search & Filters ─────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/tasks') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search task title, code..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-input text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="todo" <?= ($_GET['status'] ?? '') === 'todo' ? 'selected' : '' ?>>To Do</option>
            <option value="in_progress" <?= ($_GET['status'] ?? '') === 'in_progress' ? 'selected' : '' ?>>In Progress</option>
            <option value="review" <?= ($_GET['status'] ?? '') === 'review' ? 'selected' : '' ?>>In Review</option>
            <option value="completed" <?= ($_GET['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Completed</option>
        </select>

        <button type="submit" class="btn btn-secondary text-xs py-1.5 px-3">Filter</button>
        <a href="<?= url('/tasks') ?>" class="text-xs text-muted">Clear</a>
    </form>
</div>

<!-- ── Tasks Table ──────────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Code</th>
                    <th class="p-3">Title</th>
                    <th class="p-3">Project Workspace</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Priority</th>
                    <th class="p-3">Assignee</th>
                    <th class="p-3">Due Date</th>
                    <th class="p-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($tasks)): ?>
                    <?php foreach ($tasks as $t): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono font-bold text-2xs text-muted"><?= e($t['code']) ?></td>
                            <td class="p-3 font-semibold text-main">
                                <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="hover:underline text-main">
                                    <?= e($t['title']) ?>
                                </a>
                            </td>
                            <td class="p-3 text-muted"><?= e($t['project_name'] ?: 'General Project') ?></td>
                            <td class="p-3">
                                <span class="badge badge-info capitalize"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                            </td>
                            <td class="p-3">
                                <span class="badge <?= $t['priority'] === 'urgent' ? 'badge-danger' : ($t['priority'] === 'high' ? 'badge-warning' : 'badge-secondary') ?> uppercase">
                                    <?= e($t['priority']) ?>
                                </span>
                            </td>
                            <td class="p-3 text-muted"><?= e($t['assignee_name'] ?: 'Unassigned') ?></td>
                            <td class="p-3 text-muted"><?= e($t['due_date'] ?: 'N/A') ?></td>
                            <td class="p-3 text-right">
                                <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="btn btn-secondary text-2xs py-1 px-2">View Task</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="8" class="text-center p-6 text-muted">No task items found matching criteria.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
