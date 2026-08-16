-- ============================================================
-- OmniDesk AI — Foundation Database Schema
-- ============================================================
-- Version:  1.0.0-alpha (Phase 1)
-- Engine:   MySQL 8.0+ / MariaDB 10.5+
-- Charset:  utf8mb4 / utf8mb4_unicode_ci
--
-- RULES:
--   DO NOT drop existing tables in migrations.
--   Use CREATE TABLE IF NOT EXISTS for safety.
--   Phase 1 creates only the essential foundation tables.
--   Business tables (CRM, Projects, Finance, etc.) belong to later phases.
--
-- TABLE OVERVIEW (Phase 1):
--   users          — Foundation user accounts (Phase 2 populates fully)
--   roles          — Role definitions for RBAC
--   user_roles     — User ↔ Role mapping (many-to-many)
--   sessions       — Optional DB-backed session store
--   audit_log      — Application audit trail
--   settings       — Application-wide key-value settings
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ── Database ─────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `omnidesk`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `omnidesk`;

-- ============================================================
-- TABLE: roles
-- RBAC role definitions.
-- Populated with defaults in seed_demo.sql.
-- ============================================================
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(50)      NOT NULL COMMENT 'Machine name: admin, member, viewer',
    `label`       VARCHAR(100)     NOT NULL COMMENT 'Human-readable label',
    `description` VARCHAR(255)     DEFAULT NULL,
    `is_system`   TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '1 = built-in, cannot be deleted',
    `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_roles_name` (`name`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='RBAC role definitions';

-- ============================================================
-- TABLE: users
-- Foundation user accounts.
-- Phase 2 adds: profile fields, MFA, OAuth tokens, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `email`             VARCHAR(255)     NOT NULL,
    `password_hash`     VARCHAR(255)     NOT NULL COMMENT 'bcrypt/argon2id hash — NEVER plaintext',
    `first_name`        VARCHAR(100)     NOT NULL DEFAULT '',
    `last_name`         VARCHAR(100)     NOT NULL DEFAULT '',
    `is_active`         TINYINT(1)       NOT NULL DEFAULT 1  COMMENT '0 = deactivated',
    `is_verified`       TINYINT(1)       NOT NULL DEFAULT 0  COMMENT 'Email verification status',
    `last_login_at`     DATETIME         DEFAULT NULL,
    `last_login_ip`     VARCHAR(45)      DEFAULT NULL COMMENT 'IPv4 or IPv6',
    `password_reset_token`      VARCHAR(128) DEFAULT NULL,
    `password_reset_expires_at` DATETIME     DEFAULT NULL,
    `email_verify_token`        VARCHAR(128) DEFAULT NULL,
    `created_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`        DATETIME         DEFAULT NULL COMMENT 'Soft delete timestamp',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`),
    KEY `idx_users_is_active`   (`is_active`),
    KEY `idx_users_deleted_at`  (`deleted_at`),
    KEY `idx_users_reset_token` (`password_reset_token`(32))

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Foundation user accounts';

-- ============================================================
-- TABLE: user_roles
-- Many-to-many: users ↔ roles
-- A user may hold multiple roles.
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_roles` (
    `user_id`    INT UNSIGNED NOT NULL,
    `role_id`    INT UNSIGNED NOT NULL,
    `granted_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `granted_by` INT UNSIGNED DEFAULT NULL COMMENT 'User ID who granted this role',

    PRIMARY KEY (`user_id`, `role_id`),
    CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`)
        REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ur_granted_by` FOREIGN KEY (`granted_by`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User-Role many-to-many pivot';

-- ============================================================
-- TABLE: sessions
-- Optional database-backed session storage.
-- Can be used alongside or instead of file-based sessions.
-- PHP session handler implementation is Phase 2.
-- ============================================================
CREATE TABLE IF NOT EXISTS `sessions` (
    `id`         VARCHAR(128)  NOT NULL COMMENT 'Session ID (PHP session_id())',
    `user_id`    INT UNSIGNED  DEFAULT NULL,
    `ip_address` VARCHAR(45)   DEFAULT NULL,
    `user_agent` VARCHAR(255)  DEFAULT NULL,
    `payload`    MEDIUMTEXT    NOT NULL COMMENT 'Serialized session data',
    `last_activity` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_sessions_user_id`      (`user_id`),
    KEY `idx_sessions_last_activity`(`last_activity`),
    CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Optional DB-backed session store';

-- ============================================================
-- TABLE: audit_log
-- Application audit trail. Immutable record of system events.
-- Used by ActivityLog::audit() — Phase 4 activates DB writes.
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id`          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`     INT UNSIGNED     DEFAULT NULL COMMENT 'NULL for system actions',
    `action`      VARCHAR(50)      NOT NULL COMMENT 'created | updated | deleted | viewed | login | logout',
    `entity_type` VARCHAR(100)     DEFAULT NULL COMMENT 'contact | project | invoice | etc.',
    `entity_id`   INT UNSIGNED     DEFAULT NULL,
    `metadata`    JSON             DEFAULT NULL COMMENT 'Additional context (diff, previous values, etc.)',
    `ip_address`  VARCHAR(45)      DEFAULT NULL,
    `user_agent`  VARCHAR(255)     DEFAULT NULL,
    `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_audit_user_id`     (`user_id`),
    KEY `idx_audit_action`      (`action`),
    KEY `idx_audit_entity`      (`entity_type`, `entity_id`),
    KEY `idx_audit_created_at`  (`created_at`),
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable application audit trail';

-- ============================================================
-- TABLE: settings
-- Application-wide key-value configuration.
-- UI settings management belongs to Phase 5 (Admin).
-- ============================================================
CREATE TABLE IF NOT EXISTS `settings` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key`         VARCHAR(100) NOT NULL COMMENT 'Namespaced: app.name, mail.from, etc.',
    `value`       TEXT         DEFAULT NULL,
    `type`        VARCHAR(20)  NOT NULL DEFAULT 'string' COMMENT 'string | integer | boolean | json',
    `group`       VARCHAR(50)  NOT NULL DEFAULT 'general',
    `label`       VARCHAR(255) DEFAULT NULL COMMENT 'Human-readable label for admin UI',
    `description` TEXT         DEFAULT NULL,
    `is_public`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = safe to expose to frontend',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_settings_key` (`key`),
    KEY `idx_settings_group` (`group`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Application-wide key-value settings store';

-- ============================================================
-- PHASE 2 SCHEMA ADDITIONS
-- ============================================================

-- ============================================================
-- TABLE: permissions
-- Granular RBAC permissions for modules and actions.
-- ============================================================
CREATE TABLE IF NOT EXISTS `permissions` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100) NOT NULL COMMENT 'Machine name e.g. crm.view, projects.create',
    `label`       VARCHAR(150) NOT NULL COMMENT 'Human-readable title',
    `module`      VARCHAR(50)  NOT NULL COMMENT 'Module group: crm, projects, tasks, etc.',
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_permissions_name` (`name`),
    KEY `idx_permissions_module` (`module`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Granular RBAC permission definitions';

-- ============================================================
-- TABLE: role_permissions
-- Pivot table mapping roles to granular permissions.
-- ============================================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id`       INT UNSIGNED NOT NULL,
    `permission_id` INT UNSIGNED NOT NULL,
    `granted_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`)
        REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`)
        REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Role-Permission mapping pivot';

-- ============================================================
-- TABLE: remember_tokens
-- Persistent "Remember Me" dual-token authentication store.
-- Selector/Validator pattern prevents timing/token leakage.
-- ============================================================
CREATE TABLE IF NOT EXISTS `remember_tokens` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    INT UNSIGNED    NOT NULL,
    `selector`   VARCHAR(64)     NOT NULL COMMENT 'Random public selector string',
    `token_hash` VARCHAR(255)    NOT NULL COMMENT 'Hashed validator token',
    `expires_at` DATETIME        NOT NULL,
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_remember_selector` (`selector`),
    KEY `idx_remember_user_id`  (`user_id`),
    KEY `idx_remember_expires`  (`expires_at`),
    CONSTRAINT `fk_remember_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Dual-token Remember Me persistent login store';

-- ============================================================
-- TABLE: login_attempts
-- Brute-force defense & account lockout tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ip_address`    VARCHAR(45)     NOT NULL,
    `email`         VARCHAR(255)    NOT NULL,
    `attempted_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `is_successful` TINYINT(1)      NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`),
    KEY `idx_attempts_ip_time`    (`ip_address`, `attempted_at`),
    KEY `idx_attempts_email_time` (`email`, `attempted_at`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Failed login attempts and rate limiting log';

-- ============================================================
-- PHASE 3 SCHEMA ADDITIONS
-- ============================================================

-- ============================================================
-- TABLE: workspaces
-- Enterprise workspace multi-tenant isolation layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS `workspaces` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100) NOT NULL,
    `slug`        VARCHAR(100) NOT NULL,
    `type`        VARCHAR(30)  NOT NULL DEFAULT 'company' COMMENT 'company | team | department | personal',
    `owner_id`    INT UNSIGNED NOT NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_workspaces_slug` (`slug`),
    KEY `idx_workspaces_owner` (`owner_id`),
    CONSTRAINT `fk_ws_owner` FOREIGN KEY (`owner_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Enterprise workspace boundaries';

