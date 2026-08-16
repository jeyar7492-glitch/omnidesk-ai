<?php
/**
 * OmniDesk AI — 500 Internal Server Error View
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
    <title>500 Internal Server Error — <?= e(APP_NAME) ?></title>
    <link rel="stylesheet" href="<?= asset('css/variables.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/components.css') ?>">
</head>
<body class="bg-surface text-main antialiased layout-centered">
    <main class="text-center p-8 max-w-md mx-auto">
        <div class="error-code text-6xl font-bold text-danger mb-4 font-mono">500</div>
        <h1 class="text-2xl font-bold mb-2">System Error</h1>
        <p class="text-muted text-sm mb-6">An unexpected error occurred. The incident has been logged for system administration.</p>
        <a href="<?= url('/') ?>" class="btn btn-secondary">Return to Home</a>
    </main>
</body>
</html>
