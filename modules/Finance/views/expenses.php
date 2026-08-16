<?php
/**
 * OmniDesk AI — Expenses Directory View (Phase 6)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$expList = $expenses ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Expenses Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Expenses Directory</h1>
            <p class="text-muted text-sm mb-0">Track business expenses, vendor payments, software licensing, and operational costs</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newExpenseModal').classList.add('active')">+ Log Expense</button>
            <a href="<?= url('/finance/vendors') ?>" class="btn btn-secondary text-xs py-1.5 px-3">Vendors Directory</a>
        </div>
    </div>
</div>

<!-- ── Expenses Table ───────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Expense Date</th>
                    <th class="p-3">Description</th>
                    <th class="p-3">Vendor</th>
                    <th class="p-3">Category</th>
                    <th class="p-3">Method</th>
                    <th class="p-3">Amount</th>
                    <th class="p-3">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($expList)): ?>
                    <?php foreach ($expList as $exp): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono text-muted"><?= e($exp['expense_date']) ?></td>
                            <td class="p-3 font-semibold text-main"><?= e($exp['description']) ?></td>
                            <td class="p-3 text-muted"><?= e($exp['vendor_name'] ?: 'General Vendor') ?></td>
                            <td class="p-3 text-muted"><?= e($exp['category_name'] ?: 'Expense') ?></td>
                            <td class="p-3 text-muted capitalize"><?= e($exp['payment_method']) ?></td>
                            <td class="p-3 font-mono font-bold text-danger">-$<?= number_format($exp['amount'], 2) ?></td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($exp['status']) ?></span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="7" class="text-center p-6 text-muted">No business expenses logged yet.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Expense Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newExpenseModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Log Business Expense</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newExpenseModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/finance/expenses/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="exp_desc">Description *</label>
                <input type="text" id="exp_desc" name="description" class="form-input" placeholder="e.g. AWS Monthly Cloud Hosting" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="exp_amt">Amount ($) *</label>
                    <input type="number" id="exp_amt" name="amount" class="form-input" placeholder="500.00" step="0.01" required>
                </div>
                <div>
                    <label class="form-label" for="exp_vendor">Vendor</label>
                    <select id="exp_vendor" name="vendor_id" class="form-input">
                        <option value="">Select Vendor...</option>
                        <?php foreach ($vendors as $v): ?>
                            <option value="<?= e($v['id']) ?>"><?= e($v['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="exp_cat">Category</label>
                    <select id="exp_cat" name="category_id" class="form-input">
                        <option value="">Select Category...</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?= e($cat['id']) ?>"><?= e($cat['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="exp_date">Expense Date</label>
                    <input type="date" id="exp_date" name="expense_date" class="form-input" value="<?= date('Y-m-d') ?>">
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newExpenseModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Expense</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
