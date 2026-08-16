<?php
/**
 * OmniDesk AI — CRM Tag Model
 *
 * Reusable CRM tag repository and many-to-many entity tag mapping.
 */

namespace Modules\CRM;

use Core\Database;

class Tag
{
    /**
     * Get tags for workspace.
     */
    public static function getList(int $workspaceId): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll('SELECT * FROM crm_tags WHERE workspace_id = :ws ORDER BY name ASC', ['ws' => $workspaceId]);
        } catch (\Throwable $e) {
            return [
                ['id' => 1, 'name' => 'Enterprise', 'color' => '#4f46e5'],
                ['id' => 2, 'name' => 'High Value', 'color' => '#10b981'],
                ['id' => 3, 'name' => 'Hot Lead',   'color' => '#ef4444'],
                ['id' => 4, 'name' => 'VIP',        'color' => '#f59e0b'],
            ];
        }
    }

    /**
     * Create tag.
     */
    public static function create(int $workspaceId, string $name, string $color = '#6366f1'): int
    {
        $db = Database::getInstance();
        $db->execute(
            'INSERT IGNORE INTO crm_tags (workspace_id, name, color, created_at) VALUES (:ws, :name, :color, NOW())',
            ['ws' => $workspaceId, 'name' => trim($name), 'color' => $color]
        );
        return (int)$db->lastInsertId();
    }
}
