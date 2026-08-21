<?php
/**
 * OmniDesk AI — Meetings & Action Items View
 *
 * Schedule Team Syncs, Record Meeting Notes, Key Decisions & Action Items.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$meetList = $meetings ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Meetings Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Meetings & Strategic Syncs</h1>
                <span class="badge badge-brand">Collaboration</span>
            </div>
            <p class="text-muted text-xs">
                Executive sessions, sprint retrospectives, client alignments, and tracked action item commitments.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newMeetingModal').classList.add('active')">+ Schedule Meeting</button>
        </div>
    </div>
</div>

<!-- ── Meetings Table ───────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Meeting Title</th>
                <th>Project Context</th>
                <th>Organizer</th>
                <th>Scheduled Timestamp</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action Items Summary</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($meetList)): ?>
                <?php foreach ($meetList as $m): ?>
                    <tr>
                        <td class="font-bold text-main">
                            <span class="mr-1.5">📅</span> <?= e($m['title']) ?>
                        </td>
                        <td class="text-muted font-medium"><?= e($m['project_name'] ?: 'General Sync') ?></td>
                        <td class="text-main font-medium"><?= e($m['organizer_name']) ?></td>
                        <td class="font-mono text-muted text-xs"><?= e($m['scheduled_at']) ?></td>
                        <td class="text-muted font-medium"><?= e($m['duration_minutes']) ?> mins</td>
                        <td>
                            <span class="badge badge-success text-2xs uppercase"><?= e($m['status']) ?></span>
                        </td>
                        <td class="text-muted text-2xs max-w-xs truncate font-medium"><?= e($m['action_items'] ?: 'None recorded') ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="7" class="text-center p-8 text-muted">No meetings scheduled in repository.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Meeting Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newMeetingModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Schedule Strategic Meeting</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newMeetingModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/meetings/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="meet_title">Meeting Title *</label>
                <input type="text" id="meet_title" name="title" class="form-input" placeholder="e.g. Sprint Review & Architecture Sync" required>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="meet_proj">Project Workspace</label>
                    <select id="meet_proj" name="project_id" class="form-select">
                        <option value="">General Corporate Sync</option>
                        <?php foreach ($projects as $pj): ?>
                            <option value="<?= e($pj['id']) ?>"><?= e($pj['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="meet_dur">Duration (minutes)</label>
                    <input type="number" id="meet_dur" name="duration_minutes" class="form-input" value="30">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label" for="meet_sched">Scheduled Date & Time</label>
                <input type="datetime-local" id="meet_sched" name="scheduled_at" class="form-input" value="<?= date('Y-m-d\TH:i') ?>">
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newMeetingModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Schedule Session</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
