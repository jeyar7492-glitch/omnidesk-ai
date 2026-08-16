<?php
/**
 * OmniDesk AI — Helpers
 *
 * Global helper functions available throughout the application.
 *
 * IMPORTANT: All helpers are thin wrappers over core classes.
 * Keep business logic out of helpers — keep them short and reusable.
 *
 * Included helpers:
 *   e($value)           — HTML escape (XSS prevention)
 *   csrf_field()        — CSRF hidden input field
 *   csrf_token()        — Raw CSRF token string
 *   redirect($path)     — Safe internal redirect
 *   session($key, $def) — Session value shortcut
 *   flash($type, $msg)  — Set flash message
 *   get_flash()         — Retrieve and clear flash messages
 *   asset($path)        — Return public asset URL
 *   url($path)          — Return absolute application URL
 *   env_is($env)        — Check current environment
 *   is_debug()          — Check debug mode
 *   truncate($str, $len)— Truncate string safely
 *   format_date($ts)    — Format a timestamp for display
 *   dd($var, ...)       — Dump and die (development only)
 */

use Core\Security;
use Core\Session;

// ─── Guard: helpers loaded only once ────────────────────────────────────────
if (defined('OMNIDESK_HELPERS_LOADED')) {
    return;
}
define('OMNIDESK_HELPERS_LOADED', true);

// ────────────────────────────────────────────────────────────────────────────
// Security Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Escape a value for safe HTML output.
 * This is the primary XSS prevention function.
 * Use on ALL user-controlled output in views.
 *
 * @param mixed $value
 * @return string HTML-escaped string
 */
function e(mixed $value): string
{
    return Security::escape($value);
}

/**
 * Output the CSRF hidden input field for use in HTML forms.
 * Always include in any <form> that submits POST data.
 *
 * @return string HTML string for the hidden input.
 */
function csrf_field(): string
{
    return Security::csrfField();
}

/**
 * Return the raw CSRF token value (for AJAX requests, meta tags, etc.).
 *
 * @return string The CSRF token string.
 */
function csrf_token(): string
{
    return Security::generateCsrfToken();
}

/**
 * Perform a safe internal redirect and terminate.
 *
 * @param string $path   Internal path (e.g. '/dashboard').
 * @param int    $status HTTP status code.
 */
function redirect(string $path, int $status = 302): never
{
    Security::redirect($path, $status);
}

// ────────────────────────────────────────────────────────────────────────────
// Session Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get a session value with an optional default.
 *
 * @param string $key     Session key.
 * @param mixed  $default Default value if key not set.
 * @return mixed
 */
function session(string $key, mixed $default = null): mixed
{
    return Session::get($key, $default);
}

/**
 * Set a flash message.
 *
 * @param string $type    Message type: success | error | warning | info
 * @param string $message Display message (will be escaped on output).
 */
function flash(string $type, string $message): void
{
    Session::flash($type, $message);
}

/**
 * Retrieve and clear all flash messages.
 *
 * @return array<int, array{type: string, message: string}>
 */
function get_flash(): array
{
    return Session::getFlash();
}

// ────────────────────────────────────────────────────────────────────────────
// URL Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Return the full URL for a public asset.
 *
 * @param string $path Relative asset path (e.g. 'css/variables.css').
 * @return string Full URL.
 */
function asset(string $path): string
{
    return APP_URL . '/assets/' . ltrim($path, '/');
}

/**
 * Return the full application URL for an internal path.
 *
 * @param string $path Relative path (e.g. '/dashboard').
 * @return string Full URL.
 */
function url(string $path = '/'): string
{
    return APP_URL . '/' . ltrim($path, '/');
}

// ────────────────────────────────────────────────────────────────────────────
// Environment Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if the application is running in a given environment.
 *
 * @param string $env Environment name: development | staging | production
 */
function env_is(string $env): bool
{
    return APP_ENV === $env;
}

/**
 * Check whether debug mode is enabled.
 */
function is_debug(): bool
{
    return (bool) APP_DEBUG;
}

// ────────────────────────────────────────────────────────────────────────────
// String Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Truncate a string to a maximum character length.
 *
 * @param string $string    The input string.
 * @param int    $maxLength Maximum character count.
 * @param string $suffix    Appended when truncated (default: '…').
 * @return string
 */
function truncate(string $string, int $maxLength, string $suffix = '…'): string
{
    if (mb_strlen($string) <= $maxLength) {
        return $string;
    }
    return mb_substr($string, 0, $maxLength - mb_strlen($suffix)) . $suffix;
}

/**
 * Convert a string to a URL-safe slug.
 *
 * @param string $string Input string (e.g. 'My Page Title').
 * @return string Slug (e.g. 'my-page-title').
 */
function slugify(string $string): string
{
    $string = mb_strtolower(trim($string));
    $string = preg_replace('/[^\w\s-]/u', '', $string);
    $string = preg_replace('/[\s_-]+/', '-', $string);
    return trim($string, '-');
}

// ────────────────────────────────────────────────────────────────────────────
// Date / Time Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Format a timestamp or datetime string for human display.
 *
 * @param int|string $timestamp Unix timestamp or date string.
 * @param string     $format    PHP date format (default: 'M j, Y H:i').
 * @return string Formatted date string.
 */
function format_date(int|string $timestamp, string $format = 'M j, Y H:i'): string
{
    if (is_string($timestamp)) {
        $timestamp = strtotime($timestamp);
    }
    return date($format, $timestamp);
}

/**
 * Return a human-readable time difference (e.g. '3 minutes ago').
 *
 * @param int|string $timestamp Unix timestamp or date string.
 * @return string Relative time string.
 */
function time_ago(int|string $timestamp): string
{
    if (is_string($timestamp)) {
        $timestamp = strtotime($timestamp);
    }

    $diff    = time() - $timestamp;
    $seconds = abs($diff);
    $suffix  = $diff >= 0 ? ' ago' : ' from now';

    return match (true) {
        $seconds < 60     => 'just now',
        $seconds < 3600   => (int)($seconds / 60) . ' minute' . ((int)($seconds / 60) !== 1 ? 's' : '') . $suffix,
        $seconds < 86400  => (int)($seconds / 3600) . ' hour' . ((int)($seconds / 3600) !== 1 ? 's' : '') . $suffix,
        $seconds < 604800 => (int)($seconds / 86400) . ' day' . ((int)($seconds / 86400) !== 1 ? 's' : '') . $suffix,
        default           => format_date($timestamp, 'M j, Y'),
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Development Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Dump variable(s) and terminate. Development only.
 * In production, this outputs a generic error message and logs.
 *
 * @param mixed ...$vars Variables to inspect.
 */
function dd(mixed ...$vars): never
{
    if (!APP_DEBUG) {
        error_log('[OmniDesk][dd()] Called in production environment — suppressed.');
        http_response_code(500);
        exit('An unexpected error occurred.');
    }

    echo '<pre style="background:#1e1e2e;color:#cdd6f4;padding:1rem;margin:1rem;border-radius:8px;font-family:monospace;font-size:.875rem;overflow:auto;">';
    foreach ($vars as $var) {
        var_dump($var);
        echo "\n";
    }
    echo '</pre>';
    exit();
}
