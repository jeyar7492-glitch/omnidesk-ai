<?php
/**
 * OmniDesk AI — Bootstrap
 *
 * Initializes the application environment:
 *  - Error reporting
 *  - Core autoloader
 *  - Security headers
 *  - Timezone
 *
 * Executed after config.php; before session/router initialization.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

// ─── Timezone ─────────────────────────────────────────────────────────────────
date_default_timezone_set('UTC');

// ─── Error Reporting ──────────────────────────────────────────────────────────
if (APP_DEBUG) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
}

// ─── Core Class Autoloader ────────────────────────────────────────────────────
/**
 * Simple PSR-4-inspired autoloader for OmniDesk core and module classes.
 *
 * Mapping:
 *   Core\ClassName  → /core/ClassName.php
 *   Modules\Name\*  → /modules/Name/*.php
 */
spl_autoload_register(function (string $class): void {
    // Core namespace
    if (str_starts_with($class, 'Core\\')) {
        $file = CORE_PATH . '/' . substr($class, 5) . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }

    // Modules namespace  e.g. Modules\Dashboard\DashboardController
    if (str_starts_with($class, 'Modules\\')) {
        $parts    = explode('\\', $class, 3);  // ['Modules', 'Dashboard', 'DashboardController']
        $module   = $parts[1] ?? '';
        $relative = $parts[2] ?? '';
        $file     = MODULES_PATH . '/' . $module . '/' . $relative . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
}, prepend: true);

// ─── HTTP Security Headers ────────────────────────────────────────────────────
foreach (SECURITY_HEADERS as $header => $value) {
    header($header . ': ' . $value);
}

// Remove server signature (best-effort; PHP header only — configure Apache/Nginx too)
header_remove('X-Powered-By');

// ─── Ensure Storage Directories Exist ─────────────────────────────────────────
$requiredDirs = [LOGS_PATH, UPLOADS_PATH];
foreach ($requiredDirs as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        // Non-fatal: log later when logger is available
        error_log('[OmniDesk] Failed to create directory: ' . $dir);
    }
}
unset($requiredDirs, $dir);
