<?php
/**
 * OmniDesk AI — Enterprise Communication Channels View
 *
 * Direct Messages, Team Channels, Announcements, and Threaded Discussions.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$chans = $channels ?? [];
$msgs  = $messages ?? [];
$activeChan = $channelId ?? 1;
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Communication Header Toolbar ─────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Enterprise Team Communication</h1>
                <span class="badge badge-brand">Live Sync</span>
            </div>
            <p class="text-muted text-xs">
                Real-time workspace collaboration &bull; Cross-department channels &bull; Direct team announcements &bull; Async messaging
            </p>
        </div>
    </div>
</div>

<div class="grid grid-cols-4 gap-6 mb-6">
    <!-- Sidebar Channels List (1 Col) -->
    <div class="card p-4">
        <div class="border-b pb-2 mb-3">
            <h2 class="card-title text-xs uppercase tracking-wider text-muted">Workspace Channels</h2>
        </div>
        <div class="space-y-1 text-xs">
            <?php foreach ($chans as $ch): ?>
                <a href="<?= url('/communication?channel_id=' . $ch['id']) ?>" class="block p-2.5 rounded-lg flex items-center justify-between hover:bg-surface-subtle <?= (int)$ch['id'] === (int)$activeChan ? 'font-bold text-brand bg-surface-subtle border' : 'text-main' ?>">
                    <span class="truncate"># <?= e($ch['name']) ?></span>
                    <span class="badge badge-neutral text-2xs uppercase"><?= e($ch['type']) ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Main Message Feed (3 Cols) -->
    <div class="col-span-3 card p-6 flex flex-col" style="min-height: 520px;">
        <div class="flex items-center justify-between border-b pb-3 mb-4">
            <div class="flex items-center gap-2">
                <span class="text-lg">💬</span>
                <h2 class="card-title">Live Channel Thread</h2>
            </div>
            <span class="badge badge-neutral">Active Channel</span>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 mb-4 p-4 rounded-xl bg-surface-subtle border" style="max-height: 360px;">
            <?php if (!empty($msgs)): ?>
                <?php foreach ($msgs as $m): ?>
                    <div class="p-3.5 rounded-lg bg-surface border">
                        <div class="flex justify-between items-center mb-1">
                            <strong class="text-main text-xs font-semibold"><?= e($m['sender_name']) ?></strong>
                            <span class="text-2xs text-muted font-mono"><?= e($m['created_at']) ?></span>
                        </div>
                        <p class="text-xs text-muted leading-relaxed mb-0"><?= e($m['message']) ?></p>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-12 text-xs">No messages posted to this channel yet. Start the conversation!</div>
            <?php endif; ?>
        </div>

        <!-- Post Message Form -->
        <form action="<?= url('/communication/post') ?>" method="POST" class="flex gap-2 text-xs">
            <?= csrf_field() ?>
            <input type="hidden" name="channel_id" value="<?= e($activeChan) ?>">
            <input type="text" name="message" class="form-input text-xs py-2 px-3 flex-1" placeholder="Type message to channel..." required>
            <button type="submit" class="btn btn-primary">Send ↵</button>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
