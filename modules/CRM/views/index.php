<?php
/**
 * OmniDesk AI — CRM Sales Management & Pipeline Overview
 *
 * Enterprise sales hub: Pipeline health metrics, conversion ratios,
 * stage breakdown, and quick deal intake.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">CRM & Customer Accounts</h1>
                <span class="badge badge-brand">Sales Engine</span>
            </div>
            <p class="text-muted text-xs">
                Pipeline Lifecycle Governance &bull; Opportunity Velocity &bull; Customer Directory &bull; Enterprise Deal Flow
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-sm btn-primary">📊 Pipeline Kanban</a>
            <a href="<?= url('/crm/customers') ?>" class="btn btn-sm btn-secondary">🏢 Customers Directory</a>
            <a href="<?= url('/crm/contacts') ?>" class="btn btn-sm btn-secondary">👥 Contacts</a>
            <a href="<?= url('/crm/leads') ?>" class="btn btn-sm btn-secondary">🎯 All Leads</a>
        </div>
    </div>
</div>

<!-- ── 4 CRM KPI Cards ──────────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Gross Pipeline</span>
            <span class="kpi-icon-pill">💰</span>
        </div>
        <div class="kpi-value text-main font-mono">$<?= number_format($sum['total_value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-muted"><span><?= e($sum['total_leads'] ?? 0) ?> Total Active Deals</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Weighted Pipeline</span>
            <span class="kpi-icon-pill">📈</span>
        </div>
        <div class="kpi-value text-brand font-mono">$<?= number_format($sum['weighted_value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium"><span>Probability-Adjusted</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Closed Won Revenue</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">🏆</span>
        </div>
        <div class="kpi-value text-success font-mono">$<?= number_format($sum['won_value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium"><span>Converted Contracts</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Conversion Rate</span>
            <span class="kpi-icon-pill">⚡</span>
        </div>
        <div class="kpi-value text-main font-mono"><?= e($sum['conversion_rate'] ?? 0) ?>%</div>
        <div class="kpi-footer text-muted"><span>Lead to Customer Velocity</span></div>
    </div>
</div>

<!-- ── Stage Breakdown & Quick Deal Entry ────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">

    <!-- Stage Breakdown -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Pipeline Stage Distribution</h2>
            <span class="badge badge-neutral">Stage Funnel</span>
        </div>
        <div class="space-y-2.5 text-xs">
            <?php
            $stageNames = [
                'new_lead'    => 'New Inbound Lead',
                'qualified'   => 'Qualified Opportunity',
                'proposal'    => 'Proposal Delivered',
                'negotiation' => 'Contract Negotiation',
                'won'         => 'Closed Won',
                'lost'        => 'Closed Lost'
            ];
            foreach ($sum['stages'] ?? [] as $sKey => $stgData):
            ?>
                <div class="p-3 rounded-lg bg-surface-subtle border flex justify-between items-center">
                    <div>
                        <div class="font-semibold text-main"><?= e($stageNames[$sKey] ?? $sKey) ?></div>
                        <div class="text-muted text-xs"><?= e($stgData['count']) ?> Deals in Stage</div>
                    </div>
                    <div class="font-mono font-bold text-main">$<?= number_format($stgData['value'], 0) ?></div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Quick Deal Entry Form -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Create Sales Opportunity</h2>
            <span class="badge badge-brand">Instant Intake</span>
        </div>
        <form action="<?= url('/crm/leads/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="l_title">Deal Title *</label>
                <input type="text" id="l_title" name="title" class="form-input" placeholder="e.g. Enterprise Cloud License Renewal" required>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="l_cname">Account / Company</label>
                    <input type="text" id="l_cname" name="company_name" class="form-input" placeholder="Acme Corp">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="l_val">Estimated Value ($)</label>
                    <input type="number" id="l_val" name="estimated_value" class="form-input" placeholder="50000" step="100">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="l_stage">Pipeline Stage</label>
                    <select id="l_stage" name="stage" class="form-select">
                        <option value="new_lead">New Lead</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="l_pri">Priority Tier</label>
                    <select id="l_pri" name="priority" class="form-select">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            <div class="pt-2 text-right">
                <button type="submit" class="btn btn-sm btn-primary">+ Create Sales Deal</button>
            </div>
        </form>
    </div>

</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
