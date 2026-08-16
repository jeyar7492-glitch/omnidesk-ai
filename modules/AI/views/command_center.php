<?php
/**
 * OmniDesk AI — Enterprise Autonomous AI Command Center View (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$h         = $health ?? [];
$ins       = $insights ?? [];
$apprs     = $approvals ?? [];
$auds      = $auditLogs ?? [];
$msgList   = $messages ?? [];
$convId    = $conversationId ?? 1;
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── AI Command Center Header Toolbar ─────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0">🤖 Autonomous AI Command Center</h1>
                <span class="badge badge-brand">8 Domain Agents Active</span>
            </div>
            <p class="text-muted text-sm mb-0">Multi-Agent Orchestration &bull; Business Health Engine &bull; Human Approval Center &bull; Audit Trail</p>
        </div>

        <div class="flex items-center gap-3">
            <div class="text-right">
                <span class="text-xs text-muted block font-medium">Business Health Index</span>
                <span class="text-lg font-bold text-success font-mono"><?= e($h['overall_score'] ?? 84) ?> / 100</span>
            </div>
        </div>
    </div>
</div>

<!-- ── Business Health Score Metrics Grid ───────────────────────────── -->
<div class="grid grid-cols-6 gap-3 mb-6 text-xs">
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">Overall Health</span>
        <span class="text-xl font-bold text-success font-mono"><?= e($h['overall_score'] ?? 84) ?>%</span>
    </div>
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">CRM Pipeline</span>
        <span class="text-xl font-bold text-brand font-mono"><?= e($h['crm_score'] ?? 88) ?>%</span>
    </div>
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">Projects</span>
        <span class="text-xl font-bold text-main font-mono"><?= e($h['project_score'] ?? 82) ?>%</span>
    </div>
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">Task Velocity</span>
        <span class="text-xl font-bold text-warning font-mono"><?= e($h['task_score'] ?? 75) ?>%</span>
    </div>
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">Finance & Cash</span>
        <span class="text-xl font-bold text-success font-mono"><?= e($h['finance_score'] ?? 91) ?>%</span>
    </div>
    <div class="card p-3 text-center">
        <span class="text-muted font-medium block uppercase text-2xs mb-1">Customer SLA</span>
        <span class="text-xl font-bold text-brand font-mono"><?= e($h['customer_score'] ?? 86) ?>%</span>
    </div>
</div>

<!-- ── Main Command Center Tabs & Content ────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- AI Conversation Thread (2 Cols) -->
    <div class="col-span-2 card p-6 flex flex-col" style="min-height: 540px;">
        <div class="flex items-center justify-between border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Conversational Multi-Agent Assistant</h3>
            <span class="text-2xs text-muted font-mono">Conv ID #<?= e($convId) ?></span>
        </div>

        <!-- Chat Thread Messages -->
        <div class="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded bg-surface-subtle border" id="aiChatThread" style="max-height: 380px;">
            <?php if (!empty($msgList)): ?>
                <?php foreach ($msgList as $m): ?>
                    <div class="flex flex-col <?= $m['role'] === 'user' ? 'items-end' : 'items-start' ?>">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-2xs uppercase text-muted"><?= e($m['role'] === 'user' ? 'You' : 'OmniDesk AI Agent') ?></span>
                        </div>
                        <div class="p-3 rounded-lg text-xs max-w-2xl leading-relaxed <?= $m['role'] === 'user' ? 'bg-brand text-white' : 'bg-surface border text-main' ?>" style="white-space: pre-wrap;">
                            <?= e($m['content']) ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-center text-muted text-xs py-12">
                    ⚡ OmniDesk Autonomous Business Agent ready.<br>
                    Try asking: <em>"Give me today's executive summary"</em> or <em>"Which projects are at risk?"</em>
                </div>
            <?php endif; ?>
        </div>

        <!-- Suggested Prompt Chips -->
        <div class="flex items-center gap-2 flex-wrap mb-3 text-2xs">
            <span class="text-muted font-bold">Suggested:</span>
            <button type="button" class="btn btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAICommand.sendPrompt('Give me today\'s executive summary.')">Executive Summary</button>
            <button type="button" class="btn btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAICommand.sendPrompt('Which projects are at risk and why?')">Project Risks</button>
            <button type="button" class="btn btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAICommand.sendPrompt('Find overdue tasks assigned to me.')">Overdue Tasks</button>
            <button type="button" class="btn btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAICommand.sendPrompt('Show unpaid invoices.')">Unpaid Invoices</button>
        </div>

        <!-- Prompt Input Form -->
        <form id="aiPromptForm" class="flex gap-2" onsubmit="event.preventDefault(); OmniDeskAICommand.submitPrompt();">
            <input type="hidden" id="aiConvId" value="<?= e($convId) ?>">
            <input type="text" id="aiInputPrompt" class="form-input text-xs py-2 px-3 flex-1" placeholder="Dispatch autonomous command to domain agents..." required autocomplete="off">
            <button type="submit" id="aiSubmitBtn" class="btn btn-primary text-xs py-2 px-4">Dispatch Command ↵</button>
        </form>
    </div>

    <!-- Right Column: Human Approvals & Insights -->
    <div class="space-y-6">
        <!-- Human Approval Queue Card -->
        <div class="card p-6 border-l-4 border-warning">
            <div class="flex items-center justify-between border-b pb-3 mb-4">
                <h3 class="font-semibold text-base flex items-center gap-2">
                    <span>🛡️ Human Approval Center</span>
                    <span class="badge badge-warning text-2xs"><?= count($apprs) ?></span>
                </h3>
            </div>

            <div class="space-y-3 text-xs">
                <?php if (!empty($apprs)): ?>
                    <?php foreach ($apprs as $appr): ?>
                        <div class="p-3 rounded bg-surface-subtle border">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-bold text-main uppercase text-2xs"><?= e($appr['action_name']) ?></span>
                                <span class="badge badge-danger text-2xs uppercase"><?= e($appr['risk_level']) ?> Risk</span>
                            </div>
                            <div class="text-2xs text-muted font-mono mb-2">Hash: <?= e(substr($appr['action_hash'], 0, 12)) ?>...</div>
                            <div class="flex gap-2">
                                <form action="<?= url('/ai/approvals/approve') ?>" method="POST" class="m-0 flex-1">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="approval_id" value="<?= e($appr['id']) ?>">
                                    <button type="submit" class="btn btn-success text-2xs w-full py-1">Approve</button>
                                </form>
                                <form action="<?= url('/ai/approvals/reject') ?>" method="POST" class="m-0 flex-1">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="approval_id" value="<?= e($appr['id']) ?>">
                                    <button type="submit" class="btn btn-secondary text-2xs w-full py-1">Reject</button>
                                </form>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-4 text-xs">No pending write actions awaiting approval.</div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Proactive Insights Card -->
        <div class="card p-6">
            <div class="flex items-center justify-between border-b pb-3 mb-4">
                <h3 class="font-semibold text-base">Proactive Business Insights</h3>
            </div>

            <div class="space-y-3 text-xs">
                <?php if (!empty($ins)): ?>
                    <?php foreach ($ins as $insight): ?>
                        <div class="p-3 rounded bg-surface-subtle border">
                            <div class="flex justify-between items-center mb-1">
                                <strong class="text-main"><?= e($insight['title']) ?></strong>
                                <span class="badge <?= $insight['severity'] === 'high' ? 'badge-danger' : 'badge-warning' ?> text-2xs uppercase">
                                    <?= e($insight['severity']) ?>
                                </span>
                            </div>
                            <p class="text-muted text-2xs mb-1"><?= e($insight['evidence']) ?></p>
                            <div class="text-brand font-medium text-2xs">💡 <?= e($insight['recommendation']) ?></div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-muted text-center py-4 text-xs">No proactive risk alerts detected.</div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- ── Audit Events Trail Card ───────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="flex justify-between items-center border-b pb-3 mb-4">
        <h3 class="font-semibold text-base">Immutable AI Audit Events Log</h3>
        <span class="text-2xs text-muted">Audited Actions: <?= count($auds) ?></span>
    </div>

    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Timestamp</th>
                    <th class="p-3">Agent Key</th>
                    <th class="p-3">Tool Executed</th>
                    <th class="p-3">Action Type</th>
                    <th class="p-3">Risk Level</th>
                    <th class="p-3">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($auds)): ?>
                    <?php foreach ($auds as $aud): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-mono text-muted"><?= e($aud['created_at']) ?></td>
                            <td class="p-3 font-bold text-main font-mono"><?= e($aud['agent_key']) ?></td>
                            <td class="p-3 text-brand font-semibold"><?= e($aud['tool_name']) ?></td>
                            <td class="p-3 text-muted uppercase"><?= e($aud['action_type']) ?></td>
                            <td class="p-3">
                                <span class="badge <?= $aud['risk_level'] === 'high' ? 'badge-danger' : 'badge-secondary' ?> text-2xs uppercase"><?= e($aud['risk_level']) ?></span>
                            </td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($aud['status']) ?></span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="6" class="text-center p-6 text-muted">No audit events recorded yet.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── Client-side Command Center JS ─────────────────────────────────── -->
<script>
window.OmniDeskAICommand = {
    async sendPrompt(text) {
        document.getElementById('aiInputPrompt').value = text;
        await this.submitPrompt();
    },

    async submitPrompt() {
        const input = document.getElementById('aiInputPrompt');
        const btn = document.getElementById('aiSubmitBtn');
        const thread = document.getElementById('aiChatThread');
        const convId = document.getElementById('aiConvId').value;
        const msg = input.value.trim();

        if (!msg) return;

        // Append User Message to UI using textContent
        const userBubble = document.createElement('div');
        userBubble.className = 'flex flex-col items-end';
        
        const userHeader = document.createElement('div');
        userHeader.className = 'flex items-center gap-2 mb-1';
        userHeader.textContent = 'YOU';
        userHeader.className = 'font-bold text-2xs uppercase text-muted mb-1';
        
        const userContent = document.createElement('div');
        userContent.className = 'p-3 rounded-lg text-xs max-w-2xl leading-relaxed bg-brand text-white';
        userContent.style.whiteSpace = 'pre-wrap';
        userContent.textContent = msg;

        userBubble.appendChild(userHeader);
        userBubble.appendChild(userContent);
        thread.appendChild(userBubble);

        input.value = '';
        btn.disabled = true;
        btn.innerText = 'Orchestrating Agents...';

        // Append Typing Bubble
        const agentBubble = document.createElement('div');
        agentBubble.className = 'flex flex-col items-start';

        const agentHeader = document.createElement('div');
        agentHeader.className = 'flex items-center gap-2 mb-1';
        agentHeader.textContent = 'OMNIDESK AI AGENT';
        agentHeader.className = 'font-bold text-2xs uppercase text-muted mb-1';

        const agentContent = document.createElement('div');
        agentContent.className = 'p-3 rounded-lg text-xs max-w-2xl leading-relaxed bg-surface border text-muted';
        agentContent.textContent = '⚡ Orchestrating multi-agent synthesis and security checks...';

        agentBubble.appendChild(agentHeader);
        agentBubble.appendChild(agentContent);
        thread.appendChild(agentBubble);
        thread.scrollTop = thread.scrollHeight;

        try {
            const body = new URLSearchParams();
            body.append('message', msg);
            body.append('conversation_id', convId);
            body.append('_csrf', '<?= csrf_token() ?>');

            const res = await fetch('<?= url('/ai/chat') ?>', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': '<?= csrf_token() ?>'
                },
                body: body.toString()
            });

            const data = await res.json();
            if (data.success) {
                agentContent.className = 'p-3 rounded-lg text-xs max-w-2xl leading-relaxed bg-surface border text-main';
                agentContent.textContent = data.response;
            } else {
                agentContent.textContent = 'Error: ' + (data.message || 'Orchestration failed.');
            }
        } catch (e) {
            agentContent.textContent = 'Server error processing command.';
        } finally {
            btn.disabled = false;
            btn.innerText = 'Dispatch Command ↵';
            thread.scrollTop = thread.scrollHeight;
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
