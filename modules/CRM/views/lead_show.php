<?php
/**
 * OmniDesk AI — Lead Profile & Details View
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

<!-- ── Lead Header Banner ───────────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($l['title'] ?? 'Deal Entry') ?></h1>
                <span class="badge badge-brand capitalize"><?= e(str_replace('_', ' ', $l['stage'] ?? 'new_lead')) ?></span>
                <span class="badge <?= ($l['status'] ?? '') === 'won' ? 'badge-success' : 'badge-neutral' ?> capitalize"><?= e($l['status'] ?? 'open') ?></span>
            </div>
            <p class="text-muted text-xs">Company: <strong class="text-main"><?= e($l['company_name'] ?: 'N/A') ?></strong> &bull; Contact: <strong class="text-main"><?= e($l['contact_name'] ?: 'N/A') ?></strong></p>
        </div>

        <div class="flex items-center gap-2">
            <?php if (($l['status'] ?? '') !== 'won'): ?>
                <form action="<?= url('/crm/leads/convert') ?>" method="POST" class="m-0" onsubmit="return confirm('Convert this deal into an active Customer record?')">
                    <?= csrf_field() ?>
                    <input type="hidden" name="lead_id" value="<?= e($l['id']) ?>">
                    <button type="submit" class="btn btn-sm btn-success">🏆 Convert to Customer</button>
                </form>
            <?php else: ?>
                <span class="badge badge-success">Converted Customer</span>
            <?php endif; ?>
            <a href="<?= url('/crm/pipeline') ?>" class="btn btn-sm btn-secondary">&larr; Back to Pipeline</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Deal Information Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4">
            <h2 class="card-title">Deal Overview</h2>
        </div>
        <div class="space-y-3.5 text-xs">
            <div>
                <span class="text-muted block font-medium mb-1">Estimated Value:</span>
                <span class="text-2xl font-extrabold text-brand font-mono">$<?= number_format($l['estimated_value'] ?? 0, 2) ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Win Probability:</span>
                <span class="text-main font-semibold"><?= e($l['probability'] ?? 50) ?>%</span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Lead Source:</span>
                <span class="text-main font-medium capitalize"><?= e($l['source'] ?? 'website') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Priority Tier:</span>
                <span class="badge <?= ($l['priority'] ?? '') === 'urgent' ? 'badge-danger' : (($l['priority'] ?? '') === 'high' ? 'badge-warning' : 'badge-neutral') ?> uppercase">
                    <?= e($l['priority'] ?? 'medium') ?>
                </span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-1">Assigned Account Owner:</span>
                <span class="text-main font-semibold"><?= e($l['owner_name'] ?: 'Unassigned') ?></span>
            </div>
        </div>
    </div>

    <!-- Contact Information Card -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4">
            <h2 class="card-title">Account & Contact Telemetry</h2>
        </div>
        <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="p-3.5 rounded-lg bg-surface-subtle border">
                <span class="text-muted block font-medium mb-1">Primary Contact:</span>
                <strong class="text-main text-sm font-semibold"><?= e($l['contact_name'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3.5 rounded-lg bg-surface-subtle border">
                <span class="text-muted block font-medium mb-1">Email Address:</span>
                <strong class="text-main text-sm font-semibold"><?= e($l['email'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3.5 rounded-lg bg-surface-subtle border">
                <span class="text-muted block font-medium mb-1">Phone Number:</span>
                <strong class="text-main text-sm font-semibold"><?= e($l['phone'] ?: 'Not specified') ?></strong>
            </div>
            <div class="p-3.5 rounded-lg bg-surface-subtle border">
                <span class="text-muted block font-medium mb-1">Expected Close Date:</span>
                <strong class="text-main text-sm font-semibold"><?= e($l['expected_close_date'] ?: 'Not scheduled') ?></strong>
            </div>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
