from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google.cloud import bigquery

from .config import get_settings


TABLES = {
    "projects": "projects",
    "sources": "sources",
    "requirements": "requirements",
    "evidence": "evidence",
    "conflicts": "conflicts",
    "decisions": "decisions",
}


class Repository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.cloud = bool(self.settings.bigquery_dataset)
        self._bq: bigquery.Client | None = None
        self._ready = False
        local_root = Path(self.settings.local_data_dir)
        if not local_root.is_absolute():
            local_root = Path(__file__).resolve().parents[1] / local_root
        local_root.mkdir(parents=True, exist_ok=True)
        self.sqlite_path = local_root / "fusion.sqlite3"
        if not self.cloud:
            with self._connect() as connection:
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS records (entity TEXT, project_id TEXT, record_id TEXT, payload TEXT, updated_at TEXT, PRIMARY KEY(entity, project_id, record_id))"
                )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.sqlite_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _client(self) -> bigquery.Client:
        if self._bq is None:
            self._bq = bigquery.Client(project=self.settings.google_cloud_project)
        return self._bq

    def _ensure(self) -> None:
        if self._ready or not self.cloud:
            return
        client = self._client()
        dataset_id = f"{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}"
        try:
            dataset = client.get_dataset(dataset_id)
        except Exception as exc:
            if getattr(exc, "code", None) != 404:
                raise
            dataset = bigquery.Dataset(dataset_id)
            dataset.location = self.settings.bigquery_location
            client.create_dataset(dataset, exists_ok=True)
        for entity, table_name in TABLES.items():
            table = bigquery.Table(
                f"{dataset_id}.{table_name}",
                schema=[
                    bigquery.SchemaField("project_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("record_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("payload", "JSON"),
                    bigquery.SchemaField("updated_at", "TIMESTAMP"),
                ],
            )
            client.create_table(table, exists_ok=True)
        self._ready = True

    def put(self, entity: str, project_id: str, record_id: str, payload: dict[str, Any]) -> None:
        if entity not in TABLES:
            raise ValueError(f"Unsupported entity: {entity}")
        now = datetime.now(timezone.utc).isoformat()
        if not self.cloud:
            with self._connect() as connection:
                connection.execute(
                    "INSERT INTO records(entity, project_id, record_id, payload, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(entity, project_id, record_id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
                    (entity, project_id, record_id, json.dumps(payload), now),
                )
            return
        self._ensure()
        table = f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.{TABLES[entity]}`"
        query = f"""MERGE {table} T
USING (SELECT @project_id AS project_id, @record_id AS record_id,
              PARSE_JSON(@payload) AS payload, CURRENT_TIMESTAMP() AS updated_at) S
ON T.project_id = S.project_id AND T.record_id = S.record_id
WHEN MATCHED THEN UPDATE SET payload = S.payload, updated_at = S.updated_at
WHEN NOT MATCHED THEN INSERT (project_id, record_id, payload, updated_at)
VALUES (S.project_id, S.record_id, S.payload, S.updated_at)"""
        config = bigquery.QueryJobConfig(query_parameters=[
            bigquery.ScalarQueryParameter("project_id", "STRING", project_id),
            bigquery.ScalarQueryParameter("record_id", "STRING", record_id),
            bigquery.ScalarQueryParameter("payload", "STRING", json.dumps(payload)),
        ])
        self._client().query(query, job_config=config).result()

    def list(self, entity: str, project_id: str) -> list[dict[str, Any]]:
        if entity not in TABLES:
            raise ValueError(f"Unsupported entity: {entity}")
        if not self.cloud:
            with self._connect() as connection:
                rows = connection.execute(
                    "SELECT payload FROM records WHERE entity=? AND project_id=? ORDER BY updated_at",
                    (entity, project_id),
                ).fetchall()
            return [json.loads(row["payload"]) for row in rows]
        self._ensure()
        table = f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.{TABLES[entity]}`"
        query = f"SELECT TO_JSON_STRING(payload) AS payload_json FROM {table} WHERE project_id = @project_id ORDER BY updated_at"
        config = bigquery.QueryJobConfig(query_parameters=[bigquery.ScalarQueryParameter("project_id", "STRING", project_id)])
        return [json.loads(row["payload_json"]) for row in self._client().query(query, job_config=config).result()]

    def list_projects(self) -> list[dict[str, Any]]:
        if not self.cloud:
            with self._connect() as connection:
                rows = connection.execute(
                    "SELECT payload FROM records WHERE entity='projects' ORDER BY updated_at DESC"
                ).fetchall()
            return [json.loads(row["payload"]) for row in rows]
        self._ensure()
        table = f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.projects`"
        rows = self._client().query(f"SELECT TO_JSON_STRING(payload) AS payload_json FROM {table} ORDER BY updated_at DESC LIMIT 100").result()
        return [json.loads(row["payload_json"]) for row in rows]

    def delete_project_records(self, entity: str, project_id: str) -> None:
        if not self.cloud:
            with self._connect() as connection:
                connection.execute("DELETE FROM records WHERE entity=? AND project_id=?", (entity, project_id))
            return
        self._ensure()
        table = f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.{TABLES[entity]}`"
        config = bigquery.QueryJobConfig(query_parameters=[bigquery.ScalarQueryParameter("project_id", "STRING", project_id)])
        self._client().query(f"DELETE FROM {table} WHERE project_id=@project_id", job_config=config).result()


repository = Repository()

