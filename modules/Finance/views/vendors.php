<?php
/**
 * OmniDesk AI — Vendors Directory View
 *
 * Directory of corporate suppliers, SaaS providers, and third-party vendors.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Vendors & Suppliers Directory</h1>
                <span class="badge badge-brand">Supply Chain</span>
            </div>
            <p class="text-muted text-xs">
                Corporate suppliers, SaaS service providers, external contractors, and verified vendor contacts.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/finance/expenses') ?>" class="btn btn-sm btn-primary">💸 Expenses Log</a>
            <a href="<?= url('/finance/invoices') ?>" class="btn btn-sm btn-secondary">📄 Invoices</a>
        </div>
    </div>
</div>

<!-- ── Vendors Table ────────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Vendor / Contact Name</th>
                <th>Company / Entity</th>
                <th>Email Contact</th>
                <th>Direct Phone</th>
                <th>Compliance Status</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($vendorList)): ?>
                <?php foreach ($vendorList as $v): ?>
                    <tr>
                        <td class="font-bold text-main">
                            <span class="mr-1.5">🏢</span> <?= e($v['name']) ?>
                        </td>
                        <td class="font-semibold text-main"><?= e($v['company_name'] ?: 'N/A') ?></td>
                        <td>
                            <span class="font-mono text-muted text-xs"><?= e($v['email'] ?: 'N/A') ?></span>
                        </td>
                        <td class="text-muted text-xs"><?= e($v['phone'] ?: 'N/A') ?></td>
                        <td>
                            <span class="badge badge-success text-2xs uppercase font-bold">✓ <?= e($v['status']) ?></span>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="5" class="text-center p-8 text-muted">
                        <div class="text-sm font-semibold text-main mb-1">No vendors recorded in repository</div>
                        <div class="text-2xs text-muted">Vendors linked to expense entries will be cataloged here.</div>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
