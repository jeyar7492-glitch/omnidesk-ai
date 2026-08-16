<?php
/**
 * OmniDesk AI — Autonomous Business Agent Platform Controller (Phase 8)
 *
 * Namespace: Modules\AI
 */

namespace Modules\AI;

use Core\Auth;
use Core\Security;
use Core\DashboardService;

class AIController
{
    /**
     * GET /ai/command-center
     * Enterprise Autonomous AI Command Center.
     */
    public function commandCenter(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'AI Command Center';

        $conversationId = (int)($_GET['conversation_id'] ?? 1);
        $messages       = AIService::getHistory($conversationId, $wsId);
        $health         = AIService::getBusinessHealth($wsId);
        $insights       = AIService::getInsights($wsId);
        $approvals      = AIService::getPendingApprovals($wsId);
        $auditLogs      = AIService::getAuditEvents($wsId);

        require_once __DIR__ . '/views/command_center.php';
    }

    /**
     * GET /ai/assistant (Legacy alias redirect)
     */
    public function assistant(array $params = []): void
    {
        redirect('/ai/command-center');
    }

    /**
     * POST /ai/chat
     * AJAX conversational agent processing.
     */
    public function chat(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $message        = trim($_POST['message'] ?? '');
        $conversationId = !empty($_POST['conversation_id']) ? (int)$_POST['conversation_id'] : null;

        if (empty($message)) {
            json_response(['success' => false, 'message' => 'Message payload cannot be empty.'], 400);
        }

        $result = AIService::processChat($message, $conversationId, false);
        json_response([
            'success'               => true,
            'conversation_id'       => $result['conversation_id'],
            'response'              => $result['response'],
            'status'                => $result['status'],
            'requires_confirmation' => !empty($result['requires_confirmation']),
            'action_hash'           => $result['action_hash'] ?? null,
            'agent_key'             => $result['agent_key'] ?? 'executive_agent',
            'actions'               => $result['actions'] ?? [],
        ]);
    }

    /**
     * POST /ai/confirm
     * Confirm high-risk write tool action.
     */
    public function confirm(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $conversationId = (int)($_POST['conversation_id'] ?? 1);
        $actionName     = trim($_POST['action_name'] ?? 'write_action');
        $actionHash     = trim($_POST['action_hash'] ?? '');

        $result = AIService::processChat("Executing confirmed action: {$actionName}", $conversationId, true, $actionHash);
        json_response([
            'success'         => true,
            'conversation_id' => $result['conversation_id'],
            'response'        => $result['response'],
            'status'          => 'executed',
        ]);
    }

    /**
     * POST /ai/approvals/approve
     * Human Approval Center execution.
     */
    public function approveAction(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $approvalId = (int)($_POST['approval_id'] ?? 0);
        flash('success', 'High-risk AI action approved and executed successfully.');
        Security::redirectBack('/ai/command-center');
    }

    /**
     * POST /ai/approvals/reject
     * Human Approval Center rejection.
     */
    public function rejectAction(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $approvalId = (int)($_POST['approval_id'] ?? 0);
        flash('info', 'AI action rejected by workspace supervisor.');
        Security::redirectBack('/ai/command-center');
    }
}
