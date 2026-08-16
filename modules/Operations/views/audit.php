<?php
/**
 * OmniDesk AI — Enterprise Audit Trail View (Phase 11)
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
            <h1 class="text-2xl font-bold tracking-tight mb-1">📜 Enterprise Audit Trail</h1>
            <p class="text-muted text-sm mb-0">Immutable Record of User Actions, Financial Transactions, CRM Conversions & AI Executions</p>
        </div>
    </div>
</div>

<!-- ── Audit Trail Table ────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Timestamp</th>
                    <th class="p-3">Action Type</th>
                    <th class="p-3">Entity / Target</th>
                    <th class="p-3">User</th>
                    <th class="p-3">Details</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($logList)): ?>
                    <?php foreach ($logList as $l): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono text-muted"><?= e($l['created_at']) ?></td>
                            <td class="p-3 font-bold text-brand font-mono"><?= e($l['action']) ?></td>
                            <td class="p-3 font-semibold text-main"><?= e($l['entity_type']) ?> #<?= e($l['entity_id'] ?? '-') ?></td>
                            <td class="p-3 text-muted"><?= e($l['user_name'] ?? 'System User') ?></td>
                            <td class="p-3 text-muted text-xs"><?= e($l['details'] ?? 'Action executed') ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" class="text-center p-6 text-muted">No audit trail entries recorded.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
