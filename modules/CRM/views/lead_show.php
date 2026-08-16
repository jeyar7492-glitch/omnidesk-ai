<?php
/**
 * OmniDesk AI — Lead Profile & Details View (Phase 4)
 *
 * Details page for a single lead, allowing stage transitions and Lead -> Customer conversion.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$l = $lead ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Lead Header ──────────────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($l['title'] ?? 'Deal Entry') ?></h1>
                <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $l['stage'] ?? 'new_lead')) ?></span>
                <span class="badge <?= ($l['status'] ?? '') === 'won' ? 'badge-success' : 'badge-secondary' ?> capitalize"><?= e($l['status'] ?? 'open') ?></span>
            </div>
            <p class="text-muted text-sm mb-0">Company: <?= e($l['company_name'] ?: 'N/A') ?> &bull; Contact: <?= e($l['contact_name'] ?: 'N/A') ?></p>
        </div>

        <div class="flex items-center gap-3">
            <?php if (($l['status'] ?? '') !== 'won'): ?>
                <form action="<?= url('/crm/leads/convert') ?>" method="POST" class="m-0" onsubmit="return confirm('Convert this deal into an active Customer record?')">
                    <?= csrf_field() ?>
                    <input type="hidden" name="lead_id" value="<?= e($l['id']) ?>">
                    <button type="submit" class="btn btn-success text-xs py-1.5 px-3">🏆 Convert to Customer</button>
                </form>
            <?php else: ?>
                <span class="badge badge-success">Converted Customer</span>
            <?php endif; ?>
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-secondary text-xs py-1.5 px-3">&larr; Back to Pipeline</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Deal Information Card -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Deal Overview</h3>
        <div class="space-y-3 text-xs">
            <div>
                <span class="text-muted block font-medium">Estimated Value:</span>
                <span class="text-xl font-bold text-brand font-mono">$<?= number_format($l['estimated_value'] ?? 0, 2) ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Win Probability:</span>
                <span class="text-main font-semibold"><?= e($l['probability'] ?? 50) ?>%</span>
            </div>
            <div>
                <span class="text-muted block font-medium">Source:</span>
                <span class="text-main capitalize"><?= e($l['source'] ?? 'website') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Priority:</span>
                <span class="badge <?= ($l['priority'] ?? '') === 'urgent' ? 'badge-danger' : 'badge-secondary' ?> uppercase"><?= e($l['priority'] ?? 'medium') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Assigned Owner:</span>
                <span class="text-main"><?= e($l['owner_name'] ?: 'Unassigned') ?></span>
            </div>
        </div>
    </div>

    <!-- Contact & Activity Card -->
    <div class="col-span-2 card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Contact Information</h3>
        <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="p-3 rounded bg-surface-subtle border">
                <span class="text-muted block font-medium">Contact Person:</span>
                <strong class="text-main text-sm"><?= e($l['contact_name'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3 rounded bg-surface-subtle border">
                <span class="text-muted block font-medium">Email Address:</span>
                <strong class="text-main text-sm"><?= e($l['email'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3 rounded bg-surface-subtle border">
                <span class="text-muted block font-medium">Phone Number:</span>
                <strong class="text-main text-sm"><?= e($l['phone'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3 rounded bg-surface-subtle border">
                <span class="text-muted block font-medium">Expected Close Date:</span>
                <strong class="text-main text-sm"><?= e($l['expected_close_date'] ?: 'Not scheduled') ?></strong>
            </div>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
