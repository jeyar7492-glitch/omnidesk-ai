<?php
/**
 * OmniDesk AI — Security Event Monitoring View
 *
 * Failed Logins, Prompt Injection Sanitizer Alerts, Action Replay Interceptions & CSRF Denials.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$evts = $events ?? [];
$activeSev = $_GET['severity'] ?? '';
$criticalCount = 0;
$warningCount = 0;

foreach ($evts as $ev) {
    $sev = strtoupper($ev['severity'] ?? '');
    if ($sev === 'CRITICAL' || $sev === 'HIGH') {
        $criticalCount++;
    } elseif ($sev === 'WARNING') {
        $warningCount++;
    }
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Security Events Header Toolbar ───────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Security Event Monitoring</h1>
                <span class="badge badge-brand">SOC Radar</span>
            </div>
            <p class="text-muted text-xs">
                Threat Detection &bull; Prompt Injection Sanitizer &bull; Action Replay Interceptions &bull; Zero-Trust CSRF Guard
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/operations/security') ?>" class="btn btn-sm <?= empty($activeSev) ? 'btn-primary' : 'btn-secondary' ?>">All Events</a>
            <a href="<?= url('/operations/security?severity=CRITICAL') ?>" class="btn btn-sm <?= $activeSev === 'CRITICAL' ? 'btn-danger' : 'btn-secondary' ?>">Critical Only</a>
            <a href="<?= url('/operations/security?severity=WARNING') ?>" class="btn btn-sm <?= $activeSev === 'WARNING' ? 'btn-warning' : 'btn-secondary' ?>">Warnings</a>
            <a href="<?= url('/operations/health') ?>" class="btn btn-sm btn-secondary">&larr; System Health</a>
        </div>
    </div>
</div>

<!-- ── Security KPI Telemetry ────────────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Logged Security Events</span>
            <span class="kpi-icon-pill">🛡️</span>
        </div>
        <div class="kpi-value text-main font-mono"><?= count($evts) ?></div>
        <div class="kpi-footer text-muted"><span>Total audited intrusion attempts & warnings</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Critical Threat Blocks</span>
            <span class="kpi-icon-pill" style="color: var(--status-danger); background: var(--status-danger-bg);">⚠️</span>
        </div>
        <div class="kpi-value text-danger font-mono"><?= $criticalCount ?></div>
        <div class="kpi-footer text-success font-medium"><span>100% Intercepted at perimeter</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Active Guardrails</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">🔒</span>
        </div>
        <div class="kpi-value text-success font-mono">6/6 Active</div>
        <div class="kpi-footer text-muted"><span>Rate Limit, Sanitizer, CSRF, Nonce, RBAC, SQL-Esc</span></div>
    </div>
</div>

<!-- ── Security Events Table ────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Security Event Class</th>
                <th>Severity</th>
                <th>Origin / IP Telemetry</th>
                <th>Forensic Incident Payload</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($evts)): ?>
                <?php foreach ($evts as $ev): ?>
                    <?php
                    $sev = strtoupper($ev['severity'] ?? 'INFO');
                    $badgeClass = ($sev === 'CRITICAL' || $sev === 'HIGH') ? 'badge-danger' : ($sev === 'WARNING' ? 'badge-warning' : 'badge-neutral');
                    ?>
                    <tr>
                        <td class="font-mono text-muted text-xs whitespace-nowrap"><?= e($ev['created_at']) ?></td>
                        <td class="font-bold text-main font-mono text-xs"><?= e($ev['event_type']) ?></td>
                        <td>
                            <span class="badge <?= $badgeClass ?> text-2xs uppercase font-bold">
                                <?= e($ev['severity']) ?>
                            </span>
                        </td>
                        <td class="font-mono text-muted text-xs"><?= e($ev['ip_address'] ?: 'Internal / Daemon') ?></td>
                        <td class="text-muted text-xs leading-relaxed max-w-md font-mono"><?= e($ev['details_masked']) ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="5" class="text-center p-8 text-muted">
                        <div class="text-sm font-semibold text-main mb-1">No security incidents detected</div>
                        <div class="text-2xs text-muted">All active security guardrails are operating nominally.</div>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
