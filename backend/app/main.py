import logging
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import get_settings
from .pipeline import analyze_project, answer_project_question, generate_brd
from .repository import repository
from .storage import safe_filename, save_raw


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fusion_vertex")
settings = get_settings()
app = FastAPI(title="Fusion Vertex AI", version="1.0.0", description="Evidence-grounded requirements analysis and BRD generation")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class DecisionRequest(BaseModel):
    choice: Literal["ACCEPT_SOURCE_A", "ACCEPT_SOURCE_B", "KEEP_UNRESOLVED"]
    rationale: str = Field(min_length=3, max_length=2000)


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".csv"}
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_BATCH_BYTES = 20 * 1024 * 1024


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gemini_failure(project_id: str, operation: str, exc: Exception) -> HTTPException:
    logger.exception("%s failed for %s", operation, project_id)
    status = getattr(exc, "status_code", getattr(exc, "code", None))
    if status == 429:
        return HTTPException(status_code=429, detail="The AI Studio quota or rate limit was reached. Wait before retrying; requests are already spaced to stay conservative.")
    if status == 503:
        return HTTPException(status_code=503, detail="Google reports temporary high demand for this Gemini model. Wait briefly before retrying.")
    return HTTPException(status_code=502, detail=f"{operation} failed. Check the backend logs and AI Studio project access, then retry.")


def find_project(project_id: str) -> dict:
    for project in repository.list("projects", project_id):
        if project.get("project_id") == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")


def public_source(source: dict) -> dict:
    return {key: value for key, value in source.items() if key != "object_uri"}


def create_project(name: str, description: str = "") -> dict:
    project_id = uuid.uuid4().hex[:12]
    project = {
        "project_id": project_id,
        "name": name.strip(),
        "description": description.strip(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "analysis_status": "not_started",
        "brd_status": "not_generated",
    }
    repository.put("projects", project_id, project_id, project)
    return project


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "fusion-vertex-api", "project": settings.google_cloud_project}


@app.get("/api/projects")
def list_projects() -> list[dict]:
    return repository.list_projects()


@app.get("/api/workspace")
def get_workspace(project_id: str | None = None) -> dict:
    projects, workspace = repository.get_workspace(project_id)
    if project_id and workspace is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if workspace is None:
        return {
            "projects": projects,
            "project": None,
            "requirements": [],
            "evidence": [],
            "conflicts": [],
            "decisions": [],
            "pending": [],
        }

    project = workspace["project"]
    project["sources"] = [public_source(source) for source in workspace["sources"]]
    conflicts = workspace["conflicts"]
    decisions = workspace["decisions"]
    decided_conflicts = {item["conflict_id"] for item in decisions if item.get("status") == "RECORDED"}
    pending = [
        item for item in conflicts
        if item.get("status") == "NEEDS_HUMAN_DECISION" and item["id"] not in decided_conflicts
    ]
    return {
        "projects": projects,
        "project": project,
        "requirements": workspace["requirements"],
        "evidence": workspace["evidence"],
        "conflicts": conflicts,
        "decisions": decisions,
        "pending": pending,
    }


@app.post("/api/projects")
def post_project(request: ProjectCreate) -> dict:
    return create_project(request.name, request.description)


@app.post("/api/demo")
async def create_demo() -> dict:
    project = create_project(
        "E-commerce Checkout Revamp",
        "A cross-source checkout redesign analysis with an intentionally unresolved payment-retention conflict.",
    )
    source_dir = Path(__file__).resolve().parents[1] / "demo_sources"
    if not source_dir.exists():
        raise HTTPException(status_code=500, detail="Demo sources are missing from the deployment package.")
    total = 0
    created = []
    for path in sorted(source_dir.iterdir()):
        if path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        content = path.read_bytes()
        total += len(content)
        if total > MAX_BATCH_BYTES:
            raise HTTPException(status_code=500, detail="Demo source set exceeds the upload limit.")
        source_id, object_uri = save_raw(project["project_id"], path.name, content)
        source = {
            "source_id": source_id,
            "project_id": project["project_id"],
            "filename": path.name,
            "mime_type": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            "byte_size": len(content),
            "object_uri": object_uri,
            "uploaded_at": now_iso(),
            "analyzed": False,
        }
        repository.put("sources", project["project_id"], source_id, source)
        created.append(public_source(source))
    return {"project": project, "sources": created}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> dict:
    project = find_project(project_id)
    project["sources"] = [public_source(source) for source in repository.list("sources", project_id)]
    return project


