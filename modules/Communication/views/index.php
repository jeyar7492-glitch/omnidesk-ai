<?php
/**
 * OmniDesk AI — Enterprise Communication Channels View (Phase 8)
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
            <h1 class="text-2xl font-bold tracking-tight mb-1">Enterprise Communication Channels</h1>
            <p class="text-muted text-sm mb-0">Direct Messages, Team Channels, Announcements, and Threaded Discussions</p>
        </div>
    </div>
</div>

<div class="grid grid-cols-4 gap-6 mb-6">
    <!-- Sidebar Channels List (1 Col) -->
    <div class="card p-4">
        <h3 class="font-semibold text-xs uppercase tracking-wider text-muted mb-3">Channels & Rooms</h3>
        <div class="space-y-1 text-xs">
            <?php foreach ($chans as $ch): ?>
                <a href="<?= url('/communication?channel_id=' . $ch['id']) ?>" class="block p-2 rounded flex items-center justify-between hover:bg-surface-subtle <?= (int)$ch['id'] === (int)$activeChan ? 'font-bold text-brand bg-surface-subtle' : 'text-main' ?>">
                    <span># <?= e($ch['name']) ?></span>
                    <span class="badge badge-secondary text-2xs uppercase"><?= e($ch['type']) ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Main Message Feed (3 Cols) -->
    <div class="col-span-3 card p-6 flex flex-col" style="min-height: 480px;">
        <div class="flex items-center justify-between border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Channel Messages</h3>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 mb-4 p-4 rounded bg-surface-subtle border" style="max-height: 340px;">
            <?php if (!empty($msgs)): ?>
                <?php foreach ($msgs as $m): ?>
                    <div class="p-3 rounded bg-surface border">
                        <div class="flex justify-between items-center mb-1">
                            <strong class="text-main text-xs"><?= e($m['sender_name']) ?></strong>
                            <span class="text-2xs text-muted"><?= e($m['created_at']) ?></span>
                        </div>
                        <p class="text-xs text-muted mb-0"><?= e($m['message']) ?></p>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-8 text-xs">No messages posted to this channel yet.</div>
            <?php endif; ?>
        </div>

        <!-- Post Message Form -->
        <form action="<?= url('/communication/post') ?>" method="POST" class="flex gap-2 text-xs">
            <?= csrf_field() ?>
            <input type="hidden" name="channel_id" value="<?= e($activeChan) ?>">
            <input type="text" name="message" class="form-input text-xs py-2 px-3 flex-1" placeholder="Post message to channel..." required>
            <button type="submit" class="btn btn-primary text-xs py-2 px-4">Post Message ↵</button>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
