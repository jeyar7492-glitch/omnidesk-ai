<?php
/**
 * OmniDesk AI — 404 Not Found View
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="system">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Page Not Found — <?= e(APP_NAME) ?></title>
    <link rel="stylesheet" href="<?= asset('css/variables.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/components.css') ?>">
</head>
<body class="bg-surface text-main antialiased layout-centered">
    <main class="text-center p-8 max-w-md mx-auto">
        <div class="error-code text-6xl font-bold text-muted mb-4 font-mono">404</div>
        <h1 class="text-2xl font-bold mb-2">Page Not Found</h1>
        <p class="text-muted text-sm mb-6">The page or resource you requested could not be located on this server.</p>
        <a href="<?= url('/') ?>" class="btn btn-primary">Return to Home</a>
    </main>
</body>
</html>
