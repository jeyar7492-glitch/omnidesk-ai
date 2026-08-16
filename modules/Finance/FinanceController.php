<?php
/**
 * OmniDesk AI — Finance & Invoicing Controller (Phase 6)
 *
 * Namespace: Modules\Finance
 */

namespace Modules\Finance;

use Core\Auth;
use Core\Security;
use Core\DashboardService;
use Modules\CRM\Customer;
use Modules\Projects\Project;

class FinanceController
{
    /**
     * GET /finance
     * Finance Executive Dashboard overview.
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Finance & Invoicing Dashboard';

        $metrics  = Invoice::getFinancialMetrics($wsId);
        $invoices = Invoice::getList($wsId, [], 1, 5)['data'] ?? [];
        $expenses = Expense::getList($wsId);

        require_once __DIR__ . '/views/index.php';
    }

    /**
     * GET /finance/invoices
     */
    public function invoices(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Invoices Directory';

        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        $result    = Invoice::getList($wsId, ['search' => $search, 'status' => $status]);
        $customers = Customer::getList($wsId)['data'] ?? [];
        $projects  = Project::getList($wsId)['data'] ?? [];

        require_once __DIR__ . '/views/invoices.php';
    }

    /**
     * GET /finance/invoices/show
     */
    public function showInvoice(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $id              = (int)($_GET['id'] ?? 0);

        $invoice = Invoice::find($id, $activeWorkspace['id']);
        if (!$invoice) {
            flash('error', 'Invoice record not found or access denied.');
            redirect('/finance/invoices');
        }

        $pageTitle = 'Invoice Details — ' . $invoice['invoice_number'];
        require_once __DIR__ . '/views/invoice_show.php';
    }

    /**
     * GET /finance/invoices/print
     * Printable invoice view formatted for window.print().
     */
    public function printInvoice(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $id              = (int)($_GET['id'] ?? 0);

        $invoice = Invoice::find($id, $activeWorkspace['id']);
        if (!$invoice) {
            flash('error', 'Invoice record not found.');
            redirect('/finance/invoices');
        }

        require_once __DIR__ . '/views/invoice_print.php';
    }

    /**
     * POST /finance/invoices/save
     */
    public function saveInvoice(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('finance.create');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $customerId = (int)($_POST['customer_id'] ?? 0);
        $desc       = trim($_POST['item_description'] ?? 'Services Rendered');
        $amount     = (float)($_POST['item_unit_price'] ?? 0.0);

        if ($customerId <= 0 || $amount <= 0.0) {
            flash('error', 'Customer selection and valid invoice line item amount are required.');
            Security::redirectBack('/finance/invoices');
        }

        $items = [
            [
                'description' => $desc,
                'quantity'    => (float)($_POST['item_quantity'] ?? 1.0),
                'unit_price'  => $amount,
                'discount'    => (float)($_POST['item_discount'] ?? 0.0),
                'tax_rate'    => (float)($_POST['item_tax_rate'] ?? 10.0),
            ]
        ];

        $invoiceId = Invoice::create([
            'workspace_id' => $wsId,
            'customer_id'  => $customerId,
            'project_id'   => !empty($_POST['project_id']) ? (int)$_POST['project_id'] : null,
            'issue_date'   => $_POST['issue_date'] ?? date('Y-m-d'),
            'due_date'     => $_POST['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
            'notes'        => $_POST['notes'] ?? null,
            'created_by'   => $userId,
        ], $items);

        flash('success', 'Invoice generated and issued successfully.');
        redirect('/finance/invoices/show?id=' . $invoiceId);
    }

    /**
     * POST /finance/payments/save
     */
    public function recordPayment(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('finance.edit');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);

        $res = Payment::record([
            'workspace_id'     => $activeWorkspace['id'],
            'invoice_id'       => (int)($_POST['invoice_id'] ?? 0),
            'amount'           => (float)($_POST['amount'] ?? 0.0),
            'payment_date'     => $_POST['payment_date'] ?? date('Y-m-d'),
            'payment_method'   => $_POST['payment_method'] ?? 'bank_transfer',
            'reference_number' => $_POST['reference_number'] ?? null,
            'notes'            => $_POST['notes'] ?? null,
            'created_by'       => $userId,
        ]);

        if ($res['success']) {
            flash('success', $res['message']);
        } else {
            flash('error', $res['message']);
        }

        Security::redirectBack('/finance/invoices/show?id=' . (int)($_POST['invoice_id'] ?? 0));
    }

    /**
     * GET /finance/expenses
     */
    public function expenses(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Expenses Directory';

        $expenses   = Expense::getList($wsId);
        $categories = Expense::getCategories($wsId);
        $vendors    = Vendor::getList($wsId);

        require_once __DIR__ . '/views/expenses.php';
    }

    /**
     * POST /finance/expenses/save
     */
    public function saveExpense(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('finance.create');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $desc   = trim($_POST['description'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0.0);

        if (empty($desc) || $amount <= 0.0) {
            flash('error', 'Expense description and valid amount are required.');
            Security::redirectBack('/finance/expenses');
        }

        Expense::create([
            'workspace_id'     => $wsId,
            'description'      => $desc,
            'amount'           => $amount,
            'vendor_id'        => !empty($_POST['vendor_id']) ? (int)$_POST['vendor_id'] : null,
            'category_id'      => !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null,
            'expense_date'     => $_POST['expense_date'] ?? date('Y-m-d'),
            'payment_method'   => $_POST['payment_method'] ?? 'bank_transfer',
            'reference_number' => $_POST['reference_number'] ?? null,
            'created_by'       => $userId,
        ]);

        flash('success', 'Expense entry logged successfully.');
        redirect('/finance/expenses');
    }

    /**
     * GET /finance/vendors
     */
    public function vendors(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $pageTitle       = 'Vendors Directory';

        $vendors = Vendor::getList($activeWorkspace['id']);
        require_once __DIR__ . '/views/vendors.php';
    }

    /**
     * GET /finance/reports
     */
    public function reports(array $params = []): void
    {
        Auth::requirePermission('finance.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $pageTitle       = 'Financial Reports & P&L Statement';

        $metrics  = Invoice::getFinancialMetrics($activeWorkspace['id']);
        $invoices = Invoice::getList($activeWorkspace['id'])['data'] ?? [];
        $expenses = Expense::getList($activeWorkspace['id']);

        require_once __DIR__ . '/views/reports.php';
    }
}
