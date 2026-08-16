<?php
/**
 * OmniDesk AI — System Health & Operations Dashboard View (Phase 11)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$checks = $healthChecks ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Health Dashboard Header Toolbar ──────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">🖥️ System Health & Operations Monitor</h1>
                <span class="badge badge-success">Core Online</span>
            </div>
            <p class="text-muted text-sm mb-0">Real-time Service Diagnostics &bull; MySQL Database Latency &bull; Python AI Gateway &bull; Storage & Authentication</p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/operations/security') ?>" class="btn btn-secondary text-xs py-1.5 px-3">🛡️ Security Logs</a>
            <a href="<?= url('/operations/ai') ?>" class="btn btn-secondary text-xs py-1.5 px-3">⚡ AI Observability</a>
            <a href="<?= url('/operations/audit') ?>" class="btn btn-secondary text-xs py-1.5 px-3">📜 Audit Trail</a>
        </div>
    </div>
</div>

<!-- ── System Services Status Grid ──────────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <?php foreach ($checks as $key => $chk): ?>
        <div class="card p-6 border-l-4 <?= $chk['status'] === 'healthy' ? 'border-success' : ($chk['status'] === 'warning' ? 'border-warning' : 'border-danger') ?>">
            <div class="flex justify-between items-center mb-2">
                <strong class="text-sm text-main"><?= e($chk['service']) ?></strong>
                <span class="badge <?= $chk['status'] === 'healthy' ? 'badge-success' : ($chk['status'] === 'warning' ? 'badge-warning' : 'badge-danger') ?> text-2xs uppercase">
                    <?= e($chk['status']) ?>
                </span>
            </div>
            <p class="text-muted text-xs mb-3 leading-relaxed"><?= e($chk['message']) ?></p>
            <div class="flex justify-between items-center text-2xs text-muted font-mono pt-2 border-t">
                <span>Latency: <?= e($chk['latency']) ?>ms</span>
                <span><?= e($chk['timestamp']) ?></span>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
