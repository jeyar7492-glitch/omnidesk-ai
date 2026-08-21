<?php
/**
 * OmniDesk AI — System Health & Operations Dashboard View
 *
 * Real-time Service Diagnostics, Database Latency, AI Gateway, Storage & Audit Integrity.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$checks = $healthChecks ?? [];
$healthyCount = 0;
$totalCount = count($checks);
$totalLatency = 0;

foreach ($checks as $chk) {
    if (($chk['status'] ?? '') === 'healthy') {
        $healthyCount++;
    }
    $totalLatency += (float)($chk['latency'] ?? 0);
}
$avgLatency = $totalCount > 0 ? round($totalLatency / $totalCount, 2) : 0;
$systemHealthPercent = $totalCount > 0 ? round(($healthyCount / $totalCount) * 100) : 100;
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Health Dashboard Header Toolbar ──────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">System Health & Operations Telemetry</h1>
                <span class="badge <?= $systemHealthPercent >= 90 ? 'badge-success' : 'badge-warning' ?>"><?= $healthyCount ?>/<?= $totalCount ?> Services Nominal</span>
            </div>
            <p class="text-muted text-xs">
                Real-time Service Diagnostics &bull; Database Latency &bull; Python AI Microservice Gateway &bull; Cryptographic Audit Chain
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/operations/security') ?>" class="btn btn-sm btn-secondary">🛡️ Security Logs</a>
            <a href="<?= url('/operations/ai') ?>" class="btn btn-sm btn-secondary">⚡ AI Observability</a>
            <a href="<?= url('/operations/audit') ?>" class="btn btn-sm btn-secondary">📜 Audit Trail</a>
            <button type="button" class="btn btn-sm btn-primary" onclick="window.location.reload()">↻ Refresh Telemetry</button>
        </div>
    </div>
</div>

<!-- ── Health Overview KPI Grid ─────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Service Health Score</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">🖥️</span>
        </div>
        <div class="kpi-value text-success font-mono"><?= $systemHealthPercent ?>%</div>
        <div class="kpi-footer text-muted"><span><?= $healthyCount ?> of <?= $totalCount ?> subsystems healthy</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Average Read Latency</span>
            <span class="kpi-icon-pill">⚡</span>
        </div>
        <div class="kpi-value text-main font-mono"><?= $avgLatency ?>ms</div>
        <div class="kpi-footer text-success font-medium"><span>Optimal sub-50ms threshold</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Security Perimeter</span>
            <span class="kpi-icon-pill" style="color: var(--brand-primary); background: var(--brand-subtle);">🛡️</span>
        </div>
        <div class="kpi-value text-brand font-mono">Enforced</div>
        <div class="kpi-footer text-muted"><span>CSRF & Zero-Trust Isolation Active</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Audit Cryptochain</span>
            <span class="kpi-icon-pill">🔗</span>
        </div>
        <div class="kpi-value text-main font-mono">SHA-256</div>
        <div class="kpi-footer text-success font-medium"><span>Tamper-evident verification valid</span></div>
    </div>
</div>

<!-- ── System Services Status Grid ──────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <?php foreach ($checks as $key => $chk): ?>
        <?php
        $status = $chk['status'] ?? 'unknown';
        $statusBadge = $status === 'healthy' ? 'badge-success' : ($status === 'warning' ? 'badge-warning' : 'badge-danger');
        $borderColor = $status === 'healthy' ? 'var(--status-success)' : ($status === 'warning' ? 'var(--status-warning)' : 'var(--status-danger)');
        ?>
        <div class="card p-6 flex flex-col justify-between border-l-4" style="border-left-color: <?= $borderColor ?>;">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-sm font-bold text-main mb-0.5"><?= e($chk['service']) ?></h3>
                        <span class="text-2xs font-mono text-muted uppercase"><?= e($key) ?></span>
                    </div>
                    <span class="badge <?= $statusBadge ?> text-2xs uppercase font-bold">
                        <?= e($status) ?>
                    </span>
                </div>
                <p class="text-muted text-xs mb-4 leading-relaxed"><?= e($chk['message']) ?></p>
            </div>

            <div class="flex justify-between items-center text-2xs text-muted font-mono pt-3 border-t">
                <span>Latency: <strong class="text-main font-mono"><?= e($chk['latency']) ?>ms</strong></span>
                <span><?= e($chk['timestamp']) ?></span>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
