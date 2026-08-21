<?php
/**
 * OmniDesk AI — Auth Core Service (Phase 2)
 *
 * Full production-grade authentication & authorization:
 *   - Secure login with rate limiting & brute-force defense (account lockout)
 *   - Dual-token persistent "Remember Me" handling (selector/validator)
 *   - Registration & email verification token handling
 *   - Single-use password reset tokens with expiration
 *   - Server-side RBAC permission checking (roles + granular permissions)
 *   - Password hashing policy enforcement (bcrypt cost 12 / Argon2id)
 */

namespace Core;

class Auth
{
    private const MAX_LOGIN_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS    = 900; // 15 minutes
    private const REMEMBER_COOKIE    = 'omnidesk_remember';
    private const REMEMBER_DAYS      = 30;

    /** Cached permissions for the authenticated session */
    private static ?array $cachedPermissions = null;

    // ── Password Hashing Policy ───────────────────────────────────────────────

    public static function hashPassword(string $plaintext): string
    {
        return password_hash($plaintext, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verifyPassword(string $plaintext, string $storedHash): bool
    {
        return password_verify($plaintext, $storedHash);
    }

    public static function needsRehash(string $storedHash): bool
    {
        return password_needs_rehash($storedHash, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    // ── Authentication Actions ────────────────────────────────────────────────

    /**
     * Attempt to authenticate a user with email & password.
     * Includes brute-force protection, account lockout, and optional "Remember Me".
     *
     * @return array{success: bool, message: string}
     */
    public static function attempt(string $email, string $password, bool $remember = false): array
    {
        $ip    = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $email = strtolower(trim($email));

        // 1. Check account lockout rate limits
        if (static::isLockedOut($email, $ip)) {
            ActivityLog::warning('Login attempt blocked by rate limiter', ['email' => $email, 'ip' => $ip]);
            return [
                'success' => false,
                'message' => 'Too many failed attempts. Please try again in 15 minutes.',
            ];
        }

        // 2. Fetch user by email
        $user = null;
        try {
            $db   = Database::getInstance();
            $user = $db->fetchOne(
                'SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1',
                ['email' => $email]
            );
        } catch (\Throwable $e) {
            ActivityLog::error('DB error during login attempt: ' . $e->getMessage());
            return ['success' => false, 'message' => 'A database error occurred. Please try again.'];
        }

        // 3. Verify user existence & password hash
        if (!$user || !static::verifyPassword($password, $user['password_hash'])) {
            static::recordAttempt($email, $ip, false);
            ActivityLog::warning('Failed login attempt', ['email' => $email, 'ip' => $ip]);
            return [
                'success' => false,
                'message' => 'Invalid email address or password.', // Generic to prevent enumeration
            ];
        }

        // 4. Check active account status
        if ((int)$user['is_active'] !== 1) {
            ActivityLog::warning('Login attempted on deactivated account', ['user_id' => $user['id']]);
            return [
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact support.',
            ];
        }

        // 5. Successful Login: Record attempt & clear lockout
        static::recordAttempt($email, $ip, true);

        // Fetch primary user role
        $roleRow = Database::getInstance()->fetchOne(
            'SELECT r.name FROM roles r 
             INNER JOIN user_roles ur ON ur.role_id = r.id 
             WHERE ur.user_id = :user_id LIMIT 1',
            ['user_id' => $user['id']]
        );
        $roleName = $roleRow['name'] ?? 'member';

        // Perform session login
        static::login((int)$user['id'], $roleName, [
            'first_name' => $user['first_name'],
            'last_name'  => $user['last_name'],
            'email'      => $user['email'],
        ]);

        // Transparently rehash password if algorithm settings updated
        if (static::needsRehash($user['password_hash'])) {
            $newHash = static::hashPassword($password);
            Database::getInstance()->execute(
                'UPDATE users SET password_hash = :hash WHERE id = :id',
                ['hash' => $newHash, 'id' => $user['id']]
            );
        }

        // Update last login timestamp and IP
        Database::getInstance()->execute(
            'UPDATE users SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id',
            ['ip' => $ip, 'id' => $user['id']]
        );

        // Handle "Remember Me" persistent token
        if ($remember) {
            static::createRememberToken((int)$user['id']);
        }

        ActivityLog::info('Successful user login', ['user_id' => $user['id']]);

        return ['success' => true, 'message' => 'Login successful.'];
    }

    /**
     * Register a new user account.
     *
     * @param array{first_name: string, last_name: string, email: string, password: string} $data
     * @return array{success: bool, message: string, user_id?: int}
     */
    public static function register(array $data): array
    {
        $db    = Database::getInstance();
        $email = strtolower(trim($data['email']));

        // Check duplicate email
        $existing = $db->fetchOne('SELECT id FROM users WHERE email = :email LIMIT 1', ['email' => $email]);
        if ($existing) {
            return ['success' => false, 'message' => 'An account with this email address already exists.'];
        }

        $hash        = static::hashPassword($data['password']);
        $verifyToken = Security::randomToken(32);

        $userId = $db->transaction(function ($db) use ($data, $email, $hash, $verifyToken) {
            $db->execute(
                'INSERT INTO users (first_name, last_name, email, password_hash, email_verify_token, is_active, is_verified, created_at)
                 VALUES (:first_name, :last_name, :email, :hash, :verify_token, 1, 0, NOW())',
                [
                    'first_name'   => trim($data['first_name']),
                    'last_name'    => trim($data['last_name']),
                    'email'        => $email,
                    'hash'         => $hash,
                    'verify_token' => $verifyToken,
                ]
            );

            $id = (int)$db->lastInsertId();

            // Assign default 'member' role (role_id = 3)
            $db->execute(
                'INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, 3)',
                ['user_id' => $id]
            );

            return $id;
        });

        ActivityLog::info('New user registered', ['user_id' => $userId, 'email' => $email]);

        return [
            'success'      => true,
            'message'      => 'Account created successfully. You may now log in.',
            'user_id'      => $userId,
            'verify_token' => $verifyToken,
        ];
    }

    /**
     * Request a password reset token for an email address.
     */
    public static function requestPasswordReset(string $email): array
    {
        $email = strtolower(trim($email));
        $user  = Database::getInstance()->fetchOne('SELECT id FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1', ['email' => $email]);

        if (!$user) {
            // Return success message anyway to prevent account enumeration
            return [
                'success' => true,
                'message' => 'If an account matches that email address, password reset instructions have been generated.',
            ];
        }

        $token   = Security::randomToken(32);
        $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour validity

        Database::getInstance()->execute(
            'UPDATE users SET password_reset_token = :token, password_reset_expires_at = :expires WHERE id = :id',
            ['token' => $token, 'expires' => $expires, 'id' => $user['id']]
        );

        ActivityLog::info('Password reset token generated', ['user_id' => $user['id']]);

        return [
            'success' => true,
            'message' => 'Password reset instructions have been generated.',
            'token'   => $token,
        ];
    }

    /**
     * Reset user password using a valid reset token.
     */
    public static function resetPassword(string $token, string $newPassword): array
    {
        if (empty($token)) {
            return ['success' => false, 'message' => 'Invalid or missing reset token.'];
        }

        $db   = Database::getInstance();
        $user = $db->fetchOne(
            'SELECT id FROM users WHERE password_reset_token = :token AND password_reset_expires_at > NOW() AND deleted_at IS NULL LIMIT 1',
            ['token' => $token]
        );

        if (!$user) {
            return ['success' => false, 'message' => 'Invalid or expired password reset token.'];
        }

        $newHash = static::hashPassword($newPassword);

        $db->execute(
            'UPDATE users SET password_hash = :hash, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = :id',
            ['hash' => $newHash, 'id' => $user['id']]
        );

        // Revoke all remember tokens for security
        static::revokeUserRememberTokens((int)$user['id']);

        ActivityLog::info('Password reset completed', ['user_id' => $user['id']]);

        return ['success' => true, 'message' => 'Your password has been reset successfully. You may now log in.'];
    }

    /**
     * Verify email token.
     */
    public static function verifyEmail(string $token): array
    {
        if (empty($token)) {
            return ['success' => false, 'message' => 'Invalid email verification token.'];
        }

        $db   = Database::getInstance();
        $user = $db->fetchOne('SELECT id FROM users WHERE email_verify_token = :token LIMIT 1', ['token' => $token]);

        if (!$user) {
            return ['success' => false, 'message' => 'Invalid or expired email verification token.'];
        }

        $db->execute(
            'UPDATE users SET is_verified = 1, email_verify_token = NULL WHERE id = :id',
            ['id' => $user['id']]
        );

        ActivityLog::info('Email verified', ['user_id' => $user['id']]);

        return ['success' => true, 'message' => 'Your email address has been verified successfully.'];
    }

    // ── Session & Auth State ──────────────────────────────────────────────────

    public static function check(): bool
    {
        if (Session::isAuthenticated()) {
            return true;
        }

        // Try remember me persistent cookie
        return static::checkRememberCookie();
    }

    public static function id(): ?int
    {
        return Session::userId();
    }

    public static function user(): ?array
    {
        if (!static::check()) {
            return null;
        }

        return [
            'id'         => Session::get('user_id'),
            'first_name' => Session::get('user_first_name', ''),
            'last_name'  => Session::get('user_last_name', ''),
            'full_name'  => trim(Session::get('user_first_name', '') . ' ' . Session::get('user_last_name', '')),
            'email'      => Session::get('user_email', ''),
            'role'       => Session::get('user_role', 'member'),
        ];
    }

    public static function login(int $userId, string $role = 'member', array $meta = []): void
    {
        Session::regenerate(true);

        Session::set('user_id',         $userId);
        Session::set('user_role',       $role);
        Session::set('user_first_name', $meta['first_name'] ?? '');
        Session::set('user_last_name',  $meta['last_name'] ?? '');
        Session::set('user_email',      $meta['email'] ?? '');
        Session::set('login_time',      time());

        static::$cachedPermissions = null;
    }

    public static function logout(): void
    {
        $userId = static::id();
        if ($userId) {
            static::revokeRememberCookie();
            static::revokeUserRememberTokens($userId);
            ActivityLog::info('User logged out', ['user_id' => $userId]);
        }

        Session::destroy();
        static::$cachedPermissions = null;
    }

    // ── Server-Side RBAC & Permissions ───────────────────────────────────────

    public static function role(): ?string
    {
        return Session::get('user_role');
    }

    public static function hasRole(string ...$roles): bool
    {
        $userRole = static::role();
        return $userRole !== null && in_array($userRole, $roles, true);
    }

    /**
     * Check if the authenticated user possesses a specific granular permission.
     * Admin role automatically passes all permission checks.
     */
    public static function hasPermission(string $permission): bool
    {
        if (!static::check()) {
            return false;
        }

        // Admin override
        if (static::hasRole('admin')) {
            return true;
        }

        $userPerms = static::getUserPermissions();
        return in_array($permission, $userPerms, true);
    }

    /**
     * Enforce a permission guard. Aborts with 403 if unauthorized.
     */
    public static function requirePermission(string $permission): void
    {
        if (!static::hasPermission($permission)) {
            ActivityLog::warning('Permission denied', ['user_id' => static::id(), 'permission' => $permission]);
            http_response_code(403);
            require_once MODULES_PATH . '/Dashboard/views/403.php';
            exit();
        }
    }

    /**
     * Get all granted permissions for the logged-in user.
     */
    public static function permissions(): array
    {
        return static::getUserPermissions();
    }

    /**
     * Load and cache all granted permissions for the logged-in user.
     */
    private static function getUserPermissions(): array
    {
        if (static::$cachedPermissions !== null) {
            return static::$cachedPermissions;
        }

        $userId = static::id();
        if (!$userId) {
            return [];
        }

        try {
            $rows = Database::getInstance()->fetchAll(
                'SELECT DISTINCT p.name FROM permissions p
                 INNER JOIN role_permissions rp ON rp.permission_id = p.id
                 INNER JOIN user_roles ur ON ur.role_id = rp.role_id
                 WHERE ur.user_id = :user_id',
                ['user_id' => $userId]
            );

            static::$cachedPermissions = array_column($rows, 'name');
        } catch (\Throwable $e) {
            static::$cachedPermissions = [];
        }

        return static::$cachedPermissions;
    }

    // ── Brute Force Defense / Account Lockout ─────────────────────────────────

    private static function isLockedOut(string $email, string $ip): bool
    {
        try {
            $since = date('Y-m-d H:i:s', time() - self::LOCKOUT_SECONDS);
            $row   = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as failed_count FROM login_attempts
                 WHERE (email = :email OR ip_address = :ip)
                   AND is_successful = 0
                   AND attempted_at >= :since',
                ['email' => $email, 'ip' => $ip, 'since' => $since]
            );

            return ((int)($row['failed_count'] ?? 0)) >= self::MAX_LOGIN_ATTEMPTS;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private static function recordAttempt(string $email, string $ip, bool $success): void
    {
        try {
            Database::getInstance()->execute(
                'INSERT INTO login_attempts (ip_address, email, is_successful, attempted_at)
                 VALUES (:ip, :email, :success, NOW())',
                ['ip' => $ip, 'email' => $email, 'success' => $success ? 1 : 0]
            );
        } catch (\Throwable $e) {
            // Ignore failure to record attempt
        }
    }

    // ── Persistent "Remember Me" Dual Token Strategy ──────────────────────────

    private static function createRememberToken(int $userId): void
    {
        $selector  = Security::randomToken(16);
        $validator = Security::randomToken(32);
        $hash      = hash('sha256', $validator);
        $expires   = date('Y-m-d H:i:s', time() + (self::REMEMBER_DAYS * 86400));

        try {
            Database::getInstance()->execute(
                'INSERT INTO remember_tokens (user_id, selector, token_hash, expires_at) VALUES (:uid, :sel, :hash, :exp)',
                ['uid' => $userId, 'sel' => $selector, 'hash' => $hash, 'exp' => $expires]
            );

            $cookieValue = $selector . ':' . $validator;
            setcookie(self::REMEMBER_COOKIE, $cookieValue, [
                'expires'  => time() + (self::REMEMBER_DAYS * 86400),
                'path'     => '/',
                'domain'   => '',
                'secure'   => SESSION_SECURE,
                'httponly' => true,
                'samesite' => SESSION_SAMESITE,
            ]);
        } catch (\Throwable $e) {
            ActivityLog::error('Failed to create remember token: ' . $e->getMessage());
        }
    }

    private static function checkRememberCookie(): bool
    {
        $cookie = $_COOKIE[self::REMEMBER_COOKIE] ?? '';
        if (empty($cookie) || !str_contains($cookie, ':')) {
            return false;
        }

        [$selector, $validator] = explode(':', $cookie, 2);

        try {
            $row = Database::getInstance()->fetchOne(
                'SELECT r.*, u.first_name, u.last_name, u.email, u.is_active FROM remember_tokens r
                 INNER JOIN users u ON u.id = r.user_id
                 WHERE r.selector = :sel AND r.expires_at > NOW() AND u.deleted_at IS NULL LIMIT 1',
                ['sel' => $selector]
            );

            if (!$row || (int)$row['is_active'] !== 1) {
                static::revokeRememberCookie();
                return false;
            }

            // Verify validator hash in constant time
            $calcHash = hash('sha256', $validator);
            if (!hash_equals($row['token_hash'], $calcHash)) {
                ActivityLog::warning('Potential remember-token tampering detected', ['user_id' => $row['user_id']]);
                static::revokeUserRememberTokens((int)$row['user_id']);
                static::revokeRememberCookie();
                return false;
            }

            // Valid cookie! Auto login user
            $roleRow = Database::getInstance()->fetchOne(
                'SELECT r.name FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = :uid LIMIT 1',
                ['uid' => $row['user_id']]
            );

            static::login((int)$row['user_id'], $roleRow['name'] ?? 'member', [
                'first_name' => $row['first_name'],
                'last_name'  => $row['last_name'],
                'email'      => $row['email'],
            ]);

            // Rotate validator token for security
            static::createRememberToken((int)$row['user_id']);
            Database::getInstance()->execute('DELETE FROM remember_tokens WHERE id = :id', ['id' => $row['id']]);

            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private static function revokeRememberCookie(): void
    {
        if (isset($_COOKIE[self::REMEMBER_COOKIE])) {
            setcookie(self::REMEMBER_COOKIE, '', [
                'expires'  => time() - 3600,
                'path'     => '/',
                'domain'   => '',
                'secure'   => SESSION_SECURE,
                'httponly' => true,
                'samesite' => SESSION_SAMESITE,
            ]);
            unset($_COOKIE[self::REMEMBER_COOKIE]);
        }
    }

    private static function revokeUserRememberTokens(int $userId): void
    {
        try {
            Database::getInstance()->execute('DELETE FROM remember_tokens WHERE user_id = :uid', ['uid' => $userId]);
        } catch (\Throwable $e) {
            // Non-fatal
        }
    }
}
