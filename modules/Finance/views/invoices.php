<?php
/**
 * OmniDesk AI — Invoices Directory View (Phase 6)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$invList = $result['data'] ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Invoices Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Invoices Directory</h1>
            <p class="text-muted text-sm mb-0">Manage customer invoices, total billing, outstanding balances, and payment collections</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newInvoiceModal').classList.add('active')">+ Create Invoice</button>
        </div>
    </div>
</div>

<!-- ── Search & Filters ─────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/finance/invoices') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search invoice #, customer..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-input text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="sent" <?= ($_GET['status'] ?? '') === 'sent' ? 'selected' : '' ?>>Sent</option>
            <option value="partially_paid" <?= ($_GET['status'] ?? '') === 'partially_paid' ? 'selected' : '' ?>>Partially Paid</option>
            <option value="paid" <?= ($_GET['status'] ?? '') === 'paid' ? 'selected' : '' ?>>Paid</option>
            <option value="overdue" <?= ($_GET['status'] ?? '') === 'overdue' ? 'selected' : '' ?>>Overdue</option>
        </select>

        <button type="submit" class="btn btn-secondary text-xs py-1.5 px-3">Filter</button>
        <a href="<?= url('/finance/invoices') ?>" class="text-xs text-muted">Clear</a>
    </form>
</div>

<!-- ── Invoices Table ───────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Invoice #</th>
                    <th class="p-3">Customer Account</th>
                    <th class="p-3">Issue Date</th>
                    <th class="p-3">Due Date</th>
                    <th class="p-3">Total Amount</th>
                    <th class="p-3">Paid Amount</th>
                    <th class="p-3">Balance Due</th>
                    <th class="p-3">Status</th>
                    <th class="p-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($invList)): ?>
                    <?php foreach ($invList as $inv): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono font-bold text-main">
                                <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="hover:underline">
                                    <?= e($inv['invoice_number']) ?>
                                </a>
                            </td>
                            <td class="p-3 font-medium text-main"><?= e($inv['customer_name']) ?></td>
                            <td class="p-3 text-muted"><?= e($inv['issue_date']) ?></td>
                            <td class="p-3 text-muted"><?= e($inv['due_date']) ?></td>
                            <td class="p-3 font-mono font-bold text-main">$<?= number_format($inv['total_amount'], 2) ?></td>
                            <td class="p-3 font-mono text-success">$<?= number_format($inv['paid_amount'], 2) ?></td>
                            <td class="p-3 font-mono font-bold text-danger">$<?= number_format($inv['balance_due'], 2) ?></td>
                            <td class="p-3">
                                <span class="badge <?= $inv['status'] === 'paid' ? 'badge-success' : ($inv['status'] === 'partially_paid' ? 'badge-warning' : 'badge-secondary') ?> uppercase">
                                    <?= e(str_replace('_', ' ', $inv['status'])) ?>
                                </span>
                            </td>
                            <td class="p-3 text-right">
                                <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="btn btn-secondary text-2xs py-1 px-2">View</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="9" class="text-center p-6 text-muted">No invoices found matching criteria.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Invoice Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newInvoiceModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Generate New Invoice</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newInvoiceModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/invoices/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="inv_cust">Customer Account *</label>
                <select id="inv_cust" name="customer_id" class="form-input" required>
                    <option value="" disabled selected>Select Customer...</option>
                    <?php foreach ($customers as $c): ?>
                        <option value="<?= e($c['id']) ?>"><?= e($c['company_name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label" for="inv_desc">Item Description *</label>
                <input type="text" id="inv_desc" name="item_description" class="form-input" placeholder="e.g. Enterprise Software License & Consultancy" required>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="form-label" for="inv_qty">Quantity</label>
                    <input type="number" id="inv_qty" name="item_quantity" class="form-input" value="1.00" step="0.01">
                </div>
                <div>
                    <label class="form-label" for="inv_price">Unit Price ($) *</label>
                    <input type="number" id="inv_price" name="item_unit_price" class="form-input" placeholder="1000.00" step="0.01" required>
                </div>
                <div>
                    <label class="form-label" for="inv_tax">Tax Rate (%)</label>
                    <input type="number" id="inv_tax" name="item_tax_rate" class="form-input" value="10.00" step="0.01">
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newInvoiceModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Generate Invoice</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
