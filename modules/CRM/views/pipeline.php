<?php
/**
 * OmniDesk AI — CRM Sales Pipeline Kanban View
 *
 * 6-stage interactive deal board with drag & drop AJAX stage updates.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$sum = $summary ?? [];
$kb  = $kanban ?? [];

$stagesConfig = [
    'new_lead'    => ['title' => 'New Inbound',   'color' => 'var(--text-muted)'],
    'qualified'   => ['title' => 'Qualified',     'color' => 'var(--brand-primary)'],
    'proposal'    => ['title' => 'Proposal Out',  'color' => 'var(--status-info)'],
    'negotiation' => ['title' => 'Negotiation',   'color' => 'var(--status-warning)'],
    'won'         => ['title' => 'Closed Won',    'color' => 'var(--status-success)'],
    'lost'        => ['title' => 'Closed Lost',   'color' => 'var(--status-danger)'],
];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Pipeline Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Sales Pipeline Kanban</h1>
                <span class="badge badge-brand">6 Active Stages</span>
            </div>
            <p class="text-muted text-xs">
                Total Pipeline Volume: <strong class="text-main font-mono">$<?= number_format($sum['total_value'] ?? 0, 2) ?></strong>
                &bull; Weighted Value: <strong class="text-brand font-mono">$<?= number_format($sum['weighted_value'] ?? 0, 2) ?></strong>
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newLeadModal').classList.add('active')">+ Add Deal</button>
            <a href="<?= url('/crm/leads') ?>" class="btn btn-sm btn-secondary">List View</a>
        </div>
    </div>
</div>

<!-- ── 6-Column Kanban Board ────────────────────────────────────────── -->
<div class="kanban-board grid grid-cols-6 gap-4 overflow-x-auto pb-6" style="min-height: 520px;">
    <?php foreach ($stagesConfig as $sKey => $sConf): ?>
        <?php
        $stageLeads = $kb[$sKey] ?? [];
        $stageTotal = 0.0;
        foreach ($stageLeads as $sl) { $stageTotal += (float)$sl['estimated_value']; }
        ?>
        <div class="kanban-column bg-surface-subtle p-3.5 rounded-xl border flex flex-col" data-stage="<?= e($sKey) ?>" style="min-width: 220px;">

            <!-- Column Header -->
            <div class="border-b pb-2.5 mb-3 flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-xs uppercase tracking-wider text-main mb-0.5"><?= e($sConf['title']) ?></h4>
                    <span class="text-2xs text-muted font-mono font-semibold">$<?= number_format($stageTotal, 0) ?></span>
                </div>
                <span class="badge badge-neutral text-2xs font-bold"><?= count($stageLeads) ?></span>
            </div>

            <!-- Column Cards Container -->
            <div class="kanban-cards space-y-3 flex-1 overflow-y-auto" id="stage_col_<?= e($sKey) ?>">
                <?php foreach ($stageLeads as $l): ?>
                    <div class="card p-3 shadow-sm border cursor-grab kanban-card text-xs" data-lead-id="<?= e($l['id']) ?>" draggable="true">
                        <div class="flex items-start justify-between gap-2 mb-1.5">
                            <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="font-bold text-main hover:underline text-xs block leading-snug">
                                <?= e($l['title']) ?>
                            </a>
                            <span class="badge <?= $l['priority'] === 'urgent' ? 'badge-danger' : ($l['priority'] === 'high' ? 'badge-warning' : 'badge-neutral') ?> text-2xs uppercase">
                                <?= e($l['priority']) ?>
                            </span>
                        </div>

                        <div class="text-muted text-xs mb-2.5 truncate font-medium"><?= e($l['company_name'] ?: ($l['contact_name'] ?: 'General Account')) ?></div>

                        <div class="flex items-center justify-between pt-2 border-t text-xs">
                            <span class="font-mono font-bold text-brand">$<?= number_format($l['estimated_value'], 0) ?></span>
                            <span class="text-muted text-2xs"><?= e($l['probability']) ?>% prob</span>
                        </div>

                        <!-- Stage Quick Select -->
                        <div class="mt-2.5 text-right">
                            <select class="form-select text-2xs py-1 px-1.5 w-auto cursor-pointer" onchange="OmniDeskCRM.moveLeadStage(<?= e($l['id']) ?>, this.value)">
                                <option value="" disabled selected>Move Stage...</option>
                                <?php foreach ($stagesConfig as $sk => $sc): ?>
                                    <option value="<?= e($sk) ?>" <?= $sk === $sKey ? 'disabled' : '' ?>><?= e($sc['title']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($stageLeads)): ?>
                    <div class="text-center text-muted text-2xs py-8 border border-dashed rounded-lg">
                        No deals in stage
                    </div>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<!-- ── New Deal Modal ───────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newLeadModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Add Sales Opportunity</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newLeadModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/crm/leads/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="m_title">Deal Title *</label>
                <input type="text" id="m_title" name="title" class="form-input" placeholder="e.g. Enterprise SLA Migration" required>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-2">
                <div class="form-group mb-0">
                    <label class="form-label" for="m_comp">Account / Company</label>
                    <input type="text" id="m_comp" name="company_name" class="form-input" placeholder="Acme International">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="m_val">Estimated Value ($)</label>
                    <input type="number" id="m_val" name="estimated_value" class="form-input" placeholder="75000" step="100">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="form-group mb-0">
                    <label class="form-label" for="m_stg">Initial Stage</label>
                    <select id="m_stg" name="stage" class="form-select">
                        <option value="new_lead">New Inbound</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" for="m_pri">Priority</label>
                    <select id="m_pri" name="priority" class="form-select">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newLeadModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Create Deal</button>
            </div>
        </form>
    </div>
</div>

<script>
window.OmniDeskCRM = {
    async moveLeadStage(leadId, newStage) {
        if (!newStage) return;
        try {
            const res = await OmniDesk.fetch('/crm/leads/status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: leadId, stage: newStage})
            });
            if (res.ok) {
                window.location.reload();
            } else {
                alert('Could not transition deal stage.');
            }
        } catch (e) {
            console.error(e);
            alert('Stage transition failed.');
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
