<?php
/**
 * OmniDesk AI — Customer Profile & Details View (Phase 4)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$c = $customer ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Customer Profile Header ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($c['company_name'] ?? 'Customer Account') ?></h1>
                <span class="badge <?= ($c['status'] ?? '') === 'active' ? 'badge-success' : 'badge-warning' ?> capitalize"><?= e($c['status'] ?? 'active') ?></span>
            </div>
            <p class="text-muted text-sm mb-0">Industry: <?= e($c['industry'] ?: 'General') ?> &bull; Account Owner: <?= e($c['owner_name'] ?: 'Unassigned') ?></p>
        </div>

        <div class="flex items-center gap-3">
            <a href="<?= url('/crm/customers') ?>" class="btn btn-secondary text-xs py-1.5 px-3">&larr; Back to Customers</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Account Overview Card -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-4">Account Information</h3>
        <div class="space-y-3 text-xs">
            <div>
                <span class="text-muted block font-medium">Company Name:</span>
                <span class="text-main font-semibold"><?= e($c['company_name'] ?? '') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Email:</span>
                <span class="text-main"><?= e($c['email'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Phone:</span>
                <span class="text-main"><?= e($c['phone'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Website:</span>
                <span class="text-main"><?= e($c['website'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium">Created Date:</span>
                <span class="text-main"><?= e($c['created_at'] ?? 'N/A') ?></span>
            </div>
        </div>
    </div>

    <!-- Linked Contacts Card -->
    <div class="col-span-2 card p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Key Contacts (<?= count($contacts ?? []) ?>)</h3>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($contacts)): ?>
                <?php foreach ($contacts as $cont): ?>
                    <div class="p-3 rounded bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-semibold text-main text-sm">
                                <?= e($cont['first_name'] . ' ' . $cont['last_name']) ?>
                                <?php if (!empty($cont['is_primary'])): ?>
                                    <span class="badge badge-info text-2xs ml-2">Primary Contact</span>
                                <?php endif; ?>
                            </div>
                            <div class="text-muted text-xs"><?= e($cont['job_title'] ?: 'Title N/A') ?> &bull; <?= e($cont['email'] ?: 'No Email') ?></div>
                        </div>
                        <div class="font-mono text-muted text-xs"><?= e($cont['phone'] ?: '') ?></div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-6">No specific contact individuals linked to this account yet.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
