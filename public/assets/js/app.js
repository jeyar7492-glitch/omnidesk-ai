/**
 * OmniDesk AI — Client-Side Enterprise App Shell & Dashboard (app.js)
 *
 * Vanilla JavaScript handlers:
 *   - Mobile sidebar drawer toggle
 *   - Workspace switcher dropdown toggle
 *   - User profile dropdown toggle
 *   - Notification bell dropdown toggle
 *   - Theme switcher (Light/Dark/System)
 *   - Global Search Modal (Ctrl+K / Cmd+K / ESC)
 *   - Quick Actions Modal
 *   - CSRF fetch wrapper
 */

(function () {
    'use strict';

    const OmniDesk = {
        init() {
            this.setupTheme();
            this.setupCsrf();
            this.setupSidebar();
            this.setupDropdowns();
            this.setupSearchModal();
            this.setupQuickActions();
            console.log('[OmniDesk AI] Enterprise App Shell & Executive Dashboard initialized.');
        },

        // ── Theme Switcher ──────────────────────────────────────────────────
        setupTheme() {
            const savedTheme = localStorage.getItem('omnidesk_theme') || 'system';
            document.documentElement.setAttribute('data-theme', savedTheme);

            const themeBtn = document.getElementById('themeToggleBtn');
            if (themeBtn) {
                themeBtn.addEventListener('click', () => {
                    const current = document.documentElement.getAttribute('data-theme');
                    const next = current === 'dark' ? 'light' : 'dark';
                    localStorage.setItem('omnidesk_theme', next);
                    document.documentElement.setAttribute('data-theme', next);
                });
            }
        },

        // ── CSRF Header Resolution ──────────────────────────────────────────
        setupCsrf() {
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            if (metaToken) {
                this.csrfToken = metaToken.getAttribute('content');
            }
        },

        // ── Mobile Sidebar Drawer ───────────────────────────────────────────
        setupSidebar() {
            const toggleBtn = document.getElementById('sidebarToggle');
            const sidebar   = document.getElementById('appSidebar');
            const backdrop  = document.getElementById('sidebarBackdrop');

            if (toggleBtn && sidebar && backdrop) {
                const toggle = () => {
                    sidebar.classList.toggle('active');
                    backdrop.classList.toggle('active');
                };

                toggleBtn.addEventListener('click', toggle);
                backdrop.addEventListener('click', toggle);
            }
        },

        // ── Dropdowns (Workspace, Profile & Notifications) ───────────────────
        setupDropdowns() {
            const wsBtn       = document.getElementById('wsDropdownBtn');
            const wsMenu      = document.getElementById('wsDropdown');

            const userBtn     = document.getElementById('userMenuBtn');
            const profileMenu = document.getElementById('profileDropdown');

            const notifBtn    = document.getElementById('notifBellBtn');
            const notifMenu   = document.getElementById('notifDropdown');

            const closeAll = () => {
                if (wsMenu) wsMenu.classList.remove('active');
                if (profileMenu) profileMenu.classList.remove('active');
                if (notifMenu) notifMenu.classList.remove('active');
            };

            if (wsBtn && wsMenu) {
                wsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isAct = wsMenu.classList.contains('active');
                    closeAll();
                    if (!isAct) wsMenu.classList.add('active');
                });
            }

            if (userBtn && profileMenu) {
                userBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isAct = profileMenu.classList.contains('active');
                    closeAll();
                    if (!isAct) profileMenu.classList.add('active');
                });
            }

            if (notifBtn && notifMenu) {
                notifBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isAct = notifMenu.classList.contains('active');
                    closeAll();
                    if (!isAct) notifMenu.classList.add('active');
                });
            }

            document.addEventListener('click', closeAll);
        },

        // ── Global Search Modal (Ctrl+K / Cmd+K) ─────────────────────────────
        setupSearchModal() {
            const modal      = document.getElementById('searchModal');
            const triggerBtn = document.getElementById('globalSearchBtn');
            const closeBtn   = document.getElementById('closeSearchBtn');
            const input      = document.getElementById('searchInput');

            if (!modal) return;

            const open = () => {
                modal.classList.add('active');
                if (input) input.focus();
            };

            const close = () => {
                modal.classList.remove('active');
            };

            this.openSearch  = open;
            this.closeSearch = close;

            if (triggerBtn) triggerBtn.addEventListener('click', open);
            if (closeBtn) closeBtn.addEventListener('click', close);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    modal.classList.contains('active') ? close() : open();
                }
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    close();
                }
            });
        },

        // ── Quick Actions Modal ──────────────────────────────────────────────
        setupQuickActions() {
            const modal = document.getElementById('quickActionModal');
            const title = document.getElementById('quickActionTitle');
            const form  = document.getElementById('quickActionForm');

            if (!modal) return;

            this.openQuickAction = (type) => {
                const names = {
                    project: 'Create New Project Workspace',
                    task:    'Create New Task Entry',
                    lead:    'Add Customer Lead',
                    invoice: 'Issue Financial Invoice',
                };
                if (title) title.textContent = names[type] || 'Quick Action Entry';
                modal.classList.add('active');
            };

            this.closeQuickAction = () => {
                modal.classList.remove('active');
                if (form) form.reset();
            };

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeQuickAction();
            });
        },

        // ── Secure Fetch Wrapper ─────────────────────────────────────────────
        async fetch(url, options = {}) {
            options.headers = options.headers || {};
            const token = this.csrfToken || document.querySelector('input[name="_csrf"]')?.value;

            if (token) {
                options.headers['X-CSRF-TOKEN'] = token;
            }

            return window.fetch(url, options);
        }
    };

    window.OmniDesk = OmniDesk;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => OmniDesk.init());
    } else {
        OmniDesk.init();
    }
})();
