# OmniDesk AI — Production CI/CD & Quality Assurance

> **Continuous Integration and Pre-Flight Validation Architecture**  
> *Deterministic static analysis, multi-language compilation, security leak prevention, and automated regression testing.*

---

## 1. Overview & CI Philosophy

OmniDesk AI uses a zero-defect, automated continuous integration pipeline running on GitHub Actions for every `push` and `pull_request` targeting `main`.

The workflow is architected around the following core principles:
1. **Zero False Positives / Zero False Passes**: CI executes true syntax, compilation, security scans, and in-memory test suites without mocked falsifications.
2. **Minimal Dependency Overhead**: Standard runtimes (PHP 8.2, Python 3.12, Node.js 20) with lightweight dependencies (`requests`, `pydantic`, `python-dotenv`).
3. **Clear Environmental Separation**: Portable algorithmic and integrity validations run directly in CI runners, while live multi-process daemon tests (Apache/XAMPP and MariaDB) are isolated for local and staging deployment drills.
4. **Secret Isolation**: Zero credentials or tokens are printed or required in CI validation jobs.

---

## 2. What CI Validates

Each CI run executes a 5-stage validation pipeline followed by automated summary reporting:

### Stage 1: PHP Syntax & Linting
- Scans all `.php` files across the codebase (`core/`, `modules/`, `config/`, `public/`, `database/`).
- Runs `php -l` on every file in parallel.
- Fails immediately if any syntax error, parse error, or invalid PHP 8.2 construct is introduced.

### Stage 2: Python Compilation
- Scans all Python source files across `ai/` and `tests/`.
- Executes `py_compile` to ensure 100% syntactical and byte-compile validity.
- Validates imports and structure without requiring external LLM API endpoints.

### Stage 3: Frontend Asset Integrity & JavaScript Syntax
- Verifies existence of required public assets (`public/index.php`, `public/.htaccess`, `public/assets/css/variables.css`, `public/assets/css/base.css`, `public/assets/css/components.css`, `public/assets/js/app.js`).
- Validates JavaScript syntax using `node -c` on all client scripts.

### Stage 4: Security & Secret Leak Prevention
- Ensures `.env` and environment overrides (`.env.*`) are never committed to version control.
- Scans git tracking index for private keys (`*.pem`, `*.key`, `*.pfx`, `id_rsa`).
- Scans PHP source code for dangerous execution primitives (`eval()`, `shell_exec()`, `passthru()`, `popen()`, `proc_open()`).
- Scans JavaScript code for unsafe DOM injection sinks (`document.write()`).

### Stage 5: Portable Automated Test Suites
- **Financial Integrity Suite (`tests/test_financial_integrity.py`)**: 10 tests verifying invoice totals, decimal arithmetic invariants, cross-agent ledger consistency, stale memory rejection, and overpayment bounds.
- **Enterprise Reliability Suite (`tests/test_reliability.py`)**: 15 tests verifying concurrent payment race locking, double-submit idempotency, database rollback atomicity, AI gateway circuit breaking, cryptographic audit chain tamper detection, and disaster recovery snapshot invariants.

---

## 3. How to Run Equivalent Checks Locally

OmniDesk AI includes a local pre-flight runner that mirrors CI checks identically.

### 1-Step Unified Validation (Recommended)
Run the pre-flight validator from the repository root:
```bash
python tests/validate_ci.py
```

### Individual Step Commands

#### PHP Syntax Linting
```bash
# Windows (PowerShell with XAMPP)
& "C:\xampp\php\php.exe" -l public/index.php

# Linux / macOS
find . -name "*.php" -not -path "./vendor/*" -not -path "./.git/*" -exec php -l {} +
```

#### Python Compilation
```bash
# Compile all AI engine and test files
python -m py_compile ai/app/main.py tests/test_reliability.py
```

#### JavaScript Syntax
```bash
node -c public/assets/js/app.js
```

#### Portable Test Suites
```bash
python tests/test_financial_integrity.py
python tests/test_reliability.py
```

---

## 4. Test Categories & Environment Prerequisites

| Test File | Scope / Purpose | Environment Required | Executed in CI? |
| :--- | :--- | :--- | :---: |
| `tests/test_financial_integrity.py` | 10 Financial ledger invariant tests | Python 3.10+ | **Yes** |
| `tests/test_reliability.py` | 15 Concurrency & audit chain tests | Python 3.10+ | **Yes** |
| `tests/validate_ci.py` | Full pre-flight syntax & security suite | PHP 8.2+, Python 3.10+, Node 18+ | **Yes** |
| `tests/test_e2e_browser.py` | Live HTTP browser cookie/CSRF tests | PHP Web Server on `127.0.0.1:8000` | Staging / Local Drill |
| `tests/test_production_readiness.py` | Full multi-tenant lifecycle E2E drill | PHP + Python AI (`:8008`) + MariaDB | Staging / Local Drill |
| `tests/test_final_forensic.py` | 30-section live forensic server audit | PHP + Python AI (`:8008`) + MariaDB | Staging / Local Drill |

### What Requires XAMPP / MariaDB?
The live runtime tests (`test_production_readiness.py`, `test_final_forensic.py`, `test_e2e_browser.py`) require:
1. MariaDB/MySQL database running on port `3306` with `omnidesk` database migrated (`database/schema.sql` and `database/seed_demo.sql`).
2. Apache/PHP web server running on `http://127.0.0.1:8000`.
3. Python AI microservice running on `http://127.0.0.1:8008`.

### What Requires AI Provider Credentials?
- **Syntax / Unit / In-Memory Tests**: Require **NO** AI provider credentials (run completely offline and deterministic).
- **Live LLM Query Generation**: Real-time natural language synthesis against external foundation models requires `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` set in local `.env`. When keys are unset, the system seamlessly operates in deterministic rule/facts fallback mode.

---

## 5. Troubleshooting & Interpreting Failures

### PHP Syntax Error (`php -l` failed)
- **Cause**: Missing semicolon, mismatched brace, or unsupported PHP 8.2 syntax.
- **Fix**: Check line number indicated in the CI log output and fix syntax error.

### Python Compilation Error (`py_compile` failed)
- **Cause**: Indentation error, syntax error, or invalid type annotations.
- **Fix**: Run `python -m py_compile <path-to-file>` locally to pinpoint the exact line.

### Security / Tracked Secret Failure
- **Cause**: A `.env` file, `.pem` key, or certificate was accidentally staged with `git add`.
- **Fix**: Untrack the file using `git rm --cached <file>` and ensure it is listed in `.gitignore`.

### Financial Invariant or Reliability Test Failure
- **Cause**: Regression in ledger balance calculation ($\text{balance} \neq \text{total} - \sum\text{payments}$), missing lock in `FinanceService`, or audit hash chaining mismatch.
- **Fix**: Run `python tests/test_financial_integrity.py` locally and inspect assertion failures.
