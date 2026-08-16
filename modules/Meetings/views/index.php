<?php
/**
 * OmniDesk AI — Meetings & Action Items View (Phase 8)
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
            <h1 class="text-2xl font-bold tracking-tight mb-1">Meetings & Action Items Repository</h1>
            <p class="text-muted text-sm mb-0">Schedule Team Syncs, Record Meeting Notes, Key Decisions & AI Action Items</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newMeetingModal').classList.add('active')">+ Schedule Meeting</button>
        </div>
    </div>
</div>

<!-- ── Meetings Table ───────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Meeting Title</th>
                    <th class="p-3">Project</th>
                    <th class="p-3">Organizer</th>
                    <th class="p-3">Scheduled At</th>
                    <th class="p-3">Duration</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Action Items</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($meetList)): ?>
                    <?php foreach ($meetList as $m): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main"><?= e($m['title']) ?></td>
                            <td class="p-3 text-muted"><?= e($m['project_name'] ?: 'General Sync') ?></td>
                            <td class="p-3 text-muted"><?= e($m['organizer_name']) ?></td>
                            <td class="p-3 font-mono text-muted"><?= e($m['scheduled_at']) ?></td>
                            <td class="p-3 text-muted"><?= e($m['duration_minutes']) ?> mins</td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($m['status']) ?></span>
                            </td>
                            <td class="p-3 text-muted text-2xs"><?= e($m['action_items'] ?: 'None recorded') ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="7" class="text-center p-6 text-muted">No meetings scheduled in repository.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Meeting Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newMeetingModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Schedule Enterprise Meeting</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newMeetingModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/meetings/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="meet_title">Meeting Title *</label>
                <input type="text" id="meet_title" name="title" class="form-input" placeholder="e.g. Sprint Review & Architecture Sync" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="meet_proj">Project Workspace</label>
                    <select id="meet_proj" name="project_id" class="form-input">
                        <option value="">Select Project...</option>
                        <?php foreach ($projects as $pj): ?>
                            <option value="<?= e($pj['id']) ?>"><?= e($pj['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="meet_dur">Duration (mins)</label>
                    <input type="number" id="meet_dur" name="duration_minutes" class="form-input" value="30">
                </div>
            </div>
            <div>
                <label class="form-label" for="meet_sched">Scheduled Date & Time</label>
                <input type="datetime-local" id="meet_sched" name="scheduled_at" class="form-input" value="<?= date('Y-m-d\TH:i') ?>">
            </div>
            <div>
                <label class="form-label" for="meet_notes">Agenda & Notes</label>
                <textarea id="meet_notes" name="notes" class="form-input" rows="2" placeholder="Key meeting agenda items..."></textarea>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newMeetingModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Schedule Meeting</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
