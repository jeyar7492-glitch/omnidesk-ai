<?php
/**
 * OmniDesk AI — Security Event Monitoring View (Phase 11)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$evts = $events ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Security Events Header Toolbar ───────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">🛡️ Security Event Monitoring</h1>
            <p class="text-muted text-sm mb-0">Failed Logins &bull; Prompt Injection Sanitizer Alerts &bull; Action Replay Interceptions &bull; CSRF Denials</p>
        </div>

        <div class="flex items-center gap-2 text-xs">
            <a href="<?= url('/operations/security') ?>" class="btn btn-secondary text-2xs py-1 px-2.5">All Events</a>
            <a href="<?= url('/operations/security?severity=CRITICAL') ?>" class="btn btn-secondary text-2xs py-1 px-2.5 text-danger font-bold">Critical Only</a>
            <a href="<?= url('/operations/security?severity=WARNING') ?>" class="btn btn-secondary text-2xs py-1 px-2.5 text-warning font-bold">Warnings</a>
        </div>
    </div>
</div>

<!-- ── Security Events Table ────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Timestamp</th>
                    <th class="p-3">Event Type</th>
                    <th class="p-3">Severity</th>
                    <th class="p-3">Source IP</th>
                    <th class="p-3">Event Details</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($evts)): ?>
                    <?php foreach ($evts as $ev): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono text-muted"><?= e($ev['created_at']) ?></td>
                            <td class="p-3 font-bold text-main font-mono"><?= e($ev['event_type']) ?></td>
                            <td class="p-3">
                                <span class="badge <?= $ev['severity'] === 'CRITICAL' ? 'badge-danger' : ($ev['severity'] === 'HIGH' ? 'badge-danger' : 'badge-warning') ?> text-2xs uppercase">
                                    <?= e($ev['severity']) ?>
                                </span>
                            </td>
                            <td class="p-3 font-mono text-muted"><?= e($ev['ip_address']) ?></td>
                            <td class="p-3 text-muted text-xs leading-relaxed"><?= e($ev['details_masked']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" class="text-center p-6 text-muted">No security incidents recorded.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
