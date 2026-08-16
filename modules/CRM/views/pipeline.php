<?php
/**
 * OmniDesk AI — CRM Sales Pipeline Kanban View (Phase 4)
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
    'new_lead'    => ['title' => 'New Lead',     'color' => 'var(--text-muted)'],
    'qualified'   => ['title' => 'Qualified',    'color' => 'var(--brand-primary)'],
    'proposal'    => ['title' => 'Proposal Out', 'color' => 'var(--status-info)'],
    'negotiation' => ['title' => 'Negotiation',  'color' => 'var(--status-warning)'],
    'won'         => ['title' => 'Closed Won',   'color' => 'var(--status-success)'],
    'lost'        => ['title' => 'Closed Lost',  'color' => 'var(--status-danger)'],
];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Pipeline Header Toolbar ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">Sales Pipeline Kanban</h1>
                <span class="badge badge-brand">6 Active Stages</span>
            </div>
            <p class="text-muted text-sm mb-0">
                Total Pipeline: <strong class="text-main">$<?= number_format($sum['total_value'] ?? 0, 2) ?></strong>
                &bull; Weighted: <strong class="text-brand">$<?= number_format($sum['weighted_value'] ?? 0, 2) ?></strong>
            </p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newLeadModal').classList.add('active')">+ Add Deal</button>
            <a href="<?= url('/crm/leads') ?>" class="btn btn-secondary text-xs py-1.5 px-3">List View</a>
        </div>
    </div>
</div>

<!-- ── 6-Column Kanban Board ────────────────────────────────────────── -->
<div class="kanban-board grid grid-cols-6 gap-4 overflow-x-auto pb-6" style="min-height: 500px;">
    <?php foreach ($stagesConfig as $sKey => $sConf): ?>
        <?php
        $stageLeads = $kb[$sKey] ?? [];
        $stageTotal = 0.0;
        foreach ($stageLeads as $sl) { $stageTotal += (float)$sl['estimated_value']; }
        ?>
        <div class="kanban-column bg-surface-subtle p-3 rounded-lg border flex flex-col" data-stage="<?= e($sKey) ?>">
            <!-- Column Header -->
            <div class="column-header border-b pb-2 mb-3 flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-xs uppercase tracking-wider text-main mb-0"><?= e($sConf['title']) ?></h4>
                    <span class="text-2xs text-muted font-mono">$<?= number_format($stageTotal, 0) ?></span>
                </div>
                <span class="badge badge-secondary text-2xs"><?= count($stageLeads) ?></span>
            </div>

            <!-- Column Cards Container -->
            <div class="kanban-cards space-y-3 flex-1 overflow-y-auto" id="stage_col_<?= e($sKey) ?>">
                <?php foreach ($stageLeads as $l): ?>
                    <div class="card p-3 shadow-sm hover:shadow border cursor-grab kanban-card text-xs" data-lead-id="<?= e($l['id']) ?>" draggable="true">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <a href="<?= url('/crm/leads/show?id=' . $l['id']) ?>" class="font-bold text-main hover:underline text-xs block leading-tight">
                                <?= e($l['title']) ?>
                            </a>
                            <span class="badge <?= $l['priority'] === 'urgent' ? 'badge-danger' : ($l['priority'] === 'high' ? 'badge-warning' : 'badge-secondary') ?> text-2xs uppercase">
                                <?= e($l['priority']) ?>
                            </span>
                        </div>

                        <div class="text-muted text-xs mb-2 truncate"><?= e($l['company_name'] ?: ($l['contact_name'] ?: 'General Lead')) ?></div>

                        <div class="flex items-center justify-between pt-2 border-t text-xs">
                            <span class="font-mono font-bold text-brand">$<?= number_format($l['estimated_value'], 0) ?></span>
                            <span class="text-muted text-2xs"><?= e($l['probability']) ?>% prob</span>
                        </div>

                        <!-- Stage Quick Select -->
                        <div class="mt-2 text-right">
                            <select class="form-input text-2xs py-0 px-1 w-auto cursor-pointer" onchange="OmniDeskCRM.moveLeadStage(<?= e($l['id']) ?>, this.value)">
                                <option value="" disabled selected>Move Stage...</option>
                                <?php foreach ($stagesConfig as $sk => $sc): ?>
                                    <option value="<?= e($sk) ?>" <?= $sk === $sKey ? 'disabled' : '' ?>><?= e($sc['title']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($stageLeads)): ?>
                    <div class="empty-column-placeholder text-center text-muted text-2xs py-8 border border-dashed rounded">
                        No deals in stage
                    </div>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<!-- ── New Deal Modal ────────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newLeadModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Add New Sales Deal</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newLeadModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/crm/leads/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="nl_title">Deal Title *</label>
                <input type="text" id="nl_title" name="title" class="form-input" placeholder="e.g. Enterprise License Renewal" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="nl_cname">Company Name</label>
                    <input type="text" id="nl_cname" name="company_name" class="form-input" placeholder="Company...">
                </div>
                <div>
                    <label class="form-label" for="nl_val">Estimated Value ($)</label>
                    <input type="number" id="nl_val" name="estimated_value" class="form-input" placeholder="50000" step="100">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="form-label" for="nl_stage">Stage</label>
                    <select id="nl_stage" name="stage" class="form-input">
                        <option value="new_lead">New Lead</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="nl_pri">Priority</label>
                    <select id="nl_pri" name="priority" class="form-input">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newLeadModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Deal Entry</button>
            </div>
        </form>
    </div>
</div>

<!-- ── Kanban Stage Movement Client Script ────────────────────────────── -->
<script>
window.OmniDeskCRM = {
    async moveLeadStage(leadId, newStage) {
        if (!leadId || !newStage) return;

        const body = new URLSearchParams();
        body.append('lead_id', leadId);
        body.append('stage', newStage);
        body.append('_csrf', '<?= csrf_token() ?>');

        try {
            const res = await fetch('<?= url('/crm/leads/move-stage') ?>', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': '<?= csrf_token() ?>'
                },
                body: body.toString()
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || 'Failed to move lead stage.');
            }
        } catch (e) {
            alert('Server request failed.');
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
