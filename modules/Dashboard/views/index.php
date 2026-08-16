<?php
/**
 * OmniDesk AI — Executive Workspace Dashboard View (Phase 3)
 *
 * Full enterprise dashboard rendered inside the Enterprise App Shell.
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

<!-- ── Workspace & Toolbar Header ───────────────────────────────────── -->
<div class="card card-glass p-6 mb-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold tracking-tight mb-0"><?= e($activeWs['name']) ?></h1>
                <span class="badge badge-success capitalize"><?= e($activeWs['type'] ?? 'company') ?> Workspace</span>
            </div>
            <p class="text-muted text-sm mb-0">Executive Platform Overview &bull; Filtered by <?= e($metrics['period_label'] ?? 'Last 30 Days') ?></p>
        </div>

        <!-- Date Range Filter & Quick Action Buttons -->
        <div class="flex items-center gap-3 flex-wrap">
            <form action="<?= url('/dashboard') ?>" method="GET" class="flex items-center gap-2 m-0" id="periodForm">
                <label for="periodSelect" class="text-xs text-muted font-medium">Period:</label>
                <select name="period" id="periodSelect" class="form-input text-xs py-1.5 px-3 w-auto" onchange="document.getElementById('periodForm').submit()">
                    <?php foreach ($periods as $key => $label): ?>
                        <option value="<?= e($key) ?>" <?= $period === $key ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </form>

            <div class="quick-actions-toolbar flex items-center gap-2 border-l pl-3">
                <?php if (\Core\Auth::hasPermission('projects.create')): ?>
                    <button type="button" class="btn btn-primary text-xs py-1.5 px-3" onclick="OmniDesk.openQuickAction('project')">+ Project</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('tasks.create')): ?>
                    <button type="button" class="btn btn-secondary text-xs py-1.5 px-3" onclick="OmniDesk.openQuickAction('task')">+ Task</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('crm.create')): ?>
                    <button type="button" class="btn btn-secondary text-xs py-1.5 px-3" onclick="OmniDesk.openQuickAction('lead')">+ Lead</button>
                <?php endif; ?>
                <?php if (\Core\Auth::hasPermission('finance.create')): ?>
                    <button type="button" class="btn btn-secondary text-xs py-1.5 px-3" onclick="OmniDesk.openQuickAction('invoice')">+ Invoice</button>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- ── 9 KPI Cards Grid ──────────────────────────────────────────────── -->
<div class="grid grid-cols-4 gap-4 mb-6">
    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Active Projects</span>
            <span class="text-lg">📁</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1"><?= e($metrics['active_projects']['value'] ?? 0) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['active_projects']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Open Tasks</span>
            <span class="text-lg">✅</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1"><?= e($metrics['open_tasks']['value'] ?? 0) ?></div>
        <div class="text-xs text-muted"><?= e($metrics['open_tasks']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Overdue Tasks</span>
            <span class="text-lg">⚠️</span>
        </div>
        <div class="text-2xl font-bold text-danger mb-1"><?= e($metrics['overdue_tasks']['value'] ?? 0) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['overdue_tasks']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">CRM Leads</span>
            <span class="text-lg">👥</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1"><?= e($metrics['total_leads']['value'] ?? 0) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['total_leads']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Gross Revenue</span>
            <span class="text-lg">💰</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1">$<?= number_format($metrics['gross_revenue']['value'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['gross_revenue']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Expenses</span>
            <span class="text-lg">💸</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1">$<?= number_format($metrics['total_expenses']['value'] ?? 0, 2) ?></div>
        <div class="text-xs text-muted"><?= e($metrics['total_expenses']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Net Profit</span>
            <span class="text-lg">📈</span>
        </div>
        <div class="text-2xl font-bold text-success mb-1">$<?= number_format($metrics['net_profit']['value'] ?? 0, 2) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['net_profit']['trend'] ?? '') ?></div>
    </div>

    <div class="card p-4">
        <div class="flex items-center justify-between mb-1">
            <span class="text-muted text-xs font-medium uppercase tracking-wider">Vault Documents</span>
            <span class="text-lg">📄</span>
        </div>
        <div class="text-2xl font-bold text-main mb-1"><?= e($metrics['vault_documents']['value'] ?? 0) ?></div>
        <div class="text-xs text-success font-medium"><?= e($metrics['vault_documents']['trend'] ?? '') ?></div>
    </div>
</div>

<!-- ── Financial Performance & Invoice Status (Finance View Guarded) ── -->
<?php if ($financials): ?>
    <div class="grid grid-cols-3 gap-6 mb-6">
        <!-- Revenue vs Expense SVG Chart -->
        <div class="col-span-2 card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <div>
                    <h3 class="font-semibold text-base">Financial Performance Trend</h3>
                    <p class="text-xs text-muted">Monthly Revenue, Expenses & Net Profit Breakdown</p>
                </div>
                <span class="badge badge-success">Permission: finance.view</span>
            </div>

            <div class="chart-container py-4 flex flex-col justify-end" style="height: 220px;">
                <svg viewBox="0 0 500 180" class="w-full h-full">
                    <!-- Grid Lines -->
                    <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border-color)" stroke-dasharray="4 4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="var(--border-color)" stroke-dasharray="4 4" />
                    <line x1="0" y1="140" x2="500" y2="140" stroke="var(--border-color)" />

                    <!-- Month Bars -->
                    <?php
                    $months = $financials['monthly_trend'] ?? [];
                    $x = 40;
                    foreach ($months as $m):
                        $revH = ($m['revenue'] / 140000) * 120;
                        $expH = ($m['expenses'] / 140000) * 120;
                    ?>
                        <!-- Revenue Bar -->
                        <rect x="<?= $x ?>" y="<?= 140 - $revH ?>" width="24" height="<?= $revH ?>" rx="4" fill="var(--brand-primary)" opacity="0.9" />
                        <!-- Expense Bar -->
                        <rect x="<?= $x + 28 ?>" y="<?= 140 - $expH ?>" width="24" height="<?= $expH ?>" rx="4" fill="var(--status-warning)" opacity="0.8" />
                        <!-- Month Label -->
                        <text x="<?= $x + 24 ?>" y="165" font-size="11" fill="var(--text-muted)" text-anchor="middle"><?= e($m['month']) ?></text>
                    <?php $x += 115; endforeach; ?>
                </svg>

                <div class="chart-legend flex items-center justify-center gap-6 mt-4 text-xs">
                    <span class="flex items-center gap-2"><span class="w-3 h-3 rounded" style="background: var(--brand-primary)"></span> Revenue</span>
                    <span class="flex items-center gap-2"><span class="w-3 h-3 rounded" style="background: var(--status-warning)"></span> Expenses</span>
                </div>
            </div>
        </div>

        <!-- Invoice Status Distribution -->
        <div class="card p-6">
            <h3 class="font-semibold text-base border-b pb-3 mb-4">Invoice Distribution</h3>
            <div class="space-y-4 text-xs">
                <?php foreach ($financials['invoices_by_status'] as $statusKey => $st): ?>
                    <div>
                        <div class="flex justify-between font-medium mb-1 capitalize">
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

<!-- ── Project Health & Task Summary Row ────────────────────────────── -->
<div class="grid grid-cols-2 gap-6 mb-6">
    <!-- Project Health Widget -->
    <?php if ($projectHealth): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h3 class="font-semibold text-base">Project Health & Milestones</h3>
                <span class="badge badge-success"><?= e($projectHealth['active']) ?> Active</span>
            </div>

            <div class="space-y-4 text-xs">
                <?php foreach ($projectHealth['projects'] as $pj): ?>
                    <div class="p-3 rounded-lg bg-surface-subtle border">
                        <div class="flex justify-between items-center mb-1">
                            <strong class="text-main text-sm"><?= e($pj['name']) ?></strong>
                            <span class="badge <?= $pj['status'] === 'completed' ? 'badge-success' : ($pj['status'] === 'at_risk' ? 'badge-danger' : 'badge-info') ?> capitalize">
                                <?= e(str_replace('_', ' ', $pj['status'])) ?>
                            </span>
                        </div>
                        <div class="text-muted text-xs mb-2">Milestone: <?= e($pj['milestone']) ?></div>
                        <div class="w-full bg-surface h-2 rounded-full overflow-hidden border">
                            <div class="h-full bg-brand rounded-full" style="width: <?= e($pj['progress']) ?>%"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Task Breakdown Widget -->
    <?php if ($taskOverview): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h3 class="font-semibold text-base">Task Status Breakdown</h3>
                <span class="badge badge-warning">5 Column Kanban</span>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                <?php foreach ($taskOverview['by_status'] as $stName => $count): ?>
                    <div class="p-3 rounded bg-surface-subtle border flex justify-between items-center">
                        <span class="capitalize text-muted font-medium"><?= e(str_replace('_', ' ', $stName)) ?></span>
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

<!-- ── CRM Pipeline & Recent Activity Row ────────────────────────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- CRM Pipeline Widget -->
    <?php if ($crmPipeline): ?>
        <div class="card p-6">
            <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
                <h3 class="font-semibold text-base">CRM Pipeline Funnel</h3>
                <span class="text-xs text-success font-semibold">$<?= number_format($crmPipeline['pipeline_value'], 2) ?></span>
            </div>

            <div class="space-y-3 text-xs">
                <?php foreach ($crmPipeline['stages'] as $stg): ?>
                    <div class="p-2.5 rounded bg-surface-subtle border flex items-center justify-between">
                        <div>
                            <div class="font-medium text-main"><?= e($stg['stage']) ?></div>
                            <div class="text-muted text-xs"><?= e($stg['count']) ?> Deals</div>
                        </div>
                        <div class="font-mono font-semibold">$<?= number_format($stg['value'], 0) ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Recent Activity Log Feed -->
    <div class="col-span-2 card p-6">
        <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
            <h3 class="font-semibold text-base">Real-Time Activity Audit Feed</h3>
            <span class="badge badge-info">Security Audit Active</span>
        </div>

        <div class="activity-feed space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
            <?php foreach ($activities as $act): ?>
                <div class="activity-item p-2.5 rounded bg-surface-subtle border flex items-start gap-3">
                    <span class="badge <?= $act['level'] === 'critical' ? 'badge-danger' : ($act['level'] === 'warning' ? 'badge-warning' : 'badge-info') ?> uppercase text-2xs">
                        <?= e($act['level']) ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-main truncate"><?= e($act['message']) ?></div>
                        <div class="text-muted text-xs flex gap-2">
                            <span><?= e($act['user']) ?></span>
                            <span>&bull;</span>
                            <span><?= e($act['time_ago']) ?></span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<!-- ── Recent Items Grid (Projects, Customers, Documents) ───────────── -->
<div class="grid grid-cols-3 gap-6 mb-6">
    <!-- Recent Projects -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-3">Recent Workspaces</h3>
        <div class="space-y-2 text-xs">
            <?php if (!empty($recentProjects)): ?>
                <?php foreach ($recentProjects as $rp): ?>
                    <div class="p-2 rounded bg-surface-subtle flex justify-between items-center">
                        <div>
                            <div class="font-medium text-main"><?= e($rp['name']) ?></div>
                            <div class="text-muted text-xs"><?= e($rp['category']) ?></div>
                        </div>
                        <span class="text-muted"><?= e($rp['updated']) ?></span>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-4">No recent projects available.</div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Recent Customers/Leads -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-3">Recent Accounts</h3>
        <div class="space-y-2 text-xs">
            <?php if (!empty($recentLeads)): ?>
                <?php foreach ($recentLeads as $rl): ?>
                    <div class="p-2 rounded bg-surface-subtle flex justify-between items-center">
                        <div>
                            <div class="font-medium text-main"><?= e($rl['name']) ?></div>
                            <div class="text-muted text-xs"><?= e($rl['contact']) ?> &bull; <?= e($rl['stage']) ?></div>
                        </div>
                        <span class="font-mono text-success font-semibold"><?= e($rl['value']) ?></span>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-4">No recent customer leads.</div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Recent Documents -->
    <div class="card p-6">
        <h3 class="font-semibold text-base border-b pb-3 mb-3">Recent Vault Files</h3>
        <div class="space-y-2 text-xs">
            <?php if (!empty($recentDocuments)): ?>
                <?php foreach ($recentDocuments as $rd): ?>
                    <div class="p-2 rounded bg-surface-subtle flex justify-between items-center">
                        <div class="truncate max-w-xs">
                            <div class="font-medium text-main truncate"><?= e($rd['name']) ?></div>
                            <div class="text-muted text-xs"><?= e($rd['size']) ?> &bull; <?= e($rd['date']) ?></div>
                        </div>
                        <span class="text-lg">📄</span>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-muted text-center py-4">No recent vault documents.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- ── Quick Action Modal ────────────────────────────────────────────── -->
<div class="search-modal-backdrop" id="quickActionModal">
    <div class="search-modal-card card card-glass p-6">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="font-semibold text-base" id="quickActionTitle">Quick Action</h3>
            <button type="button" class="btn-icon" onclick="OmniDesk.closeQuickAction()">&times;</button>
        </div>
        <form id="quickActionForm" action="#" method="POST" class="form-grid gap-4 text-xs">
            <?= csrf_field() ?>
            <div class="form-group">
                <label for="qa_title" class="form-label">Title / Name</label>
                <input type="text" id="qa_title" name="title" class="form-input" placeholder="Enter title..." required>
            </div>
            <div class="form-group">
                <label for="qa_desc" class="form-label">Description / Notes</label>
                <textarea id="qa_desc" name="description" class="form-input" rows="3" placeholder="Enter details..."></textarea>
            </div>
            <div class="flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="OmniDesk.closeQuickAction()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Entry</button>
            </div>
        </form>
    </div>
</div>

<?php require_once MODULES_PATH . '/Shared/views/app_shell_end.php'; ?>
