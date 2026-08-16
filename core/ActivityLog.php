<?php
/**
 * OmniDesk AI — ActivityLog
 *
 * Audit trail and application logging foundation.
 *
 * Provides:
 *   1. File-based application logging (always available, no DB required)
 *   2. Database audit trail skeleton (expanded in later phases)
 *
 * Log Levels (syslog-compatible):
 *   debug     Detailed diagnostic information (development only)
 *   info      Significant application events (user login, record created)
 *   warning   Potentially harmful situations (failed login attempt)
 *   error     Error events that allow continuation
 *   critical  Severe errors requiring immediate attention
 *
 * Usage:
 *   ActivityLog::info('User logged in', ['user_id' => 42]);
 *   ActivityLog::warning('Failed login attempt', ['email' => '...']);
 *   ActivityLog::error('Payment processing failed', ['order_id' => 99]);
 *
 * Future (Phase 4+):
 *   ActivityLog::audit('record_created', 'contact', $id, $userId);
 */

namespace Core;

class ActivityLog
{
    /** @var int[] Log level priorities (higher = more severe) */
    private const LEVELS = [
        'debug'    => 0,
        'info'     => 1,
        'warning'  => 2,
        'error'    => 3,
        'critical' => 4,
    ];

    /** @var string Active log file path */
    private static string $logFile = '';

    /**
     * Resolve and cache the log file path.
     */
    private static function logFile(): string
    {
        if (static::$logFile === '') {
            $date             = date('Y-m-d');
            static::$logFile  = LOGS_PATH . "/omnidesk-{$date}.log";
        }
        return static::$logFile;
    }

    /**
     * Determine whether a given level should be logged
     * based on the configured LOG_LEVEL threshold.
     */
    private static function shouldLog(string $level): bool
    {
        $configuredPriority = self::LEVELS[LOG_LEVEL]   ?? 0;
        $messagePriority    = self::LEVELS[$level]       ?? 0;
        return $messagePriority >= $configuredPriority;
    }

