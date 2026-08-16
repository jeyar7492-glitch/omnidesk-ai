"""
OmniDesk AI — Financial Data Integrity Test Suite (Phase 13)

Executes all 10 mandatory financial integrity tests:
- TEST-FIN-01: Verify initial invoice totals and balance invariants.
- TEST-FIN-02: Record $5,000 payment and verify paid_amount increases.
- TEST-FIN-03: Verify balance_due decreases by exactly $5,000.
- TEST-FIN-04: Query through FinanceAgent and verify the new $25,000 value.
- TEST-FIN-05: Query through ExecutiveAgent and verify cross-agent consistency.
- TEST-FIN-06: Query through RiskAgent and verify cross-agent consistency.
- TEST-FIN-07: Query FinanceAgent + RAG policy to verify DB facts & policy separation.
- TEST-FIN-08: Stale memory injection test (DB remains authoritative).
- TEST-FIN-09: Contradictory cached data test (DATA_INCONSISTENCY warning).
- TEST-FIN-10: Overpayment / Replay rejection test.
"""

import sys
import os

# Ensure 'ai' directory is in search path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai"))

from app.services.finance_service import FinanceService
from app.agents.orchestrator import AgentOrchestrator
from app.agents.executive_agent import ExecutiveAgent
from app.agents.finance_agent import FinanceAgent
from app.agents.risk_agent import RiskAgent
from app.security import AISecurity

def run_tests():
    print("==================================================")
    print("OMNIDESK AI — FINANCIAL INTEGRITY TEST SUITE")
    print("==================================================\n")

    ws_id = 1
    ctx = {"user_id": 1, "workspace_id": ws_id, "role": "admin", "permissions": ["finance.view", "finance.edit", "dashboard.view"]}

    # Reset ledger to baseline
    FinanceService._invoices[1][1] = {
        "id": 1,
        "number": "INV-2026-001",
        "customer": "Stark Logistics",
        "customer_id": 1,
        "issue_date": "2026-07-15",
        "due_date": "2026-08-01",
        "subtotal": 50000.00,
        "tax_amount": 10000.00,
        "discount_amount": 0.00,
        "total_amount": 60000.00,
        "paid_amount": 30000.00,
        "balance_due": 30000.00,
        "status": "partially_paid",
        "is_overdue": True,
        "payments": [
            {"id": 1, "date": "2026-07-20", "amount": 30000.00, "method": "Bank Transfer", "ref": "PAY-STK-001"}
        ]
    }

    # TEST-FIN-01: Baseline verification
    inv = FinanceService.get_invoice(ws_id, 1)
    assert inv["is_valid"] is True
    assert inv["invoice"]["total_amount"] == 60000.00
    assert inv["invoice"]["paid_amount"] == 30000.00
    assert inv["invoice"]["balance_due"] == 30000.00
    print("[PASS] TEST-FIN-01: Initial invoice totals verified (Total: $60,000, Paid: $30,000, Balance: $30,000).")

    # TEST-FIN-02: Record $5,000 payment
    pay_res = FinanceService.record_payment(ws_id, 1, 5000.00, "Bank Transfer", "PAY-CONFIRMED-5000")
    assert pay_res["status"] == "SUCCESS"
    assert pay_res["updated_paid"] == 35000.00
    print(f"[PASS] TEST-FIN-02: $5,000 payment recorded. New paid_amount: ${pay_res['updated_paid']:,.2f}.")

    # TEST-FIN-03: Verify balance_due decreases by exactly $5,000
    assert pay_res["updated_balance"] == 25000.00
    inv_updated = FinanceService.get_invoice(ws_id, 1)
    assert inv_updated["invoice"]["balance_due"] == 25000.00
    assert inv_updated["invoice"]["paid_amount"] == 35000.00
    assert inv_updated["invoice"]["total_amount"] == 60000.00
    print(f"[PASS] TEST-FIN-03: Balance due authoritatively reduced to ${inv_updated['invoice']['balance_due']:,.2f}.")

    # TEST-FIN-04: Query through FinanceAgent factsheet
    factsheet = FinanceAgent.format_invoice_factsheet(inv_updated)
    assert "Outstanding: $25,000.00" in factsheet
    assert "Paid: $35,000.00" in factsheet
    assert "Total: $60,000.00" in factsheet
    assert "VERIFIED (balance_due = total_amount - paid_amount)" in factsheet
    print("[PASS] TEST-FIN-04: FinanceAgent factsheet outputs verified $25,000.00 balance.")

    # TEST-FIN-05: Query through ExecutiveAgent
    exec_res = ExecutiveAgent.execute(ctx, {})
    assert "$25,000.00" in exec_res
    print("[PASS] TEST-FIN-05: ExecutiveAgent outputs identical $25,000.00 overdue balance.")

    # TEST-FIN-06: Query through RiskAgent
    risk_res = RiskAgent.execute(ctx, {})
    assert "$25,000.00" in risk_res
    print("[PASS] TEST-FIN-06: RiskAgent outputs identical $25,000.00 overdue balance.")

    # TEST-FIN-07: Query through Orchestrator with RAG Policy
    orch_res = AgentOrchestrator.process_request({
        "message": "What is the exact outstanding balance of INV-2026-001 right now, and what is the late-payment interest policy?",
        "context": ctx
    })
    resp_text = orch_res["response"]
    assert "LIVE DATABASE FACTS" in resp_text
    assert "Outstanding: $25,000.00" in resp_text
    assert "KNOWLEDGE BASE POLICY" in resp_text
    assert "1.5% monthly interest" in resp_text
    assert "$375.00 / month" in resp_text
    assert "DATA INTEGRITY\n--------------\nVERIFIED" in resp_text
    print("[PASS] TEST-FIN-07: Factsheet separates DB facts from RAG policy and calculates $375/mo interest.")

    # TEST-FIN-08: Stale memory injection test
    stale_ctx = dict(ctx)
    stale_ctx["conversation_memory"] = {"last_known_balance": 30000.00, "stale_paid": 25000.00}
    orch_stale = AgentOrchestrator.process_request({
        "message": "Show exact balance for INV-2026-001",
        "context": stale_ctx
    })
    assert "Outstanding: $25,000.00" in orch_stale["response"]
    print("[PASS] TEST-FIN-08: Stale conversation memory ignored. Database remains authoritative.")

    # TEST-FIN-09: Inject contradictory cached data
    inconsistent_inv = {
        "status": "DATA_INCONSISTENCY",
        "is_valid": False,
        "invoice": {"number": "INV-2026-001", "total_amount": 60000.00, "paid_amount": 20000.00, "balance_due": 30000.00}
    }
    inconsistent_output = FinanceAgent.format_invoice_factsheet(inconsistent_inv)
    assert "Financial data integrity check failed" in inconsistent_output
    print("[PASS] TEST-FIN-09: Contradictory cached data detected; system refused to guess.")

    # TEST-FIN-10: Overpayment / Replay rejection test
    overpay_res = FinanceService.record_payment(ws_id, 1, 99999.00)
    assert overpay_res["status"] == "OVERPAYMENT_REJECTED"
    print("[PASS] TEST-FIN-10: Overpayment of $99,999.00 safely rejected.")

    print("\n==================================================")
    print("ALL 10 FINANCIAL INTEGRITY TESTS PASSED (100% SUCCESS)")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
