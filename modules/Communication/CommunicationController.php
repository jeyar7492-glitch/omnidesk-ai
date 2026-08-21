<?php
/**
 * OmniDesk AI — Enterprise Communication Controller (Phase 8)
 *
 * Namespace: Modules\Communication
 */

namespace Modules\Communication;

use Core\Auth;
use Core\Security;
use Core\DashboardService;

class CommunicationController
{
    /**
     * GET /communication
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Enterprise Communication Channels';

        $channelId = (int)($_GET['channel_id'] ?? 1);
        $channels  = Channel::getList($wsId);
        $messages  = Message::getListForChannel($channelId, $wsId);

        require_once __DIR__ . '/views/index.php';
    }

    /**
     * POST /communication/post
     */
    public function postMessage(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $channelId = (int)($_POST['channel_id'] ?? 1);
        $msg       = trim($_POST['message'] ?? $_POST['body'] ?? '');

        if (!empty($msg)) {
            Message::post([
                'workspace_id' => $wsId,
                'channel_id'   => $channelId,
                'sender_id'    => $userId,
                'message'      => $msg,
            ]);
            flash('success', 'Message posted to channel.');
        }

        redirect('/communication?channel_id=' . $channelId);
    }
}
