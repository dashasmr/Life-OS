from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


def _task_row(**overrides):
    base = {
        "id": "tsk-1",
        "title": "Read FastAPI docs",
        "status": "todo",
        "priority": "medium",
        "due_date": None,
        "energy_type": None,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_create_task_endpoint(monkeypatch):
    def fake_create_task(_db, payload):
        return _task_row(
            title=payload.title,
            priority=payload.priority,
            due_date=payload.due_date,
            energy_type=payload.energy_type,
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
        lambda *_args, **_kwargs: _task_row(
            status="done",
            completed_at=datetime.now(timezone.utc),
        ),
    )

    client = TestClient(app)
    response = client.patch("/tasks/tsk-1/status", json={"status": "done"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