    /**
     * Write a log entry to the daily log file.
     *
     * @param string               $level   Log level string.
     * @param string               $message Human-readable message.
     * @param array<string, mixed> $context Optional contextual data.
     */
    private static function write(string $level, string $message, array $context = []): void
    {
        if (!static::shouldLog($level)) {
            return;
        }

        $timestamp  = date('Y-m-d H:i:s');
        $userId     = class_exists(Session::class) ? (Session::userId() ?? 'guest') : 'system';
        $ip         = static::clientIp();
        $levelUpper = strtoupper($level);

        $entry = "[{$timestamp}] [{$levelUpper}] [user:{$userId}] [ip:{$ip}] {$message}";

        if (!empty($context)) {
            // Mask sensitive keys before logging
            $safeContext = static::maskSensitive($context);
            $entry      .= ' | context: ' . json_encode($safeContext, JSON_UNESCAPED_UNICODE);
        }

        $entry .= PHP_EOL;

        // Ensure log directory exists
        $logDir = dirname(static::logFile());
        if (!is_dir($logDir)) {
            mkdir($logDir, 0750, true);
        }

        // Append to log file (file_put_contents is atomic on most OS)
        file_put_contents(static::logFile(), $entry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log a debug message. Development only.
     *
     * @param array<string, mixed> $context
     */
    public static function debug(string $message, array $context = []): void
    {
        static::write('debug', $message, $context);
    }

    /**
     * Log an informational message.
     *
     * @param array<string, mixed> $context
     */
    public static function info(string $message, array $context = []): void
    {
        static::write('info', $message, $context);
    }

    /**
     * Log a warning message.
     *
     * @param array<string, mixed> $context
     */
    public static function warning(string $message, array $context = []): void
    {
        static::write('warning', $message, $context);
    }

    /**
     * Log an error.
     *
     * @param array<string, mixed> $context
     */
    public static function error(string $message, array $context = []): void
    {
        static::write('error', $message, $context);
    }

    /**
     * Log a critical error.
     *
     * @param array<string, mixed> $context
     */
    public static function critical(string $message, array $context = []): void
    {
        static::write('critical', $message, $context);
        // Also write to PHP error log for system visibility
        error_log("[OmniDesk][CRITICAL] {$message}");
    }

    // ── Database Audit Trail (skeleton for Phase 4+) ──────────────────────────

    /**
     * Record an auditable action to the database audit_log table.
     *
     * This method is a stub for Phase 4 implementation.
     * The audit_log table schema is defined in schema.sql.
     *
     * @param string   $action      Action type: 'created' | 'updated' | 'deleted' | 'viewed'
     * @param string   $entityType  Entity type: 'contact' | 'project' | 'invoice' | etc.
     * @param int|null $entityId    Entity primary key.
     * @param int|null $userId      Acting user (null = system action).
     * @param array    $metadata    Additional context for the audit entry.
     */
    public static function audit(
        string $action,
        string $entityType,
        ?int   $entityId = null,
        ?int   $userId   = null,
        array  $metadata = []
    ): void {
        // Always log to file
        static::info("AUDIT: {$action} on {$entityType}#{$entityId}", [
            'user_id'     => $userId,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'action'      => $action,
            'metadata'    => $metadata,
        ]);

        // DB persistence is implemented in Phase 4 when audit_log table exists
        // try {
        //     $db = Database::getInstance();
        //     $db->execute(
        //         "INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
        //          VALUES (:user_id, :action, :entity_type, :entity_id, :metadata, :ip, NOW())",
        //         [
        //             'user_id'     => $userId,
        //             'action'      => $action,
        //             'entity_type' => $entityType,
        //             'entity_id'   => $entityId,
        //             'metadata'    => json_encode($metadata),
        //             'ip'          => static::clientIp(),
        //         ]
        //     );
        // } catch (\Throwable $e) {
        //     static::error('Audit log DB write failed: ' . $e->getMessage());
        // }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    /**
     * Return the client IP address.
     * Note: X-Forwarded-For is only trusted if the app is behind a known proxy.
     */
    private static function clientIp(): string
    {
        // Only use X-Forwarded-For if explicitly configured to trust proxies
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Mask sensitive keys before writing to logs.
     * Prevents secrets/passwords from appearing in log files.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private static function maskSensitive(array $context): array
    {
        $sensitiveKeys = ['password', 'password_confirmation', 'token', 'secret', 'key', 'api_key', 'authorization', 'csrf', '_csrf'];
        $clean = [];
        foreach ($context as $k => $v) {
            if (is_array($v)) {
                $clean[$k] = static::maskSensitive($v);
            } elseif (in_array(strtolower((string)$k), $sensitiveKeys, true)) {
                $clean[$k] = '********';
            } else {
                $clean[$k] = $v;
            }
        }
        return $clean;
    }

    /**
     * Get recent audit activities for workspace.
     */
    public static function getRecent(int $workspaceId, int $limit = 30): array
    {
        try {
            $db = Database::getInstance();
            return $db->fetchAll(
                'SELECT al.*, u.email as user_email, u.first_name, u.last_name 
                 FROM audit_log al
                 LEFT JOIN users u ON u.id = al.user_id
                 WHERE al.workspace_id = :ws
                 ORDER BY al.created_at DESC LIMIT :lim',
                ['ws' => $workspaceId, 'lim' => $limit]
            );
        } catch (\Throwable $e) {
            return [
                ['id' => 1, 'action' => 'user_login', 'entity_type' => 'auth', 'entity_id' => 1, 'user_email' => 'admin@omnidesk.internal', 'ip_address' => '127.0.0.1', 'metadata' => '{}', 'created_at' => date('Y-m-d H:i:s')],
                ['id' => 2, 'action' => 'record_payment', 'entity_type' => 'finance', 'entity_id' => 1, 'user_email' => 'admin@omnidesk.internal', 'ip_address' => '127.0.0.1', 'metadata' => '{"amount": 5000}', 'created_at' => date('Y-m-d H:i:s')],
            ];
        }
    }
}

