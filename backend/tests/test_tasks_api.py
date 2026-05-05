from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


def test_create_task_endpoint(monkeypatch):
    def fake_create_task(_db, payload):
        return SimpleNamespace(
            id="tsk-1",
            title=payload.title,
            status="todo",
            created_at=datetime.now(timezone.utc),
            completed_at=None,
        )

    monkeypatch.setattr("app.routers.tasks.create_task", fake_create_task)

    client = TestClient(app)
    response = client.post("/tasks", json={"title": "Read FastAPI docs"})

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Read FastAPI docs"
    assert body["status"] == "todo"


def test_update_task_status_endpoint(monkeypatch):
    monkeypatch.setattr(
        "app.routers.tasks.update_task_status",
        lambda *_args, **_kwargs: SimpleNamespace(
            id="tsk-1",
            title="Read FastAPI docs",
            status="done",
            created_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        ),
    )

    client = TestClient(app)
    response = client.patch("/tasks/tsk-1/status", json={"status": "done"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
