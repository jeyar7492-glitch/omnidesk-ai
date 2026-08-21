<?php
/**
 * OmniDesk AI — Reset Password View
 *
 * Premium dark authentication interface for setting a new password.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Set New Password — OmniDesk AI';
$token = $_GET['token'] ?? '';
?>
<?php require_once MODULES_PATH . '/Shared/views/header.php'; ?>
<body class="auth-page-body antialiased">

    <!-- Ambient Glow Backgrounds -->
    <div class="auth-ambient-glow auth-glow-1" aria-hidden="true"></div>
    <div class="auth-ambient-glow auth-glow-2" aria-hidden="true"></div>
    <div class="auth-grid-overlay" aria-hidden="true"></div>

    <div class="auth-viewport-wrapper">
        <div class="auth-split-layout">

            <!-- ── Left Column: Brand & Capability Showcase ─────────────── -->
            <section class="auth-brand-panel" aria-label="Platform Overview">
                <div class="brand-panel-content">

                    <!-- Brand Identity Mark -->
                    <div class="auth-brand-badge mb-6">
                        <svg class="auth-logo-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <rect width="36" height="36" rx="9" fill="url(#brandGrad)" />
                            <path d="M18 8L27 13.5V22.5L18 28L9 22.5V13.5L18 8Z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />
                            <circle cx="18" cy="18" r="3.5" fill="#38bdf8" />
                            <path d="M18 8V18M27 13.5L18 18M9 13.5L18 18M18 28V18" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
                            <defs>
                                <linearGradient id="brandGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#4f46e5" />
                                    <stop offset="1" stop-color="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div class="auth-brand-text">
                            <span class="auth-brand-title">OmniDesk<span class="text-gradient"> AI</span></span>
                            <span class="auth-brand-version">v1.0.1 Enterprise</span>
                        </div>
                    </div>

                    <!-- Value Proposition -->
                    <h1 class="auth-hero-heading">
                        Establish new secure <br>
                        <span class="text-hero-gradient">access credentials.</span>
                    </h1>
                    <p class="auth-hero-subtext">
                        Enforce strong cryptographic passwords with modern Argon2id / bcrypt hashing standards.
                    </p>

                </div>

                <footer class="auth-panel-footer">
                    <span>&copy; <?= date('Y') ?> OmniDesk AI Inc. All rights reserved.</span>
                </footer>
            </section>

            <!-- ── Right Column: Password Reset Form ────────────────────── -->
            <main class="auth-form-panel" aria-label="Set New Password">
                <div class="auth-card-wrapper">

                    <div class="auth-form-header">
                        <h2 class="auth-form-title">Set new password</h2>
                        <p class="auth-form-subtitle">Choose a strong password with at least 8 characters</p>
                    </div>

                    <!-- Flash Message Alerts -->
                    <?php $flashes = get_flash(); ?>
                    <?php if (!empty($flashes)): ?>
                        <div class="auth-alerts-container" role="alert">
                            <?php foreach ($flashes as $f): ?>
                                <div class="alert alert-<?= e($f['type']) ?> auth-alert">
                                    <div class="alert-content">
                                        <span class="alert-icon"><?= $f['type'] === 'error' ? '⚠️' : '✓' ?></span>
                                        <span><?= e($f['message']) ?></span>
                                    </div>
                                    <button type="button" onclick="this.closest('.auth-alert').remove()" class="alert-dismiss" aria-label="Dismiss alert">&times;</button>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <!-- Form Container -->
                    <form action="<?= url('/reset-password') ?>" method="POST" class="auth-form" id="resetForm">
                        <?= csrf_field() ?>
                        <input type="hidden" name="token" value="<?= e($token) ?>">

                        <div class="form-group mb-4">
                            <label for="password" class="form-label">New Password * (Min 8 chars)</label>
                            <div class="input-with-icon">
                                <span class="input-leading-icon" aria-hidden="true">🔒</span>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    class="form-input input-pl-icon"
                                    placeholder="••••••••"
                                    required
                                    minlength="8"
                                    autofocus
                                    autocomplete="new-password"
                                >
                            </div>
                        </div>

                        <div class="form-group mb-6">
                            <label for="password_confirmation" class="form-label">Confirm New Password *</label>
                            <div class="input-with-icon">
                                <span class="input-leading-icon" aria-hidden="true">🔒</span>
                                <input
                                    type="password"
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    class="form-input input-pl-icon"
                                    placeholder="••••••••"
                                    required
                                    minlength="8"
                                    autocomplete="new-password"
                                >
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary auth-submit-btn" id="resetSubmitBtn">
                            <span class="btn-text">Update Password & Access Workspace</span>
                        </button>
                    </form>

                    <div class="auth-card-footer">
                        <a href="<?= url('/login') ?>" class="auth-link-bold">&larr; Return to login</a>
                    </div>

                </div>
            </main>

        </div>
    </div>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
