<?php
/**
 * OmniDesk AI — Front Controller (Phase 2)
 *
 * Single entry point for all HTTP requests.
 * Routes requests to Auth and Dashboard controllers with security guards.
 */

if (php_sapi_name() === 'cli-server') {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($uri !== '/' && is_file(__DIR__ . $uri)) {
        return false;
    }
}

define('OMNIDESK_APP', true);


$appRoot = dirname(__DIR__);

// 1. Configuration
require_once $appRoot . '/config/config.php';

// 2. Bootstrap
require_once $appRoot . '/config/bootstrap.php';

// 3. Helper functions
require_once CORE_PATH . '/Helpers.php';

use Core\Session;
use Core\Router;
use Core\Auth;
use Core\ActivityLog;

// 4. Session
Session::start();

// Check remember-me cookie if not logged in
if (!Auth::check()) {
    Auth::check();
}

// 5. Router setup
$router = new Router();

// ── Auth Routes (Guest Only) ──────────────────────────────────────────────────
$router->get('/login',           [\Modules\Auth\AuthController::class, 'showLogin'],        'guest');
$router->post('/login',          [\Modules\Auth\AuthController::class, 'login'],            'guest');
$router->get('/register',        [\Modules\Auth\AuthController::class, 'showRegister'],     'guest');
$router->post('/register',       [\Modules\Auth\AuthController::class, 'register'],        'guest');
$router->get('/forgot-password', [\Modules\Auth\AuthController::class, 'showForgotPassword'], 'guest');
$router->post('/forgot-password',[\Modules\Auth\AuthController::class, 'forgotPassword'],    'guest');
$router->get('/reset-password',  [\Modules\Auth\AuthController::class, 'showResetPassword'],  'guest');
$router->post('/reset-password', [\Modules\Auth\AuthController::class, 'resetPassword'],     'guest');
$router->get('/verify-email',    [\Modules\Auth\AuthController::class, 'verifyEmail']);
$router->any('/logout',          [\Modules\Auth\AuthController::class, 'logout']);

// ── Authenticated Workspace Routes ───────────────────────────────────────────
$router->get('/',                 [\Modules\Dashboard\DashboardController::class, 'index'],           'auth');
$router->get('/dashboard',        [\Modules\Dashboard\DashboardController::class, 'index'],           'auth');
$router->post('/workspace/switch',[\Modules\Dashboard\DashboardController::class, 'switchWorkspace'], 'auth');


// ── Phase 4 CRM & Lead Management Routes ──────────────────────────────────────
$router->get('/crm',                [\Modules\CRM\CRMController::class, 'index'],        'permission:crm.view');
$router->get('/crm/customers',      [\Modules\CRM\CRMController::class, 'customers'],    'permission:crm.view');
$router->get('/crm/customers/show', [\Modules\CRM\CRMController::class, 'showCustomer'], 'permission:crm.view');
$router->post('/crm/customers/save',[\Modules\CRM\CRMController::class, 'saveCustomer'], 'permission:crm.create');
$router->get('/crm/pipeline',       [\Modules\CRM\CRMController::class, 'pipeline'],     'permission:crm.view');
$router->get('/crm/leads',          [\Modules\CRM\CRMController::class, 'leads'],        'permission:crm.view');
$router->get('/crm/leads/show',     [\Modules\CRM\CRMController::class, 'showLead'],     'permission:crm.view');
$router->post('/crm/leads/save',    [\Modules\CRM\CRMController::class, 'saveLead'],     'permission:crm.create');
$router->post('/crm/leads/move-stage',[\Modules\CRM\CRMController::class,'moveStage'],   'permission:crm.edit');
$router->post('/crm/leads/convert', [\Modules\CRM\CRMController::class, 'convertLead'],  'permission:crm.edit');
$router->get('/crm/contacts',       [\Modules\CRM\CRMController::class, 'contacts'],     'permission:crm.view');


