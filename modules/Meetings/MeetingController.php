<?php
/**
 * OmniDesk AI — Enterprise Meetings Controller (Phase 8)
 *
 * Namespace: Modules\Meetings
 */

namespace Modules\Meetings;

use Core\Auth;
use Core\Security;
use Core\DashboardService;
use Modules\Projects\Project;

class MeetingController
{
    /**
     * GET /meetings
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Meetings & Action Items Repository';

        $meetings = Meeting::getList($wsId);
        $projects = Project::getList($wsId)['data'] ?? [];

        require_once __DIR__ . '/views/index.php';
    }

    /**
     * POST /meetings/save
     */
    public function saveMeeting(array $params = []): void
    {
        Security::requireValidCsrf();
        Auth::requirePermission('dashboard.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $title = trim($_POST['title'] ?? '');
        if (!empty($title)) {
            Meeting::create([
                'workspace_id'     => $wsId,
                'title'            => $title,
                'project_id'       => !empty($_POST['project_id']) ? (int)$_POST['project_id'] : null,
                'organizer_id'     => $userId,
                'scheduled_at'     => $_POST['scheduled_at'] ?? date('Y-m-d H:i:s'),
                'duration_minutes' => (int)($_POST['duration_minutes'] ?? 30),
                'notes'            => $_POST['notes'] ?? null,
                'action_items'     => $_POST['action_items'] ?? null,
            ]);
            flash('success', 'Meeting record scheduled successfully.');
        }

        redirect('/meetings');
    }
}
