<?php
/**
 * OmniDesk AI — Invoices Directory View
 *
 * Manage customer invoices, total billing, outstanding balances, and payment collections.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Invoices & Receivables Directory</h1>
                <span class="badge badge-brand">Accounts Receivable</span>
            </div>
            <p class="text-muted text-xs">
                Manage customer billing records, issue formal invoices, track balances due, and register payment settlements.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newInvoiceModal').classList.add('active')">+ Create Invoice</button>
        </div>
    </div>
</div>

<!-- ── Search & Filters ─────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/finance/invoices') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search invoice #, customer..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="status" class="form-select text-xs py-1.5 px-3 w-auto">
            <option value="">All Statuses</option>
            <option value="sent" <?= ($_GET['status'] ?? '') === 'sent' ? 'selected' : '' ?>>Sent</option>
            <option value="partially_paid" <?= ($_GET['status'] ?? '') === 'partially_paid' ? 'selected' : '' ?>>Partially Paid</option>
            <option value="paid" <?= ($_GET['status'] ?? '') === 'paid' ? 'selected' : '' ?>>Paid</option>
            <option value="overdue" <?= ($_GET['status'] ?? '') === 'overdue' ? 'selected' : '' ?>>Overdue</option>
        </select>

        <button type="submit" class="btn btn-sm btn-secondary">Filter</button>
        <a href="<?= url('/finance/invoices') ?>" class="text-xs text-muted hover:underline ml-1">Clear</a>
    </form>
</div>

<!-- ── Invoices Table ───────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Invoice #</th>
                <th>Customer Account</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total Billed</th>
                <th>Paid Amount</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($invList)): ?>
                <?php foreach ($invList as $inv): ?>
                    <tr>
                        <td class="font-mono font-bold text-main">
                            <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="hover:underline">
                                <?= e($inv['invoice_number']) ?>
                            </a>
                        </td>
                        <td class="font-semibold text-main"><?= e($inv['customer_name']) ?></td>
                        <td class="text-muted font-mono text-xs"><?= e($inv['issue_date']) ?></td>
                        <td class="text-muted font-mono text-xs"><?= e($inv['due_date']) ?></td>
                        <td class="font-mono font-bold text-main">$<?= number_format($inv['total_amount'], 2) ?></td>
                        <td class="font-mono text-success font-semibold">$<?= number_format($inv['paid_amount'], 2) ?></td>
                        <td class="font-mono font-bold <?= (float)$inv['balance_due'] > 0 ? 'text-warning' : 'text-muted' ?>">$<?= number_format($inv['balance_due'], 2) ?></td>
                        <td>
                            <span class="badge <?= $inv['status'] === 'paid' ? 'badge-success' : ($inv['status'] === 'partially_paid' ? 'badge-warning' : 'badge-neutral') ?> uppercase">
                                <?= e(str_replace('_', ' ', $inv['status'])) ?>
                            </span>
                        </td>
                        <td class="text-right">
                            <a href="<?= url('/finance/invoices/show?id=' . $inv['id']) ?>" class="btn btn-sm btn-secondary">View Invoice</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="9" class="text-center p-8 text-muted">No invoices found matching criteria.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Invoice Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newInvoiceModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Issue Financial Invoice</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newInvoiceModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/invoices/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="ni_cust">Customer Account *</label>
                    <input type="text" id="ni_cust" name="customer_name" class="form-input" placeholder="e.g. Apex Dynamics Corp" required>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="ni_amount">Invoice Amount ($) *</label>
                    <input type="number" id="ni_amount" name="total_amount" class="form-input" placeholder="25000.00" step="0.01" required>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="ni_issue">Issue Date</label>
                    <input type="date" id="ni_issue" name="issue_date" class="form-input" value="<?= date('Y-m-d') ?>">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="ni_due">Payment Due Date</label>
                    <input type="date" id="ni_due" name="due_date" class="form-input" value="<?= date('Y-m-d', strtotime('+30 days')) ?>">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newInvoiceModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Issue Invoice</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
