<?php
/**
 * OmniDesk AI — Enterprise SaaS Login View
 *
 * Premium dark interface with two-column layout:
 * - Left: Brand showcase, AI capabilities, and security assurances
 * - Right: High-security workspace authentication form
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = 'Sign In — OmniDesk AI';
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
                        AI-powered business <br>
                        <span class="text-hero-gradient">operations platform.</span>
                    </h1>
                    <p class="auth-hero-subtext">
                        One intelligent workspace unifying executive intelligence, CRM pipelines, project kanban, finance, and autonomous multi-agent automation.
                    </p>

                    <!-- 3 Capability Feature Indicators -->
                    <div class="auth-features-list">
                        <div class="auth-feature-item">
                            <div class="feature-icon-wrapper">
                                <svg viewBox="0 0 20 20" fill="currentColor" class="feature-svg"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
                            </div>
                            <div class="feature-text">
                                <strong>Autonomous Multi-Agent System</strong>
                                <span>11 specialized domain agents executing with zero hallucination.</span>
                            </div>
                        </div>

                        <div class="auth-feature-item">
                            <div class="feature-icon-wrapper">
                                <svg viewBox="0 0 20 20" fill="currentColor" class="feature-svg"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                            </div>
                            <div class="feature-text">
                                <strong>Unified System of Record</strong>
                                <span>Real-time reconciliation across CRM, Projects, and Financial Ledgers.</span>
                            </div>
                        </div>

                        <div class="auth-feature-item">
                            <div class="feature-icon-wrapper">
                                <svg viewBox="0 0 20 20" fill="currentColor" class="feature-svg"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                            </div>
                            <div class="feature-text">
                                <strong>Enterprise Zero-Trust Security</strong>
                                <span>Cryptographic audit hash-chaining and strict multi-tenant isolation.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Security & Trust Indicators -->
                    <div class="auth-trust-footer">
                        <div class="trust-badge">
                            <span class="trust-dot"></span>
                            <span>SHA-256 Cryptographic Audit</span>
                        </div>
                        <div class="trust-badge">
                            <span class="trust-dot"></span>
                            <span>Strict Multi-Tenant Partitioning</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Right Column: Modern Authentication Card ─────────────── -->
            <section class="auth-form-panel" aria-label="Sign In">
                <div class="auth-card-container">
                    
                    <div class="auth-card-header">
                        <div class="auth-card-tag">Workspace Access</div>
                        <h2 class="auth-card-title">Sign in to your workspace</h2>
                        <p class="auth-card-desc">Continue managing your business with intelligent automation.</p>
                    </div>

                    <!-- Flash Notification Messages -->
                    <?php $flashes = get_flash(); ?>
                    <?php if (!empty($flashes)): ?>
                        <div class="auth-flash-container" role="alert">
                            <?php foreach ($flashes as $f): ?>
                                <div class="auth-alert auth-alert-<?= e($f['type']) ?>">
                                    <div class="auth-alert-icon">
                                        <?php if ($f['type'] === 'danger' || $f['type'] === 'error'): ?>
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                                        <?php else: ?>
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                                        <?php endif; ?>
                                    </div>
                                    <div class="auth-alert-message"><?= e($f['message']) ?></div>
                                    <button type="button" onclick="this.parentElement.remove()" class="auth-alert-close" aria-label="Dismiss notification">&times;</button>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <!-- Form -->
                    <form action="<?= url('/login') ?>" method="POST" id="authLoginForm" class="auth-form-grid" novalidate>
                        <?= csrf_field() ?>

                        <!-- Email Input -->
                        <div class="auth-field-group">
                            <label for="email" class="auth-field-label">Work Email Address</label>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                </span>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email" 
                                    class="auth-input-control" 
                                    placeholder="name@company.com" 
                                    required 
                                    autofocus 
                                    autocomplete="email"
                                    spellcheck="false"
                                >
                            </div>
                        </div>

                        <!-- Password Input -->
                        <div class="auth-field-group">
                            <div class="auth-label-row">
                                <label for="password" class="auth-field-label">Password</label>
                                <a href="<?= url('/forgot-password') ?>" class="auth-link-subtle" tabindex="4">Forgot password?</a>
                            </div>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" /></svg>
                                </span>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    class="auth-input-control auth-input-password" 
                                    placeholder="••••••••••••" 
                                    required 
                                    autocomplete="current-password"
                                >
                                <button type="button" id="togglePasswordBtn" class="auth-password-toggle" aria-label="Toggle password visibility" title="Show/hide password" tabindex="-1">
                                    <svg id="eyeOpenIcon" viewBox="0 0 20 20" fill="currentColor" class="toggle-icon"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>
                                    <svg id="eyeClosedIcon" viewBox="0 0 20 20" fill="currentColor" class="toggle-icon hidden"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Remember Me -->
                        <div class="auth-checkbox-row">
                            <label class="auth-checkbox-label">
                                <input type="checkbox" name="remember" value="1" class="auth-checkbox-control">
                                <span class="checkbox-custom"></span>
                                <span class="checkbox-text">Keep me signed in for 30 days</span>
                            </label>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" id="authSubmitBtn" class="auth-submit-button">
                            <span class="btn-text">Sign In to Workspace</span>
                            <span class="btn-icon">
                                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                            </span>
                            <span class="btn-spinner hidden" aria-hidden="true">
                                <svg class="spinner-svg" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </span>
                        </button>
                    </form>

                    <!-- Account Registration Link -->
                    <div class="auth-card-footer">
                        <p class="footer-text">
                            New enterprise workspace? 
                            <a href="<?= url('/register') ?>" class="footer-link">Register your organization</a>
                        </p>
                        <div class="footer-security-note">
                            <svg viewBox="0 0 20 20" fill="currentColor" class="security-mini-icon"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" /></svg>
                            <span>Protected by timing-safe CSRF & Session Guard</span>
                        </div>
                    </div>

                </div>
            </section>

        </div>
    </div>

    <!-- Client-side helper for password visibility toggle & loading state -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const toggleBtn = document.getElementById('togglePasswordBtn');
            const passInput = document.getElementById('password');
            const eyeOpen   = document.getElementById('eyeOpenIcon');
            const eyeClosed = document.getElementById('eyeClosedIcon');
            const loginForm = document.getElementById('authLoginForm');
            const submitBtn = document.getElementById('authSubmitBtn');

            if (toggleBtn && passInput) {
                toggleBtn.addEventListener('click', function () {
                    const isPass = passInput.getAttribute('type') === 'password';
                    passInput.setAttribute('type', isPass ? 'text' : 'password');
                    if (eyeOpen && eyeClosed) {
                        eyeOpen.classList.toggle('hidden', isPass);
                        eyeClosed.classList.toggle('hidden', !isPass);
                    }
                });
            }

            if (loginForm && submitBtn) {
                loginForm.addEventListener('submit', function () {
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnIcon = submitBtn.querySelector('.btn-icon');
                    const spinner = submitBtn.querySelector('.btn-spinner');

                    if (btnText && spinner) {
                        btnText.textContent = 'Authenticating...';
                        if (btnIcon) btnIcon.classList.add('hidden');
                        spinner.classList.remove('hidden');
                        submitBtn.setAttribute('disabled', 'disabled');
                    }
                });
            }
        });
    </script>
    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
