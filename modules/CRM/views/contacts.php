<?php
/**
 * OmniDesk AI — Contact Directory View (Phase 4)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$contactsList = $contacts ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Contact Header ────────────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Contacts Directory</h1>
            <p class="text-muted text-sm mb-0">Directory of individual business contacts, executive decision makers, and account representatives</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/crm/customers') ?>" class="btn btn-secondary text-xs py-1.5 px-3">View Customers</a>
        </div>
    </div>
</div>

<!-- ── Contacts Table ────────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase tracking-wider">
                    <th class="p-3">Full Name</th>
                    <th class="p-3">Job Title</th>
                    <th class="p-3">Customer Account</th>
                    <th class="p-3">Email & Phone</th>
                    <th class="p-3">Role</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($contactsList)): ?>
                    <?php foreach ($contactsList as $ct): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main">
                                <?= e($ct['first_name'] . ' ' . $ct['last_name']) ?>
                            </td>
                            <td class="p-3 text-muted"><?= e($ct['job_title'] ?: 'Title N/A') ?></td>
                            <td class="p-3 font-medium text-main"><?= e($ct['company_name'] ?: 'Independent') ?></td>
                            <td class="p-3 text-muted">
                                <div><?= e($ct['email'] ?: 'N/A') ?></div>
                                <div class="text-2xs"><?= e($ct['phone'] ?: '') ?></div>
                            </td>
                            <td class="p-3">
                                <?php if (!empty($ct['is_primary'])): ?>
                                    <span class="badge badge-info text-2xs">Primary Contact</span>
                                <?php else: ?>
                                    <span class="badge badge-secondary text-2xs">Secondary</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" class="text-center p-6 text-muted">No contacts found in directory.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
