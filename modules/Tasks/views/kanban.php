<?php
/**
 * OmniDesk AI — 6-Column Interactive Task Kanban View
 *
 * Interactive sprint work item board with drag & drop AJAX status updates.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$kb = $kanban ?? [];
$taskStages = [
    'backlog'     => ['title' => 'Backlog',     'color' => 'var(--text-muted)'],
    'todo'        => ['title' => 'To Do',       'color' => 'var(--brand-primary)'],
    'in_progress' => ['title' => 'In Progress', 'color' => 'var(--status-info)'],
    'review'      => ['title' => 'In Review',   'color' => 'var(--status-warning)'],
    'testing'     => ['title' => 'Testing',     'color' => 'var(--brand-primary)'],
    'completed'   => ['title' => 'Completed',   'color' => 'var(--status-success)'],
];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Task Kanban Header Toolbar ──────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Interactive Task Kanban Board</h1>
                <span class="badge badge-brand">6-Column Workflow</span>
            </div>
            <p class="text-muted text-xs">
                Real-time sprint workflow board: drag tasks or transition status to advance delivery.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newTaskModal').classList.add('active')">+ Create Task</button>
            <a href="<?= url('/tasks') ?>" class="btn btn-sm btn-secondary">List View</a>
            <a href="<?= url('/tasks/calendar') ?>" class="btn btn-sm btn-secondary">📅 Calendar</a>
        </div>
    </div>
</div>

<!-- ── 6-Column Task Kanban Board ───────────────────────────────────── -->
<div class="kanban-board grid grid-cols-6 gap-4 overflow-x-auto pb-6" style="min-height: 550px;">
    <?php foreach ($taskStages as $stKey => $stConf): ?>
        <?php $colTasks = $kb[$stKey] ?? []; ?>
        <div class="kanban-column bg-surface-subtle p-3.5 rounded-xl border flex flex-col" data-status="<?= e($stKey) ?>" style="min-width: 220px;">
            <!-- Column Header -->
            <div class="border-b pb-2.5 mb-3 flex items-center justify-between">
                <h4 class="font-bold text-xs uppercase tracking-wider text-main mb-0"><?= e($stConf['title']) ?></h4>
                <span class="badge badge-neutral text-2xs font-bold"><?= count($colTasks) ?></span>
            </div>

            <!-- Column Cards Container -->
            <div class="kanban-cards space-y-3 flex-1 overflow-y-auto" id="task_col_<?= e($stKey) ?>">
                <?php foreach ($colTasks as $t): ?>
                    <div class="card p-3 shadow-sm border cursor-grab kanban-card text-xs" data-task-id="<?= e($t['id']) ?>" draggable="true">
                        <div class="flex items-start justify-between gap-2 mb-1.5">
                            <span class="font-mono text-2xs font-bold text-muted"><?= e($t['code']) ?></span>
                            <span class="badge <?= $t['priority'] === 'urgent' ? 'badge-danger' : ($t['priority'] === 'high' ? 'badge-warning' : 'badge-neutral') ?> text-2xs uppercase">
                                <?= e($t['priority']) ?>
                            </span>
                        </div>

                        <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="font-bold text-main hover:underline text-xs block mb-2 leading-snug">
                            <?= e($t['title']) ?>
                        </a>

                        <div class="text-muted text-2xs mb-2.5 truncate font-medium"><?= e($t['project_name'] ?: 'General Project') ?></div>

                        <div class="flex items-center justify-between pt-2 border-t text-2xs text-muted">
                            <span>👤 <?= e($t['assignee_name'] ?: 'Unassigned') ?></span>
                            <span>💬 <?= e($t['total_comments']) ?></span>
                        </div>

                        <!-- Status Quick Select -->
                        <div class="mt-2.5 text-right">
                            <select class="form-select text-2xs py-1 px-1.5 w-auto cursor-pointer" onchange="OmniDeskTasks.moveTaskStatus(<?= e($t['id']) ?>, this.value)">
                                <option value="" disabled selected>Move Status...</option>
                                <?php foreach ($taskStages as $sk => $sc): ?>
                                    <option value="<?= e($sk) ?>" <?= $sk === $stKey ? 'disabled' : '' ?>><?= e($sc['title']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($colTasks)): ?>
                    <div class="text-center text-muted text-2xs py-8 border border-dashed rounded-lg">
                        No tasks in stage
                    </div>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<!-- ── New Task Modal ────────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newTaskModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Create Task Work Item</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newTaskModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/tasks/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="nt_title">Task Title *</label>
                <input type="text" id="nt_title" name="title" class="form-input" placeholder="e.g. Implement zero-trust session validation" required>
            </div>
            <div class="form-group mb-2">
                <label class="form-label" for="nt_desc">Detailed Acceptance Criteria</label>
                <textarea id="nt_desc" name="description" class="form-textarea" rows="3" placeholder="Provide task context..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="nt_pri">Priority</label>
                    <select id="nt_pri" name="priority" class="form-select">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="nt_due">Target Due Date</label>
                    <input type="date" id="nt_due" name="due_date" class="form-input">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newTaskModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Create Task</button>
            </div>
        </form>
    </div>
</div>

<script>
window.OmniDeskTasks = {
    async moveTaskStatus(taskId, newStatus) {
        if (!newStatus) return;
        try {
            const res = await OmniDesk.fetch('/tasks/status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: taskId, status: newStatus})
            });
            if (res.ok) {
                window.location.reload();
            } else {
                alert('Could not update task status.');
            }
        } catch (e) {
            console.error(e);
            alert('Task update failed.');
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
