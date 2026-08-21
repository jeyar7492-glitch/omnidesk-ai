<?php
/**
 * OmniDesk AI — Enterprise Authenticated Application Shell (Start)
 *
 * Professional B2B SaaS Layout:
 *   - Grouped Sidebar Navigation (Home, Work, Finance, Intelligence, Collaboration, Operations)
 *   - Enterprise Topbar (Breadcrumbs, Global Search, Quick Create, Notifications, Theme, Profile)
 *   - Responsive Mobile Drawer
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$currentUser = \Core\Auth::user();
$currentRoute = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Navigation Menu Structure Grouped by Enterprise Functional Domains
$navGroups = [
    [
        'title' => 'Core & Overview',
        'items' => [
            ['key' => 'dashboard', 'label' => 'Executive Dashboard', 'icon' => '📊', 'url' => '/dashboard', 'perm' => 'dashboard.view'],
            ['key' => 'my-work',   'label' => 'My Work & Queue',     'icon' => '👤', 'url' => '/my-work',   'perm' => 'dashboard.view'],
            ['key' => 'manager',   'label' => 'Team Manager Hub',    'icon' => '👔', 'url' => '/manager',   'perm' => 'dashboard.view'],
            ['key' => 'executive', 'label' => 'Executive Briefing',   'icon' => '🏛️', 'url' => '/executive', 'perm' => 'dashboard.view'],
        ]
    ],
    [
        'title' => 'Work & Execution',
        'items' => [
            ['key' => 'crm',       'label' => 'CRM & Pipeline',      'icon' => '👥', 'url' => '/crm',       'perm' => 'crm.view'],
            ['key' => 'projects',  'label' => 'Projects & Delivery', 'icon' => '📁', 'url' => '/projects',  'perm' => 'projects.view'],
            ['key' => 'tasks',     'label' => 'Task Kanban Board',   'icon' => '✅', 'url' => '/tasks',     'perm' => 'tasks.view'],
        ]
    ],
    [
        'title' => 'Finance & Ledger',
        'items' => [
            ['key' => 'finance',   'label' => 'Finance & Invoicing', 'icon' => '💳', 'url' => '/finance',   'perm' => 'finance.view'],
        ]
    ],
    [
        'title' => 'AI & Knowledge',
        'items' => [
            ['key' => 'ai',        'label' => 'AI Command Center',   'icon' => '⚡', 'url' => '/ai/command-center', 'perm' => 'dashboard.view', 'badge' => 'Agentic'],
            ['key' => 'documents', 'label' => 'Document Vault & RAG','icon' => '📄', 'url' => '/documents', 'perm' => 'documents.view'],
        ]
    ],
    [
        'title' => 'Collaboration',
        'items' => [
            ['key' => 'communication', 'label' => 'Channels & Chat',  'icon' => '💬', 'url' => '/communication', 'perm' => 'dashboard.view'],
            ['key' => 'meetings',      'label' => 'Meetings & Agenda','icon' => '📅', 'url' => '/meetings',      'perm' => 'dashboard.view'],
        ]
    ],
    [
        'title' => 'Operations & Security',
        'items' => [
            ['key' => 'operations', 'label' => 'System Health',      'icon' => '🖥️', 'url' => '/operations/health',   'perm' => 'settings.view'],
            ['key' => 'security',   'label' => 'Security Events',    'icon' => '🛡️', 'url' => '/operations/security', 'perm' => 'settings.view'],
            ['key' => 'audit',      'label' => 'Audit Trail',        'icon' => '📜', 'url' => '/operations/audit',    'perm' => 'settings.view'],
            ['key' => 'ai-metrics', 'label' => 'AI Observability',   'icon' => '📈', 'url' => '/operations/ai',       'perm' => 'settings.view'],
            ['key' => 'automation', 'label' => 'Workflow Automation','icon' => '⚙️', 'url' => '/automation',          'perm' => 'settings.view'],
        ]
    ]
];
?>
<?php require_once __DIR__ . '/header.php'; ?>
<body class="bg-app text-main antialiased app-body">

    <div class="app-layout">
        <!-- Mobile Sidebar Backdrop -->
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

        <!-- ── Sidebar Navigation ─────────────────────────────────────────── -->
        <aside class="app-sidebar" id="appSidebar" aria-label="Main Navigation">

            <!-- Brand Header -->
            <div class="sidebar-header">
                <a href="<?= url('/dashboard') ?>" class="brand-link">
                    <svg class="brand-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <rect width="32" height="32" rx="8" fill="url(#sidebarLogoGrad)" />
                        <path d="M16 7L24 12V20L16 25L8 20V12L16 7Z" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
                        <circle cx="16" cy="16" r="3" fill="#38bdf8" />
                        <defs>
                            <linearGradient id="sidebarLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#4f46e5" />
                                <stop offset="1" stop-color="#06b6d4" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span><?= e(APP_NAME) ?></span>
                </a>
                <span class="brand-badge-version">v1.0.1</span>
            </div>

            <!-- Workspace Selector Dropdown -->
            <div class="sidebar-workspace">
                <?php
                $userWsList   = \Core\DashboardService::getUserWorkspaces($currentUser['id'] ?? 0);
                $currActiveWs = \Core\DashboardService::getActiveWorkspace($currentUser['id'] ?? 0);
                ?>
                <div class="dropdown-wrapper w-full">
                    <button type="button" class="workspace-badge-btn" id="wsDropdownBtn" aria-haspopup="true" aria-expanded="false" title="Switch Workspace">
                        <div class="flex items-center gap-2 truncate">
                            <span class="ws-indicator"></span>
                            <span class="ws-name truncate font-medium"><?= e($currActiveWs['name'] ?? 'Production Workspace') ?></span>
                        </div>
                        <span class="text-xs text-muted">▼</span>
                    </button>

                    <div class="dropdown-menu ws-dropdown" id="wsDropdown" role="menu">
                        <div class="text-xs font-semibold text-muted uppercase tracking-wider px-2 py-1 mb-1">Workspaces</div>
                        <?php foreach ($userWsList as $ws): ?>
                            <form action="<?= url('/workspace/switch') ?>" method="POST" class="m-0">
                                <?= csrf_field() ?>
                                <input type="hidden" name="workspace_id" value="<?= e($ws['id']) ?>">
                                <button type="submit" class="w-full text-left p-2 rounded text-xs flex items-center justify-between hover:bg-surface-subtle border-0 bg-transparent cursor-pointer <?= (int)$ws['id'] === (int)($currActiveWs['id'] ?? 0) ? 'font-bold text-brand' : 'text-main' ?>" role="menuitem">
                                    <span><?= e($ws['name']) ?></span>
                                    <?php if ((int)$ws['id'] === (int)($currActiveWs['id'] ?? 0)): ?>
                                        <span class="text-success font-bold">✓</span>
                                    <?php endif; ?>
                                </button>
                            </form>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <!-- Grouped Navigation -->
            <nav class="sidebar-nav">
                <?php foreach ($navGroups as $group): ?>
                    <div class="nav-group">
                        <div class="nav-group-title"><?= e($group['title']) ?></div>
                        <ul class="nav-list">
                            <?php foreach ($group['items'] as $item): ?>
                                <?php if (\Core\Auth::hasPermission($item['perm'])): ?>
                                    <?php
                                    $isActive = ($currentRoute === $item['url']) ||
                                                ($item['url'] !== '/dashboard' && str_starts_with($currentRoute, $item['url']));
                                    ?>
                                    <li class="nav-item">
                                        <a href="<?= url($item['url']) ?>" class="nav-link <?= $isActive ? 'active' : '' ?>">
                                            <span class="nav-icon"><?= $item['icon'] ?></span>
                                            <span class="nav-label"><?= e($item['label']) ?></span>
                                            <?php if (!empty($item['badge'])): ?>
                                                <span class="nav-badge"><?= e($item['badge']) ?></span>
                                            <?php endif; ?>
                                        </a>
                                    </li>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endforeach; ?>
            </nav>

            <!-- User Footer Pill -->
            <div class="sidebar-footer">
                <div class="user-pill">
                    <div class="avatar-circle">
                        <?= e(strtoupper(substr($currentUser['first_name'] ?? 'A', 0, 1))) ?>
                    </div>
                    <div class="user-info flex-1 min-w-0">
                        <div class="user-name font-semibold text-xs text-main truncate"><?= e($currentUser['full_name'] ?? 'Administrator') ?></div>
                        <div class="user-role text-xs text-muted capitalize truncate"><?= e($currentUser['role'] ?? 'admin') ?> &bull; <span class="text-success font-medium">Online</span></div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- ── Main Canvas (Topbar + Content) ──────────────────────────────── -->
        <div class="app-main">

            <!-- Topbar Header -->
            <header class="app-topbar">
                <div class="topbar-left">
                    <button type="button" class="btn-icon mobile-toggle" id="sidebarToggle" aria-label="Toggle Navigation">
                        ☰
                    </button>

                    <!-- Breadcrumbs -->
                    <div class="breadcrumbs">
                        <span class="text-muted">OmniDesk</span>
                        <span class="breadcrumb-separator">/</span>
                        <span class="breadcrumb-current capitalize">
                            <?= e(trim(str_replace(['/', '-', '_'], ' ', $currentRoute)) ?: 'Dashboard') ?>
                        </span>
                    </div>
                </div>

                <div class="topbar-center">
                    <!-- Global Search Trigger -->
                    <button type="button" class="search-trigger" id="globalSearchBtn" aria-label="Search workspace">
                        <span class="search-icon">🔍</span>
                        <span class="search-text">Search workspace...</span>
                        <kbd class="search-kbd">Ctrl K</kbd>
                    </button>
                </div>

                <div class="topbar-right">
                    <!-- Quick Create Button -->
                    <div class="dropdown-wrapper">
                        <button type="button" class="btn btn-sm btn-primary" id="quickCreateBtn" aria-haspopup="true" aria-expanded="false">
                            <span>+ Create</span>
                        </button>
                        <div class="dropdown-menu" id="quickCreateMenu" role="menu">
                            <div class="text-xs font-semibold text-muted uppercase tracking-wider px-2 py-1 mb-1">New Entity</div>
                            <a href="<?= url('/crm') ?>" class="dropdown-link" role="menuitem">👥 New Lead</a>
                            <a href="<?= url('/projects') ?>" class="dropdown-link" role="menuitem">📁 New Project</a>
                            <a href="<?= url('/tasks') ?>" class="dropdown-link" role="menuitem">✅ New Task</a>
                            <a href="<?= url('/finance') ?>" class="dropdown-link" role="menuitem">💳 New Invoice</a>
                        </div>
                    </div>

                    <!-- AI Assistant Access Button -->
                    <a href="<?= url('/ai/command-center') ?>" class="btn-icon" title="AI Command Center" aria-label="AI Command Center">
                        ⚡
                    </a>

                    <!-- Theme Toggle Switcher -->
                    <button type="button" class="btn-icon" id="themeToggleBtn" title="Toggle Light/Dark Theme" aria-label="Toggle Theme">
                        🌙
                    </button>

                    <!-- Notification Bell -->
                    <div class="dropdown-wrapper">
                        <button type="button" class="btn-icon relative" id="notifBellBtn" title="Notifications" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
                            🔔
                            <span class="notif-badge">3</span>
                        </button>
                        <div class="dropdown-menu notif-dropdown" id="notifDropdown" role="menu">
                            <div class="dropdown-header flex justify-between items-center p-3 border-b">
                                <strong class="text-xs uppercase text-muted">Notifications</strong>
                                <span class="badge badge-success">Active</span>
                            </div>
                            <div class="notif-list p-2 text-xs">
                                <div class="p-2 rounded bg-surface-subtle mb-1">
                                    <div class="font-semibold text-main">System Health Normal</div>
                                    <div class="text-muted text-xs">All 52 InnoDB tables verified</div>
                                </div>
                                <div class="p-2 rounded hover:bg-surface-subtle mb-1">
                                    <div class="font-semibold text-main">AI Multi-Agent Ready</div>
                                    <div class="text-muted text-xs">11 domain supervisors online</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- User Menu Dropdown -->
                    <div class="dropdown-wrapper">
                        <button type="button" class="user-avatar-btn cursor-pointer border-0 bg-transparent" id="userMenuBtn" aria-haspopup="true" aria-expanded="false" aria-label="User Account Menu">
                            <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.75rem;">
                                <?= e(strtoupper(substr($currentUser['first_name'] ?? 'A', 0, 1))) ?>
                            </div>
                        </button>
                        <div class="dropdown-menu profile-dropdown" id="profileDropdown" role="menu">
                            <div class="p-3 border-b">
                                <div class="font-semibold text-sm text-main"><?= e($currentUser['full_name'] ?? 'Administrator') ?></div>
                                <div class="text-xs text-muted truncate"><?= e($currentUser['email'] ?? 'admin@omnidesk.internal') ?></div>
                            </div>
                            <div class="py-1">
                                <a href="<?= url('/operations/health') ?>" class="dropdown-link" role="menuitem">⚙️ System Console</a>
                                <a href="<?= url('/logout') ?>" class="dropdown-link text-danger font-semibold" role="menuitem">🚪 Sign Out</a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Flash Notification Messages -->
            <?php $flashes = get_flash(); ?>
            <?php if (!empty($flashes)): ?>
                <div class="flash-container px-6 pt-4">
                    <?php foreach ($flashes as $f): ?>
                        <div class="alert alert-<?= e($f['type']) ?> flex items-center justify-between mb-2">
                            <span><?= e($f['message']) ?></span>
                            <button type="button" onclick="this.parentElement.remove()" class="alert-close" aria-label="Close notification">&times;</button>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- Main Content Container -->
            <main class="app-content">
