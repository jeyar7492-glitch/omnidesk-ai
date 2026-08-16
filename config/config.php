<?php
/**
 * OmniDesk AI — Application Configuration
 *
 * SECURITY: Never commit real production secrets.
 * Use environment variables or a local .env file for sensitive values.
 * This file provides defaults suitable for local development only.
 *
 * Production deployments must override sensitive values via:
 *   - Server environment variables (preferred)
 *   - A .env file excluded from version control
 */

// ─── Guard: Prevent direct access ────────────────────────────────────────────
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

// ─── Helper: Read from env, fall back to default ─────────────────────────────
function env(string $key, mixed $default = null): mixed
{
    $value = getenv($key);
    if ($value === false) {
        return $default;
    }
    // Cast common boolean strings
    return match (strtolower($value)) {
        'true', '1', 'yes'  => true,
        'false', '0', 'no'  => false,
        default             => $value,
    };
}

// ─── Application ─────────────────────────────────────────────────────────────
define('APP_NAME',    env('APP_NAME',    'OmniDesk AI'));
define('APP_TAGLINE', 'Professional AI-Powered Enterprise Management & Productivity Platform');
define('APP_VERSION', '1.0.0-alpha');
define('APP_ENV',     env('APP_ENV',     'development')); // development | staging | production
define('APP_DEBUG',   env('APP_DEBUG',   true));           // Set false in production

// Base URL — trailing slash omitted
// Example production value: 'https://app.omnidesk.io'
define('APP_URL', rtrim(env('APP_URL', 'http://localhost'), '/'));

// ─── Database ─────────────────────────────────────────────────────────────────
define('DB_HOST',    env('DB_HOST',    '127.0.0.1'));
define('DB_PORT',    env('DB_PORT',    '3306'));
define('DB_NAME',    env('DB_NAME',    'omnidesk'));
define('DB_USER',    env('DB_USER',    'root'));
define('DB_PASS',    env('DB_PASS',    ''));              // Override via env in production
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

// ─── Session ──────────────────────────────────────────────────────────────────
define('SESSION_NAME',     env('SESSION_NAME',     'omnidesk_sess'));
define('SESSION_LIFETIME', (int) env('SESSION_LIFETIME', 7200));   // seconds (2 hours)
define('SESSION_SECURE',   env('SESSION_SECURE',   false));        // true when HTTPS
define('SESSION_HTTPONLY',  true);
define('SESSION_SAMESITE',  'Lax');                                // Strict | Lax | None

// ─── Security ─────────────────────────────────────────────────────────────────
define('CSRF_TOKEN_LENGTH', 32);
define('CSRF_TOKEN_KEY',    '_csrf_token');
define('CSRF_FORM_FIELD',   '_csrf');

// ─── File Uploads ─────────────────────────────────────────────────────────────
define('UPLOAD_MAX_SIZE',    (int) env('UPLOAD_MAX_SIZE', 10485760)); // 10 MB in bytes
define('UPLOAD_ALLOWED_MIME', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
]);
define('UPLOAD_ALLOWED_EXT', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'csv']);

// ─── Paths (absolute, server-side) ───────────────────────────────────────────
define('ROOT_PATH',    dirname(__DIR__));
define('CONFIG_PATH',  ROOT_PATH . '/config');
define('CORE_PATH',    ROOT_PATH . '/core');
define('MODULES_PATH', ROOT_PATH . '/modules');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOGS_PATH',    STORAGE_PATH . '/logs');
define('UPLOADS_PATH', STORAGE_PATH . '/uploads');
define('PUBLIC_PATH',  ROOT_PATH . '/public');

// ─── Logging ──────────────────────────────────────────────────────────────────
define('LOG_LEVEL', env('LOG_LEVEL', APP_DEBUG ? 'debug' : 'error'));
// Supported levels: debug | info | warning | error | critical

// ─── HTTP Security Headers ────────────────────────────────────────────────────
// These are applied in bootstrap.php
define('SECURITY_HEADERS', [
    'X-Frame-Options'           => 'SAMEORIGIN',
    'X-Content-Type-Options'    => 'nosniff',
    'X-XSS-Protection'          => '1; mode=block',
    'Referrer-Policy'           => 'strict-origin-when-cross-origin',
    // CSP — intentionally permissive for development; tighten in production
    'Content-Security-Policy'   =>
        "default-src 'self'; " .
        "script-src 'self'; " .
        "style-src 'self' https://fonts.googleapis.com; " .
        "font-src 'self' https://fonts.gstatic.com; " .
        "img-src 'self' data:; " .
        "connect-src 'self'; " .
        "object-src 'none'; " .
        "base-uri 'self'; " .
        "form-action 'self';",
]);
