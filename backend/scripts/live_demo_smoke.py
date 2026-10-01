"""Run the real five-source flow against the configured Gemini API key.

This sends one analysis, one Ask Fusion, and one BRD request. The API enforces
the configured minimum request spacing. Output contains counts and IDs only.
"""

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


def require_ok(response, operation: str) -> dict:
    if not response.is_success:
        detail = response.json().get("detail", "request failed")
        raise SystemExit(f"{operation} failed ({response.status_code}): {detail}")
    return response.json()


with TestClient(app) as client:
    demo = require_ok(client.post("/api/demo"), "Create demo")
    project_id = demo["project"]["project_id"]
    if len(demo["sources"]) != 5:
        raise SystemExit(f"Expected five demo sources; got {len(demo['sources'])}")
    print(f"Uploaded five sources to project {project_id}.")

    analysis = require_ok(client.post(f"/api/projects/{project_id}/analyze"), "Gemini analysis")
    print(f"Real Gemini analysis returned {len(analysis['requirements'])} cited requirements, {len(analysis['evidence'])} evidence links, and {len(analysis['conflicts'])} conflicts.")
    payment_conflicts = [item for item in analysis["conflicts"] if "payment" in item["title"].lower() or "card" in item["title"].lower()]
    if not payment_conflicts:
        raise SystemExit("Gemini did not identify the intended payment-retention contradiction.")
    if not any(item["status"] == "NEEDS_HUMAN_DECISION" for item in payment_conflicts):
        raise SystemExit("The payment conflict was resolved without a human decision.")
    print(f"Payment contradiction remains open as {payment_conflicts[0]['id']}.")

    answer = require_ok(client.post(
        f"/api/projects/{project_id}/ask",
        json={"question": "Why does the payment-retention requirement need a human decision?"},
    ), "Ask Fusion")
    print(f"Ask Fusion returned a grounded answer with {len(answer.get('citations', []))} citations.")

    brd = require_ok(client.post(f"/api/projects/{project_id}/generate-brd"), "BRD generation")
    downloaded = require_ok(client.get(f"/api/projects/{project_id}/brd"), "BRD download")
    if len(downloaded.get("markdown", "")) < 500 or "Traceability Matrix" not in downloaded["markdown"]:
        raise SystemExit("Generated BRD did not include the expected traceability content.")
    print(f"Generated and downloaded a {len(downloaded['markdown'])}-character traceable BRD.")
    print(f"The generated artifact is stored at {brd['output_uri']}.")
