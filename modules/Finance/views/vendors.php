<?php
/**
 * OmniDesk AI — Vendors Directory View (Phase 6)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$vendorList = $vendors ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Vendors Header Toolbar ───────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Vendors Directory</h1>
            <p class="text-muted text-sm mb-0">Directory of corporate suppliers, SaaS providers, and third-party vendors</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/finance/expenses') ?>" class="btn btn-secondary text-xs py-1.5 px-3">View Expenses</a>
        </div>
    </div>
</div>

<!-- ── Vendors Table ────────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Vendor Name</th>
                    <th class="p-3">Company Name</th>
                    <th class="p-3">Email Address</th>
                    <th class="p-3">Phone</th>
                    <th class="p-3">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($vendorList)): ?>
                    <?php foreach ($vendorList as $v): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main"><?= e($v['name']) ?></td>
                            <td class="p-3 text-muted"><?= e($v['company_name'] ?: 'N/A') ?></td>
                            <td class="p-3 text-muted"><?= e($v['email'] ?: 'N/A') ?></td>
                            <td class="p-3 text-muted"><?= e($v['phone'] ?: 'N/A') ?></td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($v['status']) ?></span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" class="text-center p-6 text-muted">No vendors recorded in repository.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
