"""
OmniDesk AI — Agentic AI Engine Configuration (Phase 7)

Provides runtime settings, LLM provider configurations, tool execution limits,
and security policies.
"""

import os
from typing import Dict, Any

class Settings:
    APP_NAME: str = "OmniDesk Agentic AI Engine"
    VERSION: str = "1.0.0"
    
    # LLM Provider Abstraction Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock_standalone")  # mock_standalone | openai | anthropic | gemini | local
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-2.5-flash")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    
    # Execution Limits
    MAX_AGENT_STEPS: int = 5
    MAX_TOOL_CALLS: int = 10
    MAX_CONTEXT_MESSAGES: int = 20
    
    # Read/Write Tool Confirmation Policy
    REQUIRE_CONFIRMATION_FOR_WRITES: bool = True

settings = Settings()
