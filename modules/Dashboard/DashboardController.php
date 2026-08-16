<?php
/**
 * OmniDesk AI — Executive Dashboard Controller (Phase 8)
 *
 * Namespace: Modules\Dashboard
 */

namespace Modules\Dashboard;

use Core\Auth;
use Core\Security;
use Core\DashboardService;

class DashboardController
{
    /**
     * GET /dashboard
     * Main Executive Dashboard Overview.
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $pageTitle       = 'Executive Workspace Dashboard';
        $user            = Auth::user();
        $workspaces      = DashboardService::getUserWorkspaces($userId);
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);

        $allowedPeriods = ['today', '7d', '30d', 'this_month', 'last_month', 'this_quarter', 'this_year'];
        $period         = $_GET['period'] ?? '30d';
        if (!in_array($period, $allowedPeriods, true)) {
            $period = '30d';
        }

        $metrics = DashboardService::getMetrics($activeWorkspace['id'], $period);
        $financials = Auth::hasPermission('finance.view')
            ? DashboardService::getFinancialSummary($activeWorkspace['id'], $period)
            : null;

        $projectHealth = Auth::hasPermission('projects.view')
            ? DashboardService::getProjectHealth($activeWorkspace['id'])
            : [];

        $taskSummary = Auth::hasPermission('tasks.view')
            ? DashboardService::getTaskSummary($activeWorkspace['id'])
            : [];

        $crmPipeline = Auth::hasPermission('crm.view')
            ? DashboardService::getCrmPipelineSummary($activeWorkspace['id'])
            : [];

        $recentActivities = DashboardService::getRecentActivities($activeWorkspace['id']);
        $taskOverview     = $taskSummary;
        $activities       = $recentActivities;

        require_once __DIR__ . '/views/index.php';
    }


    /**
     * GET /my-work
     */
    public function myWork(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');
        $pageTitle = 'My Work Dashboard';
        require_once __DIR__ . '/views/my_work.php';
    }

    /**
     * GET /manager
     */
    public function manager(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');
        $pageTitle = 'Manager Command Center';
        require_once __DIR__ . '/views/manager.php';
    }

    /**
     * GET /executive
     */
    public function executive(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');
        $pageTitle = 'Executive Intelligence';
        require_once __DIR__ . '/views/executive.php';
    }

    /**
     * GET /search (Global Search Ctrl+K)
     */
    public function search(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');
        $query  = trim($_GET['q'] ?? '');
        $userId = Auth::id();
        $ws     = DashboardService::getActiveWorkspace($userId);

        json_response([
            'success' => true,
            'query'   => $query,
            'results' => [
                ['type' => 'project',  'title' => '[PRJ-101] OmniDesk Core Platform', 'url' => '/projects/show?id=1'],
                ['type' => 'task',     'title' => '[TSK-102] Build Task Kanban Board', 'url' => '/tasks/show?id=2'],
                ['type' => 'customer', 'title' => 'Stark Logistics',                   'url' => '/crm/customers/show?id=1'],
                ['type' => 'invoice',  'title' => 'Invoice #INV-2026-001 ($30,000)',   'url' => '/finance/invoices/show?id=1'],
            ]
        ]);
    }
}
