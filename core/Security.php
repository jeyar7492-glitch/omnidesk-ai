<?php
/**
 * OmniDesk AI — Security
 *
 * Centralised, reusable security utilities covering:
 *   - CSRF token generation and validation
 *   - HTML output escaping (XSS prevention)
 *   - Safe redirects (open-redirect prevention)
 *   - Request method enforcement
 *   - Secure random token generation
 *   - Basic authorization checks (expanded in Phase 2)
 *
 * All security logic must live here or in dedicated core classes.
 * NEVER duplicate security logic across modules.
 */

namespace Core;

class Security
{
    // ── CSRF ──────────────────────────────────────────────────────────────────

    /**
     * Generate and store a CSRF token in the session.
     * Returns the existing token if already set for this request.
     *
     * @throws \RuntimeException if session is not active.
     */
    public static function generateCsrfToken(): string
    {
        if (!Session::has(CSRF_TOKEN_KEY)) {
            Session::set(
                CSRF_TOKEN_KEY,
                bin2hex(random_bytes(CSRF_TOKEN_LENGTH))
            );
        }
        return Session::get(CSRF_TOKEN_KEY);
    }

    /**
     * Validate the CSRF token supplied in a POST request.
     * Performs a timing-safe comparison.
     *
     * @param string|null $submittedToken Token from $_POST[CSRF_FORM_FIELD].
     * @return bool True if valid, false otherwise.
     */
    public static function validateCsrfToken(?string $submittedToken): bool
    {
        if ($submittedToken === null || $submittedToken === '') {
            return false;
        }

        $storedToken = Session::get(CSRF_TOKEN_KEY, '');

        // hash_equals is timing-safe — prevents timing attacks
        return hash_equals($storedToken, $submittedToken);
    }

    /**
     * Render a hidden CSRF input field for use in HTML forms.
     * The field name matches CSRF_FORM_FIELD constant.
     */
    public static function csrfField(): string
    {
        $token = static::generateCsrfToken();
        return '<input type="hidden" name="' . CSRF_FORM_FIELD . '" value="' . $token . '">';
    }

    /**
     * Enforce CSRF validation on incoming POST requests.
     * Call at the top of any POST-handling controller action.
     * Terminates the request with 403 if token is invalid.
     */
    public static function requireValidCsrf(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            return;
        }

        $token = $_POST[CSRF_FORM_FIELD] ?? null;

        if (!static::validateCsrfToken($token)) {
            http_response_code(403);
            exit('Invalid or missing CSRF token. Request rejected.');
        }
    }

    // ── Output Escaping ───────────────────────────────────────────────────────

    /**
     * Escape a value for safe HTML output.
     * Use this for ALL user-controlled content rendered in HTML.
     *
     * Equivalent of the global e() helper — both point to this method.
     *
     * @param mixed $value Value to escape (converted to string first).
     * @return string HTML-safe string.
     */
    public static function escape(mixed $value): string
    {
        return htmlspecialchars(
            (string) $value,
            ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5,
            'UTF-8'
        );
    }

    // ── Redirects ─────────────────────────────────────────────────────────────

    /**
     * Perform a safe internal redirect.
     *
     * NEVER redirect to an arbitrary user-supplied URL.
     * This method only allows redirects to internal paths (same origin).
     *
     * @param string $path   Application-relative path (e.g. '/dashboard').
     * @param int    $status HTTP status code (301, 302, etc.).
     */
    public static function redirect(string $path, int $status = 302): never
    {
        // Strip any scheme/host — enforce internal-only redirects
        $path = '/' . ltrim(parse_url($path, PHP_URL_PATH) ?? '', '/');
        http_response_code($status);
        header('Location: ' . $path);
        exit();

    }

    /**
     * Redirect back to the referring page safely.
     * Falls back to home if referrer is missing or external.
     *
     * @param string $fallback Path to use if referrer is unavailable.
     */
    public static function redirectBack(string $fallback = '/'): never
    {
        $referer = $_SERVER['HTTP_REFERER'] ?? '';

        // Only redirect back if referrer is same origin
        if ($referer !== '' && str_starts_with($referer, APP_URL)) {
            $path = parse_url($referer, PHP_URL_PATH) ?? '/';
            static::redirect($path);
        }

        static::redirect($fallback);
    }

    // ── Request Method ────────────────────────────────────────────────────────

    /**
     * Enforce the HTTP request method for an action.
     * Returns 405 Method Not Allowed if method does not match.
     *
     * @param string ...$methods Allowed methods (e.g. 'GET', 'POST').
     */
    public static function requireMethod(string ...$methods): void
    {
        $current = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
        $allowed = array_map('strtoupper', $methods);

        if (!in_array($current, $allowed, true)) {
            http_response_code(405);
            header('Allow: ' . implode(', ', $allowed));
            exit('Method Not Allowed.');
        }
    }

    // ── Auth Guards (Phase 2 will flesh these out) ────────────────────────────

    /**
     * Require the user to be authenticated.
     * Redirects to login if not authenticated.
     * Full RBAC is implemented in Phase 2.
     */
    public static function requireAuth(): void
    {
        if (!Session::isAuthenticated()) {
            // Store intended destination for post-login redirect
            Session::set('intended_url', $_SERVER['REQUEST_URI'] ?? '/');
            static::redirect('/login');
        }
    }

    /**
     * Require the user is a guest (not authenticated).
     * Redirects authenticated users to the dashboard.
     */
    public static function requireGuest(): void
    {
        if (Session::isAuthenticated()) {
            static::redirect('/dashboard');
        }
    }

    // ── Token Generation ──────────────────────────────────────────────────────

    /**
     * Generate a cryptographically secure random token.
     *
     * @param int $bytes Number of random bytes (token length = bytes × 2 in hex).
     * @return string Hexadecimal token string.
     */
    public static function randomToken(int $bytes = 32): string
    {
        return bin2hex(random_bytes($bytes));
    }

    /**
     * Generate a URL-safe base64 random token.
     *
     * @param int $bytes Number of random bytes.
     */
    public static function randomTokenUrlSafe(int $bytes = 32): string
    {
        return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
    }

    // ── Input Sanitization Reminder ───────────────────────────────────────────
    // NOTE: Sanitization alone is NOT sufficient for SQL injection prevention.
    // Use parameterized prepared statements (see Database.php) for all DB queries.
    // Use escape() above for all HTML output.
    // Use Validator for input validation (see Validator.php).
}
