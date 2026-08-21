<?php
/**
 * OmniDesk AI — Forgot Password View
 *
 * Premium dark authentication interface for secure password recovery.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Reset Password — OmniDesk AI';
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
                        Zero-trust identity & <br>
                        <span class="text-hero-gradient">access recovery.</span>
                    </h1>
                    <p class="auth-hero-subtext">
                        Recover administrative access through cryptographically signed email tokens with automated replay protection.
                    </p>

                    <!-- Feature Showcase List -->
                    <div class="auth-feature-list">
                        <div class="auth-feature-item">
                            <div class="auth-feature-icon">🛡️</div>
                            <div>
                                <h3 class="auth-feature-title">Expiring Secure Nonces</h3>
                                <p class="auth-feature-desc">Single-use reset tokens with strict 15-minute expiration windows.</p>
                            </div>
                        </div>
                        <div class="auth-feature-item">
                            <div class="auth-feature-icon">🔒</div>
                            <div>
                                <h3 class="auth-feature-title">Session Invalidation</h3>
                                <p class="auth-feature-desc">Immediate revocation of active sessions across all devices upon password reset.</p>
                            </div>
                        </div>
                    </div>

                </div>

                <footer class="auth-panel-footer">
                    <span>&copy; <?= date('Y') ?> OmniDesk AI Inc. All rights reserved.</span>
                    <div class="auth-footer-links">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Security Terms</a>
                    </div>
                </footer>
            </section>

            <!-- ── Right Column: Password Recovery Form ─────────────────── -->
            <main class="auth-form-panel" aria-label="Password Recovery">
                <div class="auth-card-wrapper">

                    <div class="auth-form-header">
                        <h2 class="auth-form-title">Reset password</h2>
                        <p class="auth-form-subtitle">Enter your email to receive recovery instructions</p>
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
                    <form action="<?= url('/forgot-password') ?>" method="POST" class="auth-form" id="forgotForm">
                        <?= csrf_field() ?>

                        <div class="form-group mb-6">
                            <label for="email" class="form-label">Account Email Address *</label>
                            <div class="input-with-icon">
                                <span class="input-leading-icon" aria-hidden="true">✉️</span>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    class="form-input input-pl-icon"
                                    placeholder="name@company.com"
                                    required
                                    autofocus
                                    autocomplete="email"
                                >
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary auth-submit-btn" id="forgotSubmitBtn">
                            <span class="btn-text">Send Password Reset Link</span>
                        </button>
                    </form>

                    <div class="auth-card-footer">
                        <span class="text-muted">Remembered your password?</span>
                        <a href="<?= url('/login') ?>" class="auth-link-bold">Return to login &rarr;</a>
                    </div>

                </div>
            </main>

        </div>
    </div>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
