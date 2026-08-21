<?php
/**
 * OmniDesk AI — Full-page Enterprise Agentic AI Workspace Assistant
 *
 * Autonomous Workspace Assistant, Multitenant Isolated, RBAC Protected.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$msgList = $messages ?? [];
$convId  = $conversationId ?? 1;
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Agentic AI Header Toolbar ────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Autonomous AI Workspace Copilot</h1>
                <span class="badge badge-brand">AI Gateway Live</span>
            </div>
            <p class="text-muted text-xs">
                Autonomous cross-domain assistant &bull; Multi-tenant isolated memory &bull; Zero-trust RBAC execution
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/ai/command-center') ?>" class="btn btn-sm btn-primary">⚡ AI Command Center</a>
        </div>
    </div>
</div>

<!-- ── Agentic AI Chat Workspace Interface ──────────────────────────── -->
<div class="card p-6 mb-6 flex flex-col" style="min-height: 540px;">
    <!-- Chat Messages Scroll Container -->
    <div class="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-xl bg-surface-subtle border" id="aiChatThread" style="max-height: 420px;">
        <?php if (!empty($msgList)): ?>
            <?php foreach ($msgList as $m): ?>
                <div class="flex flex-col <?= $m['role'] === 'user' ? 'items-end' : 'items-start' ?>">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-2xs uppercase text-muted"><?= e($m['role'] === 'user' ? 'You' : 'OmniDesk AI Agent') ?></span>
                    </div>
                    <div class="p-3.5 rounded-xl text-xs max-w-2xl leading-relaxed <?= $m['role'] === 'user' ? 'bg-brand text-white' : 'bg-surface border text-main' ?>" style="white-space: pre-wrap;">
                        <?= e($m['content']) ?>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="text-center text-muted text-xs py-14">
                ⚡ OmniDesk Agentic AI Assistant ready.<br>
                Try asking: <em>"Give me an executive briefing on workspace revenue and overdue items"</em> or <em>"Show me active project tasks"</em>
            </div>
        <?php endif; ?>
    </div>

    <!-- Suggested Action Chips -->
    <div class="flex items-center gap-2 flex-wrap mb-3 text-2xs">
        <span class="text-muted font-bold">Suggested:</span>
        <button type="button" class="btn btn-sm btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAI.sendPrompt('Give me an executive briefing on workspace performance and overdue items')">Executive Briefing</button>
        <button type="button" class="btn btn-sm btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAI.sendPrompt('Show active project tasks and Kanban status')">Active Tasks</button>
        <button type="button" class="btn btn-sm btn-secondary text-2xs py-1 px-2.5" onclick="OmniDeskAI.sendPrompt('Summarize CRM sales leads pipeline')">CRM Leads</button>
    </div>

    <!-- Chat Prompt Form -->
    <form id="aiPromptForm" class="flex gap-2" onsubmit="event.preventDefault(); OmniDeskAI.submitPrompt();">
        <input type="hidden" id="aiConvId" value="<?= e($convId) ?>">
        <input type="text" id="aiInputPrompt" class="form-input text-xs py-2 px-3 flex-1" placeholder="Ask OmniDesk Agentic AI anything about your workspace..." required autocomplete="off">
        <button type="submit" id="aiSubmitBtn" class="btn btn-primary text-xs py-2 px-4">Send Prompt ↵</button>
    </form>
</div>

<!-- ── Client-side AI Processing Script ──────────────────────────────── -->
<script>
window.OmniDeskAI = {
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

        // Append User Message to UI
        const userBubble = document.createElement('div');
        userBubble.className = 'flex flex-col items-end';

        const userHeader = document.createElement('div');
        userHeader.className = 'font-bold text-2xs uppercase text-muted mb-1';
        userHeader.textContent = 'YOU';

        const userContent = document.createElement('div');
        userContent.className = 'p-3.5 rounded-xl text-xs max-w-2xl leading-relaxed bg-brand text-white';
        userContent.style.whiteSpace = 'pre-wrap';
        userContent.textContent = msg;

        userBubble.appendChild(userHeader);
        userBubble.appendChild(userContent);
        thread.appendChild(userBubble);

        input.value = '';
        btn.disabled = true;
        btn.innerText = 'Consulting AI...';

        // Append Typing Bubble
        const agentBubble = document.createElement('div');
        agentBubble.className = 'flex flex-col items-start';

        const agentHeader = document.createElement('div');
        agentHeader.className = 'font-bold text-2xs uppercase text-muted mb-1';
        agentHeader.textContent = 'OMNIDESK AI AGENT';

        const agentContent = document.createElement('div');
        agentContent.className = 'p-3.5 rounded-xl text-xs max-w-2xl leading-relaxed bg-surface border text-muted';
        agentContent.textContent = '⚡ Consulting domain agents and querying business ledger...';

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
                agentContent.className = 'p-3.5 rounded-xl text-xs max-w-2xl leading-relaxed bg-surface border text-main';
                agentContent.textContent = data.response;
            } else {
                agentContent.textContent = 'Error: ' + (data.message || 'AI request failed.');
            }
        } catch (e) {
            agentContent.textContent = 'Server error communicating with AI engine.';
        } finally {
            btn.disabled = false;
            btn.innerText = 'Send Prompt ↵';
            thread.scrollTop = thread.scrollHeight;
        }
    }
};
</script>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
