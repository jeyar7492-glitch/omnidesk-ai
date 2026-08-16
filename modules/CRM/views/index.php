<?php
/**
 * OmniDesk AI — CRM Overview Dashboard View (Phase 4)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$sum = $summary ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── CRM Header & Navigation Tabs ──────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">CRM & Sales Management</h1>
                <span class="badge badge-success">Workspace Active</span>
            </div>
            <p class="text-muted text-sm mb-0">Customer Relationship Management, Leads Pipeline, and Deal Tracking</p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-primary text-xs py-1.5 px-3">📊 Pipeline Kanban</a>
            <a href="<?= url('/crm/customers') ?>" class="btn btn-secondary text-xs py-1.5 px-3">🏢 Customers Directory</a>
            <a href="<?= url('/crm/contacts') ?>" class="btn btn-secondary text-xs py-1.5 px-3">👥 Contacts</a>
            <a href="<?= url('/crm/leads') ?>" class="btn btn-secondary text-xs py-1.5 px-3">🎯 All Leads</a>
        </div>
    </div>
</div>

<!-- ── CRM KPI Metric Cards ─────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Total Pipeline Value</div>
        <div class="text-2xl font-bold text-main mb-1">$<?= number_format($sum['total_value'] ?? 0, 2) ?></div>
        <div class="text-xs text-muted"><?= e($sum['total_leads'] ?? 0) ?> Total Deals</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Weighted Pipeline</div>
        <div class="text-2xl font-bold text-brand mb-1">$<?= number_format($sum['weighted_value'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium">Probability Weighted</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Deals Won Value</div>
        <div class="text-2xl font-bold text-success mb-1">$<?= number_format($sum['won_value'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium">Closed Won</div>
    </div>

    <div class="card p-4">
        <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Conversion Rate</div>
        <div class="text-2xl font-bold text-main mb-1"><?= e($sum['conversion_rate'] ?? 0) ?>%</div>
        <div class="text-xs text-muted">Lead to Customer Ratio</div>
    </div>
</div>

<!-- ── Pipeline Stages Breakdown Row ──────────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">
    <!-- Pipeline Stage Distribution -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Pipeline Stage Distribution</h3>
        <div class="space-y-3 text-xs">
            <?php
            $stageNames = [
                'new_lead' => 'New Lead In', 'qualified' => 'Qualified Prospect',
                'proposal' => 'Proposal Out', 'negotiation' => 'In Negotiation',
                'won' => 'Closed Won', 'lost' => 'Closed Lost'
            ];
            foreach ($sum['stages'] ?? [] as $sKey => $stgData):
            ?>
                <div class="p-2.5 rounded bg-surface-subtle border flex justify-between items-center">
                    <div>
                        <div class="font-medium text-main"><?= e($stageNames[$sKey] ?? $sKey) ?></div>
                        <div class="text-muted text-xs"><?= e($stgData['count']) ?> Deals</div>
                    </div>
                    <div class="font-mono font-semibold">$<?= number_format($stgData['value'], 0) ?></div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Quick New Lead Form Card -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Add Lead to Pipeline</h3>
        <form action="<?= url('/crm/leads/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="l_title">Deal Title *</label>
                <input type="text" id="l_title" name="title" class="form-input" placeholder="e.g. Enterprise Cloud License Renewal" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="l_cname">Company Name</label>
                    <input type="text" id="l_cname" name="company_name" class="form-input" placeholder="Company...">
                </div>
                <div>
                    <label class="form-label" for="l_val">Estimated Value ($)</label>
                    <input type="number" id="l_val" name="estimated_value" class="form-input" placeholder="50000" step="100">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="l_stage">Stage</label>
                    <select id="l_stage" name="stage" class="form-input">
                        <option value="new_lead">New Lead</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="l_pri">Priority</label>
                    <select id="l_pri" name="priority" class="form-input">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            <div class="pt-2 text-right">
                <button type="submit" class="btn btn-primary text-xs py-2 px-4">+ Create Deal Entry</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
