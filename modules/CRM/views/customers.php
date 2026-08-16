<?php
/**
 * OmniDesk AI — Customer Directory View (Phase 4)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$customers = $result['data'] ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Customer Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Customer Directory</h1>
            <p class="text-muted text-sm mb-0">Manage enterprise customer accounts, organization profiles, and account owners</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newCustomerModal').classList.add('active')">+ Add Customer Account</button>
            <a href="<?= url('/crm/contacts') ?>" class="btn btn-secondary text-xs py-1.5 px-3">View Contacts</a>
        </div>
    </div>
</div>

<!-- ── Search & Filter Bar ─────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/crm/customers') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search company, email, phone..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-input text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="active" <?= ($_GET['status'] ?? '') === 'active' ? 'selected' : '' ?>>Active</option>
            <option value="prospect" <?= ($_GET['status'] ?? '') === 'prospect' ? 'selected' : '' ?>>Prospect</option>
            <option value="inactive" <?= ($_GET['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Inactive</option>
        </select>

        <button type="submit" class="btn btn-secondary text-xs py-1.5 px-3">Filter</button>
        <a href="<?= url('/crm/customers') ?>" class="text-xs text-muted">Clear</a>
    </form>
</div>

<!-- ── Customer Directory Table ────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase tracking-wider">
                    <th class="p-3">Company Name</th>
                    <th class="p-3">Type / Industry</th>
                    <th class="p-3">Email & Phone</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Account Owner</th>
                    <th class="p-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($customers)): ?>
                    <?php foreach ($customers as $c): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main">
                                <a href="<?= url('/crm/customers/show?id=' . $c['id']) ?>" class="hover:underline text-main">
                                    <?= e($c['company_name']) ?>
                                </a>
                            </td>
                            <td class="p-3 text-muted">
                                <span class="capitalize"><?= e($c['type']) ?></span> &bull; <?= e($c['industry'] ?: 'N/A') ?>
                            </td>
                            <td class="p-3 text-muted">
                                <div><?= e($c['email'] ?: 'N/A') ?></div>
                                <div class="text-2xs"><?= e($c['phone'] ?: '') ?></div>
                            </td>
                            <td class="p-3">
                                <span class="badge <?= $c['status'] === 'active' ? 'badge-success' : ($c['status'] === 'prospect' ? 'badge-warning' : 'badge-danger') ?> capitalize">
                                    <?= e($c['status']) ?>
                                </span>
                            </td>
                            <td class="p-3 text-muted"><?= e($c['owner_name'] ?: 'Unassigned') ?></td>
                            <td class="p-3 text-right">
                                <a href="<?= url('/crm/customers/show?id=' . $c['id']) ?>" class="btn btn-secondary text-2xs py-1 px-2">View Profile</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="6" class="text-center p-6 text-muted">No customer accounts found matching criteria.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Customer Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newCustomerModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Add New Customer Account</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newCustomerModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/crm/customers/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="c_cname">Company / Organization Name *</label>
                <input type="text" id="c_cname" name="company_name" class="form-input" placeholder="e.g. Acme Corp" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="c_type">Account Type</label>
                    <select id="c_type" name="type" class="form-input">
                        <option value="company">Company</option>
                        <option value="individual">Individual</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="c_ind">Industry</label>
                    <input type="text" id="c_ind" name="industry" class="form-input" placeholder="Technology, Defense...">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="c_email">Primary Email</label>
                    <input type="email" id="c_email" name="email" class="form-input" placeholder="contact@company.com">
                </div>
                <div>
                    <label class="form-label" for="c_phone">Phone Number</label>
                    <input type="text" id="c_phone" name="phone" class="form-input" placeholder="+1-555-0100">
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newCustomerModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Account</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
