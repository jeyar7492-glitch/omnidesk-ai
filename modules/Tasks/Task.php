<?php
/**
 * OmniDesk AI — Task Model (Phase 5)
 *
 * Workspace-isolated task management, Kanban status transitions,
 * checklists, comments, and time tracking logs.
 */

namespace Modules\Tasks;

use Core\Database;
use Core\ActivityLog;

class Task
{
    /**
     * Get task list with filters and search.
     */
    public static function getList(int $workspaceId, array $filters = []): array
    {
        $where  = ['t.workspace_id = :ws'];
        $params = ['ws' => $workspaceId];

        if (!empty($filters['project_id'])) {
            $where[] = 't.project_id = :pid';
            $params['pid'] = (int)$filters['project_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 't.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['priority'])) {
            $where[] = 't.priority = :priority';
            $params['priority'] = $filters['priority'];
        }

        if (!empty($filters['assigned_user_id'])) {
            $where[] = 't.assigned_user_id = :uid';
            $params['uid'] = (int)$filters['assigned_user_id'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(t.title LIKE :search OR t.code LIKE :search OR t.description LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $whereSql = implode(' AND ', $where);

        try {
            $db   = Database::getInstance();
            $rows = $db->fetchAll(
                "SELECT t.*, p.name as project_name, CONCAT(u.first_name, ' ', u.last_name) as assignee_name,
                        (SELECT COUNT(*) FROM task_checklists c WHERE c.task_id = t.id) as total_checklists,
                        (SELECT COUNT(*) FROM task_checklists c WHERE c.task_id = t.id AND c.is_completed = 1) as completed_checklists,
                        (SELECT COUNT(*) FROM task_comments cm WHERE cm.task_id = t.id) as total_comments
                 FROM tasks t
                 LEFT JOIN projects p ON p.id = t.project_id
                 LEFT JOIN users u ON u.id = t.assigned_user_id
                 WHERE {$whereSql}
                 ORDER BY t.created_at DESC",
                $params
            );

            return $rows;
        } catch (\Throwable $e) {
            // Fallback for environment without DB
            return [
                ['id' => 1, 'code' => 'TSK-101', 'title' => 'Implement Project Models & Controllers', 'status' => 'completed',   'priority' => 'urgent', 'project_name' => 'OmniDesk Core Platform', 'assignee_name' => 'Demo Admin', 'due_date' => '2026-08-15', 'total_checklists' => 2, 'completed_checklists' => 2, 'total_comments' => 1],
                ['id' => 2, 'code' => 'TSK-102', 'title' => 'Build 6-Column Task Kanban Board',    'status' => 'in_progress', 'priority' => 'high',   'project_name' => 'OmniDesk Core Platform', 'assignee_name' => 'Demo Admin', 'due_date' => '2026-08-18', 'total_checklists' => 2, 'completed_checklists' => 1, 'total_comments' => 1],
                ['id' => 3, 'code' => 'TSK-103', 'title' => 'Calendar View Integration',          'status' => 'todo',        'priority' => 'medium', 'project_name' => 'OmniDesk Core Platform', 'assignee_name' => 'Demo User',  'due_date' => '2026-08-25', 'total_checklists' => 0, 'completed_checklists' => 0, 'total_comments' => 0],
                ['id' => 4, 'code' => 'TSK-104', 'title' => 'OAuth2 Token Endpoint Audit',         'status' => 'review',      'priority' => 'high',   'project_name' => 'Enterprise API Gateway', 'assignee_name' => 'Demo Admin', 'due_date' => '2026-09-01', 'total_checklists' => 0, 'completed_checklists' => 0, 'total_comments' => 0],
                ['id' => 5, 'code' => 'TSK-105', 'title' => 'Mobile Drawer Touch Optimization',    'status' => 'backlog',     'priority' => 'urgent', 'project_name' => 'Mobile Shell Redesign',  'assignee_name' => 'Demo User',  'due_date' => '2026-09-10', 'total_checklists' => 0, 'completed_checklists' => 0, 'total_comments' => 0],
            ];
        }
    }

    /**
     * Find single task by ID with workspace isolation.
     */
    public static function find(int $id, int $workspaceId): ?array
    {
        try {
            $db  = Database::getInstance();
            $row = $db->fetchOne(
                "SELECT t.*, p.name as project_name, CONCAT(u.first_name, ' ', u.last_name) as assignee_name,
                        CONCAT(cby.first_name, ' ', cby.last_name) as creator_name
                 FROM tasks t
                 LEFT JOIN projects p ON p.id = t.project_id
                 LEFT JOIN users u ON u.id = t.assigned_user_id
                 LEFT JOIN users cby ON cby.id = t.created_by
                 WHERE t.id = :id AND t.workspace_id = :ws LIMIT 1",
                ['id' => $id, 'ws' => $workspaceId]
            );
            return $row ?: null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Create a new task.
     */
    public static function create(array $data): int
    {
        $db   = Database::getInstance();
        $code = 'TSK-' . rand(100, 999);

        $db->execute(
            'INSERT INTO tasks (workspace_id, project_id, milestone_id, code, title, description, status, priority, assigned_user_id, created_by, start_date, due_date, estimated_minutes, created_at)
             VALUES (:ws, :pid, :ms, :code, :title, :desc, :status, :pri, :assigned, :cby, :sdate, :ddate, :est, NOW())',
            [
                'ws'       => $data['workspace_id'],
                'pid'      => $data['project_id'],
                'ms'       => $data['milestone_id'] ?? null,
                'code'     => $code,
                'title'    => trim($data['title']),
                'desc'     => $data['description'] ?? null,
                'status'   => $data['status'] ?? 'todo',
                'pri'      => $data['priority'] ?? 'medium',
                'assigned' => $data['assigned_user_id'] ?? null,
                'cby'      => $data['created_by'] ?? null,
                'sdate'    => $data['start_date'] ?? null,
                'ddate'    => $data['due_date'] ?? null,
                'est'      => (int)($data['estimated_minutes'] ?? 0),
            ]
        );

        $taskId = (int)$db->lastInsertId();
        ActivityLog::info('Task created', ['task_id' => $taskId, 'project_id' => $data['project_id']]);
        return $taskId;
    }

    /**
     * Update task status (Kanban drag & drop transition handler).
     */
    public static function updateStatus(int $id, int $workspaceId, string $newStatus, int $userId): bool
    {
        $allowedStatuses = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'completed'];
        if (!in_array($newStatus, $allowedStatuses, true)) {
            return false;
        }

        $db = Database::getInstance();
        $completedAtSql = $newStatus === 'completed' ? 'NOW()' : 'NULL';

        $updated = $db->execute(
            "UPDATE tasks SET status = :st, completed_at = {$completedAtSql}, updated_at = NOW() WHERE id = :id AND workspace_id = :ws",
            ['st' => $newStatus, 'id' => $id, 'ws' => $workspaceId]
        ) > 0;

        if ($updated) {
            ActivityLog::info('Task status changed', ['task_id' => $id, 'new_status' => $newStatus, 'user_id' => $userId]);
        }

        return $updated;
    }

    /**
     * Get checklists for a task.
     */
    public static function getChecklists(int $taskId, int $workspaceId): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll(
                'SELECT * FROM task_checklists WHERE task_id = :tid AND workspace_id = :ws ORDER BY position ASC, id ASC',
                ['tid' => $taskId, 'ws' => $workspaceId]
            );
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Toggle checklist item state.
     */
    public static function toggleChecklist(int $checklistId, int $workspaceId): bool
    {
        try {
            $db = Database::getInstance();
            return $db->execute(
                'UPDATE task_checklists SET is_completed = IF(is_completed = 1, 0, 1) WHERE id = :id AND workspace_id = :ws',
                ['id' => $checklistId, 'ws' => $workspaceId]
            ) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Get task comments.
     */
    public static function getComments(int $taskId, int $workspaceId): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll(
                "SELECT tc.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
                 FROM task_comments tc
                 LEFT JOIN users u ON u.id = tc.user_id
                 WHERE tc.task_id = :tid AND tc.workspace_id = :ws
                 ORDER BY tc.created_at ASC",
                ['tid' => $taskId, 'ws' => $workspaceId]
            );
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Add comment to task.
     */
    public static function addComment(int $taskId, int $workspaceId, int $userId, string $comment): int
    {
        $db = Database::getInstance();
        $db->execute(
            'INSERT INTO task_comments (workspace_id, task_id, user_id, comment, created_at) VALUES (:ws, :tid, :uid, :comm, NOW())',
            ['ws' => $workspaceId, 'tid' => $taskId, 'uid' => $userId, 'comm' => trim($comment)]
        );
        return (int)$db->lastInsertId();
    }
}
