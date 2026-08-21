<?php
/**
 * OmniDesk AI — 403 Forbidden Access Page
 *
 * Enterprise Access Control Denial View.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = '403 Access Denied — OmniDesk AI';
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
        <div class="mb-4 inline-flex p-4 rounded-2xl" style="background: rgba(245, 158, 11, 0.1); color: var(--status-warning);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>

        <div class="font-mono font-extrabold text-xs uppercase tracking-widest text-warning mb-1">HTTP 403 &bull; Authorization Boundary</div>
        <h1 class="text-2xl font-extrabold tracking-tight text-main mb-2">Access Restricted by RBAC Policy</h1>
        <p class="text-muted text-xs leading-relaxed mb-6">
            Your current identity role does not possess the requisite permission grants to access or execute operations on this workspace resource.
        </p>

        <div class="flex items-center justify-center gap-3">
            <a href="<?= url('/dashboard') ?>" class="btn btn-primary">Return to Executive Dashboard</a>
            <a href="<?= url('/operations/security') ?>" class="btn btn-secondary">Security Policy</a>
        </div>
    </main>
</body>
</html>
