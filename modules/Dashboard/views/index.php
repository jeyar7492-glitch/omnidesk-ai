<?php
/**
 * OmniDesk AI — Executive Workspace Dashboard View
 *
 * Commercial SaaS command center:
 *   - Workspace Banner with live date range selector and quick actions
 *   - 8 High-impact KPI telemetry cards with trend indicators
 *   - Financial performance breakdown & invoice distribution
 *   - Project delivery health and task Kanban status breakdown
 *   - CRM pipeline overview and real-time audit feed
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$activeWs   = $activeWorkspace ?? ['name' => 'Enterprise Workspace', 'type' => 'company'];
$period     = $_GET['period'] ?? '30d';
$periods    = [
    'today'        => 'Today',
    '7d'           => 'Last 7 Days',
    '30d'          => 'Last 30 Days',
    'this_month'   => 'This Month',
    'last_month'   => 'Last Month',
    'this_quarter' => 'This Quarter',
    'this_year'    => 'This Year',
];
?>
<?php require_once MODULES_PATH . '/Shared/views/app_shell_start.php'; ?>

<!-- ── Workspace Header Banner ──────────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1.5">
                <h1 class="text-2xl font-extrabold tracking-tight text-main"><?= e($activeWs['name']) ?></h1>
                <span class="badge badge-brand capitalize"><?= e($activeWs['type'] ?? 'company') ?> Workspace</span>
            </div>
            <p class="text-muted text-xs">
                Real-Time Executive Intelligence &bull; Telemetry Window: <span class="text-main font-semibold"><?= e($metrics['period_label'] ?? 'Last 30 Days') ?></span>
            </p>
        </div>

        <!-- Period Selector & Quick Actions -->
        <div class="flex items-center gap-3 flex-wrap">
            <form action="<?= url('/dashboard') ?>" method="GET" class="flex items-center gap-2 m-0" id="periodForm">
                <label for="periodSelect" class="text-xs text-muted font-medium">Window:</label>
                <select name="period" id="periodSelect" class="form-select text-xs py-1.5 px-3 w-auto" onchange="document.getElementById('periodForm').submit()">
                    <?php foreach ($periods as $key => $label): ?>
                        <option value="<?= e($key) ?>" <?= $period === $key ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </form>

            <div class="flex items-center gap-2 border-l pl-3">
                <?php if (\Core\Auth::hasPermission('projects.create')): ?>
                    <button type="button" class="btn btn-sm btn-primary" onclick="OmniDesk.openQuickAction('project')">+ Project</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('tasks.create')): ?>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="OmniDesk.openQuickAction('task')">+ Task</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('crm.create')): ?>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="OmniDesk.openQuickAction('lead')">+ Lead</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('finance.create')): ?>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="OmniDesk.openQuickAction('invoice')">+ Invoice</button>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- ── 8 KPI Cards Grid ──────────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">

    <!-- Active Projects -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Active Projects</span>
            <span class="kpi-icon-pill">📁</span>
        </div>
        <div class="kpi-value"><?= e($metrics['active_projects']['value'] ?? 0) ?></div>
        <div class="kpi-footer text-success font-medium">
            <span><?= e($metrics['active_projects']['trend'] ?? 'Stable delivery') ?></span>
        </div>
    </div>

    <!-- Open Tasks -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Open Tasks</span>
            <span class="kpi-icon-pill">✅</span>
        </div>
        <div class="kpi-value"><?= e($metrics['open_tasks']['value'] ?? 0) ?></div>
        <div class="kpi-footer text-muted">
            <span><?= e($metrics['open_tasks']['trend'] ?? 'In sprint queue') ?></span>
        </div>
    </div>

    <!-- Overdue Tasks -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Overdue Tasks</span>
            <span class="kpi-icon-pill" style="color: var(--status-danger); background: var(--status-danger-bg);">⚠️</span>
        </div>
        <div class="kpi-value text-danger"><?= e($metrics['overdue_tasks']['value'] ?? 0) ?></div>
        <div class="kpi-footer text-warning font-medium">
            <span><?= e($metrics['overdue_tasks']['trend'] ?? 'Requires attention') ?></span>
        </div>
    </div>

    <!-- Total Leads -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">CRM Leads</span>
            <span class="kpi-icon-pill">👥</span>
        </div>
        <div class="kpi-value"><?= e($metrics['total_leads']['value'] ?? 0) ?></div>
        <div class="kpi-footer text-success font-medium">
            <span><?= e($metrics['total_leads']['trend'] ?? 'Active pipeline') ?></span>
        </div>
    </div>

    <!-- Gross Revenue -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Gross Revenue</span>
            <span class="kpi-icon-pill">💰</span>
        </div>
        <div class="kpi-value">$<?= number_format($metrics['gross_revenue']['value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium">
            <span><?= e($metrics['gross_revenue']['trend'] ?? 'Collected payments') ?></span>
        </div>
    </div>

    <!-- Expenses -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Total Expenses</span>
            <span class="kpi-icon-pill">💸</span>
        </div>
        <div class="kpi-value">$<?= number_format($metrics['total_expenses']['value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-muted">
            <span><?= e($metrics['total_expenses']['trend'] ?? 'Operational costs') ?></span>
        </div>
    </div>

    <!-- Net Profit -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Net Profit</span>
            <span class="kpi-icon-pill" style="color: var(--status-success); background: var(--status-success-bg);">📈</span>
        </div>
        <div class="kpi-value text-success">$<?= number_format($metrics['net_profit']['value'] ?? 0, 2) ?></div>
        <div class="kpi-footer text-success font-medium">
            <span><?= e($metrics['net_profit']['trend'] ?? 'Positive margin') ?></span>
        </div>
    </div>

    <!-- Vault Documents -->
    <div class="kpi-card">
        <div class="kpi-header">
            <span class="kpi-label">Knowledge Vault</span>
            <span class="kpi-icon-pill">📄</span>
        </div>
        <div class="kpi-value"><?= e($metrics['vault_documents']['value'] ?? 0) ?></div>
        <div class="kpi-footer text-info font-medium">
            <span><?= e($metrics['vault_documents']['trend'] ?? 'Indexed RAG chunks') ?></span>
        </div>
    </div>

</div>

<!-- ── Financial Performance & Invoice Distribution ─────────────────── -->
<?php if ($financials): ?>
    <div class="grid grid-cols-3 gap-6 mb-6">

        <!-- Performance Trend Visualizer -->
        <div class="col-span-2 card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <div>
                    <h2 class="card-title">Financial Performance Trend</h2>
                    <p class="card-subtitle">Monthly Revenue vs Operational Expenses Reconciliation</p>
                </div>
                <span class="badge badge-brand">Audit Reconciled</span>
            </div>

            <div class="chart-container py-2 flex flex-col justify-end" style="height: 200px;">
                <svg viewBox="0 0 500 160" class="w-full h-full" aria-label="Financial Chart">
                    <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border-subtle)" stroke-dasharray="4 4" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border-subtle)" stroke-dasharray="4 4" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="var(--border-color)" />

                    <?php
                    $months = $financials['monthly_trend'] ?? [];
                    $x = 45;
                    foreach ($months as $m):
                        $revH = ($m['revenue'] / 140000) * 100;
                        $expH = ($m['expenses'] / 140000) * 100;
                    ?>
                        <!-- Revenue Bar -->
                        <rect x="<?= $x ?>" y="<?= 130 - $revH ?>" width="22" height="<?= $revH ?>" rx="3" fill="var(--brand-primary)" opacity="0.9" />
                        <!-- Expense Bar -->
                        <rect x="<?= $x + 26 ?>" y="<?= 130 - $expH ?>" width="22" height="<?= $expH ?>" rx="3" fill="var(--status-warning)" opacity="0.8" />
                        <!-- Month Label -->
                        <text x="<?= $x + 24 ?>" y="152" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="middle"><?= e($m['month']) ?></text>
                    <?php $x += 115; endforeach; ?>
                </svg>

                <div class="flex items-center justify-center gap-6 mt-3 text-xs">
                    <span class="flex items-center gap-2 font-medium"><span class="w-3 h-3 rounded" style="background: var(--brand-primary)"></span> Revenue</span>
                    <span class="flex items-center gap-2 font-medium"><span class="w-3 h-3 rounded" style="background: var(--status-warning)"></span> Expenses</span>
                </div>
            </div>
        </div>

        <!-- Invoice Status Distribution -->
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h2 class="card-title">Invoice Status</h2>
                <span class="badge badge-neutral">Ledger</span>
            </div>
            <div class="space-y-4 text-xs">
                <?php foreach ($financials['invoices_by_status'] as $statusKey => $st): ?>
                    <div>
                        <div class="flex justify-between font-semibold mb-1 capitalize text-main">
                            <span><?= e($statusKey) ?> (<?= e($st['count']) ?>)</span>
                            <span>$<?= number_format($st['amount'], 2) ?></span>
                        </div>
                        <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border">
                            <div class="h-full bg-brand rounded-full" style="width: <?= e($st['percentage']) ?>%"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

    </div>
<?php endif; ?>

<!-- ── Project Delivery & Task Breakdown ────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">

    <!-- Project Health -->
    <?php if ($projectHealth): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <div>
                    <h2 class="card-title">Project Delivery Health</h2>
                    <p class="card-subtitle">Active Milestones and Delivery Roadmaps</p>
                </div>
                <span class="badge badge-success"><?= e($projectHealth['active']) ?> Active</span>
            </div>

            <div class="space-y-3.5 text-xs">
                <?php foreach ($projectHealth['projects'] as $pj): ?>
                    <div class="p-3.5 rounded-lg bg-surface-subtle border">
                        <div class="flex justify-between items-center mb-1.5">
                            <strong class="text-main text-sm font-semibold"><?= e($pj['name']) ?></strong>
                            <span class="badge <?= $pj['status'] === 'completed' ? 'badge-success' : ($pj['status'] === 'at_risk' ? 'badge-danger' : 'badge-info') ?> capitalize">
                                <?= e(str_replace('_', ' ', $pj['status'])) ?>
                            </span>
                        </div>
                        <div class="text-muted text-xs mb-2">Milestone: <span class="text-main font-medium"><?= e($pj['milestone']) ?></span></div>
                        <div class="w-full bg-surface h-2 rounded-full overflow-hidden border">
                            <div class="h-full bg-brand rounded-full" style="width: <?= e($pj['progress']) ?>%"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Task Breakdown -->
    <?php if ($taskOverview): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <div>
                    <h2 class="card-title">Task Pipeline Status</h2>
                    <p class="card-subtitle">Work Distribution across Kanban States</p>
                </div>
                <span class="badge badge-brand">Kanban</span>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                <?php foreach ($taskOverview['by_status'] as $stName => $count): ?>
                    <div class="p-3 rounded-lg bg-surface-subtle border flex justify-between items-center">
                        <span class="capitalize text-muted font-semibold"><?= e(str_replace('_', ' ', $stName)) ?></span>
                        <strong class="text-main text-sm font-mono"><?= e($count) ?></strong>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="border-t pt-3">
                <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Priority Distribution</div>
                <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="badge badge-danger">Urgent: <?= e($taskOverview['by_priority']['urgent']) ?></span>
                    <span class="badge badge-warning">High: <?= e($taskOverview['by_priority']['high']) ?></span>
                    <span class="badge badge-info">Medium: <?= e($taskOverview['by_priority']['medium']) ?></span>
                    <span class="badge badge-success">Low: <?= e($taskOverview['by_priority']['low']) ?></span>
                </div>
            </div>
        </div>
    <?php endif; ?>

</div>

<!-- ── CRM Funnel & Live Security Audit Feed ────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">

    <!-- CRM Funnel -->
    <?php if ($crmPipeline): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h2 class="card-title">CRM Pipeline Funnel</h2>
                <span class="badge badge-success font-mono">$<?= number_format($crmPipeline['pipeline_value'], 2) ?></span>
            </div>

            <div class="space-y-2.5 text-xs">
                <?php foreach ($crmPipeline['stages'] as $stg): ?>
                    <div class="p-2.5 rounded-lg bg-surface-subtle border flex items-center justify-between">
                        <div>
                            <div class="font-semibold text-main"><?= e($stg['stage']) ?></div>
                            <div class="text-muted text-xs"><?= e($stg['count']) ?> Deals</div>
                        </div>
                        <div class="font-mono font-bold text-main">$<?= number_format($stg['value'], 0) ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Real-Time Activity Log Feed -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <div>
                <h2 class="card-title">Live Cryptographic Audit Feed</h2>
                <p class="card-subtitle">SHA-256 Tamper-Evident Event Stream</p>
            </div>
            <span class="badge badge-info">Security Guard Active</span>
        </div>

        <div class="space-y-2.5 text-xs max-h-80 overflow-y-auto pr-1">
            <?php foreach ($activities as $act): ?>
                <div class="p-2.5 rounded-lg bg-surface-subtle border flex items-start gap-3">
                    <span class="badge <?= $act['level'] === 'critical' ? 'badge-danger' : ($act['level'] === 'warning' ? 'badge-warning' : 'badge-brand') ?> uppercase" style="font-size: 0.65rem;">
                        <?= e($act['level']) ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-main truncate"><?= e($act['message']) ?></div>
                        <div class="text-muted text-xs flex items-center gap-2 mt-0.5">
                            <span class="font-medium"><?= e($act['user']) ?></span>
                            <span>&bull;</span>
                            <span><?= e($act['time_ago']) ?></span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

</div>

<!-- ── Quick Action Create Modal ────────────────────────────────────── -->
<div class="search-modal-backdrop" id="quickActionModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-bold text-base text-main" id="quickActionTitle">Quick Action</h3>
            <button type="button" class="btn-icon" onclick="OmniDesk.closeQuickAction()" aria-label="Close modal">&times;</button>
        </div>
        <form id="quickActionForm" action="#" method="POST" class="form-grid gap-4 text-xs">
            <?= csrf_field() ?>
            <div class="form-group">
                <label for="qa_title" class="form-label">Title / Name</label>
                <input type="text" id="qa_title" name="title" class="form-input" placeholder="Enter title..." required>
            </div>
            <div class="form-group">
                <label for="qa_desc" class="form-label">Description / Notes</label>
                <textarea id="qa_desc" name="description" class="form-textarea" rows="3" placeholder="Enter details..."></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" class="btn btn-secondary" onclick="OmniDesk.closeQuickAction()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Entry</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
