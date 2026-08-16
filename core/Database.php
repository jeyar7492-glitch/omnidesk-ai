<?php
/**
 * OmniDesk AI — Database (PDO Abstraction Layer)
 *
 * Provides a singleton PDO connection with secure defaults:
 *   - ATTR_EMULATE_PREPARES = false  (real prepared statements)
 *   - ATTR_ERRMODE = EXCEPTION       (throw PDOException on error)
 *   - ATTR_DEFAULT_FETCH_MODE = ASSOC
 *   - Character set: utf8mb4
 *
 * Usage:
 *   $db  = Database::getInstance();
 *   $pdo = $db->getConnection();
 *
 * All queries MUST use prepared statements.
 * NEVER concatenate user-supplied data into SQL strings.
 */

namespace Core;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    /** @var Database|null Singleton instance */
    private static ?Database $instance = null;

    /** @var PDO The underlying PDO connection */
    private PDO $pdo;

    /**
     * Private constructor — use getInstance().
     *
     * @throws RuntimeException if connection fails.
     */
    private function __construct()
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,   // ← REQUIRED: real prepared statements
            PDO::ATTR_PERSISTENT         => false,   // No persistent connections (safer)
            PDO::MYSQL_ATTR_FOUND_ROWS   => true,    // Affected rows = matched rows
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Mask credential details from production output
            $message = APP_DEBUG
                ? 'Database connection failed: ' . $e->getMessage()
                : 'Database connection failed. Check server configuration.';

            // Always log the full error server-side
            error_log('[OmniDesk][Database] Connection error: ' . $e->getMessage());

            throw new RuntimeException($message, (int) $e->getCode(), $e);
        }
    }

    /**
     * Return the singleton Database instance.
     */
    public static function getInstance(): static
    {
        if (static::$instance === null) {
            static::$instance = new static();
        }
        return static::$instance;
    }

    /**
     * Return the PDO connection.
     */
    public function getConnection(): PDO
    {
        return $this->pdo;
    }

    /**
     * Convenience: prepare and execute a statement, return PDOStatement.
     *
     * @param string $sql    SQL with named or positional placeholders.
     * @param array  $params Bound parameters.
     */
    public function query(string $sql, array $params = []): \PDOStatement
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Fetch a single row.
     *
     * @return array|null Row as associative array, or null if not found.
     */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $result = $this->query($sql, $params)->fetch();
        return $result === false ? null : $result;
    }

    /**
     * Fetch all matching rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Execute an INSERT/UPDATE/DELETE and return affected row count.
     */
    public function execute(string $sql, array $params = []): int
    {
        return $this->query($sql, $params)->rowCount();
    }

    /**
     * Return the last inserted auto-increment ID.
     */
    public function lastInsertId(): string
    {
        return $this->pdo->lastInsertId();
    }

    /**
     * Begin a transaction.
     */
    public function beginTransaction(): bool
    {
        return $this->pdo->beginTransaction();
    }

    /**
     * Commit the current transaction.
     */
    public function commit(): bool
    {
        return $this->pdo->commit();
    }

    /**
     * Roll back the current transaction.
     */
    public function rollBack(): bool
    {
        return $this->pdo->rollBack();
    }

    /**
     * Execute a callable inside a transaction.
     * Automatically commits on success, rolls back on exception.
     *
     * @throws \Throwable re-throws any exception after rollback.
     */
    public function transaction(callable $callback): mixed
    {
        $this->beginTransaction();
        try {
            $result = $callback($this);
            $this->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }
    }

    /** Prevent cloning of the singleton. */
    private function __clone() {}
}
