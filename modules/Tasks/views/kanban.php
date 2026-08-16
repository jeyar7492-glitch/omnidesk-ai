<?php
/**
 * OmniDesk AI — 6-Column Interactive Task Kanban View (Phase 5)
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
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">Interactive Task Kanban Board</h1>
                <span class="badge badge-brand">6 Column Workflow</span>
            </div>
            <p class="text-muted text-sm mb-0">Drag and drop or select task status columns to update workflow progression</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newTaskModal').classList.add('active')">+ Create Task</button>
            <a href="<?= url('/tasks') ?>" class="btn btn-secondary text-xs py-1.5 px-3">List View</a>
            <a href="<?= url('/tasks/calendar') ?>" class="btn btn-secondary text-xs py-1.5 px-3">📅 Calendar</a>
        </div>
    </div>
</div>

<!-- ── 6-Column Task Kanban Board ───────────────────────────────────── -->
<div class="kanban-board grid grid-cols-6 gap-4 overflow-x-auto pb-6" style="min-height: 550px;">
    <?php foreach ($taskStages as $stKey => $stConf): ?>
        <?php $colTasks = $kb[$stKey] ?? []; ?>
        <div class="kanban-column bg-surface-subtle p-3 rounded-lg border flex flex-col" data-status="<?= e($stKey) ?>">
            <!-- Column Header -->
            <div class="column-header border-b pb-2 mb-3 flex items-center justify-between">
                <h4 class="font-bold text-xs uppercase tracking-wider text-main mb-0"><?= e($stConf['title']) ?></h4>
                <span class="badge badge-secondary text-2xs"><?= count($colTasks) ?></span>
            </div>

            <!-- Column Cards Container -->
            <div class="kanban-cards space-y-3 flex-1 overflow-y-auto" id="task_col_<?= e($stKey) ?>">
                <?php foreach ($colTasks as $t): ?>
                    <div class="card p-3 shadow-sm hover:shadow border cursor-grab kanban-card text-xs" data-task-id="<?= e($t['id']) ?>" draggable="true">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <span class="font-mono text-2xs font-bold text-muted"><?= e($t['code']) ?></span>
                            <span class="badge <?= $t['priority'] === 'urgent' ? 'badge-danger' : ($t['priority'] === 'high' ? 'badge-warning' : 'badge-secondary') ?> text-2xs uppercase">
                                <?= e($t['priority']) ?>
                            </span>
                        </div>

                        <a href="<?= url('/tasks/show?id=' . $t['id']) ?>" class="font-bold text-main hover:underline text-xs block mb-2 leading-tight">
                            <?= e($t['title']) ?>
                        </a>

                        <div class="text-muted text-2xs mb-2 truncate"><?= e($t['project_name'] ?: 'General Project') ?></div>

                        <div class="flex items-center justify-between pt-2 border-t text-2xs text-muted">
                            <span>👤 <?= e($t['assignee_name'] ?: 'Unassigned') ?></span>
                            <span>💬 <?= e($t['total_comments']) ?></span>
                        </div>

                        <!-- Status Quick Select -->
                        <div class="mt-2 text-right">
                            <select class="form-input text-2xs py-0 px-1 w-auto cursor-pointer" onchange="OmniDeskTasks.moveTaskStatus(<?= e($t['id']) ?>, this.value)">
                                <option value="" disabled selected>Move Status...</option>
                                <?php foreach ($taskStages as $sk => $sc): ?>
                                    <option value="<?= e($sk) ?>" <?= $sk === $stKey ? 'disabled' : '' ?>><?= e($sc['title']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($colTasks)): ?>
                    <div class="empty-column-placeholder text-center text-muted text-2xs py-8 border border-dashed rounded">
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
            <h3 class="font-semibold text-base">Create Work Item Task</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newTaskModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/tasks/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="nt_title">Task Title *</label>
                <input type="text" id="nt_title" name="title" class="form-input" placeholder="e.g. Implement OAuth2 Refresh Handler" required>
            </div>
            <div>
                <label class="form-label" for="nt_pid">Project Workspace *</label>
                <select id="nt_pid" name="project_id" class="form-input" required>
                    <option value="" disabled selected>Select Project...</option>
                    <?php foreach ($projects as $pj): ?>
                        <option value="<?= e($pj['id']) ?>"><?= e($pj['name']) ?> (<?= e($pj['code']) ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="nt_status">Status</label>
                    <select id="nt_status" name="status" class="form-input">
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="backlog">Backlog</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="nt_pri">Priority</label>
                    <select id="nt_pri" name="priority" class="form-input">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newTaskModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Task</button>
            </div>
        </form>
    </div>
</div>

<!-- ── Kanban Status Transition Client Script ────────────────────────── -->
<script>
window.OmniDeskTasks = {
    async moveTaskStatus(taskId, newStatus) {
        if (!taskId || !newStatus) return;

        const body = new URLSearchParams();
        body.append('task_id', taskId);
        body.append('status', newStatus);
        body.append('_csrf', '<?= csrf_token() ?>');

        try {
            const res = await fetch('<?= url('/tasks/update-status') ?>', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': '<?= csrf_token() ?>'
                },
                body: body.toString()
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || 'Failed to move task status.');
            }
        } catch (e) {
            alert('Server request failed.');
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
