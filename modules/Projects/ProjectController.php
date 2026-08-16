<?php
/**
 * OmniDesk AI — Project Controller (Phase 5)
 *
 * Namespace: Modules\Projects
 */

namespace Modules\Projects;

use Core\Auth;
use Core\Security;
use Core\DashboardService;
use Modules\Tasks\Task;

class ProjectController
{
    /**
     * GET /projects
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('projects.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Project Workspaces Directory';

        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        $result = Project::getList($wsId, ['search' => $search, 'status' => $status]);
        require_once __DIR__ . '/views/index.php';
    }

    /**
     * GET /projects/show
     */
    public function show(array $params = []): void
    {
        Auth::requirePermission('projects.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $id              = (int)($_GET['id'] ?? 0);

        $project = Project::find($id, $activeWorkspace['id']);
        if (!$project) {
            flash('error', 'Project workspace not found or access denied.');
            redirect('/projects');
        }

        $tasks     = Task::getList($activeWorkspace['id'], ['project_id' => $id]);
        $pageTitle = 'Project — ' . $project['name'];

        require_once __DIR__ . '/views/show.php';
    }

    /**
     * POST /projects/save
     */
    public function save(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('projects.create');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $name = trim($_POST['name'] ?? '');
        if (empty($name)) {
            flash('error', 'Project name is required.');
            Security::redirectBack('/projects');
        }

        $projectId = Project::create([
            'workspace_id' => $wsId,
            'name'         => $name,
            'description'  => $_POST['description'] ?? null,
            'status'       => $_POST['status'] ?? 'active',
            'priority'     => $_POST['priority'] ?? 'medium',
            'start_date'   => $_POST['start_date'] ?? null,
            'due_date'     => $_POST['due_date'] ?? null,
            'budget'       => (float)($_POST['budget'] ?? 0.0),
            'manager_id'   => $userId,
            'created_by'   => $userId,
        ]);

        flash('success', 'New Project Workspace initialized successfully.');
        redirect('/projects/show?id=' . $projectId);
    }
}