-- ============================================================
-- TABLE: workspace_members
-- User-Workspace membership mapping.
-- ============================================================
CREATE TABLE IF NOT EXISTS `workspace_members` (
    `workspace_id` INT UNSIGNED NOT NULL,
    `user_id`      INT UNSIGNED NOT NULL,
    `role`         VARCHAR(30)  NOT NULL DEFAULT 'member' COMMENT 'owner | admin | member | viewer',
    `joined_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`workspace_id`, `user_id`),
    CONSTRAINT `fk_wm_workspace` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_wm_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User workspace memberships';

-- ============================================================
-- PHASE 4 SCHEMA ADDITIONS — CRM & LEAD MANAGEMENT
-- ============================================================

-- ============================================================
-- TABLE: customers
-- Enterprise customer directory.
-- ============================================================
CREATE TABLE IF NOT EXISTS `customers` (
    `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED NOT NULL,
    `company_name`     VARCHAR(150) NOT NULL,
    `type`             VARCHAR(30)  NOT NULL DEFAULT 'company' COMMENT 'company | individual',
    `industry`         VARCHAR(100) DEFAULT NULL,
    `website`          VARCHAR(255) DEFAULT NULL,
    `email`            VARCHAR(255) DEFAULT NULL,
    `phone`            VARCHAR(50)  DEFAULT NULL,
    `address`          VARCHAR(255) DEFAULT NULL,
    `city`             VARCHAR(100) DEFAULT NULL,
    `state`            VARCHAR(100) DEFAULT NULL,
    `country`          VARCHAR(100) DEFAULT NULL,
    `postal_code`      VARCHAR(30)  DEFAULT NULL,
    `status`           VARCHAR(30)  NOT NULL DEFAULT 'active' COMMENT 'active | prospect | inactive | archived',
    `assigned_user_id` INT UNSIGNED DEFAULT NULL,
    `notes`            TEXT         DEFAULT NULL,
    `created_by`       INT UNSIGNED DEFAULT NULL,
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_customers_workspace` (`workspace_id`),
    KEY `idx_customers_status`    (`status`),
    KEY `idx_customers_assigned`  (`assigned_user_id`),
    CONSTRAINT `fk_cust_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_cust_assigned` FOREIGN KEY (`assigned_user_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Enterprise customer directory';

-- ============================================================
-- TABLE: contacts
-- Customer contact individuals.
-- ============================================================
CREATE TABLE IF NOT EXISTS `contacts` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `customer_id`  INT UNSIGNED DEFAULT NULL,
    `first_name`   VARCHAR(100) NOT NULL,
    `last_name`    VARCHAR(100) NOT NULL,
    `job_title`    VARCHAR(100) DEFAULT NULL,
    `email`        VARCHAR(255) DEFAULT NULL,
    `phone`        VARCHAR(50)  DEFAULT NULL,
    `mobile`       VARCHAR(50)  DEFAULT NULL,
    `is_primary`   TINYINT(1)   NOT NULL DEFAULT 0,
    `notes`        TEXT         DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_contacts_workspace` (`workspace_id`),
    KEY `idx_contacts_customer`  (`customer_id`),
    CONSTRAINT `fk_cont_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_cont_customer` FOREIGN KEY (`customer_id`)
        REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Customer contacts';

-- ============================================================
-- TABLE: leads
-- CRM Deals and sales leads pipeline.
-- ============================================================
CREATE TABLE IF NOT EXISTS `leads` (
    `id`                  INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `workspace_id`        INT UNSIGNED   NOT NULL,
    `customer_id`         INT UNSIGNED   DEFAULT NULL,
    `contact_id`          INT UNSIGNED   DEFAULT NULL,
    `title`               VARCHAR(200)   NOT NULL,
    `company_name`        VARCHAR(150)   DEFAULT NULL,
    `contact_name`        VARCHAR(150)   DEFAULT NULL,
    `email`               VARCHAR(255)   DEFAULT NULL,
    `phone`               VARCHAR(50)    DEFAULT NULL,
    `source`              VARCHAR(50)    NOT NULL DEFAULT 'website' COMMENT 'website | referral | social | ad | email | cold_call | event | partner | other',
    `stage`               VARCHAR(50)    NOT NULL DEFAULT 'new_lead' COMMENT 'new_lead | qualified | proposal | negotiation | won | lost',
    `status`              VARCHAR(30)    NOT NULL DEFAULT 'open' COMMENT 'open | won | lost',
    `priority`            VARCHAR(30)    NOT NULL DEFAULT 'medium' COMMENT 'low | medium | high | urgent',
    `estimated_value`     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `probability`         INT UNSIGNED   NOT NULL DEFAULT 50 COMMENT '0..100 percentage',
    `expected_close_date` DATE           DEFAULT NULL,
    `assigned_user_id`    INT UNSIGNED   DEFAULT NULL,
    `notes`               TEXT           DEFAULT NULL,
    `created_by`          INT UNSIGNED   DEFAULT NULL,
    `created_at`          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_leads_workspace` (`workspace_id`),
    KEY `idx_leads_stage`     (`stage`),
    KEY `idx_leads_status`    (`status`),
    KEY `idx_leads_assigned`  (`assigned_user_id`),
    CONSTRAINT `fk_leads_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_leads_customer` FOREIGN KEY (`customer_id`)
        REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_leads_contact` FOREIGN KEY (`contact_id`)
        REFERENCES `contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_leads_assigned` FOREIGN KEY (`assigned_user_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='CRM Deals and sales leads pipeline';

-- ============================================================
-- TABLE: crm_tags
-- Normalized CRM tag repository.
-- ============================================================
CREATE TABLE IF NOT EXISTS `crm_tags` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(50)  NOT NULL,
    `color`        VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tags_ws_name` (`workspace_id`, `name`),
    CONSTRAINT `fk_tags_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Normalized CRM tags';

-- ============================================================
-- TABLE: crm_entity_tags
-- Pivot table linking tags to customers or leads.
-- ============================================================
CREATE TABLE IF NOT EXISTS `crm_entity_tags` (
    `tag_id`      INT UNSIGNED NOT NULL,
    `entity_type` VARCHAR(30)  NOT NULL COMMENT 'customer | lead',
    `entity_id`   INT UNSIGNED NOT NULL,

    PRIMARY KEY (`tag_id`, `entity_type`, `entity_id`),
    CONSTRAINT `fk_et_tag` FOREIGN KEY (`tag_id`)
        REFERENCES `crm_tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='CRM Tag Pivot';

-- ============================================================
-- TABLE: crm_activities
-- CRM activity timeline entries.
-- ============================================================
CREATE TABLE IF NOT EXISTS `crm_activities` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `lead_id`      INT UNSIGNED    DEFAULT NULL,
    `customer_id`  INT UNSIGNED    DEFAULT NULL,
    `contact_id`   INT UNSIGNED    DEFAULT NULL,
    `user_id`      INT UNSIGNED    DEFAULT NULL,
    `type`         VARCHAR(50)     NOT NULL COMMENT 'call | email | meeting | note | follow_up | status_change | stage_change | lead_created | lead_converted | customer_created',
    `subject`      VARCHAR(255)    NOT NULL,
    `description`  TEXT            DEFAULT NULL,
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_act_ws`       (`workspace_id`),
    KEY `idx_act_lead`     (`lead_id`),
    KEY `idx_act_customer` (`customer_id`),
    CONSTRAINT `fk_act_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_act_lead` FOREIGN KEY (`lead_id`)
        REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_act_customer` FOREIGN KEY (`customer_id`)
        REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_act_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='CRM activity timeline log';

-- ============================================================
-- TABLE: crm_followups
-- Scheduled follow-up tasks for leads.
-- ============================================================
CREATE TABLE IF NOT EXISTS `crm_followups` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`  INT UNSIGNED    NOT NULL,
    `lead_id`       INT UNSIGNED    NOT NULL,
    `user_id`       INT UNSIGNED    NOT NULL,
    `due_date`      DATE            NOT NULL,
    `reminder_time` TIME            DEFAULT NULL,
    `status`        VARCHAR(30)     NOT NULL DEFAULT 'pending' COMMENT 'pending | completed | cancelled',
    `notes`         TEXT            DEFAULT NULL,
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_flw_ws`   (`workspace_id`),
    KEY `idx_flw_lead` (`lead_id`),
    KEY `idx_flw_due`  (`due_date`, `status`),
    CONSTRAINT `fk_flw_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_flw_lead` FOREIGN KEY (`lead_id`)
        REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_flw_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Scheduled CRM follow-ups';

-- ============================================================
-- PHASE 5 SCHEMA ADDITIONS — PROJECT & TASK MANAGEMENT
-- ============================================================

-- ============================================================
-- TABLE: projects
-- Enterprise project management.
-- ============================================================
CREATE TABLE IF NOT EXISTS `projects` (
    `id`              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `workspace_id`    INT UNSIGNED   NOT NULL,
    `code`            VARCHAR(30)    NOT NULL,
    `name`            VARCHAR(150)   NOT NULL,
    `slug`            VARCHAR(150)   NOT NULL,
    `description`     TEXT           DEFAULT NULL,
    `customer_id`     INT UNSIGNED   DEFAULT NULL,
    `manager_id`      INT UNSIGNED   DEFAULT NULL,
    `status`          VARCHAR(30)    NOT NULL DEFAULT 'active' COMMENT 'planning | active | on_hold | at_risk | completed | cancelled | archived',
    `priority`        VARCHAR(30)    NOT NULL DEFAULT 'medium' COMMENT 'low | medium | high | urgent',
    `start_date`      DATE           DEFAULT NULL,
    `due_date`        DATE           DEFAULT NULL,
    `completion_date` DATE           DEFAULT NULL,
    `budget`          DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `progress`        INT UNSIGNED   NOT NULL DEFAULT 0 COMMENT '0..100 percentage',
    `created_by`      INT UNSIGNED   DEFAULT NULL,
    `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `archived_at`     DATETIME       DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_proj_ws_code` (`workspace_id`, `code`),
    KEY `idx_proj_ws`       (`workspace_id`),
    KEY `idx_proj_status`   (`status`),
    KEY `idx_proj_manager`  (`manager_id`),
    CONSTRAINT `fk_proj_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_proj_cust` FOREIGN KEY (`customer_id`)
        REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_proj_mgr` FOREIGN KEY (`manager_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Enterprise project management';

-- ============================================================
-- TABLE: project_members
-- Project team membership.
-- ============================================================
CREATE TABLE IF NOT EXISTS `project_members` (
    `project_id`   INT UNSIGNED NOT NULL,
    `workspace_id` INT UNSIGNED NOT NULL,
    `user_id`      INT UNSIGNED NOT NULL,
    `role`         VARCHAR(30)  NOT NULL DEFAULT 'member' COMMENT 'manager | developer | designer | tester | finance | viewer | member',
    `joined_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`project_id`, `user_id`),
    KEY `idx_pm_ws`   (`workspace_id`),
    KEY `idx_pm_user` (`user_id`),
    CONSTRAINT `fk_pm_proj` FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pm_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Project team memberships';

-- ============================================================
-- TABLE: project_milestones
-- Project milestones and major deliverables.
-- ============================================================
CREATE TABLE IF NOT EXISTS `project_milestones` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `project_id`   INT UNSIGNED NOT NULL,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(150) NOT NULL,
    `description`  TEXT         DEFAULT NULL,
    `start_date`   DATE         DEFAULT NULL,
    `due_date`     DATE         DEFAULT NULL,
    `status`       VARCHAR(30)  NOT NULL DEFAULT 'active' COMMENT 'upcoming | active | completed | overdue',
    `progress`     INT UNSIGNED NOT NULL DEFAULT 0,
    `completed_at` DATETIME     DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_ms_proj` (`project_id`),
    KEY `idx_ms_ws`   (`workspace_id`),
    CONSTRAINT `fk_ms_proj` FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ms_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Project milestones';

-- ============================================================
-- TABLE: tasks
-- Task Board management and work items.
-- ============================================================
CREATE TABLE IF NOT EXISTS `tasks` (
    `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`      INT UNSIGNED NOT NULL,
    `project_id`        INT UNSIGNED NOT NULL,
    `milestone_id`      INT UNSIGNED DEFAULT NULL,
    `parent_task_id`    INT UNSIGNED DEFAULT NULL,
    `code`              VARCHAR(30)  NOT NULL,
    `title`             VARCHAR(200) NOT NULL,
    `description`       TEXT         DEFAULT NULL,
    `status`            VARCHAR(30)  NOT NULL DEFAULT 'todo' COMMENT 'backlog | todo | in_progress | review | testing | completed',
    `priority`          VARCHAR(30)  NOT NULL DEFAULT 'medium' COMMENT 'low | medium | high | urgent',
    `assigned_user_id`  INT UNSIGNED DEFAULT NULL,
    `created_by`        INT UNSIGNED DEFAULT NULL,
    `start_date`        DATE         DEFAULT NULL,
    `due_date`          DATE         DEFAULT NULL,
    `completed_at`      DATETIME     DEFAULT NULL,
    `estimated_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
    `actual_minutes`    INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_tasks_ws`       (`workspace_id`),
    KEY `idx_tasks_proj`     (`project_id`),
    KEY `idx_tasks_status`   (`status`),
    KEY `idx_tasks_assigned` (`assigned_user_id`),
    CONSTRAINT `fk_tasks_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tasks_proj` FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tasks_ms` FOREIGN KEY (`milestone_id`)
        REFERENCES `project_milestones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assigned_user_id`)
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Task board work items';

-- ============================================================
-- TABLE: task_checklists
-- Task checklist items.
-- ============================================================
CREATE TABLE IF NOT EXISTS `task_checklists` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `task_id`      INT UNSIGNED    NOT NULL,
    `title`        VARCHAR(255)    NOT NULL,
    `is_completed` TINYINT(1)      NOT NULL DEFAULT 0,
    `position`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_chk_task` (`task_id`),
    CONSTRAINT `fk_chk_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_chk_task` FOREIGN KEY (`task_id`)
        REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Task checklist items';

-- ============================================================
-- TABLE: task_comments
-- Task discussion comments.
-- ============================================================
CREATE TABLE IF NOT EXISTS `task_comments` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `task_id`      INT UNSIGNED    NOT NULL,
    `user_id`      INT UNSIGNED    NOT NULL,
    `comment`      TEXT            NOT NULL,
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_tc_task` (`task_id`),
    CONSTRAINT `fk_tc_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tc_task` FOREIGN KEY (`task_id`)
        REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tc_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Task discussion comments';

-- ============================================================
-- TABLE: task_time_entries
-- Task time tracking logs.
-- ============================================================
CREATE TABLE IF NOT EXISTS `task_time_entries` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED    NOT NULL,
    `task_id`          INT UNSIGNED    NOT NULL,
    `user_id`          INT UNSIGNED    NOT NULL,
    `started_at`       DATETIME        NOT NULL,
    `ended_at`         DATETIME        DEFAULT NULL,
    `duration_minutes` INT UNSIGNED    NOT NULL DEFAULT 0,
    `description`      VARCHAR(255)    DEFAULT NULL,
    `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_tte_task` (`task_id`),
    KEY `idx_tte_user` (`user_id`),
    CONSTRAINT `fk_tte_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tte_task` FOREIGN KEY (`task_id`)
        REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tte_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Task time tracking logs';

-- ============================================================
-- PHASE 6 SCHEMA ADDITIONS — FINANCE & INVOICING
-- ============================================================

-- ============================================================
-- TABLE: invoices
-- Enterprise invoices store.
-- ============================================================
CREATE TABLE IF NOT EXISTS `invoices` (
    `id`              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `workspace_id`    INT UNSIGNED   NOT NULL,
    `invoice_number`  VARCHAR(50)    NOT NULL,
    `customer_id`     INT UNSIGNED   NOT NULL,
    `project_id`      INT UNSIGNED   DEFAULT NULL,
    `issue_date`      DATE           NOT NULL,
    `due_date`        DATE           NOT NULL,
    `status`          VARCHAR(30)    NOT NULL DEFAULT 'draft' COMMENT 'draft | sent | partially_paid | paid | overdue | cancelled',
    `currency`        VARCHAR(10)    NOT NULL DEFAULT 'USD',
    `subtotal`        DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `tax_amount`      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `total_amount`    DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `paid_amount`     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `balance_due`     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `notes`           TEXT           DEFAULT NULL,
    `terms`           TEXT           DEFAULT NULL,
    `created_by`      INT UNSIGNED   DEFAULT NULL,
    `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_inv_ws_num` (`workspace_id`, `invoice_number`),
    KEY `idx_inv_ws`       (`workspace_id`),
    KEY `idx_inv_status`   (`status`),
    KEY `idx_inv_cust`     (`customer_id`),
    CONSTRAINT `fk_inv_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_inv_cust` FOREIGN KEY (`customer_id`)
        REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_inv_proj` FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Enterprise invoice records';

-- ============================================================
-- TABLE: invoice_items
-- Invoice line items.
-- ============================================================
CREATE TABLE IF NOT EXISTS `invoice_items` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `invoice_id`   INT UNSIGNED    NOT NULL,
    `description`  VARCHAR(255)    NOT NULL,
    `quantity`     DECIMAL(10,2)   NOT NULL DEFAULT 1.00,
    `unit_price`   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    `discount`     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    `tax_rate`     DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    `subtotal`     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    `total`        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,

    PRIMARY KEY (`id`),
    KEY `idx_item_inv` (`invoice_id`),
    CONSTRAINT `fk_item_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_item_inv` FOREIGN KEY (`invoice_id`)
        REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Invoice line items';

-- ============================================================
-- TABLE: invoice_payments
-- Recorded invoice payments.
-- ============================================================
CREATE TABLE IF NOT EXISTS `invoice_payments` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED    NOT NULL,
    `invoice_id`       INT UNSIGNED    NOT NULL,
    `amount`           DECIMAL(12,2)   NOT NULL,
    `payment_date`     DATE            NOT NULL,
    `payment_method`   VARCHAR(50)     NOT NULL DEFAULT 'bank_transfer' COMMENT 'bank_transfer | card | cash | upi | cheque | other',
    `reference_number` VARCHAR(100)    DEFAULT NULL,
    `notes`            TEXT            DEFAULT NULL,
    `created_by`       INT UNSIGNED    DEFAULT NULL,
    `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_pay_inv`  (`invoice_id`),
    KEY `idx_pay_ws`   (`workspace_id`),
    CONSTRAINT `fk_pay_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pay_inv` FOREIGN KEY (`invoice_id`)
        REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Recorded invoice payments';

-- ============================================================
-- TABLE: vendors
-- Enterprise vendor repository.
-- ============================================================
CREATE TABLE IF NOT EXISTS `vendors` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(150) NOT NULL,
    `company_name` VARCHAR(150) DEFAULT NULL,
    `email`        VARCHAR(255) DEFAULT NULL,
    `phone`        VARCHAR(50)  DEFAULT NULL,
    `address`      VARCHAR(255) DEFAULT NULL,
    `status`       VARCHAR(30)  NOT NULL DEFAULT 'active',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_vendor_ws` (`workspace_id`),
    CONSTRAINT `fk_vendor_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Enterprise vendor repository';

-- ============================================================
-- TABLE: expense_categories
-- Expense classification categories.
-- ============================================================
CREATE TABLE IF NOT EXISTS `expense_categories` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(100) NOT NULL,
    `color`        VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_expcat_ws_name` (`workspace_id`, `name`),
    CONSTRAINT `fk_expcat_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Expense categories';

-- ============================================================
-- TABLE: expenses
-- Business expenses log.
-- ============================================================
CREATE TABLE IF NOT EXISTS `expenses` (
    `id`               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED   NOT NULL,
    `vendor_id`        INT UNSIGNED   DEFAULT NULL,
    `category_id`      INT UNSIGNED   DEFAULT NULL,
    `project_id`       INT UNSIGNED   DEFAULT NULL,
    `amount`           DECIMAL(12,2)  NOT NULL,
    `tax_amount`       DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    `expense_date`     DATE           NOT NULL,
    `payment_method`   VARCHAR(50)    NOT NULL DEFAULT 'bank_transfer',
    `reference_number` VARCHAR(100)   DEFAULT NULL,
    `description`      TEXT           NOT NULL,
    `status`           VARCHAR(30)    NOT NULL DEFAULT 'approved' COMMENT 'draft | submitted | approved | rejected | paid',
    `created_by`       INT UNSIGNED   DEFAULT NULL,
    `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_exp_ws`       (`workspace_id`),
    KEY `idx_exp_vendor`   (`vendor_id`),
    KEY `idx_exp_cat`      (`category_id`),
    CONSTRAINT `fk_exp_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_exp_vendor` FOREIGN KEY (`vendor_id`)
        REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_exp_cat` FOREIGN KEY (`category_id`)
        REFERENCES `expense_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_exp_proj` FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Business expense log';

-- ============================================================
-- PHASE 7 SCHEMA ADDITIONS — AGENTIC AI ENGINE
-- ============================================================

-- ============================================================
-- TABLE: ai_conversations
-- Active AI conversation threads.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_conversations` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `user_id`      INT UNSIGNED    NOT NULL,
    `title`        VARCHAR(255)    NOT NULL DEFAULT 'New AI Assistant Session',
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_aic_ws`   (`workspace_id`),
    KEY `idx_aic_user` (`user_id`),
    CONSTRAINT `fk_aic_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_aic_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI Assistant conversation threads';

-- ============================================================
-- TABLE: ai_messages
-- Conversation message log (User, Assistant, Tool).
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_messages` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`          INT UNSIGNED    NOT NULL,
    `conversation_id`       BIGINT UNSIGNED NOT NULL,
    `role`                  VARCHAR(30)     NOT NULL COMMENT 'user | assistant | system | tool',
    `content`               LONGTEXT        NOT NULL,
    `tool_calls`            JSON            DEFAULT NULL,
    `requires_confirmation` TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_aim_conv` (`conversation_id`),
    KEY `idx_aim_ws`   (`workspace_id`),
    CONSTRAINT `fk_aim_conv` FOREIGN KEY (`conversation_id`)
        REFERENCES `ai_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_aim_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI message log entries';

-- ============================================================
-- TABLE: ai_tool_runs
-- Audit trail of AI agent tool executions and confirmation queue.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_tool_runs` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`    INT UNSIGNED    NOT NULL,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `tool_name`       VARCHAR(100)    NOT NULL,
    `action_type`     VARCHAR(30)     NOT NULL DEFAULT 'read' COMMENT 'read | write',
    `inputs`          JSON            DEFAULT NULL,
    `outputs`         JSON            DEFAULT NULL,
    `status`          VARCHAR(30)     NOT NULL DEFAULT 'executed' COMMENT 'pending | confirmed | executed | rejected',
    `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_atr_conv` (`conversation_id`),
    KEY `idx_atr_ws`   (`workspace_id`),
    CONSTRAINT `fk_atr_conv` FOREIGN KEY (`conversation_id`)
        REFERENCES `ai_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_atr_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI tool execution audit trail';

-- ============================================================
-- AUTONOMOUS BUSINESS AGENT PLATFORM SCHEMA ADDITIONS
-- ============================================================

-- ============================================================
-- TABLE: ai_agents
-- Specialized domain agent definitions.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_agents` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `agent_key`    VARCHAR(50)  NOT NULL,
    `name`         VARCHAR(100) NOT NULL,
    `domain`       VARCHAR(50)  NOT NULL COMMENT 'executive | crm | project | task | finance | document | notification | risk',
    `risk_level`   VARCHAR(20)  NOT NULL DEFAULT 'low',
    `status`       VARCHAR(20)  NOT NULL DEFAULT 'active',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_agent_ws_key` (`workspace_id`, `agent_key`),
    CONSTRAINT `fk_agent_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Specialized AI Domain Agents';

-- ============================================================
-- TABLE: ai_plans
-- Structured multi-step agent execution plans.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_plans` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`      INT UNSIGNED    NOT NULL,
    `conversation_id`   BIGINT UNSIGNED DEFAULT NULL,
    `goal`              VARCHAR(255)    NOT NULL,
    `reasoning_summary` TEXT            NOT NULL,
    `risk_level`        VARCHAR(20)     NOT NULL DEFAULT 'low' COMMENT 'low | medium | high',
    `status`            VARCHAR(30)     NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | executing | completed | failed',
    `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_plan_ws` (`workspace_id`),
    CONSTRAINT `fk_plan_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-step AI Execution Plans';

-- ============================================================
-- TABLE: ai_business_health
-- Calculated workspace business health metrics & domain scores.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_business_health` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`   INT UNSIGNED    NOT NULL,
    `overall_score`  INT UNSIGNED    NOT NULL DEFAULT 100,
    `crm_score`      INT UNSIGNED    NOT NULL DEFAULT 100,
    `project_score`  INT UNSIGNED    NOT NULL DEFAULT 100,
    `task_score`     INT UNSIGNED    NOT NULL DEFAULT 100,
    `finance_score`  INT UNSIGNED    NOT NULL DEFAULT 100,
    `customer_score` INT UNSIGNED    NOT NULL DEFAULT 100,
    `summary`        TEXT            NOT NULL,
    `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_health_ws` (`workspace_id`),
    CONSTRAINT `fk_health_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI Business Health Engine Metrics';

-- ============================================================
-- TABLE: ai_insights
-- Proactive business insights & severity recommendations.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_insights` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`   INT UNSIGNED    NOT NULL,
    `category`       VARCHAR(50)     NOT NULL COMMENT 'crm | project | task | finance | risk',
    `title`          VARCHAR(255)    NOT NULL,
    `severity`       VARCHAR(20)     NOT NULL DEFAULT 'medium' COMMENT 'low | medium | high | critical',
    `evidence`       TEXT            NOT NULL,
    `recommendation` TEXT            NOT NULL,
    `confidence`     DECIMAL(4,2)    NOT NULL DEFAULT 0.95,
    `status`         VARCHAR(20)     NOT NULL DEFAULT 'active' COMMENT 'active | dismissed | resolved',
    `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_insight_ws` (`workspace_id`),
    CONSTRAINT `fk_insight_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Proactive AI Business Insights';

-- ============================================================
-- TABLE: ai_approvals
-- Human Approval Center queue for high-risk write actions.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_approvals` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`    INT UNSIGNED    NOT NULL,
    `conversation_id` BIGINT UNSIGNED DEFAULT NULL,
    `action_name`     VARCHAR(100)    NOT NULL,
    `agent_key`       VARCHAR(50)     NOT NULL,
    `action_hash`     VARCHAR(64)     NOT NULL,
    `risk_level`      VARCHAR(20)     NOT NULL DEFAULT 'high',
    `params`          JSON            DEFAULT NULL,
    `status`          VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected | expired',
    `requested_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `decided_at`      DATETIME        DEFAULT NULL,
    `decided_by`      INT UNSIGNED    DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_appr_hash` (`action_hash`),
    KEY `idx_appr_ws` (`workspace_id`),
    CONSTRAINT `fk_appr_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Human Approval Center Queue';

-- ============================================================
-- TABLE: ai_memories
-- Multi-layer memory store (Conversation, Workspace, Preference, Decision, Semantic).
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_memories` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED    NOT NULL,
    `user_id`      INT UNSIGNED    DEFAULT NULL,
    `memory_layer` VARCHAR(30)     NOT NULL COMMENT 'conversation | workspace | preference | decision | semantic',
    `key_name`     VARCHAR(100)    NOT NULL,
    `content`      LONGTEXT        NOT NULL,
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_mem_ws` (`workspace_id`),
    CONSTRAINT `fk_mem_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-layer AI Memory Store';

-- ============================================================
-- TABLE: ai_audit_events
-- Immutable audit log trail for autonomous AI operations.
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_audit_events` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`    INT UNSIGNED    NOT NULL,
    `user_id`         INT UNSIGNED    NOT NULL,
    `conversation_id` BIGINT UNSIGNED DEFAULT NULL,
    `agent_key`       VARCHAR(50)     NOT NULL,
    `tool_name`       VARCHAR(100)    NOT NULL,
    `action_type`     VARCHAR(20)     NOT NULL DEFAULT 'read' COMMENT 'read | write',
    `risk_level`      VARCHAR(20)     NOT NULL DEFAULT 'low',
    `action_hash`     VARCHAR(64)     DEFAULT NULL,
    `status`          VARCHAR(30)     NOT NULL DEFAULT 'executed',
    `duration_ms`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_audit_ws` (`workspace_id`),
    CONSTRAINT `fk_audit_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutable AI Audit Event Log';

-- ============================================================
-- PHASE 8 SCHEMA ADDITIONS — ENTERPRISE WORK OPERATING SYSTEM
-- ============================================================

-- ── Teams & Departments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `teams` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(100) NOT NULL,
    `code`         VARCHAR(50)  NOT NULL,
    `leader_id`    INT UNSIGNED DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_team_ws_code` (`workspace_id`, `code`),
    CONSTRAINT `fk_team_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Teams & Departments';

CREATE TABLE IF NOT EXISTS `team_members` (
    `team_id`      INT UNSIGNED NOT NULL,
    `workspace_id` INT UNSIGNED NOT NULL,
    `user_id`      INT UNSIGNED NOT NULL,
    `joined_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`team_id`, `user_id`),
    CONSTRAINT `fk_tm_team` FOREIGN KEY (`team_id`)
        REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tm_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_tm_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team Members pivot';

-- ── Communication Engine (Channels, DMs, Threads) ───────────────────────────
CREATE TABLE IF NOT EXISTS `channels` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name`         VARCHAR(100) NOT NULL,
    `type`         VARCHAR(30)  NOT NULL DEFAULT 'public' COMMENT 'public | private | announcement',
    `created_by`   INT UNSIGNED DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_chan_ws_name` (`workspace_id`, `name`),
    CONSTRAINT `fk_chan_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Chat Channels';

CREATE TABLE IF NOT EXISTS `chat_messages` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED    NOT NULL,
    `channel_id`       INT UNSIGNED    DEFAULT NULL,
    `sender_id`        INT UNSIGNED    NOT NULL,
    `recipient_id`     INT UNSIGNED    DEFAULT NULL,
    `message`          LONGTEXT        NOT NULL,
    `thread_parent_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_pinned`        TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_msg_chan` (`channel_id`),
    KEY `idx_msg_ws`   (`workspace_id`),
    CONSTRAINT `fk_msg_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Chat Messages';

-- ── Meetings & Action Items Engine ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `meetings` (
    `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`     INT UNSIGNED NOT NULL,
    `title`            VARCHAR(255) NOT NULL,
    `project_id`       INT UNSIGNED DEFAULT NULL,
    `organizer_id`     INT UNSIGNED NOT NULL,
    `scheduled_at`     DATETIME     NOT NULL,
    `duration_minutes` INT UNSIGNED NOT NULL DEFAULT 30,
    `status`           VARCHAR(30)  NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled | in_progress | completed | cancelled',
    `notes`            LONGTEXT     DEFAULT NULL,
    `decisions`        TEXT         DEFAULT NULL,
    `action_items`     TEXT         DEFAULT NULL,
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_meet_ws` (`workspace_id`),
    CONSTRAINT `fk_meet_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Meetings Repository';

-- ── Knowledge Center Documents Vault ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `documents` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `title`        VARCHAR(255) NOT NULL,
    `category`     VARCHAR(100) NOT NULL DEFAULT 'General',
    `file_path`    VARCHAR(255) NOT NULL,
    `file_size`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `mime_type`    VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    `version`      VARCHAR(20)  NOT NULL DEFAULT '1.0',
    `author_id`    INT UNSIGNED NOT NULL,
    `status`       VARCHAR(30)  NOT NULL DEFAULT 'approved' COMMENT 'draft | review | approved | archived',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_doc_ws` (`workspace_id`),
    CONSTRAINT `fk_doc_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Knowledge Center Documents';

-- ── Autonomous Automation Rules Engine ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `automation_rules` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`   INT UNSIGNED NOT NULL,
    `name`           VARCHAR(150) NOT NULL,
    `trigger_event`  VARCHAR(50)  NOT NULL COMMENT 'task_overdue | invoice_overdue | lead_negotiation | meeting_completed | document_uploaded',
    `action_type`    VARCHAR(50)  NOT NULL COMMENT 'notify | create_task | update_status | rag_index',
    `action_payload` JSON         DEFAULT NULL,
    `status`         VARCHAR(20)  NOT NULL DEFAULT 'active',
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_autorule_ws` (`workspace_id`),
    CONSTRAINT `fk_autorule_ws` FOREIGN KEY (`workspace_id`)
        REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Autonomous Automation Rules';

-- ── Security Event Monitoring ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_events` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`   INT UNSIGNED    DEFAULT NULL,
    `user_id`        INT UNSIGNED    DEFAULT NULL,
    `event_type`     VARCHAR(100)    NOT NULL COMMENT 'failed_login | account_lockout | csrf_failure | rbac_denial | idor_attempt | prompt_injection | replay_attempt | rate_limit',
    `severity`       VARCHAR(20)     NOT NULL DEFAULT 'INFO' COMMENT 'INFO | WARNING | HIGH | CRITICAL',
    `ip_address`     VARCHAR(45)     NOT NULL DEFAULT '127.0.0.1',
    `details_masked` TEXT            NOT NULL,
    `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_sec_ws`  (`workspace_id`),
    KEY `idx_sec_sev` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Security Event Logs';

-- ── Phase 14 Enterprise Reliability: Idempotency & Tamper-Evident Audit ───
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `idempotency_key`  VARCHAR(64)     NOT NULL,
    `workspace_id`     INT UNSIGNED    NOT NULL,
    `user_id`          INT UNSIGNED    NOT NULL,
    `tool_name`        VARCHAR(100)    NOT NULL,
    `request_hash`     VARCHAR(64)     NOT NULL,
    `response_payload` JSON            DEFAULT NULL,
    `transaction_id`   BIGINT UNSIGNED DEFAULT NULL,
    `status`           VARCHAR(20)     NOT NULL DEFAULT 'processing' COMMENT 'processing | completed | failed',
    `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_idempotency_ws_key` (`workspace_id`, `idempotency_key`),
    KEY `idx_idem_user` (`user_id`),
    KEY `idx_idem_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Workspace-Scoped Transaction Idempotency Keys';

CREATE TABLE IF NOT EXISTS `audit_chains` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id`      INT UNSIGNED    NOT NULL,
    `event_id`          BIGINT UNSIGNED NOT NULL,
    `previous_hash`     VARCHAR(64)     NOT NULL,
    `canonical_payload` TEXT            NOT NULL,
    `current_hash`      VARCHAR(64)     NOT NULL,
    `is_verified`       TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_chain_ws` (`workspace_id`),
    KEY `idx_chain_evt` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tamper-Evident Cryptographic Audit Chain';

SET foreign_key_checks = 1;

-- ============================================================
-- END OF ALL SCHEMAS
-- ============================================================










