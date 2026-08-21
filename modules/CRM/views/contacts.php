<?php
/**
 * OmniDesk AI — Contact Directory View
 *
 * Directory of individual business contacts, executive decision makers, and account representatives.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$contactsList = $contacts ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Contact Header Toolbar ───────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Contacts Directory</h1>
                <span class="badge badge-brand">Stakeholder Roster</span>
            </div>
            <p class="text-muted text-xs">
                Directory of individual business contacts, executive decision makers, and account representatives.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/crm/customers') ?>" class="btn btn-sm btn-secondary">View Customers Directory</a>
        </div>
    </div>
</div>

<!-- ── Contacts Table ────────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Full Name</th>
                <th>Professional Role</th>
                <th>Linked Customer Account</th>
                <th>Email & Direct Phone</th>
                <th>Stakeholder Role</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($contactsList)): ?>
                <?php foreach ($contactsList as $ct): ?>
                    <tr>
                        <td class="font-bold text-main">
                            <?= e($ct['first_name'] . ' ' . $ct['last_name']) ?>
                        </td>
                        <td class="text-muted font-medium"><?= e($ct['job_title'] ?: 'Title N/A') ?></td>
                        <td class="font-semibold text-main"><?= e($ct['company_name'] ?: 'Independent') ?></td>
                        <td>
                            <div class="text-main font-mono text-xs"><?= e($ct['email'] ?: 'N/A') ?></div>
                            <div class="text-2xs text-muted"><?= e($ct['phone'] ?: '') ?></div>
                        </td>
                        <td>
                            <?php if (!empty($ct['is_primary'])): ?>
                                <span class="badge badge-brand text-2xs">Primary Contact</span>
                            <?php else: ?>
                                <span class="badge badge-neutral text-2xs">Secondary</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="5" class="text-center p-8 text-muted">No contacts found in directory.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
