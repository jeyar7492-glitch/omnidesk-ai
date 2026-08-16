<?php
/**
 * OmniDesk AI — Authenticated Enterprise Application Shell Start
 *
 * Renders:
 *   - Sidebar Navigation
 *   - Topbar (Mobile Menu Toggle, Breadcrumbs, Global Search, Notification Bell, Theme Switcher, User Menu)
 *   - Main Content Wrapper
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$currentUser = \Core\Auth::user();
$currentRoute = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Navigation menu definition
$navItems = [
    ['key' => 'dashboard',     'label' => 'Dashboard',          'icon' => '📊', 'url' => '/dashboard',         'perm' => 'dashboard.view'],
    ['key' => 'my-work',       'label' => 'My Work',            'icon' => '👤', 'url' => '/my-work',           'perm' => 'dashboard.view'],
    ['key' => 'manager',       'label' => 'Manager Hub',        'icon' => '👔', 'url' => '/manager',           'perm' => 'dashboard.view'],
    ['key' => 'executive',     'label' => 'Executive Review',   'icon' => '🏛️', 'url' => '/executive',         'perm' => 'dashboard.view'],
    ['key' => 'ai',            'label' => '🤖 AI Command Center','icon' => '⚡', 'url' => '/ai/command-center', 'perm' => 'dashboard.view'],
    ['key' => 'communication', 'label' => 'Communication',      'icon' => '💬', 'url' => '/communication',     'perm' => 'dashboard.view'],
    ['key' => 'meetings',      'label' => 'Meetings',           'icon' => '📅', 'url' => '/meetings',          'perm' => 'dashboard.view'],
    ['key' => 'documents',     'label' => 'Document Vault',     'icon' => '📄', 'url' => '/documents',         'perm' => 'documents.view'],
    ['key' => 'crm',           'label' => 'CRM & Leads',        'icon' => '👥', 'url' => '/crm',               'perm' => 'crm.view'],
    ['key' => 'projects',      'label' => 'Projects',           'icon' => '📁', 'url' => '/projects',          'perm' => 'projects.view'],
    ['key' => 'tasks',         'label' => 'Task Boards',        'icon' => '✅', 'url' => '/tasks',             'perm' => 'tasks.view'],
    ['key' => 'finance',       'label' => 'Finance',            'icon' => '💳', 'url' => '/finance',           'perm' => 'finance.view'],
    ['key' => 'automation',    'label' => 'Automation',         'icon' => '⚡', 'url' => '/automation',        'perm' => 'settings.view'],
    ['key' => 'operations',    'label' => 'System Health',      'icon' => '🖥️', 'url' => '/operations/health', 'perm' => 'settings.view'],
    ['key' => 'notifications', 'label' => 'Notifications',      'icon' => '🔔', 'url' => '/notifications',     'perm' => 'notifications.view'],
    ['key' => 'settings',      'label' => 'Settings',           'icon' => '⚙️', 'url' => '/settings',          'perm' => 'settings.view'],
];
?>
<?php require_once __DIR__ . '/header.php'; ?>
<body class="bg-app text-main antialiased app-body">

    <div class="app-layout">
        <!-- Mobile Sidebar Backdrop -->
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

        <!-- ── Sidebar Navigation ─────────────────────────────────────────── -->
        <aside class="app-sidebar" id="appSidebar">
            <div class="sidebar-header">
                <a href="<?= url('/dashboard') ?>" class="brand-link">
                    <span class="brand-icon">⚡</span>
                    <span class="brand-title"><?= e(APP_NAME) ?></span>
                </a>
            </div>

            <div class="sidebar-workspace p-3">
                <?php
                $userWsList   = \Core\DashboardService::getUserWorkspaces($currentUser['id'] ?? 0);
                $currActiveWs = \Core\DashboardService::getActiveWorkspace($currentUser['id'] ?? 0);
                ?>
                <div class="dropdown-wrapper w-full">
                    <button type="button" class="workspace-badge w-full justify-between cursor-pointer" id="wsDropdownBtn">
                        <div class="flex items-center gap-2 truncate">
                            <span class="ws-dot"></span>
                            <span class="ws-name truncate font-medium"><?= e($currActiveWs['name']) ?></span>
                        </div>
                        <span class="text-xs text-muted">▼</span>
                    </button>

                    <div class="dropdown-menu ws-dropdown p-2" id="wsDropdown">
                        <div class="text-xs font-semibold text-muted uppercase tracking-wider px-2 py-1 mb-1">Switch Workspace</div>
                        <?php foreach ($userWsList as $ws): ?>
                            <form action="<?= url('/workspace/switch') ?>" method="POST" class="m-0">
                                <?= csrf_field() ?>
                                <input type="hidden" name="workspace_id" value="<?= e($ws['id']) ?>">
                                <button type="submit" class="w-full text-left p-2 rounded text-xs flex items-center justify-between hover:bg-surface-subtle border-0 bg-transparent cursor-pointer <?= (int)$ws['id'] === (int)$currActiveWs['id'] ? 'font-bold text-brand' : 'text-main' ?>">
                                    <span><?= e($ws['name']) ?></span>
                                    <?php if ((int)$ws['id'] === (int)$currActiveWs['id']): ?>
                                        <span class="text-success">✓</span>
                                    <?php endif; ?>
                                </button>
                            </form>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <nav class="sidebar-nav">
                <ul class="nav-list">
                    <?php foreach ($navItems as $item): ?>
                        <?php if (\Core\Auth::hasPermission($item['perm'])): ?>
                            <?php $isActive = str_starts_with($currentRoute, $item['url']); ?>
                            <li class="nav-item">
                                <a href="<?= url($item['url']) ?>" class="nav-link <?= $isActive ? 'active' : '' ?>">
                                    <span class="nav-icon"><?= $item['icon'] ?></span>
                                    <span class="nav-label"><?= e($item['label']) ?></span>
                                </a>
                            </li>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </ul>
            </nav>

            <div class="sidebar-footer p-4">
                <div class="user-pill flex items-center gap-3">
                    <div class="avatar-circle">
                        <?= e(strtoupper(substr($currentUser['first_name'] ?? 'U', 0, 1))) ?>
                    </div>
                    <div class="user-info flex-1 min-w-0">
                        <div class="user-name truncate"><?= e($currentUser['full_name'] ?? 'User') ?></div>
                        <div class="user-role text-xs text-muted capitalize"><?= e($currentUser['role'] ?? 'member') ?></div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- ── Main Area (Topbar + Content) ────────────────────────────────── -->
        <div class="app-main">

            <!-- Topbar Header -->
            <header class="app-topbar">
                <div class="topbar-left flex items-center gap-3">
                    <button type="button" class="btn-icon mobile-toggle" id="sidebarToggle" aria-label="Toggle Navigation">
                        ☰
                    </button>

                    <div class="breadcrumbs flex items-center gap-2 text-xs text-muted">
                        <span>OmniDesk</span>
                        <span>/</span>
                        <span class="text-main font-medium capitalize"><?= e(ltrim($currentRoute, '/') ?: 'Dashboard') ?></span>
                    </div>
                </div>

                <div class="topbar-center">
                    <!-- Global Search Trigger -->
                    <button type="button" class="search-trigger" id="globalSearchBtn">
                        <span class="search-icon">🔍</span>
                        <span class="search-text">Search workspace...</span>
                        <kbd class="search-kbd">Ctrl K</kbd>
                    </button>
                </div>

                <div class="topbar-right flex items-center gap-3">
                    <!-- Theme Switcher -->
                    <button type="button" class="btn-icon" id="themeToggleBtn" title="Toggle Light/Dark Theme">
                        🌙
                    </button>

                    <!-- Notification Bell Dropdown -->
                    <div class="dropdown-wrapper">
                        <button type="button" class="btn-icon relative" id="notifBellBtn" title="Notifications">
                            🔔
                            <span class="notif-badge">3</span>
                        </button>
                        <div class="dropdown-menu notif-dropdown" id="notifDropdown">
                            <div class="dropdown-header flex justify-between items-center p-3 border-b">
                                <strong class="text-xs uppercase text-muted">Notifications</strong>
                                <span class="badge badge-success">3 Unread</span>
                            </div>
                            <div class="notif-list p-2 text-xs">
                                <a href="#" class="notif-item p-2 block rounded hover:bg-surface-subtle">
                                    <div class="font-medium text-main">System Foundation Ready</div>
                                    <div class="text-muted text-xs">Phase 2 enterprise shell activated</div>
                                </a>
                                <a href="#" class="notif-item p-2 block rounded hover:bg-surface-subtle">
                                    <div class="font-medium text-main">Security Policy Active</div>
                                    <div class="text-muted text-xs">CSRF and rate-limiting guards online</div>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- User Profile Dropdown -->
                    <div class="dropdown-wrapper">
                        <button type="button" class="user-avatar-btn" id="userMenuBtn">
                            <div class="avatar-sm">
                                <?= e(strtoupper(substr($currentUser['first_name'] ?? 'U', 0, 1))) ?>
                            </div>
                        </button>
                        <div class="dropdown-menu profile-dropdown" id="profileDropdown">
                            <div class="p-3 border-b">
                                <div class="font-semibold text-sm"><?= e($currentUser['full_name'] ?? 'User') ?></div>
                                <div class="text-xs text-muted"><?= e($currentUser['email'] ?? '') ?></div>
                            </div>
                            <div class="py-1">
                                <a href="<?= url('/settings') ?>" class="dropdown-link">⚙️ Settings</a>
                                <a href="<?= url('/logout') ?>" class="dropdown-link text-danger">🚪 Log Out</a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Flash Messages -->
            <?php $flashes = get_flash(); ?>
            <?php if (!empty($flashes)): ?>
                <div class="flash-container p-4">
                    <?php foreach ($flashes as $f): ?>
                        <div class="alert alert-<?= e($f['type']) ?> flex items-center justify-between mb-2">
                            <span><?= e($f['message']) ?></span>
                            <button type="button" onclick="this.parentElement.remove()" class="alert-close">&times;</button>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- Main Content Container -->
            <main class="app-content p-6">
