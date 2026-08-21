<?php
/**
 * OmniDesk AI — Project Directory View
 *
 * Enterprise project workspaces, task completion progress, budgets, and milestone tracking.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Project Workspaces & Delivery</h1>
                <span class="badge badge-brand">Portfolio Master</span>
            </div>
            <p class="text-muted text-xs">
                Enterprise project workspaces, task completion velocity, budget utilization, and milestone roadmaps.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newProjectModal').classList.add('active')">+ New Project</button>
            <a href="<?= url('/tasks/kanban') ?>" class="btn btn-sm btn-secondary">📋 Task Boards</a>
        </div>
    </div>
</div>

<!-- ── Search & Filter ──────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/projects') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search project name, code..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-select text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="active" <?= ($_GET['status'] ?? '') === 'active' ? 'selected' : '' ?>>Active</option>
            <option value="at_risk" <?= ($_GET['status'] ?? '') === 'at_risk' ? 'selected' : '' ?>>At Risk</option>
            <option value="completed" <?= ($_GET['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Completed</option>
        </select>

        <button type="submit" class="btn btn-sm btn-secondary">Filter</button>
        <a href="<?= url('/projects') ?>" class="text-xs text-muted hover:underline ml-1">Clear</a>
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

                    <h2 class="font-bold text-base text-main mb-1">
                        <a href="<?= url('/projects/show?id=' . $p['id']) ?>" class="hover:underline text-main">
                            <?= e($p['name']) ?>
                        </a>
                    </h2>
                    <p class="text-xs text-muted mb-4 line-clamp-2"><?= e($p['description'] ?: 'Active delivery workspace.') ?></p>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="flex justify-between text-xs font-semibold mb-1">
                            <span class="text-muted">Sprint Delivery</span>
                            <span class="text-main font-mono"><?= e($p['progress']) ?>%</span>
                        </div>
                        <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border">
                            <div class="h-full bg-brand rounded-full" style="width: <?= e($p['progress']) ?>%"></div>
                        </div>
                    </div>
                </div>

                <div class="pt-3 border-t flex justify-between items-center text-xs">
                    <span class="text-muted">Budget: <strong class="text-main font-mono">$<?= number_format($p['budget'], 0) ?></strong></span>
                    <a href="<?= url('/projects/show?id=' . $p['id']) ?>" class="btn btn-sm btn-secondary">Open Project &rarr;</a>
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
            <h3 class="font-bold text-base text-main">Initialize Project Workspace</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newProjectModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/projects/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="np_name">Project Title *</label>
                <input type="text" id="np_name" name="name" class="form-input" placeholder="e.g. Core Infrastructure Migration" required>
            </div>
            <div class="form-group mb-2">
                <label class="form-label" for="np_desc">Strategic Scope & Objectives</label>
                <textarea id="np_desc" name="description" class="form-textarea" rows="3" placeholder="Outline project milestones..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="np_budget">Allocated Budget ($)</label>
                    <input type="number" id="np_budget" name="budget" class="form-input" placeholder="50000" step="1000">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="np_dd">Target Completion Date</label>
                    <input type="date" id="np_dd" name="deadline" class="form-input">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newProjectModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Launch Workspace</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
