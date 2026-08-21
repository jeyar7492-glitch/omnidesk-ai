<?php
/**
 * OmniDesk AI — CRM Controller
 *
 * Controller handling Customers, Contacts, Leads, Pipeline Kanban,
 * Lead Conversion, Activity Timelines, and workspace authorization.
 *
 * Namespace: Modules\CRM
 */

namespace Modules\CRM;

use Core\Auth;
use Core\Security;
use Core\DashboardService;
use Core\ActivityLog;

class CRMController
{
    /**
     * GET /crm
     * CRM Dashboard view.
     */
    public function index(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'CRM & Sales Pipeline Dashboard';

        $summary  = Lead::getPipelineSummary($wsId);
        $recentLeads = Lead::getList($wsId, [], 1, 5);
        $customers = Customer::getList($wsId, [], 1, 5);

        require_once __DIR__ . '/views/index.php';
    }

    /**
     * GET /crm/customers
     */
    public function customers(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $pageTitle       = 'Customer Directory';

        $page     = max(1, (int)($_GET['page'] ?? 1));
        $search   = trim($_GET['search'] ?? '');
        $status   = trim($_GET['status'] ?? '');
        $industry = trim($_GET['industry'] ?? '');

        $result = Customer::getList($activeWorkspace['id'], [
            'search'   => $search,
            'status'   => $status,
            'industry' => $industry,
        ], $page, 15);

        require_once __DIR__ . '/views/customers.php';
    }

    /**
     * GET /crm/customers/show
     */
    public function showCustomer(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $id              = (int)($_GET['id'] ?? 0);

        $customer = Customer::find($id, $activeWorkspace['id']);
        if (!$customer) {
            flash('error', 'Customer not found or access denied.');
            redirect('/crm/customers');
        }

        $contacts  = Contact::getList($activeWorkspace['id'], $id);
        $pageTitle = 'Customer Details — ' . $customer['company_name'];

        require_once __DIR__ . '/views/customer_show.php';
    }

    /**
     * POST /crm/customers/save
     */
    public function saveCustomer(array $params = []): void
    {
        Security::requireValidCsrf();

        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            Auth::requirePermission('crm.edit');
        } else {
            Auth::requirePermission('crm.create');
        }

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $companyName = trim($_POST['company_name'] ?? $_POST['name'] ?? '');
        if (empty($companyName)) {
            flash('error', 'Company name is required.');
            Security::redirectBack('/crm/customers');
        }

        $payload = [
            'workspace_id'     => $wsId,
            'company_name'     => $companyName,
            'type'             => $_POST['type'] ?? 'company',
            'industry'         => $_POST['industry'] ?? null,
            'website'          => $_POST['website'] ?? null,
            'email'            => $_POST['email'] ?? null,
            'phone'            => $_POST['phone'] ?? null,
            'address'          => $_POST['address'] ?? null,
            'city'             => $_POST['city'] ?? null,
            'state'            => $_POST['state'] ?? null,
            'country'          => $_POST['country'] ?? null,
            'status'           => $_POST['status'] ?? 'active',
            'notes'            => $_POST['notes'] ?? null,
            'assigned_user_id' => $userId,
            'created_by'       => $userId,
        ];

        if ($id > 0) {
            Customer::update($id, $wsId, $payload);
            flash('success', 'Customer record updated successfully.');
        } else {
            Customer::create($payload);
            flash('success', 'New customer created successfully.');
        }

