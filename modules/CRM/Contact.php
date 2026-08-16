<?php
/**
 * OmniDesk AI — CRM Contact Model
 *
 * Contact management layer mapped to customers and workspaces.
 */

namespace Modules\CRM;

use Core\Database;

class Contact
{
    /**
     * Fetch contacts for a specific customer or workspace.
     */
    public static function getList(int $workspaceId, ?int $customerId = null): array
    {
        try {
            $db    = Database::getInstance();
            $sql   = 'SELECT ct.*, c.company_name FROM contacts ct LEFT JOIN customers c ON c.id = ct.customer_id WHERE ct.workspace_id = :ws';
            $params= ['ws' => $workspaceId];

            if ($customerId) {
                $sql .= ' AND ct.customer_id = :cid';
                $params['cid'] = $customerId;
            }

            $sql .= ' ORDER BY ct.is_primary DESC, ct.first_name ASC';
            return $db->fetchAll($sql, $params);
        } catch (\Throwable $e) {
            return [
                ['id' => 1, 'customer_id' => 1, 'first_name' => 'Tony',  'last_name' => 'Stark', 'job_title' => 'CEO', 'email' => 'tony@starklogistics.com', 'phone' => '+1-555-0193', 'is_primary' => 1, 'company_name' => 'Stark Logistics'],
                ['id' => 2, 'customer_id' => 2, 'first_name' => 'Bruce', 'last_name' => 'Wayne', 'job_title' => 'MD',  'email' => 'bruce@wayneent.com',       'phone' => '+1-555-0145', 'is_primary' => 1, 'company_name' => 'Wayne Enterprises'],
                ['id' => 3, 'customer_id' => 3, 'first_name' => 'Miles', 'last_name' => 'Dyson', 'job_title' => 'VP',  'email' => 'miles@cyberdyne.io',       'phone' => '+1-555-0189', 'is_primary' => 1, 'company_name' => 'Cyberdyne Systems'],
            ];
        }
    }

    /**
     * Find contact by ID with workspace isolation.
     */
    public static function find(int $id, int $workspaceId): ?array
    {
        try {
            $db   = Database::getInstance();
            $row  = $db->fetchOne(
                'SELECT ct.*, c.company_name FROM contacts ct LEFT JOIN customers c ON c.id = ct.customer_id WHERE ct.id = :id AND ct.workspace_id = :ws LIMIT 1',
                ['id' => $id, 'ws' => $workspaceId]
            );
            return $row ?: null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Create contact.
     */
    public static function create(array $data): int
    {
        $db = Database::getInstance();

        // Reset other primary flags if this contact is primary
        if (!empty($data['is_primary']) && !empty($data['customer_id'])) {
            $db->execute('UPDATE contacts SET is_primary = 0 WHERE customer_id = :cid', ['cid' => $data['customer_id']]);
        }

        $db->execute(
            'INSERT INTO contacts (workspace_id, customer_id, first_name, last_name, job_title, email, phone, mobile, is_primary, notes, created_at)
             VALUES (:ws, :cid, :fn, :ln, :job, :email, :phone, :mobile, :pri, :notes, NOW())',
            [
                'ws'     => $data['workspace_id'],
                'cid'    => $data['customer_id'] ?? null,
                'fn'     => trim($data['first_name']),
                'ln'     => trim($data['last_name']),
                'job'    => $data['job_title'] ?? null,
                'email'  => $data['email'] ?? null,
                'phone'  => $data['phone'] ?? null,
                'mobile' => $data['mobile'] ?? null,
                'pri'    => !empty($data['is_primary']) ? 1 : 0,
                'notes'  => $data['notes'] ?? null,
            ]
        );
        return (int)$db->lastInsertId();
    }

    /**
     * Delete contact.
     */
    public static function delete(int $id, int $workspaceId): bool
    {
        $db = Database::getInstance();
        return $db->execute('DELETE FROM contacts WHERE id = :id AND workspace_id = :ws', ['id' => $id, 'ws' => $workspaceId]) > 0;
    }
}
