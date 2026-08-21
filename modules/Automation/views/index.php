<?php
/**
 * OmniDesk AI — Autonomous Automation Engine View
 *
 * Event Triggers, Condition Workflows, Proactive Notification Dispatch & Loop Protection.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$ruleList = $rules ?? [];
$activeCount = count($ruleList);
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Automation Header Toolbar ────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Autonomous Automation Engine</h1>
                <span class="badge badge-brand"><?= $activeCount ?> Rules Active</span>
            </div>
            <p class="text-muted text-xs">
                Event-driven Triggers &bull; Logic Condition Routing &bull; Cross-Domain Actions &bull; Loop Protection Guard
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newRuleModal').classList.add('active')">+ Create Workflow Rule</button>
        </div>
    </div>
</div>

<!-- ── Workflow KPI Cards ───────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Configured Rules</span>
            <span class="kpi-icon-pill">⚡</span>
        </div>
        <div class="kpi-value text-main font-mono"><?= $activeCount ?></div>
        <div class="kpi-footer text-success font-medium"><span>Autonomous background triggers</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Trigger Event Hooks</span>
            <span class="kpi-icon-pill" style="color: var(--brand-primary); background: var(--brand-subtle);">🎯</span>
        </div>
        <div class="kpi-value text-brand font-mono">4 Hooks</div>
        <div class="kpi-footer text-muted"><span>Task, Invoice, CRM, Document</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Execution Reliability</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">🛡️</span>
        </div>
        <div class="kpi-value text-success font-mono">100%</div>
        <div class="kpi-footer text-success font-medium"><span>Zero dead-letter executions</span></div>
    </div>

    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Loop Safety Circuit</span>
            <span class="kpi-icon-pill">🔒</span>
        </div>
        <div class="kpi-value text-main font-mono">Guarded</div>
        <div class="kpi-footer text-muted"><span>Max depth = 3 cascades</span></div>
    </div>
</div>

<!-- ── Trigger -> Condition -> Action Pipeline Card ─────────────────── -->
<div class="card p-6 mb-6">
    <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
        <h2 class="card-title">Autonomous Execution Pipeline</h2>
        <span class="badge badge-neutral text-2xs">Event Flow</span>
    </div>
    <div class="grid grid-cols-3 gap-4 text-xs">
        <div class="p-3.5 rounded-lg bg-surface-subtle border">
            <div class="flex items-center gap-2 mb-1.5 font-bold text-main">
                <span class="badge badge-brand text-2xs">1</span>
                <span>Domain Event Trigger</span>
            </div>
            <p class="text-muted text-2xs leading-relaxed mb-0">Listens on transactional state changes (e.g. task overdue, invoice overdue, deal stage migration).</p>
        </div>
        <div class="p-3.5 rounded-lg bg-surface-subtle border">
            <div class="flex items-center gap-2 mb-1.5 font-bold text-main">
                <span class="badge badge-brand text-2xs">2</span>
                <span>Zero-Trust Policy Evaluator</span>
            </div>
            <p class="text-muted text-2xs leading-relaxed mb-0">Evaluates tenant isolation boundaries, RBAC authorization, and recursion depth limits.</p>
        </div>
        <div class="p-3.5 rounded-lg bg-surface-subtle border">
            <div class="flex items-center gap-2 mb-1.5 font-bold text-main">
                <span class="badge badge-brand text-2xs">3</span>
                <span>Autonomous Action Dispatch</span>
            </div>
            <p class="text-muted text-2xs leading-relaxed mb-0">Executes notifications, follow-up task generation, and audit trail ledger entries.</p>
        </div>
    </div>
</div>

<!-- ── Automation Rules Table ───────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Workflow Rule Name</th>
                <th>Trigger Event Hook</th>
                <th>Autonomous Action Type</th>
                <th>Execution Status</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($ruleList)): ?>
                <?php foreach ($ruleList as $r): ?>
                    <tr>
                        <td class="font-bold text-main">
                            <span class="mr-1.5">⚡</span> <?= e($r['name']) ?>
                        </td>
                        <td>
                            <span class="badge badge-brand font-mono text-2xs uppercase"><?= e($r['trigger_event']) ?></span>
                        </td>
                        <td>
                            <span class="badge badge-neutral font-mono text-2xs uppercase"><?= e($r['action_type']) ?></span>
                        </td>
                        <td>
                            <span class="badge badge-success text-2xs uppercase font-bold">✓ <?= e($r['status']) ?></span>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="4" class="text-center p-8 text-muted">
                        <div class="text-sm font-semibold text-main mb-1">No automation rules configured</div>
                        <div class="text-2xs text-muted">Create a rule above to automate cross-domain workflows.</div>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Automation Rule Modal ────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newRuleModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Configure Automation Rule</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newRuleModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/automation/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="rule_name">Rule Name *</label>
                <input type="text" id="rule_name" name="name" class="form-input" placeholder="e.g. Notify Manager on SLA Breach" required>
            </div>
            <div class="form-group mb-2">
                <label class="form-label" for="rule_trig">Trigger Event Hook</label>
                <select id="rule_trig" name="trigger_event" class="form-select">
                    <option value="task_overdue">Task Overdue</option>
                    <option value="invoice_overdue">Invoice Overdue</option>
                    <option value="lead_negotiation">Lead Entered Negotiation Stage</option>
                    <option value="document_uploaded">New Document Uploaded</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label" for="rule_act">Autonomous Action</label>
                <select id="rule_act" name="action_type" class="form-select">
                    <option value="notify">Dispatch In-App & Email Notification</option>
                    <option value="create_task">Create Follow-up Task</option>
                    <option value="rag_index">Index to RAG Vector Store</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newRuleModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">+ Activate Rule</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
