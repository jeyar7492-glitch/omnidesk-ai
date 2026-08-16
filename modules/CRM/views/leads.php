<?php
/**
 * OmniDesk AI — Leads Directory View (Phase 4)
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
            <h1 class="text-2xl font-bold tracking-tight mb-1">Leads Directory</h1>
            <p class="text-muted text-sm mb-0">Tabular listing of all sales leads, deal values, and current pipeline stages</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-primary text-xs py-1.5 px-3">📊 View Pipeline Kanban</a>
        </div>
    </div>
</div>

<!-- ── Filter Bar ───────────────────────────────────────────────────── -->
<div class="card p-4 mb-6">
    <form action="<?= url('/crm/leads') ?>" method="GET" class="flex items-center gap-3 flex-wrap m-0 text-xs">
        <input type="text" name="search" class="form-input text-xs py-1.5 px-3 w-64" placeholder="Search title, company, email..." value="<?= e($_GET['search'] ?? '') ?>">

        <select name="stage" class="form-input text-xs py-1.5 px-3 w-auto">
            <option value="">All Stages</option>
            <option value="new_lead" <?= ($_GET['stage'] ?? '') === 'new_lead' ? 'selected' : '' ?>>New Lead</option>
            <option value="qualified" <?= ($_GET['stage'] ?? '') === 'qualified' ? 'selected' : '' ?>>Qualified</option>
            <option value="proposal" <?= ($_GET['stage'] ?? '') === 'proposal' ? 'selected' : '' ?>>Proposal</option>
            <option value="negotiation" <?= ($_GET['stage'] ?? '') === 'negotiation' ? 'selected' : '' ?>>Negotiation</option>
            <option value="won" <?= ($_GET['stage'] ?? '') === 'won' ? 'selected' : '' ?>>Closed Won</option>
            <option value="lost" <?= ($_GET['stage'] ?? '') === 'lost' ? 'selected' : '' ?>>Closed Lost</option>
        </select>

        <button type="submit" class="btn btn-secondary text-xs py-1.5 px-3">Filter</button>
        <a href="<?= url('/crm/leads') ?>" class="text-xs text-muted">Clear</a>
    </form>
</div>

<!-- ── Leads Table ──────────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase tracking-wider">
                    <th class="p-3">Deal Title</th>
                    <th class="p-3">Company / Contact</th>
                    <th class="p-3">Value</th>
                    <th class="p-3">Stage</th>
                    <th class="p-3">Priority</th>
                    <th class="p-3">Owner</th>
                    <th class="p-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($leads)): ?>
                    <?php foreach ($leads as $l): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main">
                                <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="hover:underline text-main">
                                    <?= e($l['title']) ?>
                                </a>
                            </td>
                            <td class="p-3 text-muted">
                                <div><?= e($l['company_name'] ?: 'N/A') ?></div>
                                <div class="text-2xs"><?= e($l['contact_name'] ?: '') ?></div>
                            </td>
                            <td class="p-3 font-mono font-bold text-brand">$<?= number_format($l['estimated_value'], 2) ?></td>
                            <td class="p-3">
                                <span class="badge badge-info capitalize"><?= e(str_replace('_', ' ', $l['stage'])) ?></span>
                            </td>
                            <td class="p-3">
                                <span class="badge <?= $l['priority'] === 'urgent' ? 'badge-danger' : ($l['priority'] === 'high' ? 'badge-warning' : 'badge-secondary') ?> uppercase">
                                    <?= e($l['priority']) ?>
                                </span>
                            </td>
                            <td class="p-3 text-muted"><?= e($l['owner_name'] ?: 'Unassigned') ?></td>
                            <td class="p-3 text-right">
                                <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="btn btn-secondary text-2xs py-1 px-2">View Deal</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="7" class="text-center p-6 text-muted">No sales leads found matching criteria.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
