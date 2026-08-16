<?php
/**
 * OmniDesk AI — Login View
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Log In';
?>
<?php require_once MODULES_PATH . '/Shared/views/header.php'; ?>
<body class="bg-app text-main antialiased layout-centered">

    <main class="auth-container fade-in">
        <div class="brand-header text-center mb-6">
            <div class="brand-logo-badge mb-3">
                <span class="logo-icon">⚡</span>
                <span class="logo-text"><?= e(APP_NAME) ?></span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">Sign in to your account</h1>
            <p class="text-muted text-sm mt-1">Enterprise Management & Productivity Platform</p>
        </div>

        <!-- Flash messages -->
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
            <form action="<?= url('/login') ?>" method="POST" class="form-grid gap-4">
                <?= csrf_field() ?>

                <div class="form-group">
                    <label for="email" class="form-label">Work Email Address</label>
                    <input type="email" id="email" name="email" class="form-input" placeholder="name@company.com" required autofocus autocomplete="email">
                </div>

                <div class="form-group">
                    <div class="flex justify-between items-center mb-1">
                        <label for="password" class="form-label mb-0">Password</label>
                        <a href="<?= url('/forgot-password') ?>" class="text-xs text-brand hover:underline">Forgot password?</a>
                    </div>
                    <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
                </div>

                <div class="form-group flex items-center justify-between">
                    <label class="checkbox-label flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" name="remember" value="1" class="form-checkbox">
                        <span>Keep me signed in for 30 days</span>
                    </label>
                </div>

                <button type="submit" class="btn btn-primary w-full py-2.5">
                    Sign In to Platform
                </button>
            </form>

            <div class="auth-demo-credentials p-3 mt-4 rounded bg-surface-subtle text-xs border">
                <strong class="block mb-1 text-main">Demo Accounts (Pre-configured):</strong>
                <div class="text-muted font-mono">Admin: demo-admin@omnidesk.io / DemoAdmin2024!</div>
                <div class="text-muted font-mono">User: demo-user@omnidesk.io / DemoUser2024!</div>
            </div>
        </div>

        <p class="text-center text-xs text-muted mt-6">
            Don't have an enterprise account? <a href="<?= url('/register') ?>" class="text-brand font-medium hover:underline">Register your workspace</a>
        </p>
    </main>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
