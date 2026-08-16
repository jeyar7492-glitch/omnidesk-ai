<?php
/**
 * OmniDesk AI — Authenticated Enterprise Application Shell End
 *
 * Renders:
 *   - Global Search Modal (Ctrl+K)
 *   - Application Footer
 *   - Client Scripts
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}
?>
            </main> <!-- /.app-content -->

            <footer class="app-footer p-4 text-center text-xs text-muted border-t">
                <div class="flex justify-between items-center max-w-7xl mx-auto">
                    <span>&copy; <?= date('Y') ?> <?= e(APP_NAME) ?> &bull; Enterprise Operations</span>
                    <span>v<?= e(APP_VERSION) ?> &bull; System Active</span>
                </div>
            </footer>
        </div> <!-- /.app-main -->
    </div> <!-- /.app-layout -->

    <!-- ── Global Search Modal ────────────────────────────────────────────── -->
    <div class="search-modal-backdrop" id="searchModal">
        <div class="search-modal-card card card-glass">
            <div class="search-modal-header p-4 border-b flex items-center gap-3">
                <span class="search-modal-icon">🔍</span>
                <input type="text" id="searchInput" class="search-modal-input" placeholder="Search projects, tasks, contacts, documents..." autocomplete="off">
                <kbd class="modal-close-kbd" id="closeSearchBtn">ESC</kbd>
            </div>
            <div class="search-modal-body p-4 max-h-96 overflow-y-auto" id="searchResults">
                <div class="search-section-title text-xs font-semibold text-muted uppercase tracking-wider mb-2">Categories</div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <a href="<?= url('/crm') ?>" class="p-3 bg-surface-subtle rounded flex items-center gap-2 hover:bg-border-subtle">
                        <span>👥</span> <span>CRM & Contacts</span>
                    </a>
                    <a href="<?= url('/projects') ?>" class="p-3 bg-surface-subtle rounded flex items-center gap-2 hover:bg-border-subtle">
                        <span>📁</span> <span>Project Workspaces</span>
                    </a>
                    <a href="<?= url('/tasks') ?>" class="p-3 bg-surface-subtle rounded flex items-center gap-2 hover:bg-border-subtle">
                        <span>✅</span> <span>Task Boards</span>
                    </a>
                    <a href="<?= url('/finance') ?>" class="p-3 bg-surface-subtle rounded flex items-center gap-2 hover:bg-border-subtle">
                        <span>💳</span> <span>Invoices & Finance</span>
                    </a>
                </div>
            </div>
            <div class="search-modal-footer p-3 border-t text-xs text-muted flex justify-between">
                <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                <span>Press <kbd>ESC</kbd> to exit</span>
            </div>
        </div>
    </div>

    <!-- Application JavaScript -->
    <script src="<?= asset('js/app.js') ?>" defer></script>
</body>
</html>
