<?php
/**
 * OmniDesk AI — Autonomous Automation Engine View (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$ruleList = $rules ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Automation Header Toolbar ────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Autonomous Automation Engine</h1>
            <p class="text-muted text-sm mb-0">Event Triggers &bull; Condition Workflows &bull; Proactive Notification Dispatch &bull; Loop Protection</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newRuleModal').classList.add('active')">+ Create Automation Rule</button>
        </div>
    </div>
</div>

<!-- ── Automation Rules Table ───────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Rule Name</th>
                    <th class="p-3">Trigger Event</th>
                    <th class="p-3">Action Type</th>
                    <th class="p-3">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($ruleList)): ?>
                    <?php foreach ($ruleList as $r): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main">⚡ <?= e($r['name']) ?></td>
                            <td class="p-3 font-mono text-brand"><?= e($r['trigger_event']) ?></td>
                            <td class="p-3 font-mono text-muted"><?= e($r['action_type']) ?></td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($r['status']) ?></span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="4" class="text-center p-6 text-muted">No automation rules configured.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Automation Rule Modal ────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newRuleModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Configure Autonomous Automation Rule</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newRuleModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/automation/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="rule_name">Rule Name *</label>
                <input type="text" id="rule_name" name="name" class="form-input" placeholder="e.g. Notify Manager on SLA Breach" required>
            </div>
            <div>
                <label class="form-label" for="rule_trig">Trigger Event</label>
                <select id="rule_trig" name="trigger_event" class="form-input">
                    <option value="task_overdue">Task Overdue</option>
                    <option value="invoice_overdue">Invoice Overdue</option>
                    <option value="lead_negotiation">Lead Entered Negotiation Stage</option>
                    <option value="document_uploaded">New Document Uploaded</option>
                </select>
            </div>
            <div>
                <label class="form-label" for="rule_act">Autonomous Action</label>
                <select id="rule_act" name="action_type" class="form-input">
                    <option value="notify">Dispatch In-App & Email Notification</option>
                    <option value="create_task">Create Follow-up Task</option>
                    <option value="rag_index">Index to RAG Vector Store</option>
                </select>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newRuleModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Activate Rule</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
