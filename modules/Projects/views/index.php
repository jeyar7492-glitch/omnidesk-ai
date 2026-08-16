<?php
/**
 * OmniDesk AI — Project Directory View (Phase 5)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$projects = $result['data'] ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Projects Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Project Workspaces Directory</h1>
            <p class="text-muted text-sm mb-0">Enterprise project workspaces, task completion progress, budgets, and milestone tracking</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newProjectModal').classList.add('active')">+ New Project</button>
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-secondary text-xs py-1.5 px-3">📋 Task Boards</a>
        </div>
    </div>
</div>

<!-- ── Search & Filter ──────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/projects') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search project name, code..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-input text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="active" <?= ($_GET['status'] ?? '') === 'active' ? 'selected' : '' ?>>Active</option>
            <option value="at_risk" <?= ($_GET['status'] ?? '') === 'at_risk' ? 'selected' : '' ?>>At Risk</option>
            <option value="completed" <?= ($_GET['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Completed</option>
        </select>

        <button type="submit" class="btn btn-secondary text-xs py-1.5 px-3">Filter</button>
        <a href="<?= url('/projects') ?>" class="text-xs text-muted">Clear</a>
    </form>
</div>

<!-- ── Projects Grid ────────────────────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <?php if (!empty($projects)): ?>
        <?php foreach ($projects as $p): ?>
            <div class="card p-6 flex flex-col justify-between hover:shadow border">
                <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="font-mono text-2xs text-muted font-bold uppercase"><?= e($p['code']) ?></span>
                        <span class="badge <?= $p['status'] === 'completed' ? 'badge-success' : ($p['status'] === 'at_risk' ? 'badge-danger' : 'badge-brand') ?> capitalize">
                            <?= e(str_replace('_', ' ', $p['status'])) ?>
                        </span>
                    </div>

                    <h3 class="font-bold text-base text-main mb-1">
                        <a href="<?= url('/projects/show?id=' . $p['id']) ?>" class="hover:underline text-main">
                            <?= e($p['name']) ?>
                        </a>
                    </h3>
                    <p class="text-xs text-muted mb-4 line-clamp-2"><?= e($p['description'] ?: 'No description provided.') ?></p>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="flex justify-between text-xs font-semibold mb-1">
                            <span class="text-muted">Completion</span>
                            <span class="text-main"><?= e($p['progress']) ?>%</span>
                        </div>
                        <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border">
                            <div class="h-full bg-brand rounded-full" style="width: <?= e($p['progress']) ?>%"></div>
                        </div>
                    </div>
                </div>

                <div class="pt-3 border-t flex justify-between items-center text-xs">
                    <span class="text-muted">Budget: <strong class="text-main">$<?= number_format($p['budget'], 0) ?></strong></span>
                    <a href="<?= url('/projects/show?id=' . $p['id']) ?>" class="btn btn-secondary text-2xs py-1 px-3">Open Project &rarr;</a>
                </div>
            </div>
        <?php endforeach; ?>
    <?php else: ?>
        <div class="col-span-3 card p-8 text-center text-muted">
            No projects found matching criteria.
        </div>
    <?php endif; ?>
</div>

<!-- ── New Project Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newProjectModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Initialize Project Workspace</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newProjectModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/projects/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="p_name">Project Name *</label>
                <input type="text" id="p_name" name="name" class="form-input" placeholder="e.g. Core System Refactoring" required>
            </div>
            <div>
                <label class="form-label" for="p_desc">Description</label>
                <textarea id="p_desc" name="description" class="form-input" rows="3" placeholder="Scope and deliverables..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="p_pri">Priority</label>
                    <select id="p_pri" name="priority" class="form-input">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="p_budget">Budget ($)</label>
                    <input type="number" id="p_budget" name="budget" class="form-input" placeholder="50000" step="1000">
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newProjectModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Project</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
