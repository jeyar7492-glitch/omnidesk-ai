<?php
/**
 * OmniDesk AI — Knowledge Center Documents View (Phase 8)
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$docList = $documents ?? [];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Documents Header Toolbar ─────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight mb-1">Knowledge Center & Document Vault</h1>
            <p class="text-muted text-sm mb-0">Corporate Policy Repositories, RAG Vector Search Index, and Document Approval Workflows</p>
        </div>

        <div class="flex items-center gap-3">
            <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="document.getElementById('newDocModal').classList.add('active')">+ Upload Document</button>
        </div>
    </div>
</div>

<!-- ── Documents Table ──────────────────────────────────────────────── -->
<div class="card p-6 mb-6">
    <div class="table-responsive">
        <table class="table-custom w-full text-xs">
            <thead>
                <tr class="border-b text-left text-muted uppercase">
                    <th class="p-3">Document Title</th>
                    <th class="p-3">Category</th>
                    <th class="p-3">Version</th>
                    <th class="p-3">Author</th>
                    <th class="p-3">File Size</th>
                    <th class="p-3">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($docList)): ?>
                    <?php foreach ($docList as $d): ?>
                        <tr class="border-b hover:bg-surface-subtle">
                            <td class="p-3 font-semibold text-main">📄 <?= e($d['title']) ?></td>
                            <td class="p-3 text-muted"><?= e($d['category']) ?></td>
                            <td class="p-3 font-mono text-muted">v<?= e($d['version']) ?></td>
                            <td class="p-3 text-muted"><?= e($d['author_name']) ?></td>
                            <td class="p-3 font-mono text-muted"><?= number_format(($d['file_size'] / 1024), 1) ?> KB</td>
                            <td class="p-3">
                                <span class="badge badge-success text-2xs uppercase"><?= e($d['status']) ?></span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="6" class="text-center p-6 text-muted">No documents stored in Knowledge Vault.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- ── New Document Modal ───────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newDocModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base">Index New Knowledge Document</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newDocModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/documents/save') ?>" method="POST" class="space-y-3 text-xs">
            <?= csrf_field() ?>
            <div>
                <label class="form-label" for="doc_title">Document Title *</label>
                <input type="text" id="doc_title" name="title" class="form-input" placeholder="e.g. Q4 Financial Operating Framework" required>
            </div>
            <div>
                <label class="form-label" for="doc_cat">Category</label>
                <select id="doc_cat" name="category" class="form-input">
                    <option value="Security & SLA">Security & SLA</option>
                    <option value="Sales & CRM">Sales & CRM</option>
                    <option value="Engineering & Architecture">Engineering & Architecture</option>
                    <option value="General">General</option>
                </select>
            </div>
            <div class="pt-3 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newDocModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Index Document</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
