-- ============================================================
-- OmniDesk AI — Demo Seed Data
-- ============================================================
-- Purpose:  Populate the database with safe demonstration data.
-- Run AFTER schema.sql has been imported.
--
-- IMPORTANT:
--   This file is for DEVELOPMENT and DEMO environments only.
--   DO NOT run against a production database with real user data.
--
-- Passwords in this file use bcrypt hashes.
--   demo-admin@omnidesk.io  → password: DemoAdmin2024!
--   demo-user@omnidesk.io   → password: DemoUser2024!
--
-- Hashes generated with: password_hash('...', PASSWORD_BCRYPT, ['cost' => 12])
-- ============================================================

USE `omnidesk`;

-- ── Disable FK checks during seeding ─────────────────────────────────────────
SET foreign_key_checks = 0;

-- ── Roles ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `roles` (`id`, `name`, `label`, `description`, `is_system`) VALUES
(1, 'admin',   'Administrator', 'Full system access. Manages users, settings, and all modules.', 1),
(2, 'manager', 'Manager',       'Manages teams, projects, and reports. Cannot modify system settings.', 1),
(3, 'member',  'Member',        'Standard team member with access to assigned workspaces and projects.', 1),
(4, 'viewer',  'Viewer',        'Read-only access to permitted resources.', 1),
(5, 'finance', 'Finance',       'Access to financial reports, invoices, and payment records.', 1);

-- ── Demo Users ────────────────────────────────────────────────────────────────
-- NOTE: These are demo accounts. Hashes are for demonstration passwords only.
-- Change or remove these in staging/production.
INSERT IGNORE INTO `users`
    (`id`, `email`, `password_hash`, `first_name`, `last_name`, `is_active`, `is_verified`)
VALUES
(
    1,
    'demo-admin@omnidesk.io',
    '$2y$12$xOWLqmNHVi0oEyaR1KUYJO.OZSxwvfTGpq1Xz3R9OoYFZFYQ5XOvy',
    'Demo',
    'Admin',
    1,
    1
),
(
    2,
    'demo-user@omnidesk.io',
    '$2y$12$R3GpOjD1OGMBKvzKvqN5NOqNl4m2DJCwKbFhBrEoAKCMH/LxEH8fG',
    'Demo',
    'User',
    1,
    1
);

