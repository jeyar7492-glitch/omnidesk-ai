<?php
/**
 * OmniDesk AI — Task Controller (Phase 5)
 *
 * Namespace: Modules\Tasks
 */

namespace Modules\Tasks;

use Core\Auth;
use Core\Security;
use Core\DashboardService;
use Modules\Projects\Project;

class TaskController
{
    /**
     * GET /tasks
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('tasks.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Global Tasks Directory';

        $search   = trim($_GET['search'] ?? '');
        $status   = trim($_GET['status'] ?? '');
        $priority = trim($_GET['priority'] ?? '');

        $tasks = Task::getList($wsId, ['search' => $search, 'status' => $status, 'priority' => $priority]);
        require_once __DIR__ . '/views/index.php';
    }

    /**
     * GET /tasks/kanban
     */
    public function kanban(array $params = []): void
    {
        Auth::requirePermission('tasks.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Interactive Task Kanban Board';

        $tasks = Task::getList($wsId);

        $kanban = [
            'backlog'     => [],
            'todo'        => [],
            'in_progress' => [],
            'review'      => [],
            'testing'     => [],
            'completed'   => [],
        ];

        foreach ($tasks as $t) {
            $st = $t['status'];
            if (isset($kanban[$st])) {
                $kanban[$st][] = $t;
            }
        }

        $projects = Project::getList($wsId)['data'] ?? [];
        require_once __DIR__ . '/views/kanban.php';
    }

    /**
     * GET /tasks/calendar
     */
    public function calendar(array $params = []): void
    {
        Auth::requirePermission('tasks.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Task Deadline Calendar View';

        $tasks = Task::getList($wsId);
        require_once __DIR__ . '/views/calendar.php';
    }

    /**
     * GET /tasks/show
     */
    public function show(array $params = []): void
    {
        Auth::requirePermission('tasks.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $id              = (int)($_GET['id'] ?? 0);

        $task = Task::find($id, $wsId);
        if (!$task) {
            flash('error', 'Task item not found or access denied.');
            redirect('/tasks');
        }

        $checklists = Task::getChecklists($id, $wsId);
        $comments   = Task::getComments($id, $wsId);
        $pageTitle  = 'Task Details — ' . $task['title'];

        require_once __DIR__ . '/views/show.php';
    }

    /**
     * POST /tasks/save
     */
    public function save(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('tasks.create');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $title     = trim($_POST['title'] ?? '');
        $projectId = (int)($_POST['project_id'] ?? 0);

        if (empty($title) || $projectId <= 0) {
            flash('error', 'Task title and project selection are required.');
            Security::redirectBack('/tasks/kanban');
        }

        Task::create([
            'workspace_id'      => $wsId,
            'project_id'        => $projectId,
            'title'             => $title,
            'description'       => $_POST['description'] ?? null,
            'status'            => $_POST['status'] ?? 'todo',
            'priority'          => $_POST['priority'] ?? 'medium',
            'assigned_user_id'  => $userId,
            'created_by'        => $userId,
            'due_date'          => $_POST['due_date'] ?? null,
            'estimated_minutes' => (int)($_POST['estimated_minutes'] ?? 0),
        ]);

        flash('success', 'Task item added successfully.');
        redirect('/tasks/kanban');
    }

    /**
     * POST /tasks/update-status (AJAX Endpoint)
     */
    public function updateStatus(array $params = []): void
    {
        Security::requireValidCsrf();

        if (!Auth::hasPermission('tasks.edit')) {
            json_response(['success' => false, 'message' => 'Forbidden: missing tasks.edit permission.'], 403);
        }

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $taskId          = (int)($_POST['task_id'] ?? 0);
        $newStatus       = trim($_POST['status'] ?? '');

        if ($taskId <= 0 || empty($newStatus)) {
            json_response(['success' => false, 'message' => 'Invalid parameters.'], 400);
        }

        $success = Task::updateStatus($taskId, $activeWorkspace['id'], $newStatus, $userId);
        if ($success) {
            json_response(['success' => true, 'message' => 'Task status updated successfully!']);
        } else {
            json_response(['success' => false, 'message' => 'Failed to update task status.'], 400);
        }
    }

    /**
     * POST /tasks/comment
     */
    public function addComment(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('tasks.edit');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $taskId          = (int)($_POST['task_id'] ?? 0);
        $comment         = trim($_POST['comment'] ?? '');

        if ($taskId > 0 && !empty($comment)) {
            Task::addComment($taskId, $activeWorkspace['id'], $userId, $comment);
            flash('success', 'Comment posted.');
        }

        Security::redirectBack('/tasks/show?id=' . $taskId);
    }
}
