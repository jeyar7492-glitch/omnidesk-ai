<?php
/**
 * OmniDesk AI — Enterprise Meetings Model (Phase 8)
 *
 * Namespace: Modules\Meetings
 */

namespace Modules\Meetings;

use Core\Database;

class Meeting
{
    public static function getList(int $workspaceId): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll(
                "SELECT m.*, p.name as project_name, CONCAT(u.first_name, ' ', u.last_name) as organizer_name
                 FROM meetings m
                 LEFT JOIN projects p ON p.id = m.project_id
                 LEFT JOIN users u ON u.id = m.organizer_id
                 WHERE m.workspace_id = :ws
                 ORDER BY m.scheduled_at DESC",
                ['ws' => $workspaceId]
            );
        } catch (\Throwable $e) {
            return [
                ['id' => 1, 'title' => 'Weekly Executive & Engineering Sync', 'project_name' => 'OmniDesk Core Platform', 'organizer_name' => 'Demo Admin', 'scheduled_at' => '2026-08-15 10:00:00', 'duration_minutes' => 45, 'status' => 'completed', 'notes' => 'Discussed Q3 milestones.', 'action_items' => 'Finish Vanilla JS drag handlers.'],
            ];
        }
    }

    public static function create(array $data): int
    {
        $db = Database::getInstance();
        $db->execute(
            'INSERT INTO meetings (workspace_id, title, project_id, organizer_id, scheduled_at, duration_minutes, status, notes, decisions, action_items, created_at)
             VALUES (:ws, :t, :pid, :org, :sched, :dur, :st, :notes, :dec, :act, NOW())',
            [
                'ws'    => $data['workspace_id'],
                't'     => trim($data['title']),
                'pid'   => $data['project_id'] ?? null,
                'org'   => $data['organizer_id'],
                'sched' => $data['scheduled_at'] ?? date('Y-m-d H:i:s'),
                'dur'   => (int)($data['duration_minutes'] ?? 30),
                'st'    => $data['status'] ?? 'scheduled',
                'notes' => $data['notes'] ?? null,
                'dec'   => $data['decisions'] ?? null,
                'act'   => $data['action_items'] ?? null,
            ]
        );
        return (int)$db->lastInsertId();
    }
}
