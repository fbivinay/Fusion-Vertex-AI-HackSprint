from pathlib import Path
from uuid import uuid4

from google.cloud import storage

from .config import get_settings


settings = get_settings()
_client: storage.Client | None = None


def _storage_client() -> storage.Client:
    global _client
    if _client is None:
        _client = storage.Client(project=settings.google_cloud_project)
    return _client


def safe_filename(filename: str) -> str:
    leaf = Path(filename.replace("\\", "/")).name
    return "".join(c for c in leaf if c.isalnum() or c in "._- ").strip()[:160] or "upload"


def save_raw(project_id: str, filename: str, content: bytes) -> tuple[str, str]:
    source_id = f"S-{uuid4().hex[:10].upper()}"
    clean_name = safe_filename(filename)
    key = f"projects/{project_id}/raw/{source_id}-{clean_name}"
    if settings.fusion_bucket:
        blob = _storage_client().bucket(settings.fusion_bucket).blob(key)
        blob.upload_from_string(content)
        return source_id, f"gs://{settings.fusion_bucket}/{key}"
    local_root = Path(settings.local_data_dir)
    if not local_root.is_absolute():
        local_root = Path(__file__).resolve().parents[1] / local_root
    target = local_root / "uploads" / project_id / f"{source_id}-{clean_name}"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return source_id, str(target)


def load_source(object_uri: str) -> bytes:
    if object_uri.startswith("gs://"):
        bucket_name, key = object_uri[5:].split("/", 1)
        return _storage_client().bucket(bucket_name).blob(key).download_as_bytes()
    return Path(object_uri).read_bytes()


def save_output(project_id: str, filename: str, content: bytes, content_type: str) -> str:
    key = f"projects/{project_id}/outputs/{safe_filename(filename)}"
    if settings.fusion_bucket:
        blob = _storage_client().bucket(settings.fusion_bucket).blob(key)
        blob.upload_from_string(content, content_type=content_type)
        return f"gs://{settings.fusion_bucket}/{key}"
    local_root = Path(settings.local_data_dir)
    if not local_root.is_absolute():
        local_root = Path(__file__).resolve().parents[1] / local_root
    target = local_root / "outputs" / project_id / safe_filename(filename)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return str(target)


def save_processed(project_id: str, filename: str, content: bytes, content_type: str) -> str:
    key = f"projects/{project_id}/processed/{safe_filename(filename)}"
    if settings.fusion_bucket:
        blob = _storage_client().bucket(settings.fusion_bucket).blob(key)
        blob.upload_from_string(content, content_type=content_type)
        return f"gs://{settings.fusion_bucket}/{key}"
    local_root = Path(settings.local_data_dir)
    if not local_root.is_absolute():
        local_root = Path(__file__).resolve().parents[1] / local_root
    target = local_root / "processed" / project_id / safe_filename(filename)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return str(target)

