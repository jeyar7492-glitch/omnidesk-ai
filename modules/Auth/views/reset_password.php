<?php
/**
 * OmniDesk AI — Reset Password View
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Set New Password';
$token = $_GET['token'] ?? '';
?>
<?php require_once MODULES_PATH . '/Shared/views/header.php'; ?>
<body class="bg-app text-main antialiased layout-centered">

    <main class="auth-container fade-in">
        <div class="brand-header text-center mb-6">
            <div class="brand-logo-badge mb-3">
                <span class="logo-icon">⚡</span>
                <span class="logo-text"><?= e(APP_NAME) ?></span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">Set a new password</h1>
            <p class="text-muted text-sm mt-1">Please enter your new password below</p>
        </div>

        <?php $flashes = get_flash(); ?>
        <?php if (!empty($flashes)): ?>
            <div class="mb-4">
                <?php foreach ($flashes as $f): ?>
                    <div class="alert alert-<?= e($f['type']) ?> mb-2 text-sm p-3 rounded-lg flex items-center justify-between">
                        <span><?= e($f['message']) ?></span>
                        <button type="button" onclick="this.parentElement.remove()" class="alert-close">&times;</button>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <div class="card card-glass p-6">
            <form action="<?= url('/reset-password') ?>" method="POST" class="form-grid gap-4">
                <?= csrf_field() ?>
                <input type="hidden" name="token" value="<?= e($token) ?>">

                <div class="form-group">
                    <label for="password" class="form-label">New Password (Min 8 characters)</label>
                    <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required minlength="8" autofocus>
                </div>

                <div class="form-group">
                    <label for="password_confirmation" class="form-label">Confirm New Password</label>
                    <input type="password" id="password_confirmation" name="password_confirmation" class="form-input" placeholder="••••••••" required minlength="8">
                </div>

                <button type="submit" class="btn btn-primary w-full py-2.5">
                    Update Password & Log In
                </button>
            </form>
        </div>

        <p class="text-center text-xs text-muted mt-6">
            <a href="<?= url('/login') ?>" class="text-brand font-medium hover:underline">Return to log in</a>
        </p>
    </main>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