-- ── User Role Assignments ─────────────────────────────────────────────────────
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`, `granted_by`) VALUES
(1, 1, NULL),  -- demo-admin → Administrator (system-granted)
(2, 3, 1);     -- demo-user  → Member (granted by demo-admin)

-- ── Application Settings ──────────────────────────────────────────────────────
INSERT IGNORE INTO `settings` (`key`, `value`, `type`, `group`, `label`, `description`, `is_public`) VALUES
('app.name',           'OmniDesk AI',                          'string',  'general', 'Application Name',       'Display name of the application.',           1),
('app.tagline',        'Enterprise Management & Productivity',  'string',  'general', 'Application Tagline',    'Short tagline shown on the landing page.',    1),
('app.timezone',       'UTC',                                   'string',  'general', 'Default Timezone',       'Application default timezone.',              0),
('app.date_format',    'M j, Y',                               'string',  'general', 'Date Format',            'PHP date format for display dates.',         0),
('app.pagination',     '25',                                    'integer', 'general', 'Items Per Page',         'Default number of records per page.',        0),
('mail.from_address',  'noreply@omnidesk.io',                  'string',  'mail',    'From Email Address',     'Default sender email address.',              0),
('mail.from_name',     'OmniDesk AI',                          'string',  'mail',    'From Name',              'Default sender name for outgoing emails.',   0),
('security.max_login_attempts', '5',                           'integer', 'security','Max Login Attempts',     'Lockout after N failed login attempts.',     0),
('security.lockout_duration',   '900',                         'integer', 'security','Lockout Duration (sec)', 'Account lockout duration in seconds.',       0),
('ui.theme',           'system',                               'string',  'ui',      'Default UI Theme',       'light | dark | system',                      1);

-- ── Permissions ───────────────────────────────────────────────────────────────
INSERT IGNORE INTO `permissions` (`id`, `name`, `label`, `module`, `description`) VALUES
(1,  'dashboard.view',     'View Dashboard',          'dashboard', 'Access executive dashboard'),
(2,  'crm.view',           'View CRM & Contacts',     'crm',       'View contacts, companies, leads'),
(3,  'crm.create',         'Create CRM Records',      'crm',       'Create new contacts or leads'),
(4,  'crm.update',         'Update CRM Records',      'crm',       'Edit existing contacts or leads'),
(5,  'crm.delete',         'Delete CRM Records',      'crm',       'Remove contacts or leads'),
(6,  'projects.view',      'View Projects',           'projects',  'View project workspaces'),
(7,  'projects.create',    'Create Projects',         'projects',  'Create new project spaces'),
(8,  'projects.update',    'Update Projects',         'projects',  'Modify project details'),
(9,  'projects.delete',    'Delete Projects',         'projects',  'Delete projects'),
(10, 'tasks.view',         'View Tasks',              'tasks',     'View task boards'),
(11, 'tasks.create',        'Create Tasks',            'tasks',     'Create new tasks'),
(12, 'tasks.update',        'Update Tasks',            'tasks',     'Edit task status or details'),
(13, 'tasks.delete',        'Delete Tasks',            'tasks',     'Delete tasks'),
(14, 'finance.view',       'View Financials',         'finance',   'View invoices and revenue'),
(15, 'finance.create',     'Create Invoices',         'finance',   'Issue invoices and payments'),
(16, 'finance.update',     'Update Invoices',         'finance',   'Edit financial records'),
(17, 'finance.delete',     'Delete Invoices',         'finance',   'Delete financial records'),
(18, 'documents.view',     'View Documents',          'documents', 'View stored documents'),
(19, 'documents.create',   'Upload Documents',        'documents', 'Upload new files'),
(20, 'documents.delete',   'Delete Documents',        'documents', 'Delete stored files'),
(21, 'notifications.view', 'View Notifications',      'notifications', 'View notification center'),
(22, 'settings.view',      'View System Settings',    'settings',  'View system configuration'),
(23, 'settings.update',    'Manage System Settings',  'settings',  'Modify system configuration');

-- ── Role Permissions Mapping ──────────────────────────────────────────────────
-- Admin gets all permissions (1..23)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `permissions`;

-- Manager gets view/create/update on CRM, projects, tasks, docs, dashboard, notifications
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 6), (2, 7), (2, 8), (2, 10), (2, 11), (2, 12), (2, 18), (2, 19), (2, 21);

-- Member gets view/update on projects & tasks, view docs, view dashboard, view notifications
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3, 1), (3, 6), (3, 10), (3, 11), (3, 12), (3, 18), (3, 21);

-- Viewer gets read-only access to dashboard, CRM, projects, tasks, docs
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(4, 1), (4, 2), (4, 6), (4, 10), (4, 18), (4, 21);

-- Finance gets dashboard, finance (all), docs, notifications
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(5, 1), (5, 14), (5, 15), (5, 16), (5, 17), (5, 18), (5, 21);

-- ── Demo Workspaces ───────────────────────────────────────────────────────────
INSERT IGNORE INTO `workspaces` (`id`, `name`, `slug`, `type`, `owner_id`) VALUES
(1, 'Acme Global Enterprise', 'acme-global', 'company', 1),
(2, 'Innovation Labs',        'innovation-labs', 'department', 1);

-- ── Workspace Memberships ─────────────────────────────────────────────────────
INSERT IGNORE INTO `workspace_members` (`workspace_id`, `user_id`, `role`) VALUES
(1, 1, 'owner'),  -- demo-admin is Owner of Acme Global Enterprise
(1, 2, 'member'), -- demo-user is Member of Acme Global Enterprise
(2, 1, 'owner');  -- demo-admin is Owner of Innovation Labs

-- ── Demo Customers ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO `customers` (`id`, `workspace_id`, `company_name`, `type`, `industry`, `website`, `email`, `phone`, `status`, `assigned_user_id`, `created_by`) VALUES
(1, 1, 'Stark Logistics',   'company', 'Logistics',   'https://starklogistics.com', 'info@starklogistics.com', '+1-555-0192', 'active',   1, 1),
(2, 1, 'Wayne Enterprises', 'company', 'Defense',     'https://wayneent.com',       'contact@wayneent.com',   '+1-555-0144', 'prospect', 1, 1),
(3, 1, 'Cyberdyne Systems', 'company', 'Robotics',    'https://cyberdyne.io',       'sales@cyberdyne.io',     '+1-555-0188', 'active',   2, 1);

-- ── Demo Contacts ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO `contacts` (`id`, `workspace_id`, `customer_id`, `first_name`, `last_name`, `job_title`, `email`, `phone`, `is_primary`) VALUES
(1, 1, 1, 'Tony',  'Stark', 'Chief Executive Officer', 'tony@starklogistics.com', '+1-555-0193', 1),
(2, 1, 2, 'Bruce', 'Wayne', 'Managing Director',       'bruce@wayneent.com',       '+1-555-0145', 1),
(3, 1, 3, 'Miles', 'Dyson', 'VP of Engineering',       'miles@cyberdyne.io',       '+1-555-0189', 1);

-- ── Demo CRM Tags ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO `crm_tags` (`id`, `workspace_id`, `name`, `color`) VALUES
(1, 1, 'Enterprise', '#4f46e5'),
(2, 1, 'High Value', '#10b981'),
(3, 1, 'Hot Lead',   '#ef4444'),
(4, 1, 'VIP',        '#f59e0b');

-- ── Demo Leads / Deals Pipeline ────────────────────────────────────────────────
INSERT IGNORE INTO `leads` (`id`, `workspace_id`, `customer_id`, `contact_id`, `title`, `company_name`, `contact_name`, `email`, `phone`, `source`, `stage`, `status`, `priority`, `estimated_value`, `probability`, `expected_close_date`, `assigned_user_id`, `created_by`) VALUES
(1, 1, 1, 1, 'Fleet Management Software Renewal', 'Stark Logistics',   'Tony Stark', 'tony@starklogistics.com', '+1-555-0193', 'referral', 'negotiation', 'open', 'urgent', 120000.00, 85, '2026-09-15', 1, 1),
(2, 1, 2, 2, 'Defense Portal Modernization',     'Wayne Enterprises', 'Bruce Wayne', 'bruce@wayneent.com',      '+1-555-0145', 'website',  'proposal',    'open', 'high',    85000.00,  60, '2026-10-01', 1, 1),
(3, 1, 3, 3, 'Automated QC Robotics Integration','Cyberdyne Systems', 'Miles Dyson', 'miles@cyberdyne.io',      '+1-555-0189', 'event',    'qualified',   'open', 'medium',  45000.00,  40, '2026-11-15', 2, 1),
(4, 1, NULL, NULL, 'Apex Cloud Migration Deal',    'Apex Cloud',        'Sarah Connor','sarah@apexcloud.io',     '+1-555-0112', 'cold_call','new_lead',    'open', 'high',    32000.00,  20, '2026-12-01', 1, 1),
(5, 1, 1, 1, 'Global Freight API Service',      'Stark Logistics',   'Tony Stark', 'tony@starklogistics.com', '+1-555-0193', 'partner',  'won',        'won',  'medium',  60000.00, 100, '2026-08-01', 1, 1);

-- ── Demo CRM Activities ────────────────────────────────────────────────────────
INSERT IGNORE INTO `crm_activities` (`id`, `workspace_id`, `lead_id`, `customer_id`, `user_id`, `type`, `subject`, `description`) VALUES
(1, 1, 1, 1, 1, 'meeting', 'Executive Renewal Demo', 'Demonstrated OmniDesk AI enterprise dashboard capabilities to Tony Stark.'),
(2, 1, 2, 2, 1, 'proposal', 'Proposal Sent', 'Submitted $85k Defense Modernization RFP proposal.'),
(3, 1, 5, 1, 1, 'lead_converted', 'Deal Closed Won', 'Stark Logistics Global Freight API deal marked as Won.');

-- ── Demo Projects ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO `projects` (`id`, `workspace_id`, `code`, `name`, `slug`, `description`, `customer_id`, `manager_id`, `status`, `priority`, `start_date`, `due_date`, `budget`, `progress`, `created_by`) VALUES
(1, 1, 'PRJ-101', 'OmniDesk Core Platform', 'omnidesk-core', 'Core enterprise multi-tenant management platform', 1, 1, 'active',  'high',   '2026-08-01', '2026-11-30', 150000.00, 85, 1),
(2, 1, 'PRJ-102', 'Enterprise API Gateway', 'api-gateway',  'OAuth2 and RESTful API gateway microservice',      2, 1, 'active',  'medium', '2026-08-15', '2026-12-15',  85000.00, 60, 1),
(3, 1, 'PRJ-103', 'Mobile Shell Redesign',  'mobile-shell', 'Responsive progressive web shell optimization',     3, 2, 'at_risk', 'urgent', '2026-08-10', '2026-09-30',  45000.00, 35, 1);

-- ── Demo Project Members ───────────────────────────────────────────────────────
INSERT IGNORE INTO `project_members` (`project_id`, `workspace_id`, `user_id`, `role`) VALUES
(1, 1, 1, 'manager'),
(1, 1, 2, 'developer'),
(2, 1, 1, 'manager'),
(3, 1, 2, 'developer');

-- ── Demo Project Milestones ────────────────────────────────────────────────────
INSERT IGNORE INTO `project_milestones` (`id`, `project_id`, `workspace_id`, `name`, `description`, `start_date`, `due_date`, `status`, `progress`) VALUES
(1, 1, 1, 'Phase 5 Launch', 'Project and Task Board Release', '2026-08-01', '2026-08-20', 'active', 90),
(2, 1, 1, 'Phase 6 Finance', 'Invoicing and Expense Engine',  '2026-08-21', '2026-09-15', 'upcoming', 0),
(3, 2, 1, 'OAuth2 Integration', 'Secure identity gateway release', '2026-08-15', '2026-09-30', 'active', 50);

-- ── Demo Tasks ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `tasks` (`id`, `workspace_id`, `project_id`, `milestone_id`, `code`, `title`, `description`, `status`, `priority`, `assigned_user_id`, `created_by`, `due_date`, `estimated_minutes`, `actual_minutes`) VALUES
(1, 1, 1, 1, 'TSK-101', 'Implement Project Models & Controllers', 'Create PHP classes for Project and Task CRUD', 'completed',   'urgent', 1, 1, '2026-08-15', 240, 210),
(2, 1, 1, 1, 'TSK-102', 'Build 6-Column Task Kanban Board',    'Drag & drop Vanilla JS Kanban interface',     'in_progress', 'high',   1, 1, '2026-08-18', 360, 180),
(3, 1, 1, 1, 'TSK-103', 'Calendar View Integration',          'Task deadline calendar visualization',        'todo',        'medium', 2, 1, '2026-08-25', 180, 0),
(4, 1, 2, 3, 'TSK-104', 'OAuth2 Token Endpoint Audit',         'Audit bearer token verification pipeline',    'review',      'high',   1, 1, '2026-09-01', 300, 240),
(5, 1, 3, NULL, 'TSK-105', 'Mobile Drawer Touch Event Optimization', 'Optimize touch drawer gestures for iOS', 'backlog',   'urgent', 2, 1, '2026-09-10', 120, 0);

-- ── Demo Task Checklists ──────────────────────────────────────────────────────
INSERT IGNORE INTO `task_checklists` (`id`, `workspace_id`, `task_id`, `title`, `is_completed`, `position`) VALUES
(1, 1, 1, 'Database schema migration', 1, 1),
(2, 1, 1, 'PDO prepared statements', 1, 2),
(3, 1, 2, 'Vanilla JS drag handler', 1, 1),
(4, 1, 2, 'CSRF AJAX token injection', 0, 2);

-- ── Demo Task Comments ────────────────────────────────────────────────────────
INSERT IGNORE INTO `task_comments` (`id`, `workspace_id`, `task_id`, `user_id`, `comment`) VALUES
(1, 1, 1, 1, 'Project models completed and verified with 100% prepared statements.'),
(2, 1, 2, 2, 'Working on Vanilla JS drag-and-drop event handlers.');

-- ── Demo Invoices ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO `invoices` (`id`, `workspace_id`, `invoice_number`, `customer_id`, `project_id`, `issue_date`, `due_date`, `status`, `currency`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `paid_amount`, `balance_due`, `notes`, `created_by`) VALUES
(1, 1, 'INV-2026-001', 1, 1, '2026-08-01', '2026-08-31', 'partially_paid', 'USD', 50000.00, 0.00, 5000.00, 55000.00, 25000.00, 30000.00, 'Initial Milestone Billing for Fleet Management Software', 1),
(2, 1, 'INV-2026-002', 2, 2, '2026-08-05', '2026-09-05', 'sent',           'USD', 35000.00, 1000.00, 3400.00, 37400.00,     0.00, 37400.00, 'Defense Portal Modernization Milestone 1', 1),
(3, 1, 'INV-2026-003', 3, 3, '2026-07-15', '2026-08-15', 'paid',           'USD', 20000.00, 0.00, 2000.00, 22000.00, 22000.00,     0.00, 'QC Robotics Integration Consultancy', 1);

-- ── Demo Invoice Items ─────────────────────────────────────────────────────────
INSERT IGNORE INTO `invoice_items` (`id`, `workspace_id`, `invoice_id`, `description`, `quantity`, `unit_price`, `discount`, `tax_rate`, `subtotal`, `total`) VALUES
(1, 1, 1, 'Core Architecture & Module Design', 1.00, 30000.00, 0.00, 10.00, 30000.00, 33000.00),
(2, 1, 1, 'Database Schema & Multitenant Isolation', 1.00, 20000.00, 0.00, 10.00, 20000.00, 22000.00),
(3, 1, 2, 'OAuth2 Identity Gateway Development', 1.00, 35000.00, 1000.00, 10.00, 34000.00, 37400.00);

-- ── Demo Invoice Payments ──────────────────────────────────────────────────────
INSERT IGNORE INTO `invoice_payments` (`id`, `workspace_id`, `invoice_id`, `amount`, `payment_date`, `payment_method`, `reference_number`, `created_by`) VALUES
(1, 1, 1, 25000.00, '2026-08-10', 'bank_transfer', 'WIRE-TXN-98124', 1),
(2, 1, 3, 22000.00, '2026-08-01', 'bank_transfer', 'WIRE-TXN-44102', 1);

-- ── Demo Vendors ───────────────────────────────────────────────────────────────
INSERT IGNORE INTO `vendors` (`id`, `workspace_id`, `name`, `company_name`, `email`, `phone`, `status`) VALUES
(1, 1, 'Amazon Web Services', 'AWS Cloud Infrastructure', 'billing@aws.com', '+1-800-555-0199', 'active'),
(2, 1, 'GitHub Enterprise',   'GitHub Inc',              'support@github.com', '+1-800-555-0177', 'active');

-- ── Demo Expense Categories ────────────────────────────────────────────────────
INSERT IGNORE INTO `expense_categories` (`id`, `workspace_id`, `name`, `color`) VALUES
(1, 1, 'Cloud Hosting', '#3b82f6'),
(2, 1, 'Software Licenses', '#8b5cf6'),
(3, 1, 'Office Operations', '#10b981');

-- ── Demo Expenses ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO `expenses` (`id`, `workspace_id`, `vendor_id`, `category_id`, `project_id`, `amount`, `tax_amount`, `expense_date`, `payment_method`, `description`, `status`, `created_by`) VALUES
(1, 1, 1, 1, 1, 4200.00, 420.00, '2026-08-01', 'card', 'Monthly AWS Infrastructure Hosting', 'paid', 1),
(2, 1, 2, 2, 1, 1800.00, 180.00, '2026-08-05', 'card', 'GitHub Enterprise Seats (50 users)', 'paid', 1);

-- ── Demo AI Conversations ─────────────────────────────────────────────────────
INSERT IGNORE INTO `ai_conversations` (`id`, `workspace_id`, `user_id`, `title`) VALUES
(1, 1, 1, 'Executive Platform & Revenue Briefing');

-- ── Demo AI Messages ──────────────────────────────────────────────────────────
INSERT IGNORE INTO `ai_messages` (`id`, `workspace_id`, `conversation_id`, `role`, `content`, `requires_confirmation`) VALUES
(1, 1, 1, 'user',      'Give me an executive briefing on workspace performance and overdue items.', 0),
(2, 1, 1, 'assistant', 'OmniDesk AI Executive Briefing:\n- Gross Revenue: $114,400.00 (Collected: $47,000.00, Outstanding: $67,400.00)\n- Active Projects: 3 Workspaces (85% avg progress)\n- Overdue Tasks: 1 task item (TSK-101 completed, TSK-102 in progress)\n- CRM Pipeline: 5 deals totaling $342,000.00', 0);

-- ── Demo Business Health Scores ───────────────────────────────────────────────
INSERT IGNORE INTO `ai_business_health` (`id`, `workspace_id`, `overall_score`, `crm_score`, `project_score`, `task_score`, `finance_score`, `customer_score`, `summary`) VALUES
(1, 1, 84, 88, 82, 75, 91, 86, 'Workspace performance remains strong. Task velocity is high, with minor attention needed on TSK-102 due date.');

-- ── Demo Proactive AI Insights ────────────────────────────────────────────────
INSERT IGNORE INTO `ai_insights` (`id`, `workspace_id`, `category`, `title`, `severity`, `evidence`, `recommendation`, `confidence`) VALUES
(1, 1, 'finance', 'Outstanding Receivables Alert', 'high', 'Invoice #INV-2026-001 has a $30,000.00 unpaid balance past 14 days.', 'Issue automated reminder statement to Stark Logistics accounting.', 0.95),
(2, 1, 'task',    'Overdue Work Item Detected',    'medium', 'Task [TSK-102] Kanban board implementation is approaching target deadline.', 'Reassign secondary developer to assist with Vanilla JS drag handlers.', 0.90);

-- ── Demo Pending Approvals ────────────────────────────────────────────────────
INSERT IGNORE INTO `ai_approvals` (`id`, `workspace_id`, `conversation_id`, `action_name`, `agent_key`, `action_hash`, `risk_level`, `params`, `status`) VALUES
(1, 1, 1, 'record_payment', 'finance_agent', 'a7f9b8c3d2e1f405', 'high', '{"invoice_id": 1, "amount": 30000.00, "customer": "Stark Logistics"}', 'pending');

-- ── Demo Teams & Departments ──────────────────────────────────────────────────
INSERT IGNORE INTO `teams` (`id`, `workspace_id`, `name`, `code`, `leader_id`) VALUES
(1, 1, 'Engineering & Core Platform', 'ENG', 1),
(2, 1, 'Enterprise Sales & Marketing', 'SALES', 1);

-- ── Demo Communication Channels ───────────────────────────────────────────────
INSERT IGNORE INTO `channels` (`id`, `workspace_id`, `name`, `type`, `created_by`) VALUES
(1, 1, 'general-announcements', 'announcement', 1),
(2, 1, 'proj-omnidesk-core',     'public',       1),
(3, 1, 'executive-lounge',       'private',      1);

-- ── Demo Chat Messages ────────────────────────────────────────────────────────
INSERT IGNORE INTO `chat_messages` (`id`, `workspace_id`, `channel_id`, `sender_id`, `message`) VALUES
(1, 1, 1, 1, 'Welcome team! OmniDesk AI Enterprise Platform Phase 8 is live.'),
(2, 1, 2, 1, 'Sprint status update: 6-Column Kanban Board and Autonomous Agents verified.');

-- ── Demo Meetings & Action Items ─────────────────────────────────────────────
INSERT IGNORE INTO `meetings` (`id`, `workspace_id`, `title`, `project_id`, `organizer_id`, `scheduled_at`, `duration_minutes`, `status`, `notes`, `decisions`, `action_items`) VALUES
(1, 1, 'Weekly Executive & Engineering Sync', 1, 1, '2026-08-15 10:00:00', 45, 'completed', 'Discussed Q3 milestone progress and billing status.', 'Approved final OAuth gateway schema.', 'Task assigned to finish Vanilla JS drag handlers.');

-- ── Demo Knowledge Center Documents ───────────────────────────────────────────
INSERT IGNORE INTO `documents` (`id`, `workspace_id`, `title`, `category`, `file_path`, `file_size`, `mime_type`, `version`, `author_id`, `status`) VALUES
(1, 1, 'OmniDesk Platform SLA & Billing Policy', 'Security & SLA', 'storage/uploads/sla_policy.pdf', 1048576, 'application/pdf', '2.0', 1, 'approved'),
(2, 1, 'CRM Lead Conversion & Pipeline SOP', 'Sales & CRM',   'storage/uploads/crm_sop.pdf',    524288,  'application/pdf', '1.0', 1, 'approved');

-- ── Demo Automation Rules ─────────────────────────────────────────────────────
INSERT IGNORE INTO `automation_rules` (`id`, `workspace_id`, `name`, `trigger_event`, `action_type`, `status`) VALUES
(1, 1, 'Auto-Notify Finance on Overdue Invoice', 'invoice_overdue', 'notify', 'active'),
(2, 1, 'Auto-Index Knowledge Documents to Vector Vault', 'document_uploaded', 'rag_index', 'active');

-- ── Demo Security Events Log ──────────────────────────────────────────────────
INSERT IGNORE INTO `security_events` (`id`, `workspace_id`, `user_id`, `event_type`, `severity`, `ip_address`, `details_masked`, `created_at`) VALUES
(1, 1, 1, 'failed_login',     'WARNING',  '192.168.1.45', 'Failed authentication attempt for user admin@omnidesk.internal [Rate limit active]', '2026-08-16 10:15:00'),
(2, 1, 1, 'prompt_injection', 'CRITICAL', '192.168.1.88', 'Sanitizer intercepted instruction override token in AI command dispatch', '2026-08-16 11:30:00'),
(3, 1, 1, 'replay_attempt',   'HIGH',     '127.0.0.1',    'Action hash mismatch or expired confirmation token intercepted on POST /ai/confirm', '2026-08-16 14:05:00');

SET foreign_key_checks = 1;

-- ============================================================
-- END OF DEMO SEED
-- ============================================================









