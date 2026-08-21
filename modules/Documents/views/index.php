<?php
/**
 * OmniDesk AI — Knowledge Center Documents View
 *
 * Corporate Policy Repositories, RAG Vector Search Index, and Document Asset Workflows.
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
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main">Knowledge Center & Document Vault</h1>
                <span class="badge badge-brand">RAG Indexed</span>
            </div>
            <p class="text-muted text-xs">
                Corporate policy archives, semantic AI vector index, chunk retrieval embeddings, and governance documentation.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('newDocModal').classList.add('active')">+ Index Document</button>
        </div>
    </div>
</div>

<!-- ── Documents Table ──────────────────────────────────────────────── -->
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Document Asset Title</th>
                <th>Classification</th>
                <th>Version</th>
                <th>Author</th>
                <th>File Size</th>
                <th>RAG State</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($docList)): ?>
                <?php foreach ($docList as $d): ?>
                    <tr>
                        <td class="font-bold text-main">
                            <span class="mr-1.5">📄</span> <?= e($d['title']) ?>
                        </td>
                        <td class="text-muted font-medium"><?= e($d['category']) ?></td>
                        <td class="font-mono text-muted font-semibold">v<?= e($d['version']) ?></td>
                        <td class="text-main font-medium"><?= e($d['author_name']) ?></td>
                        <td class="font-mono text-muted text-xs"><?= number_format(($d['file_size'] / 1024), 1) ?> KB</td>
                        <td>
                            <span class="badge badge-success text-2xs uppercase">✓ <?= e($d['status']) ?></span>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="6" class="text-center p-8 text-muted">No documents stored in Knowledge Vault.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- ── New Document Modal ───────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="newDocModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main">Index Knowledge Asset</h3>
            <button type="button" class="btn-icon" onclick="document.getElementById('newDocModal').classList.remove('active')">&times;</button>
        </div>
        <form action="<?= url('/documents/save') ?>" method="POST" class="space-y-3.5 text-xs">
            <?= csrf_field() ?>
            <div class="form-group mb-2">
                <label class="form-label" for="doc_title">Document Title *</label>
                <input type="text" id="doc_title" name="title" class="form-input" placeholder="e.g. Q4 Financial Operating Framework" required>
            </div>
            <div class="form-group mb-3">
                <label class="form-label" for="doc_cat">Classification Category</label>
                <select id="doc_cat" name="category" class="form-select">
                    <option value="Security & SLA">Security & SLA</option>
                    <option value="Sales & CRM">Sales & CRM</option>
                    <option value="Engineering & Architecture">Engineering & Architecture</option>
                    <option value="General">General Corporate</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newDocModal').classList.remove('active')">Cancel</button>
                <button type="submit" class="btn btn-primary">Index Document</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
