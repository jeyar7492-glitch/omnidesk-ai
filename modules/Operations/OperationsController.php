<?php
/**
 * OmniDesk AI — Production Observability & Operations Controller (Phase 11)
 *
 * Namespace: Modules\Operations
 */

namespace Modules\Operations;

use Core\Auth;
use Core\Security;
use Core\HealthService;
use Core\ActivityLog;
use Core\DashboardService;

class OperationsController
{
    /**
     * GET /operations/health
     * Admin-only System Health Dashboard.
     */
    public function health(array $params = []): void
    {
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'System Health & Operations Monitor';

        $healthChecks = HealthService::checkSystem();

        require_once __DIR__ . '/views/health.php';
    }

    /**
     * GET /operations/security
     * Admin-only Security Events Log Dashboard.
     */
    public function security(array $params = []): void
    {
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Security Event Monitoring';

        $severity = !empty($_GET['severity']) ? trim($_GET['severity']) : null;
        $events   = HealthService::getSecurityEvents($wsId, $severity);

        require_once __DIR__ . '/views/security.php';
    }

    /**
     * GET /operations/audit
     * Admin-only Audit Trail Viewer.
     */
    public function audit(array $params = []): void
    {
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Enterprise Audit Trail';

        $module = !empty($_GET['module']) ? trim($_GET['module']) : null;
        $logs   = ActivityLog::getRecent($wsId, 30);

        require_once __DIR__ . '/views/audit.php';
    }

    /**
     * GET /operations/ai
     * Admin-only AI Observability & Performance Metrics.
     */
    public function aiMetrics(array $params = []): void
    {
        Auth::requirePermission('settings.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'AI Observability & Agent Performance';

        $metrics = HealthService::getAiMetrics($wsId);

        require_once __DIR__ . '/views/ai_metrics.php';
    }

    /**
     * GET /health
     * Public sanitized JSON health endpoint.
     */
    public function publicHealth(array $params = []): void
    {
        $summary = HealthService::getPublicHealthSummary();
        $this->jsonResponse($summary, $summary['status'] === 'healthy' ? 200 : 503);
    }

    /**
     * GET /live
     * Liveness Probe for container / process orchestrators.
     */
    public function live(array $params = []): void
    {
        $res = HealthService::getLiveness();
        $this->jsonResponse($res, 200);
    }

    /**
     * GET /ready
     * Readiness Probe for traffic routing.
     */
    public function ready(array $params = []): void
    {
        $res = HealthService::getReadiness();
        $this->jsonResponse($res, $res['status'] === 'ready' ? 200 : 503);
    }

    /**
     * Helper to send clean JSON response.
     */
    private function jsonResponse(array $data, int $code = 200): void
    {
        header('Content-Type: application/json');
        http_response_code($code);
        echo json_encode($data);
        exit;
    }
}