        redirect('/crm/customers');
    }

    /**
     * GET /crm/pipeline
     */
    public function pipeline(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'CRM Sales Pipeline Kanban';

        $summary = Lead::getPipelineSummary($wsId);
        $leads   = Lead::getList($wsId);

        // Group leads by stage for Kanban rendering
        $kanban = [
            'new_lead'    => [],
            'qualified'   => [],
            'proposal'    => [],
            'negotiation' => [],
            'won'         => [],
            'lost'        => [],
        ];

        foreach ($leads as $l) {
            $stg = $l['stage'];
            if (isset($kanban[$stg])) {
                $kanban[$stg][] = $l;
            }
        }

        require_once __DIR__ . '/views/pipeline.php';
    }

    /**
     * GET /crm/leads
     */
    public function leads(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];
        $pageTitle       = 'Leads Directory';

        $search   = trim($_GET['search'] ?? '');
        $stage    = trim($_GET['stage'] ?? '');
        $priority = trim($_GET['priority'] ?? '');

        $leads = Lead::getList($wsId, [
            'search'   => $search,
            'stage'    => $stage,
            'priority' => $priority,
        ]);

        require_once __DIR__ . '/views/leads.php';
    }

    /**
     * GET /crm/leads/show
     */
    public function showLead(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $id              = (int)($_GET['id'] ?? 0);

        $lead = Lead::find($id, $activeWorkspace['id']);
        if (!$lead) {
            flash('error', 'Lead record not found or access denied.');
            redirect('/crm/pipeline');
        }

        $pageTitle = 'Lead Details — ' . $lead['title'];
        require_once __DIR__ . '/views/lead_show.php';
    }

    /**
     * POST /crm/leads/save
     */
    public function saveLead(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('crm.create');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $wsId            = $activeWorkspace['id'];

        $title = trim($_POST['title'] ?? '');
        if (empty($title)) {
            flash('error', 'Lead title is required.');
            Security::redirectBack('/crm/pipeline');
        }

        Lead::create([
            'workspace_id'        => $wsId,
            'title'               => $title,
            'company_name'        => $_POST['company_name'] ?? null,
            'contact_name'        => $_POST['contact_name'] ?? null,
            'email'               => $_POST['email'] ?? null,
            'phone'               => $_POST['phone'] ?? null,
            'source'              => $_POST['source'] ?? 'website',
            'stage'               => $_POST['stage'] ?? 'new_lead',
            'priority'            => $_POST['priority'] ?? 'medium',
            'estimated_value'     => (float)($_POST['estimated_value'] ?? 0),
            'probability'         => (int)($_POST['probability'] ?? 50),
            'expected_close_date' => $_POST['expected_close_date'] ?? null,
            'assigned_user_id'    => $userId,
            'created_by'          => $userId,
        ]);

        flash('success', 'Lead entry added to pipeline successfully.');
        redirect('/crm/pipeline');
    }

    /**
     * POST /crm/leads/move-stage (AJAX Endpoint)
     */
    public function moveStage(array $params = []): void
    {
        Security::requireValidCsrf();

        if (!Auth::hasPermission('crm.edit')) {
            json_response(['success' => false, 'message' => 'Forbidden: missing crm.edit permission.'], 403);
        }

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $leadId          = (int)($_POST['lead_id'] ?? 0);
        $newStage        = trim($_POST['stage'] ?? '');

        if ($leadId <= 0 || empty($newStage)) {
            json_response(['success' => false, 'message' => 'Invalid parameters.'], 400);
        }

        $success = Lead::updateStage($leadId, $activeWorkspace['id'], $newStage, $userId);
        if ($success) {
            json_response(['success' => true, 'message' => 'Stage updated successfully!']);
        } else {
            json_response(['success' => false, 'message' => 'Failed to update stage.'], 400);
        }
    }

    /**
     * POST /crm/leads/convert
     */
    public function convertLead(array $params = []): void
    {
        Security::requireValidCsrf();

        Auth::requirePermission('crm.edit');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $leadId          = (int)($_POST['lead_id'] ?? 0);

        $res = Lead::convertToCustomer($leadId, $activeWorkspace['id'], $userId);
        if ($res['success']) {
            flash('success', $res['message']);
            redirect('/crm/customers/show?id=' . $res['customer_id']);
        } else {
            flash('error', $res['message']);
            Security::redirectBack('/crm/pipeline');
        }
    }

    /**
     * GET /crm/contacts
     */
    public function contacts(array $params = []): void
    {
        Auth::requirePermission('crm.view');

        $userId          = Auth::id();
        $activeWorkspace = DashboardService::getActiveWorkspace($userId);
        $pageTitle       = 'Contacts Directory';

        $contacts = Contact::getList($activeWorkspace['id']);
        require_once __DIR__ . '/views/contacts.php';
    }
}