// ── Phase 5 Project & Task Management Routes ─────────────────────────────────
$router->get('/projects',          [\Modules\Projects\ProjectController::class, 'index'],        'permission:projects.view');
$router->get('/projects/show',     [\Modules\Projects\ProjectController::class, 'show'],         'permission:projects.view');
$router->post('/projects/save',    [\Modules\Projects\ProjectController::class, 'save'],         'permission:projects.create');

$router->get('/tasks',              [\Modules\Tasks\TaskController::class, 'index'],             'permission:tasks.view');
$router->get('/tasks/kanban',       [\Modules\Tasks\TaskController::class, 'kanban'],            'permission:tasks.view');
$router->get('/tasks/calendar',     [\Modules\Tasks\TaskController::class, 'calendar'],          'permission:tasks.view');
$router->get('/tasks/show',         [\Modules\Tasks\TaskController::class, 'show'],              'permission:tasks.view');
$router->post('/tasks/save',        [\Modules\Tasks\TaskController::class, 'save'],              'permission:tasks.create');
$router->post('/tasks/update-status',[\Modules\Tasks\TaskController::class, 'updateStatus'],     'permission:tasks.edit');
$router->post('/tasks/comment',     [\Modules\Tasks\TaskController::class, 'addComment'],        'permission:tasks.edit');


// ── Phase 6 Finance & Invoicing Routes ────────────────────────────────────────
$router->get('/finance',               [\Modules\Finance\FinanceController::class, 'index'],        'permission:finance.view');
$router->get('/finance/invoices',       [\Modules\Finance\FinanceController::class, 'invoices'],    'permission:finance.view');
$router->get('/finance/invoices/show',  [\Modules\Finance\FinanceController::class, 'showInvoice'], 'permission:finance.view');
$router->get('/finance/invoices/print', [\Modules\Finance\FinanceController::class, 'printInvoice'],'permission:finance.view');
$router->post('/finance/invoices/save', [\Modules\Finance\FinanceController::class, 'saveInvoice'], 'permission:finance.create');
$router->post('/finance/payments/save', [\Modules\Finance\FinanceController::class, 'recordPayment'],'permission:finance.edit');
$router->get('/finance/expenses',       [\Modules\Finance\FinanceController::class, 'expenses'],    'permission:finance.view');
$router->post('/finance/expenses/save', [\Modules\Finance\FinanceController::class, 'saveExpense'], 'permission:finance.create');
$router->get('/finance/vendors',        [\Modules\Finance\FinanceController::class, 'vendors'],     'permission:finance.view');
$router->get('/finance/reports',        [\Modules\Finance\FinanceController::class, 'reports'],     'permission:finance.view');


// ── Autonomous Business Agent Platform Routes ────────────────────────────────
$router->get('/ai/command-center',      [\Modules\AI\AIController::class, 'commandCenter'], 'permission:dashboard.view');
$router->get('/ai/assistant',           [\Modules\AI\AIController::class, 'commandCenter'], 'permission:dashboard.view');
$router->post('/ai/chat',               [\Modules\AI\AIController::class, 'chat'],          'permission:dashboard.view');
$router->post('/ai/confirm',            [\Modules\AI\AIController::class, 'confirm'],       'permission:dashboard.view');
$router->post('/ai/approvals/approve',  [\Modules\AI\AIController::class, 'approveAction'], 'permission:dashboard.view');
$router->post('/ai/approvals/reject',   [\Modules\AI\AIController::class, 'rejectAction'],  'permission:dashboard.view');


// ── Phase 8 Enterprise Work Operating System Routes ─────────────────────────
$router->get('/communication',         [\Modules\Communication\CommunicationController::class, 'index'],       'permission:dashboard.view');
$router->post('/communication/post',    [\Modules\Communication\CommunicationController::class, 'postMessage'], 'permission:dashboard.view');

$router->get('/meetings',              [\Modules\Meetings\MeetingController::class, 'index'],                  'permission:dashboard.view');
$router->post('/meetings/save',        [\Modules\Meetings\MeetingController::class, 'saveMeeting'],            'permission:dashboard.view');

