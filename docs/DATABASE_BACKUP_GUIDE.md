# OmniDesk AI — Enterprise Database Backup & Disaster Recovery Runbook (Phase 14)

## 1. Enterprise Backup Strategy & Architecture
OmniDesk AI implements a multi-tier disaster recovery architecture designed for zero data loss and strict compliance with financial integrity invariants:

```
[Production MySQL 8.0 Engine]
               │
               ├── Daily Full Snapshot (02:00 UTC) ──► Gzip Compressed & AES-256 Encrypted
               │
               ├── Continuous Binary Logs (binlogs) ──► Point-in-Time Recovery (PITR)
               │
               └── Tamper-Evident Audit Chaining   ──► Cryptographic Verification (SHA-256)
```

---

## 2. Backup Execution Procedures

### 2.1 Daily Full Database Backup (Single-Transaction Lockless Snapshot)
```bash
mysqldump \
  -u omnidesk_user -p \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --master-data=2 \
  omnidesk_ai | gzip -c | openssl enc -aes-256-cbc -salt -out /backups/omnidesk_full_$(date +%Y%m%d_%H%M%S).sql.gz.enc
```

### 2.2 Incremental Binary Log Archival
Binary logging (`binlog`) enables point-in-time recovery to any exact second between full snapshots:
```bash
mysqladmin -u root -p flush-logs
rsync -avz /var/log/mysql/mysql-bin.* /backups/binlogs/
```

---

## 3. Retention & Encryption Policies
- **Daily Snapshots:** Retained for 30 days.
- **Weekly Snapshots:** Retained for 90 days.
- **Monthly Snapshots:** Retained for 1 year in cold archive.
- **Encryption Standard:** AES-256-CBC at rest with customer-managed keys.

---

## 4. Disaster Recovery & Restore Runbook

### Step 1: Initialize Clean Database Target
```sql
DROP DATABASE IF EXISTS omnidesk_ai_recovery;
CREATE DATABASE omnidesk_ai_recovery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Decrypt & Restore Full Snapshot
```bash
openssl enc -d -aes-256-cbc -in /backups/omnidesk_full_latest.sql.gz.enc | gunzip -c | mysql -u omnidesk_user -p omnidesk_ai_recovery
```

### Step 3: Replay Binary Logs to Point of Failure
```bash
mysqlbinlog --start-datetime="2026-08-16 02:00:00" --stop-datetime="2026-08-16 17:50:00" /backups/binlogs/mysql-bin.000* | mysql -u omnidesk_user -p omnidesk_ai_recovery
```

---

## 5. Post-Restore Financial Invariant Verification Runbook

Every restored database snapshot must pass the automated mathematical integrity verification check before routing production traffic:

```sql
-- 1. Check Invoice Header vs Payments Sum Invariant
SELECT
    i.id,
    i.invoice_number,
    i.total_amount,
    i.paid_amount,
    COALESCE(SUM(p.amount), 0) AS calculated_paid,
    i.balance_due,
    (i.total_amount - COALESCE(SUM(p.amount), 0)) AS calculated_balance,
    CASE
        WHEN i.paid_amount = COALESCE(SUM(p.amount), 0)
         AND i.balance_due = (i.total_amount - COALESCE(SUM(p.amount), 0))
        THEN 'VERIFIED'
        ELSE 'DATA_INCONSISTENCY'
    END AS integrity_status
FROM invoices i
LEFT JOIN invoice_payments p ON p.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.total_amount, i.paid_amount, i.balance_due;

-- 2. Verify Zero Negative Balances
SELECT COUNT(*) as overpayment_violations FROM invoices WHERE balance_due < 0;

-- 3. Verify Cryptographic Audit Chain
-- Run Core\AuditChainService::verifyChain(workspace_id)
```

---

## 6. Disaster Recovery Checklist

- [ ] Target MySQL 8.0 server verified online (`SELECT 1`).
- [ ] Backup snapshot decrypted and decompressed successfully.
- [ ] Schema DDL, foreign keys, and indexes restored.
- [ ] Invoices, payments, and expenses restored without data loss.
- [ ] All 10 financial integrity invariants confirmed `VERIFIED`.
- [ ] Tamper-evident cryptographic audit chain intact (`AUDIT_INTEGRITY_VERIFIED`).
- [ ] Idempotency store active to prevent re-processing post-recovery transactions.
- [ ] Production DNS switched and health endpoints (`/ready`, `/live`, `/health`) responding HTTP 200.
