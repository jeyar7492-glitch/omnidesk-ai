<?php
/**
 * OmniDesk AI — Idempotency Service (Phase 14)
 *
 * Enforces transaction-level idempotency for high-risk write operations.
 * Prevents double-charging, duplicate invoices, and double-submits.
 */

namespace Core;

use Exception;

class IdempotencyService
{
    /**
     * Check if a request has already been processed for the workspace.
     */
    public static function check(string $key, int $workspaceId, int $userId, string $toolName, array $payload): ?array
    {
        if (empty($key)) {
            return null;
        }

        $requestHash = hash('sha256', json_encode($payload));

        try {
            $db = Database::getInstance();
            $record = $db->fetchOne(
                'SELECT * FROM idempotency_keys 
                 WHERE idempotency_key = :key AND workspace_id = :ws LIMIT 1',
                ['key' => $key, 'ws' => $workspaceId]
            );

            if ($record) {
                return [
                    'is_duplicate'     => true,
                    'status'           => $record['status'],
                    'response_payload' => json_decode($record['response_payload'] ?? '{}', true),
                    'transaction_id'   => $record['transaction_id'],
                    'created_at'       => $record['created_at']
                ];
            }
        } catch (\Throwable $e) {
            // Fallback for environment without DB
        }

        return ['is_duplicate' => false, 'request_hash' => $requestHash];
    }

    /**
     * Store the completed transaction response against the idempotency key.
     */
    public static function record(string $key, int $workspaceId, int $userId, string $toolName, array $payload, array $response, ?int $transactionId = null): bool
    {
        if (empty($key)) {
            return false;
        }

        $requestHash = hash('sha256', json_encode($payload));

        try {
            $db = Database::getInstance();
            $db->execute(
                'INSERT INTO idempotency_keys (idempotency_key, workspace_id, user_id, tool_name, request_hash, response_payload, transaction_id, status, created_at)
                 VALUES (:key, :ws, :uid, :tool, :rhash, :resp, :txid, "completed", NOW())
                 ON DUPLICATE KEY UPDATE response_payload = :resp2, status = "completed", updated_at = NOW()',
                [
                    'key'   => $key,
                    'ws'    => $workspaceId,
                    'uid'   => $userId,
                    'tool'  => $toolName,
                    'rhash' => $requestHash,
                    'resp'  => json_encode($response),
                    'resp2' => json_encode($response),
                    'txid'  => $transactionId
                ]
            );
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