@app.post("/api/projects/{project_id}/upload")
async def upload_sources(project_id: str, files: list[UploadFile] = File(...)) -> dict:
    find_project(project_id)
    if not files:
        raise HTTPException(status_code=400, detail="Select one or more files to upload.")
    existing = repository.list("sources", project_id)
    batch_size = sum(item.get("byte_size", 0) for item in existing)
    created = []
    for upload in files:
        name = safe_filename(upload.filename or "upload")
        extension = Path(name).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {name}")
        content = await upload.read(MAX_FILE_BYTES + 1)
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"{name} exceeds the 10 MB per-file limit.")
        batch_size += len(content)
        if batch_size > MAX_BATCH_BYTES:
            raise HTTPException(status_code=413, detail="This project is limited to 20 MB of source files.")
        mime_type = upload.content_type or mimetypes.guess_type(name)[0] or "application/octet-stream"
        source_id, object_uri = save_raw(project_id, name, content)
        source = {
            "source_id": source_id,
            "project_id": project_id,
            "filename": name,
            "mime_type": mime_type,
            "byte_size": len(content),
            "object_uri": object_uri,
            "uploaded_at": now_iso(),
            "analyzed": False,
        }
        repository.put("sources", project_id, source_id, source)
        created.append(public_source(source))
    project = find_project(project_id)
    project["updated_at"] = now_iso()
    project["analysis_status"] = "sources_added"
    repository.put("projects", project_id, project_id, project)
    return {"project_id": project_id, "sources": created}


@app.post("/api/projects/{project_id}/analyze")
def analyze(project_id: str) -> dict:
    find_project(project_id)
    try:
        return analyze_project(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise gemini_failure(project_id, "Gemini analysis", exc) from exc


@app.get("/api/projects/{project_id}/requirements")
def get_requirements(project_id: str) -> list[dict]:
    find_project(project_id)
    return repository.list("requirements", project_id)


@app.get("/api/projects/{project_id}/evidence")
def get_evidence(project_id: str) -> list[dict]:
    find_project(project_id)
    return repository.list("evidence", project_id)


@app.get("/api/projects/{project_id}/conflicts")
def get_conflicts(project_id: str) -> list[dict]:
    find_project(project_id)
    return repository.list("conflicts", project_id)


@app.get("/api/projects/{project_id}/decisions")
def get_decisions(project_id: str) -> dict:
    find_project(project_id)
    decisions = repository.list("decisions", project_id)
    decided_conflicts = {item["conflict_id"] for item in decisions if item.get("status") == "RECORDED"}
    pending = [item for item in repository.list("conflicts", project_id) if item.get("status") == "NEEDS_HUMAN_DECISION" and item["id"] not in decided_conflicts]
    return {"decisions": decisions, "pending": pending}


@app.post("/api/projects/{project_id}/conflicts/{conflict_id}/decision")
def decide(project_id: str, conflict_id: str, request: DecisionRequest) -> dict:
    find_project(project_id)
    conflicts = repository.list("conflicts", project_id)
    conflict = next((item for item in conflicts if item.get("id") == conflict_id), None)
    if conflict is None:
        raise HTTPException(status_code=404, detail="Conflict not found")
    source_key = "source_a_id" if request.choice == "ACCEPT_SOURCE_A" else "source_b_id" if request.choice == "ACCEPT_SOURCE_B" else None
    decision = {
        "decision_id": uuid.uuid4().hex[:12],
        "project_id": project_id,
        "conflict_id": conflict_id,
        "choice": request.choice,
        "selected_source_id": conflict.get(source_key) if source_key else None,
        "rationale": request.rationale,
        "decided_at": now_iso(),
        "status": "UNRESOLVED" if request.choice == "KEEP_UNRESOLVED" else "RECORDED",
    }
    repository.put("decisions", project_id, decision["decision_id"], decision)
    if source_key:
        conflict["status"] = "RESOLVED"
        conflict["resolution"] = request.choice
        conflict["resolution_rationale"] = request.rationale
        conflict["selected_source_id"] = conflict[source_key]
        repository.put("conflicts", project_id, conflict_id, conflict)
        for requirement in repository.list("requirements", project_id):
            if conflict_id in requirement.get("related_conflict_ids", []):
                requirement["classification"] = "SUPPORTED"
                requirement["human_resolution"] = request.choice
                requirement["rationale"] = (requirement.get("rationale", "") + f" Human decision accepted {conflict[source_key]}: {request.rationale}").strip()
                repository.put("requirements", project_id, requirement["id"], requirement)
    return {"decision": decision, "conflict": conflict}


@app.post("/api/projects/{project_id}/ask")
def ask_fusion(project_id: str, request: AskRequest) -> dict:
    find_project(project_id)
    if not repository.list("requirements", project_id):
        raise HTTPException(status_code=409, detail="Analyze project sources before asking Fusion.")
    try:
        return answer_project_question(project_id, request.question)
    except Exception as exc:
        raise gemini_failure(project_id, "Ask Fusion", exc) from exc


@app.post("/api/projects/{project_id}/generate-brd")
def create_brd(project_id: str) -> dict:
    find_project(project_id)
    try:
        return generate_brd(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise gemini_failure(project_id, "BRD generation", exc) from exc


@app.get("/api/projects/{project_id}/brd")
def get_brd(project_id: str) -> dict:
    project = find_project(project_id)
    if not project.get("brd_status") == "generated" or not project.get("brd_uri"):
        raise HTTPException(status_code=404, detail="Generate the BRD before downloading it.")
    uri = project["brd_uri"]
    if uri.startswith("gs://"):
        from .storage import load_source
        content = load_source(uri)
        return {"project_id": project_id, "markdown": content.decode("utf-8")}
    path = Path(uri)
    return {"project_id": project_id, "markdown": path.read_text(encoding="utf-8")}

