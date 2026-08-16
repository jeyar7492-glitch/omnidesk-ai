# OmniDesk AI — Python Agentic AI Engine

Enterprise-grade Agentic AI service for OmniDesk AI platform.

## Architecture

- **Gateway**: Serves HTTP JSON API on port `8008`
- **Orchestrator**: Intent understanding, tool selection, RBAC verification, high-risk write confirmation checks.
- **Security**: Prompt injection sanitizer, secret masking, RBAC validation.
- **Tools**: CRM, Projects, Tasks, Finance, Dashboard.

## Running Service

```bash
cd ai
python app/main.py
```
