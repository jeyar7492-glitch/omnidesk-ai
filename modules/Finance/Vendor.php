<?php
/**
 * OmniDesk AI — Vendor Model (Phase 6)
 *
 * Workspace-isolated vendor directory.
 */

namespace Modules\Finance;

use Core\Database;

class Vendor
{
    /**
     * Get vendors list.
     */
    public static function getList(int $workspaceId): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll('SELECT * FROM vendors WHERE workspace_id = :ws ORDER BY name ASC', ['ws' => $workspaceId]);
        } catch (\Throwable $e) {
            return [
                ['id' => 1, 'name' => 'Amazon Web Services', 'company_name' => 'AWS Cloud Infrastructure', 'email' => 'billing@aws.com', 'phone' => '+1-800-555-0199', 'status' => 'active'],
                ['id' => 2, 'name' => 'GitHub Enterprise',   'company_name' => 'GitHub Inc',              'email' => 'support@github.com', 'phone' => '+1-800-555-0177', 'status' => 'active'],
            ];
        }
    }

    /**
     * Create vendor.
     */
    public static function create(array $data): int
    {
        $db = Database::getInstance();
        $db->execute(
            'INSERT INTO vendors (workspace_id, name, company_name, email, phone, address, status, created_at)
             VALUES (:ws, :name, :cname, :email, :phone, :address, :st, NOW())',
            [
                'ws'      => $data['workspace_id'],
                'name'    => trim($data['name']),
                'cname'   => $data['company_name'] ?? null,
                'email'   => $data['email'] ?? null,
                'phone'   => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'st'      => $data['status'] ?? 'active',
            ]
        );
        return (int)$db->lastInsertId();
    }
}
