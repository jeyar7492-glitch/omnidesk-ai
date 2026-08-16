<?php
/**
 * OmniDesk AI — Session
 *
 * Handles secure session lifecycle:
 *   - Secure cookie parameters (HttpOnly, SameSite, Secure)
 *   - Session ID regeneration (prevents fixation)
 *   - Session timeout enforcement
 *   - Flash message support
 *   - Auth state helpers (full auth belongs to Phase 2)
 *
 * Usage:
 *   Session::start();
 *   Session::set('key', 'value');
 *   $val = Session::get('key');
 *   Session::regenerate();
 *   Session::destroy();
 */

namespace Core;

class Session
{
    /** Key used to track last activity timestamp for timeout enforcement */
    private const LAST_ACTIVITY_KEY = '__omnidesk_last_activity';

    /** Key used to store flash messages */
    private const FLASH_KEY = '__omnidesk_flash';

    /** Whether the session has been started in this request */
    private static bool $started = false;

    /**
     * Configure and start the session securely.
     * Must be called once per request, before any output.
     */
    public static function start(): void
    {
        if (static::$started || session_status() === PHP_SESSION_ACTIVE) {
            static::$started = true;
            return;
        }

        // ── Configure session cookie parameters ──────────────────────────────
        session_name(SESSION_NAME);

        session_set_cookie_params([
            'lifetime' => 0,                  // Session cookie (expires when browser closes)
            'path'     => '/',
            'domain'   => '',                 // Current domain only
            'secure'   => SESSION_SECURE,     // true in HTTPS production
            'httponly' => SESSION_HTTPONLY,   // JS cannot access session cookie
            'samesite' => SESSION_SAMESITE,   // CSRF mitigation
        ]);

        // ── PHP session security ini settings ────────────────────────────────
        ini_set('session.use_strict_mode',    '1'); // Reject unrecognized session IDs
        ini_set('session.use_only_cookies',   '1'); // No session ID in URLs
        ini_set('session.use_trans_sid',      '0'); // No transparent session ID passing
        ini_set('session.cookie_httponly',    '1');
        ini_set('session.gc_maxlifetime',     (string) SESSION_LIFETIME);

        session_start();
        static::$started = true;

        // ── Session timeout enforcement ───────────────────────────────────────
        static::enforceTimeout();
    }

    /**
     * Enforce session lifetime timeout.
     * Destroys the session if inactive longer than SESSION_LIFETIME seconds.
     */
    private static function enforceTimeout(): void
    {
        $now          = time();
        $lastActivity = static::get(self::LAST_ACTIVITY_KEY);

        if ($lastActivity !== null && ($now - (int) $lastActivity) > SESSION_LIFETIME) {
            static::destroy();
            static::start();
            return;
        }

        static::set(self::LAST_ACTIVITY_KEY, $now);
    }

    /**
     * Regenerate the session ID to prevent session fixation.
     * Should be called on privilege escalation (login, sudo actions).
     *
     * @param bool $deleteOld Delete the old session file immediately.
     */
    public static function regenerate(bool $deleteOld = true): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id($deleteOld);
        }
    }

    /**
     * Destroy the session completely and clear the cookie.
     */
    public static function destroy(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];

            // Remove session cookie from browser
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                [
                    'expires'  => time() - 3600,
                    'path'     => $params['path'],
                    'domain'   => $params['domain'],
                    'secure'   => $params['secure'],
                    'httponly' => $params['httponly'],
                    'samesite' => $params['samesite'],
                ]
            );

            session_destroy();
        }

        static::$started = false;
    }

    /**
     * Set a session value.
     */
    public static function set(string $key, mixed $value): void
    {
        $_SESSION[$key] = $value;
    }

    /**
     * Get a session value, returning $default if not set.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return $_SESSION[$key] ?? $default;
    }

    /**
     * Check whether a session key exists.
     */
    public static function has(string $key): bool
    {
        return isset($_SESSION[$key]);
    }

    /**
     * Remove a session key.
     */
    public static function remove(string $key): void
    {
        unset($_SESSION[$key]);
    }

    /**
     * Set a flash message (available once on the next request).
     *
     * @param string $type    Message type: success | error | warning | info
     * @param string $message Message text (will be escaped on output).
     */
    public static function flash(string $type, string $message): void
    {
        $flash   = static::get(self::FLASH_KEY, []);
        $flash[] = ['type' => $type, 'message' => $message];
        static::set(self::FLASH_KEY, $flash);
    }

    /**
     * Retrieve and clear all flash messages.
     *
     * @return array<int, array{type: string, message: string}>
     */
    public static function getFlash(): array
    {
        $flash = static::get(self::FLASH_KEY, []);
        static::remove(self::FLASH_KEY);
        return $flash;
    }

    // ── Auth state helpers (Phase 2 will expand these) ────────────────────────

    /**
     * Check whether a user is authenticated.
     * Full implementation in Phase 2 Auth module.
     */
    public static function isAuthenticated(): bool
    {
        return static::has('user_id') && static::get('user_id') !== null;
    }

    /**
     * Return the authenticated user ID, or null if not logged in.
     * NEVER trust a user-supplied ID — always read from session.
     */
    public static function userId(): ?int
    {
        $id = static::get('user_id');
        return $id !== null ? (int) $id : null;
    }
}
