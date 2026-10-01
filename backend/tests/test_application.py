import json
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.pipeline import _extract_text, render_brd
from app.schemas import BRDNarrative


DEMO = Path(__file__).resolve().parents[1] / "demo_sources"


class SourceParsingTests(unittest.TestCase):
    def test_pdf_page_locations_are_preserved(self) -> None:
        raw = (DEMO / "payment_compliance.pdf").read_bytes()
        text, attachments = _extract_text("payment_compliance.pdf", "application/pdf", raw)
        self.assertIn("[Page 1]", text)
        self.assertIn("credentials must not be persisted", text)
        self.assertEqual(attachments, [])

    def test_csv_rows_are_read_as_structured_source_text(self) -> None:
        raw = (DEMO / "payment_step_analytics.csv").read_bytes()
        text, _ = _extract_text("payment_step_analytics.csv", "text/csv", raw)
        self.assertIn("returning_customer", text)
        self.assertIn("0.214", text)

    def test_screenshot_is_passed_as_a_multimodal_attachment(self) -> None:
        raw = (DEMO / "checkout_payment_screen.png").read_bytes()
        text, attachments = _extract_text("checkout_payment_screen.png", "image/png", raw)
        self.assertIn("inspect the attached visual", text)
        self.assertEqual(attachments[0][2], "image/png")
        self.assertTrue(attachments[0][1].startswith(b"\x89PNG"))

    def test_brd_template_keeps_conflicts_and_traceability(self) -> None:
        narrative = BRDNarrative(
            executive_summary="Evidence-led summary.", business_objective="Reduce abandonment.",
            problem_statement="Payment choices conflict.", proposed_solution="Resolve with Compliance.",
        )
        requirement = {
            "id": "FR-001", "description": "Show a payment method choice.", "type": "functional",
            "priority": "P0", "confidence": 0.94, "classification": "NEEDS_HUMAN_DECISION",
            "rationale": "Two sources disagree.", "acceptance_criteria": ["Decision is recorded."],
            "evidence": [{"source_id": "S-A", "location": "Page 1", "supporting_text": "Use a payment method.", "explanation": "Product requirement."}],
        }
        conflict = {
            "id": "C-001", "title": "Remember payment credentials", "severity": "Critical",
            "source_a_id": "S-A", "source_a_statement": "Save payment information.",
            "source_b_id": "S-B", "source_b_statement": "Credentials must not be persisted.",
            "impact": "Retention vs compliance.", "why_it_matters": "Approval required.", "status": "NEEDS_HUMAN_DECISION",
        }
        markdown = render_brd({"project_id": "p1", "name": "Checkout", "created_at": "today"}, narrative, [requirement], [conflict], [], [])
        self.assertIn("## 14. Conflicts", markdown)
        self.assertIn("S-B", markdown)
        self.assertIn("## 16. Requirement Traceability Matrix", markdown)
        self.assertIn("FR-001", markdown)


class ApiSmokeTests(unittest.TestCase):
    def test_live_demo_endpoint_stores_all_five_sources(self) -> None:
        with TestClient(app) as client:
            health = client.get("/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json()["project"], "hacksprint-510314")
            created = client.post("/api/demo")
            self.assertEqual(created.status_code, 200, created.text)
            body = created.json()
            self.assertEqual(body["project"]["name"], "E-commerce Checkout Revamp")
            self.assertEqual(len(body["sources"]), 5)
            detail = client.get(f"/api/projects/{body['project']['project_id']}")
            self.assertEqual(detail.status_code, 200)
            self.assertEqual(len(detail.json()["sources"]), 5)
            self.assertNotIn("object_uri", json.dumps(detail.json()))


if __name__ == "__main__":
    unittest.main()
