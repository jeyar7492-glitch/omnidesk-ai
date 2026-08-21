<?php
/**
 * OmniDesk AI — CRM Leads Directory View
 *
 * Tabular listing of all sales leads, deal values, and current pipeline stages.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Leads Header Toolbar ─────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Sales Leads Directory</h1>
                <span class="badge badge-brand">All Accounts</span>
            </div>
            <p class="text-muted text-xs">
                Comprehensive directory of prospect deals, valuations, stage classifications, and relationship owners.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-sm btn-primary">📊 View Pipeline Kanban</a>
        </div>
    </div>
</div>

<!-- ── Filter Bar ───────────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/crm/leads') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search title, company, contact..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="stage" class="form-select text-xs py-1.5 px-3 w-auto">
            <option value="">All Stages</option>
            <option value="new_lead" <?= ($_GET['stage'] ?? '') === 'new_lead' ? 'selected' : '' ?>>New Lead</option>
            <option value="qualified" <?= ($_GET['stage'] ?? '') === 'qualified' ? 'selected' : '' ?>>Qualified</option>
            <option value="proposal" <?= ($_GET['stage'] ?? '') === 'proposal' ? 'selected' : '' ?>>Proposal</option>
            <option value="negotiation" <?= ($_GET['stage'] ?? '') === 'negotiation' ? 'selected' : '' ?>>Negotiation</option>
            <option value="won" <?= ($_GET['stage'] ?? '') === 'won' ? 'selected' : '' ?>>Closed Won</option>
            <option value="lost" <?= ($_GET['stage'] ?? '') === 'lost' ? 'selected' : '' ?>>Closed Lost</option>
        </select>

        <button type="submit" class="btn btn-sm btn-secondary">Filter</button>
        <a href="<?= url('/crm/leads') ?>" class="text-xs text-muted hover:underline ml-1">Clear Filters</a>
    </form>
</div>

<!-- ── Leads Table ──────────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Deal Title</th>
                <th>Company / Account</th>
                <th>Estimated Value</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Deal Owner</th>
                <th class="text-right">Action</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($leads)): ?>
                <?php foreach ($leads as $l): ?>
                    <tr>
                        <td>
                            <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="font-bold text-main hover:underline">
                                <?= e($l['title']) ?>
                            </a>
                        </td>
                        <td>
                            <div class="font-semibold text-main"><?= e($l['company_name'] ?: 'N/A') ?></div>
                            <div class="text-muted text-2xs"><?= e($l['contact_name'] ?: '') ?></div>
                        </td>
                        <td class="font-mono font-bold text-brand">$<?= number_format($l['estimated_value'], 2) ?></td>
                        <td>
                            <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $l['stage'])) ?></span>
                        </td>
                        <td>
                            <span class="badge <?= $l['priority'] === 'urgent' ? 'badge-danger' : ($l['priority'] === 'high' ? 'badge-warning' : 'badge-neutral') ?> uppercase">
                                <?= e($l['priority']) ?>
                            </span>
                        </td>
                        <td class="text-muted font-medium"><?= e($l['owner_name'] ?: 'Unassigned') ?></td>
                        <td class="text-right">
                            <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="btn btn-sm btn-secondary">View Deal</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="7" class="text-center p-8 text-muted">No sales leads found matching criteria.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
