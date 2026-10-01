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
        existing_tables = {table.table_id for table in client.list_tables(dataset_id)}
        for entity, table_name in TABLES.items():
            if table_name in existing_tables:
                continue
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

    def get_workspace(self, project_id: str | None = None) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """Load the project list and selected project's workspace in one read."""
        related_entities = ("sources", "requirements", "evidence", "conflicts", "decisions")
        if not self.cloud:
            with self._connect() as connection:
                project_rows = connection.execute(
                    "SELECT payload FROM records WHERE entity='projects' ORDER BY updated_at DESC LIMIT 100"
                ).fetchall()
                projects = [json.loads(row["payload"]) for row in project_rows]
                if project_id:
                    selected_row = connection.execute(
                        "SELECT payload FROM records WHERE entity='projects' AND project_id=? LIMIT 1",
                        (project_id,),
                    ).fetchone()
                    project = json.loads(selected_row["payload"]) if selected_row else None
                else:
                    project = projects[0] if projects else None
                if project is None:
                    return projects, None

                rows = connection.execute(
                    "SELECT entity, payload FROM records WHERE project_id=? AND entity IN (?, ?, ?, ?, ?) ORDER BY updated_at",
                    (project["project_id"], *related_entities),
                ).fetchall()
            workspace: dict[str, Any] = {"project": project, **{entity: [] for entity in related_entities}}
            for row in rows:
                workspace[row["entity"]].append(json.loads(row["payload"]))
            return projects, workspace

        self._ensure()
        project_table = f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.projects`"
        related_tables = {
            entity: f"`{self.settings.google_cloud_project}.{self.settings.bigquery_dataset}.{TABLES[entity]}`"
            for entity in related_entities
        }
        related_selects = ",\n".join(
            f"ARRAY(SELECT TO_JSON_STRING(payload) FROM {table} "
            "WHERE project_id = (SELECT project_id FROM active_project) ORDER BY updated_at) "
            f"AS {entity}_json"
            for entity, table in related_tables.items()
        )
        query = f"""WITH project_rows AS (
  SELECT project_id, payload, updated_at FROM {project_table}
), listed_projects AS (
  SELECT project_id, payload, updated_at FROM project_rows ORDER BY updated_at DESC LIMIT 100
), active_project AS (
  SELECT project_id, payload
  FROM project_rows
  WHERE (@project_id IS NOT NULL AND project_id = @project_id)
     OR (@project_id IS NULL AND project_id = (SELECT project_id FROM listed_projects ORDER BY updated_at DESC LIMIT 1))
  ORDER BY updated_at DESC
  LIMIT 1
)
SELECT
  ARRAY(SELECT TO_JSON_STRING(payload) FROM listed_projects ORDER BY updated_at DESC) AS projects_json,
  (SELECT TO_JSON_STRING(payload) FROM active_project LIMIT 1) AS project_json,
  {related_selects}
"""
        config = bigquery.QueryJobConfig(query_parameters=[
            bigquery.ScalarQueryParameter("project_id", "STRING", project_id),
        ])
        row = next(iter(self._client().query(query, job_config=config).result()), None)
        if row is None:
            return [], None
        projects = [json.loads(payload) for payload in row["projects_json"]]
        project_json = row["project_json"]
        if not project_json:
            return projects, None
        workspace = {"project": json.loads(project_json)}
        workspace.update({
            entity: [json.loads(payload) for payload in row[f"{entity}_json"]]
            for entity in related_entities
        })
        return projects, workspace

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

