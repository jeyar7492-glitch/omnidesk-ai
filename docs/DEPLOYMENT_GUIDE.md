# OmniDesk AI v1.0.0 — Production Deployment Guide

## 1. System Requirements
- **Operating System**: Linux (Ubuntu 22.04+ LTS / Debian 12 / RHEL 9) or Windows Server 2022+
- **Web Server**: Apache 2.4+ (with `mod_rewrite`, `mod_headers`) or Nginx with PHP-FPM
- **PHP**: PHP 8.1+ with extensions: `pdo`, `pdo_mysql`, `curl`, `openssl`, `mbstring`, `json`, `fileinfo`
- **Database**: MySQL 8.0+ or MariaDB 10.6+
- **Python**: Python 3.11+ (with `venv`, `pip`)

## 2. Directory Structure & Web Root
The public web document root MUST be configured to point strictly to the `public/` directory:
```
/var/www/omnidesk-ai/public  (or C:\Users\jeyar\projects\omnidesk-ai\public)
```
Internal directories (`config/`, `core/`, `database/`, `storage/`, `ai/`) are strictly protected and inaccessible via HTTP.

## 3. Step-by-Step Installation

### Step 3.1: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure database credentials and secret app key:
```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
APP_KEY=base64:Your64CharacterProductionSecretKey=

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=omnidesk_ai
DB_USERNAME=omnidesk_user
DB_PASSWORD=SecureProductionPassword123!

PYTHON_AI_HOST=127.0.0.1
PYTHON_AI_PORT=8008
```

### Step 3.2: Database Initialization
Import the database schema and initial seed data:
```bash
mysql -u omnidesk_user -p omnidesk_ai < database/schema.sql
mysql -u omnidesk_user -p omnidesk_ai < database/seed_demo.sql
```

### Step 3.3: Python AI Service Setup
Set up the Python virtual environment and install requirements:
```bash
cd ai
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
Start the Python AI Gateway service daemon:
```bash
python app/main.py
```
*(Recommended for production: Use `systemd` or `supervisor` to manage the Python daemon listening on `127.0.0.1:8008`).*

### Step 3.4: Web Server Configuration (Apache Example)
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot "/var/www/omnidesk-ai/public"

    <Directory "/var/www/omnidesk-ai/public">
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/omnidesk_error.log
    CustomLog ${APACHE_LOG_DIR}/omnidesk_access.log combined
</VirtualHost>
```

### Step 3.5: Permissions & Storage
Ensure `storage/` is writable by the web server user (`www-data` or `apache`):
```bash
chmod -R 775 storage
chown -R www-data:www-data storage
```

---

## 4. Health Check Probes & Service Verification

OmniDesk AI exposes dedicated operational endpoints for load balancers and orchestrators:

| Subsystem | Endpoint | Method | Expected Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PHP Web Server** | `/live` | `GET` | `HTTP 200` (`{"status":"live"}`) | Process liveness probe |
| **PHP Web Server** | `/ready` | `GET` | `HTTP 200` (`{"status":"ready"}`) | Database & session readiness |
| **PHP Diagnostics** | `/health` | `GET` | `HTTP 200` (`{"status":"healthy"}`) | Complete subsystem health summary |
| **Python AI Engine** | `http://127.0.0.1:8008/live` | `GET` | `HTTP 200` (`{"status":"live"}`) | AI daemon liveness |
| **Python AI Engine** | `http://127.0.0.1:8008/ready` | `GET` | `HTTP 200` (`{"status":"ready"}`) | Vector store & tool readiness |
| **Python AI Engine** | `http://127.0.0.1:8008/health` | `GET` | `HTTP 200` (`{"status":"healthy"}`) | AI memory & agent diagnostics |
| **AI Orchestration** | `http://127.0.0.1:8008/v1/chat` | `POST` | `HTTP 200` | Multi-agent chat endpoint |