$router->get('/documents',             [\Modules\Documents\DocumentController::class, 'index'],                'permission:documents.view');
$router->post('/documents/save',       [\Modules\Documents\DocumentController::class, 'saveDocument'],         'permission:documents.view');

$router->get('/automation',            [\Modules\Automation\AutomationController::class, 'index'],              'permission:settings.view');
$router->post('/automation/save',      [\Modules\Automation\AutomationController::class, 'saveRule'],           'permission:settings.view');

$router->get('/my-work',               [\Modules\Dashboard\DashboardController::class, 'myWork'],              'permission:dashboard.view');
$router->get('/manager',               [\Modules\Dashboard\DashboardController::class, 'manager'],             'permission:dashboard.view');
$router->get('/executive',             [\Modules\Dashboard\DashboardController::class, 'executive'],           'permission:dashboard.view');
$router->get('/search',                [\Modules\Dashboard\DashboardController::class, 'search'],              'permission:dashboard.view');


// ── Phase 11 & 14 Observability, Health & Reliability Probes ────────────────
$router->get('/operations/health',     [\Modules\Operations\OperationsController::class, 'health'],       'permission:settings.view');
$router->get('/operations/security',   [\Modules\Operations\OperationsController::class, 'security'],     'permission:settings.view');
$router->get('/operations/audit',      [\Modules\Operations\OperationsController::class, 'audit'],        'permission:settings.view');
$router->get('/operations/ai',         [\Modules\Operations\OperationsController::class, 'aiMetrics'],    'permission:settings.view');
$router->get('/health',                [\Modules\Operations\OperationsController::class, 'publicHealth']);
$router->get('/live',                  [\Modules\Operations\OperationsController::class, 'live']);
$router->get('/ready',                 [\Modules\Operations\OperationsController::class, 'ready']);



// Placeholder routes for future modules (Guarded by RBAC permissions)
$modulePlaceholders = [
    '/notifications' => ['perm' => 'notifications.view', 'name' => 'Notification Center'],
    '/settings'      => ['perm' => 'settings.view',      'name' => 'System Settings'],
];



foreach ($modulePlaceholders as $route => $info) {
    $router->get($route, function () use ($info) {
        Auth::requirePermission($info['perm']);
        $pageTitle = $info['name'];
        $user      = Auth::user();
        require_once MODULES_PATH . '/Shared/views/app_shell_start.php';
        echo '<div class="card p-6"><h2 class="text-xl font-bold mb-2">' . e($info['name']) . '</h2><p class="text-muted text-sm mb-4">Module space ready for Phase roadmap integration.</p><span class="badge badge-success">Permission Verified: ' . e($info['perm']) . '</span></div>';
        require_once MODULES_PATH . '/Shared/views/app_shell_end.php';
    }, 'auth');
}

// ── 404 handler ───────────────────────────────────────────────────────────────
$router->setNotFound(function (array $params): void {
    http_response_code(404);
    require_once MODULES_PATH . '/Dashboard/views/404.php';
});

// ── 6. Dispatch ─────────────────────────────────────────────────────────────
try {
    $router->dispatch();
} catch (\Throwable $e) {
    ActivityLog::critical('Unhandled exception: ' . $e->getMessage(), [
        'file'  => $e->getFile(),
        'line'  => $e->getLine(),
        'trace' => APP_DEBUG ? $e->getTraceAsString() : '[suppressed]',
    ]);

    http_response_code(500);

    if (APP_DEBUG) {
        echo '<pre style="background:#1e1e2e;color:#f38ba8;padding:2rem;margin:0;min-height:100vh;font-family:monospace;">';
        echo '<strong>[OmniDesk AI — Debug Error]</strong>' . PHP_EOL . PHP_EOL;
        echo htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . PHP_EOL . PHP_EOL;
        echo htmlspecialchars($e->getTraceAsString(), ENT_QUOTES, 'UTF-8');
        echo '</pre>';
    } else {
        require_once MODULES_PATH . '/Dashboard/views/500.php';
    }
}
