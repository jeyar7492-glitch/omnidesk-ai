<?php
/**
 * OmniDesk AI — Register View
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Create Enterprise Account';
?>
<?php require_once MODULES_PATH . '/Shared/views/header.php'; ?>
<body class="bg-app text-main antialiased layout-centered">

    <main class="auth-container fade-in">
        <div class="brand-header text-center mb-6">
            <div class="brand-logo-badge mb-3">
                <span class="logo-icon">⚡</span>
                <span class="logo-text"><?= e(APP_NAME) ?></span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">Register Enterprise Workspace</h1>
            <p class="text-muted text-sm mt-1">Join OmniDesk AI Productivity Platform</p>
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
            <form action="<?= url('/register') ?>" method="POST" class="form-grid gap-4">
                <?= csrf_field() ?>

                <div class="grid grid-cols-2 gap-3">
                    <div class="form-group">
                        <label for="first_name" class="form-label">First Name</label>
                        <input type="text" id="first_name" name="first_name" class="form-input" placeholder="Jane" required autofocus>
                    </div>
                    <div class="form-group">
                        <label for="last_name" class="form-label">Last Name</label>
                        <input type="text" id="last_name" name="last_name" class="form-input" placeholder="Doe" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="email" class="form-label">Work Email Address</label>
                    <input type="email" id="email" name="email" class="form-input" placeholder="jane.doe@company.com" required>
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">Password (Min 8 characters)</label>
                    <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required minlength="8">
                </div>

                <div class="form-group">
                    <label for="password_confirmation" class="form-label">Confirm Password</label>
                    <input type="password" id="password_confirmation" name="password_confirmation" class="form-input" placeholder="••••••••" required minlength="8">
                </div>

                <button type="submit" class="btn btn-primary w-full py-2.5">
                    Create Account
                </button>
            </form>
        </div>

        <p class="text-center text-xs text-muted mt-6">
            Already registered? <a href="<?= url('/login') ?>" class="text-brand font-medium hover:underline">Sign in to workspace</a>
        </p>
    </main>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
