from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app


def test_finance_summary_range_endpoint(monkeypatch):
    def fake_totals(_db, range_start: datetime, range_end: datetime):
        assert range_start < range_end
        return {"income_total": 1000.0, "expense_total": 125.5, "balance_delta": 874.5}

    monkeypatch.setattr("app.routers.finance.finance_totals_in_range", fake_totals)

    client = TestClient(app)
    start = datetime(2026, 5, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
    response = client.get(
        "/finance/summary/range",
        params={"from": start.isoformat(), "to": end.isoformat()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["income_total"] == 1000.0
    assert body["expense_total"] == 125.5
    assert body["balance_delta"] == 874.5


def test_finance_summary_range_rejects_inverted_window():
    client = TestClient(app)
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    end = datetime(2026, 5, 1, tzinfo=timezone.utc)
    response = client.get(
        "/finance/summary/range",
        params={"from": start.isoformat(), "to": end.isoformat()},
    )
    assert response.status_code == 422
