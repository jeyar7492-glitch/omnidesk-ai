<?php
/**
 * OmniDesk AI — Enterprise Audit Trail View
 *
 * Immutable Record of User Actions, Financial Transactions, CRM Conversions & AI Executions.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$logList = $logs ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Audit Trail Header Toolbar ───────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Immutable Enterprise Audit Trail</h1>
                <span class="badge badge-brand">Cryptographic Ledger</span>
            </div>
            <p class="text-muted text-xs">
                Tamper-evident record of user operations, financial write transactions, CRM conversions, and AI executions.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/operations/health') ?>" class="btn btn-sm btn-secondary">🖥️ System Health</a>
            <a href="<?= url('/operations/security') ?>" class="btn btn-sm btn-secondary">🛡️ Security Logs</a>
            <a href="<?= url('/operations/ai') ?>" class="btn btn-sm btn-secondary">⚡ AI Observability</a>
        </div>
    </div>
</div>

<!-- ── Audit Trail Table ────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Action Identifier</th>
                <th>Target Resource</th>
                <th>Actor / Identity</th>
                <th>Audit Context Details</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($logList)): ?>
                <?php foreach ($logList as $l): ?>
                    <tr>
                        <td class="font-mono text-muted text-xs whitespace-nowrap"><?= e($l['created_at']) ?></td>
                        <td>
                            <span class="badge badge-brand font-mono uppercase text-2xs"><?= e($l['action']) ?></span>
                        </td>
                        <td class="font-semibold text-main text-xs">
                            <?= e($l['entity_type']) ?> <span class="font-mono text-muted">#<?= e($l['entity_id'] ?? '-') ?></span>
                        </td>
                        <td class="text-main font-medium text-xs">
                            <span class="mr-1">👤</span> <?= e($l['user_name'] ?? 'System Daemon') ?>
                        </td>
                        <td class="text-muted text-xs max-w-lg leading-relaxed"><?= e($l['details'] ?? 'Operation committed.') ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="5" class="text-center p-8 text-muted">
                        <div class="text-sm font-semibold text-main mb-1">No audit trail records found</div>
                        <div class="text-2xs text-muted">All system actions will appear here in chronological order.</div>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
