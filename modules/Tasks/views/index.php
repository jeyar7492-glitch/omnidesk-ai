<?php
/**
 * OmniDesk AI — Global Tasks Directory View
 *
 * Tabular listing of all workspace tasks, priorities, assignees, and target deadlines.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Global Tasks Directory</h1>
                <span class="badge badge-brand">Task Register</span>
            </div>
            <p class="text-muted text-xs">
                Comprehensive tracking of engineering work items, sprint tickets, assignees, and due dates.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-sm btn-primary">📋 View Task Kanban</a>
            <a href="<?= url('/tasks/calendar') ?>" class="btn btn-sm btn-secondary">📅 Calendar</a>
        </div>
    </div>
</div>

<!-- ── Search & Filters ─────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/tasks') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search task title, code..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-select text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="todo" <?= ($_GET['status'] ?? '') === 'todo' ? 'selected' : '' ?>>To Do</option>
            <option value="in_progress" <?= ($_GET['status'] ?? '') === 'in_progress' ? 'selected' : '' ?>>In Progress</option>
            <option value="review" <?= ($_GET['status'] ?? '') === 'review' ? 'selected' : '' ?>>In Review</option>
            <option value="completed" <?= ($_GET['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Completed</option>
        </select>

        <button type="submit" class="btn btn-sm btn-secondary">Filter</button>
        <a href="<?= url('/tasks') ?>" class="text-xs text-muted hover:underline ml-1">Clear Filters</a>
    </form>
</div>

<!-- ── Tasks Table ──────────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Code</th>
                <th>Task Title</th>
                <th>Project Workspace</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Target Due Date</th>
                <th class="text-right">Action</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($tasks)): ?>
                <?php foreach ($tasks as $t): ?>
                    <tr>
                        <td class="font-mono font-bold text-2xs text-muted"><?= e($t['code']) ?></td>
                        <td>
                            <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="font-bold text-main hover:underline">
                                <?= e($t['title']) ?>
                            </a>
                        </td>
                        <td class="text-muted font-medium"><?= e($t['project_name'] ?: 'General Project') ?></td>
                        <td>
                            <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                        </td>
                        <td>
                            <span class="badge <?= $t['priority'] === 'urgent' ? 'badge-danger' : ($t['priority'] === 'high' ? 'badge-warning' : 'badge-neutral') ?> uppercase">
                                <?= e($t['priority']) ?>
                            </span>
                        </td>
                        <td class="text-main font-medium"><?= e($t['assignee_name'] ?: 'Unassigned') ?></td>
                        <td class="text-muted font-mono text-xs"><?= e($t['due_date'] ?: 'N/A') ?></td>
                        <td class="text-right">
                            <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="btn btn-sm btn-secondary">View Task</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="8" class="text-center p-8 text-muted">No task items found matching criteria.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
