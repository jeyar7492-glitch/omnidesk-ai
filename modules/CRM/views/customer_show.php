<?php
/**
 * OmniDesk AI — Customer Profile & Details View
 *
 * Account overview: Commercial profile, primary contacts, and relationship data.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$c = $customer ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Customer Profile Header Banner ───────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($c['company_name'] ?? 'Customer Account') ?></h1>
                <span class="badge <?= ($c['status'] ?? '') === 'active' ? 'badge-success' : 'badge-warning' ?> capitalize"><?= e($c['status'] ?? 'active') ?></span>
            </div>
            <p class="text-muted text-xs">Industry: <strong class="text-main"><?= e($c['industry'] ?: 'General') ?></strong> &bull; Account Owner: <strong class="text-main"><?= e($c['owner_name'] ?: 'Unassigned') ?></strong></p>
        </div>

        <div class="flex items-center gap-2">
            <a href="<?= url('/crm/customers') ?>" class="btn btn-sm btn-secondary">&larr; Back to Customers</a>
        </div>
    </div>
</div>

<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Account Overview Card -->
    <div class="card p-6">
        <div class="card-header border-b pb-3 mb-4">
            <h2 class="card-title">Account Information</h2>
        </div>
        <div class="space-y-3 text-xs">
            <div>
                <span class="text-muted block font-medium mb-0.5">Company Name:</span>
                <span class="text-main font-semibold text-sm"><?= e($c['company_name'] ?? '') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-0.5">Billing Email:</span>
                <span class="text-main font-mono"><?= e($c['email'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-0.5">Direct Phone:</span>
                <span class="text-main"><?= e($c['phone'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-0.5">Corporate Website:</span>
                <span class="text-main"><?= e($c['website'] ?: 'N/A') ?></span>
            </div>
            <div>
                <span class="text-muted block font-medium mb-0.5">Client Since:</span>
                <span class="text-main"><?= e($c['created_at'] ?? 'N/A') ?></span>
            </div>
        </div>
    </div>

    <!-- Linked Contacts Card -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h2 class="card-title">Key Organization Contacts (<?= count($contacts ?? []) ?>)</h2>
            <span class="badge badge-neutral">Directory</span>
        </div>

        <div class="space-y-3 text-xs">
            <?php if (!empty($contacts)): ?>
                <?php foreach ($contacts as $cont): ?>
                    <div class="p-3.5 rounded-lg bg-surface-subtle border flex justify-between items-center">
                        <div>
                            <div class="font-semibold text-main text-sm">
                                <?= e($cont['first_name'] . ' ' . $cont['last_name']) ?>
                                <?php if (!empty($cont['is_primary'])): ?>
                                    <span class="badge badge-brand text-2xs ml-2">Primary Decision Maker</span>
                                <?php endif; ?>
                            </div>
                            <div class="text-muted text-xs mt-0.5"><?= e($cont['job_title'] ?: 'Title N/A') ?> &bull; <?= e($cont['email'] ?: 'No Email') ?></div>
                        </div>
                        <div class="font-mono text-muted text-xs"><?= e($cont['phone'] ?: '') ?></div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-8">No specific contact individuals linked to this account yet.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
