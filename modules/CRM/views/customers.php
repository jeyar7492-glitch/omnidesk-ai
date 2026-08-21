<?php
/**
 * OmniDesk AI — Customer Directory View
 *
 * Manage enterprise customer accounts, organization profiles, and account owners.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Customer Accounts Directory</h1>
                <span class="badge badge-brand">Accounts Master</span>
            </div>
            <p class="text-muted text-xs">
                Manage organization relationships, commercial contracts, account ownership, and primary communications.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newCustomerModal').classList.add('active')">+ Add Account</button>
            <a href="<?= url('/crm/contacts') ?>" class="btn btn-sm btn-secondary">View Contacts</a>
        </div>
    </div>
</div>

<!-- ── Search & Filter Bar ─────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/crm/customers') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search company, email, phone..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-select text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="active" <?= ($_GET['status'] ?? '') === 'active' ? 'selected' : '' ?>>Active</option>
            <option value="prospect" <?= ($_GET['status'] ?? '') === 'prospect' ? 'selected' : '' ?>>Prospect</option>
            <option value="inactive" <?= ($_GET['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Inactive</option>
        </select>

        <button type="submit" class="btn btn-sm btn-secondary">Filter</button>
        <a href="<?= url('/crm/customers') ?>" class="text-xs text-muted hover:underline ml-1">Clear Filters</a>
    </form>
</div>

<!-- ── Customer Directory Table ────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Company Name</th>
                <th>Classification / Industry</th>
                <th>Contact Telemetry</th>
                <th>Account Status</th>
                <th>Account Owner</th>
                <th class="text-right">Actions</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($customers)): ?>
                <?php foreach ($customers as $c): ?>
                    <tr>
                        <td>
                            <a href="<?= url('/crm/customers/show?id=' . $c['id']) ?>" class="font-bold text-main hover:underline">
                                <?= e($c['company_name']) ?>
                            </a>
                        </td>
                        <td>
                            <span class="capitalize font-medium text-main"><?= e($c['type']) ?></span> &bull; <span class="text-muted"><?= e($c['industry'] ?: 'General') ?></span>
                        </td>
                        <td>
                            <div class="text-main font-medium"><?= e($c['email'] ?: 'N/A') ?></div>
                            <div class="text-2xs text-muted"><?= e($c['phone'] ?: '') ?></div>
                        </td>
                        <td>
                            <span class="badge <?= $c['status'] === 'active' ? 'badge-success' : ($c['status'] === 'prospect' ? 'badge-warning' : 'badge-danger') ?> capitalize">
                                <?= e($c['status']) ?>
                            </span>
                        </td>
                        <td class="text-muted font-medium"><?= e($c['owner_name'] ?: 'Unassigned') ?></td>
                        <td class="text-right">
                            <a href="<?= url('/crm/customers/show?id=' . $c['id']) ?>" class="btn btn-sm btn-secondary">View Account</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="6" class="text-center p-8 text-muted">No customer accounts found matching criteria.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Customer Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newCustomerModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Add Customer Account</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newCustomerModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/crm/customers/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="nc_comp">Company Name *</label>
                <input type="text" id="nc_comp" name="company_name" class="form-input" placeholder="e.g. Apex Dynamics International" required>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="nc_email">Email Address</label>
                    <input type="email" id="nc_email" name="email" class="form-input" placeholder="billing@company.com">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="nc_phone">Phone Number</label>
                    <input type="text" id="nc_phone" name="phone" class="form-input" placeholder="+1 (555) 000-0000">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="nc_type">Account Type</label>
                    <select id="nc_type" name="type" class="form-select">
                        <option value="enterprise">Enterprise</option>
                        <option value="business">Business</option>
                        <option value="startup">Startup</option>
                        <option value="individual">Individual</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="nc_ind">Industry</label>
                    <input type="text" id="nc_ind" name="industry" class="form-input" placeholder="Technology / SaaS">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newCustomerModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Create Account</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
