<?php
/**
 * OmniDesk AI — Autonomous Automation Controller (Phase 8)
 *
 * Namespace: Modules\Automation
 */

namespace Modules\Automation;

use Core\Auth;
use Core\Security;
use Core\DashboardService;

class AutomationController
{
    /**
     * GET /automation
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Autonomous Automation Engine';

        $rules = AutomationRule::getList($wsId);
        require_once __DIR__ . '/views/index.php';
    }

    /**
     * POST /automation/save
     */
    public function saveRule(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $name = trim($_POST['name'] ?? '');
        if (!empty($name)) {
            AutomationRule::create([
                'workspace_id'  => $wsId,
                'name'          => $name,
                'trigger_event' => $_POST['trigger_event'] ?? 'task_overdue',
                'action_type'   => $_POST['action_type'] ?? 'notify',
            ]);
            flash('success', 'Autonomous automation rule created successfully.');
        }

        redirect('/automation');
    }
}
