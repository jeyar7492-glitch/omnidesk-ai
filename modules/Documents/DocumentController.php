<?php
/**
 * OmniDesk AI — Knowledge Center Documents Controller (Phase 8)
 *
 * Namespace: Modules\Documents
 */

namespace Modules\Documents;

use Core\Auth;
use Core\Security;
use Core\DashboardService;

class DocumentController
{
    /**
     * GET /documents
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('documents.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Knowledge Center & Document Vault';

        $documents = Document::getList($wsId);
        require_once __DIR__ . '/views/index.php';
    }

    /**
     * POST /documents/save
     */
    public function saveDocument(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('documents.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $title = trim($_POST['title'] ?? '');
        if (!empty($title)) {
            Document::create([
                'workspace_id' => $wsId,
                'title'        => $title,
                'category'     => $_POST['category'] ?? 'General',
                'author_id'    => $userId,
            ]);
            flash('success', 'Document indexed in Knowledge Vault.');
        }

        redirect('/documents');
    }
}
