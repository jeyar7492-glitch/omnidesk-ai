<?php
/**
 * OmniDesk AI — 403 Forbidden Access Page
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = '403 Access Denied';
?>
<?php require_once MODULES_PATH . '/Shared/views/header.php'; ?>
<body class="bg-surface text-main antialiased layout-centered">
    <main class="text-center p-8 max-w-md mx-auto card card-glass">
        <div class="error-code text-6xl font-bold text-warning mb-4 font-mono">403</div>
        <h1 class="text-2xl font-bold mb-2">Access Denied</h1>
        <p class="text-muted text-sm mb-6">You do not possess the required RBAC permissions to view or perform operations on this resource.</p>
        <div class="flex gap-3 justify-center">
            <a href="<?= url('/dashboard') ?>" class="btn btn-primary">Return to Dashboard</a>
        </div>
    </main>
</body>
</html>
