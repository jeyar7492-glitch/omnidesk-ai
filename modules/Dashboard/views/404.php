<?php
/**
 * OmniDesk AI — 404 Not Found View
 *
 * Enterprise Resource Not Located View.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = '404 Resource Not Found — OmniDesk AI';
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
        <div class="mb-4 inline-flex p-4 rounded-2xl" style="background: rgba(99, 102, 241, 0.1); color: var(--brand-primary);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>

        <div class="font-mono font-extrabold text-xs uppercase tracking-widest text-brand mb-1">HTTP 404 &bull; Resource Missing</div>
        <h1 class="text-2xl font-extrabold tracking-tight text-main mb-2">Endpoint or Record Not Found</h1>
        <p class="text-muted text-xs leading-relaxed mb-6">
            The URI, entity record, or operational endpoint you requested does not exist or has been relocated within the workspace directory.
        </p>

        <div class="flex items-center justify-center gap-3">
            <a href="<?= url('/dashboard') ?>" class="btn btn-primary">Return to Executive Dashboard</a>
            <a href="<?= url('/tasks') ?>" class="btn btn-secondary">Open Tasks</a>
        </div>
    </main>
</body>
</html>
