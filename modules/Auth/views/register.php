<?php
/**
 * OmniDesk AI — Enterprise Registration View
 *
 * Premium dark authentication interface with brand capabilities showcase and workspace creation form.
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Register Enterprise Account — OmniDesk AI';
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
                        Launch your intelligent <br>
                        <span class="text-hero-gradient">enterprise workspace.</span>
                    </h1>
                    <p class="auth-hero-subtext">
                        Connect cross-functional teams with autonomous AI agents, double-entry financial integrity, and multi-tenant cryptographic isolation.
                    </p>

                    <!-- Feature Showcase List -->
                    <div class="auth-feature-list">
                        <div class="auth-feature-item">
                            <div class="auth-feature-icon">🛡️</div>
                            <div>
                                <h3 class="auth-feature-title">Multi-Tenant Zero Trust Isolation</h3>
                                <p class="auth-feature-desc">Dedicated tenant workspaces with granular role-based permissions.</p>
                            </div>
                        </div>
                        <div class="auth-feature-item">
                            <div class="auth-feature-icon">🤖</div>
                            <div>
                                <h3 class="auth-feature-title">11 Autonomous Domain Agents</h3>
                                <p class="auth-feature-desc">AI-powered operational orchestration across CRM, finance, and engineering.</p>
                            </div>
                        </div>
                        <div class="auth-feature-item">
                            <div class="auth-feature-icon">📜</div>
                            <div>
                                <h3 class="auth-feature-title">SHA-256 Tamper-Proof Audit Trail</h3>
                                <p class="auth-feature-desc">Cryptographic ledger auditing for compliance and regulatory governance.</p>
                            </div>
                        </div>
                    </div>

                </div>

                <footer class="auth-panel-footer">
                    <span>&copy; <?= date('Y') ?> OmniDesk AI Inc. All rights reserved.</span>
                    <div class="auth-footer-links">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Security Terms</a>
                        <a href="#">SOC-2 Certified</a>
                    </div>
                </footer>
            </section>

            <!-- ── Right Column: Registration Form ──────────────────────── -->
            <main class="auth-form-panel" aria-label="Create Workspace Account">
                <div class="auth-card-wrapper">

                    <div class="auth-form-header">
                        <h2 class="auth-form-title">Create your account</h2>
                        <p class="auth-form-subtitle">Register a new enterprise administrator identity</p>
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
                    <form action="<?= url('/register') ?>" method="POST" class="auth-form" id="registerForm">
                        <?= csrf_field() ?>

                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div class="form-group mb-0">
                                <label for="first_name" class="form-label">First Name *</label>
                                <input type="text" id="first_name" name="first_name" class="form-input" placeholder="Jane" required autofocus>
                            </div>
                            <div class="form-group mb-0">
                                <label for="last_name" class="form-label">Last Name *</label>
                                <input type="text" id="last_name" name="last_name" class="form-input" placeholder="Doe" required>
                            </div>
                        </div>

                        <div class="form-group mb-4">
                            <label for="email" class="form-label">Corporate Email Address *</label>
                            <div class="input-with-icon">
                                <span class="input-leading-icon" aria-hidden="true">✉️</span>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    class="form-input input-pl-icon"
                                    placeholder="jane.doe@company.com"
                                    required
                                    autocomplete="email"
                                >
                            </div>
                        </div>

                        <div class="form-group mb-4">
                            <label for="password" class="form-label">Password * (Min 8 chars)</label>
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
                                    autocomplete="new-password"
                                >
                            </div>
                        </div>

                        <div class="form-group mb-6">
                            <label for="password_confirmation" class="form-label">Confirm Password *</label>
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

                        <button type="submit" class="btn btn-primary auth-submit-btn" id="registerSubmitBtn">
                            <span class="btn-text">Create Enterprise Account</span>
                        </button>
                    </form>

                    <div class="auth-card-footer">
                        <span class="text-muted">Already registered?</span>
                        <a href="<?= url('/login') ?>" class="auth-link-bold">Sign in to workspace &rarr;</a>
                    </div>

                </div>
            </main>

        </div>
    </div>

    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
