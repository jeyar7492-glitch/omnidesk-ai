<?php
/**
 * OmniDesk AI — 500 Internal Server Error View
 *
 * Enterprise Server Fault & Incident Notification View.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = '500 System Incident — OmniDesk AI';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle) ?></title>
    <link rel="stylesheet" href="<?= asset('css/variables.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/components.css') ?>">
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: var(--bg-app);
            padding: 24px;
            margin: 0;
        }
        .error-card {
            max-width: 520px;
            width: 100%;
            text-align: center;
        }
    </style>
</head>
<body class="antialiased">
    <main class="error-card card card-glass p-8">
        <div class="mb-4 inline-flex p-4 rounded-2xl" style="background: rgba(239, 68, 68, 0.1); color: var(--status-danger);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>

        <div class="font-mono font-extrabold text-xs uppercase tracking-widest text-danger mb-1">HTTP 500 &bull; System Fault Intercepted</div>
        <h1 class="text-2xl font-extrabold tracking-tight text-main mb-2">Unexpected Service Exception</h1>
        <p class="text-muted text-xs leading-relaxed mb-6">
            An internal transaction error occurred during request execution. The incident has been safely captured in the immutable audit log.
        </p>

        <div class="flex items-center justify-center gap-3">
            <a href="<?= url('/dashboard') ?>" class="btn btn-primary">Return to Executive Dashboard</a>
            <a href="<?= url('/operations/health') ?>" class="btn btn-secondary">System Health</a>
        </div>
    </main>
</body>
</html>
