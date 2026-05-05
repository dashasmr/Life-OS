# Life OS (MVP Stage 1.2)

Production-style MVP skeleton with:
- FastAPI backend
- PostgreSQL database
- Next.js frontend
- Events-first architecture

## 1) Start PostgreSQL

```bash
docker compose up -d
```

## 2) Run backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

AI configuration (optional):
- `AI_PROVIDER=rule_based` (default, free)
- `AI_PROVIDER=openai` + `OPENAI_API_KEY=...` (paid API usage)

API endpoints:
- `GET /health`
- `POST /events`
- `GET /events?limit=20&offset=0&event_type=work_started`
- `POST /iot/button/work`
- `POST /iot/button/cleaning`
- `POST /tasks`
- `GET /tasks?limit=20&offset=0&status=todo`
- `PATCH /tasks/{task_id}/status`
- `GET /analytics/daily-summary`
- `GET /analytics/daily-insight`
- `POST /finance/transactions`
- `GET /finance/transactions?limit=10&kind=expense`
- `POST /cleaning/zones`
- `GET /cleaning/zones`
- `POST /cleaning/zones/{zone_id}/done`
- `POST /focus/sessions`
- `POST /focus/sessions/{session_id}/stop`
- `GET /focus/sessions`
- `POST /pomodoro/sessions`
- `POST /pomodoro/sessions/{session_id}/complete`
- `GET /pomodoro/sessions`

## 3) Run backend tests

```bash
cd backend
pytest
```
## 4) Run frontend

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Set API URL if needed:
```bash
set NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open http://localhost:3001

## Docker basics used in this project

- `docker compose up -d` starts services in background.
- `docker compose ps` shows service status.
- `docker compose logs -f db` streams PostgreSQL logs.
- `docker compose down` stops and removes containers.
- `docker compose down -v` also removes DB volume (full reset).
- This project maps PostgreSQL to host port `5433` to avoid conflicts
  with local PostgreSQL installations on `5432`.

## Why Alembic is important

Alembic keeps your database schema in versioned migration files.
This makes your project production-friendly because every environment
(local, staging, production) can apply the same schema history.

## Stage 1.3 notes

- Added a `tasks` module as the first productivity feature.
- Task status flow: `todo -> in_progress -> done`.
- When status changes to `in_progress` or `done`, backend also writes
  an event (`task_in_progress` or `task_completed`) into `events`.
- Added a first analytics endpoint (`daily-summary`) for today.
- Added task filters and status counters in frontend UI.

## Stage 1.4 notes

- Added Finance MVP with `income` and `expense` transactions.
- Every transaction also creates an event (`income_added` or `expense_added`).
- Daily summary now includes income/expense totals and balance delta.

## Stage 1.5 notes

- Added Cleaning MVP with zones and cleaning frequency in days.
- Added status automation for each zone: `ok`, `soon`, `overdue`.
- Added "mark cleaned" action that updates zone date and creates `cleaning_done` event.

## Stage 1.6 notes

- Added Focus Sessions MVP (`start`, `stop`, `list`).
- Each focus action also creates events (`focus_started`, `focus_ended`).
- Added Focus Sessions block to frontend dashboard.

## Stage 1.7 notes

- Added AI-like daily insight endpoint (`/analytics/daily-insight`) using rule-based logic.
- Insight returns a headline, human-readable summary, and actionable recommendations.
- Added "AI daily insight" section to frontend.

## Stage 1.8 notes

- Introduced a dedicated backend service layer (`app/services/insights.py`).
- Moved daily insight text generation logic out of CRUD into service.
- Prepared architecture for swapping rule-based insight with real LLM API later.

## Stage 1.9 notes

- Added AI provider feature flag via environment variables.
- Supports `rule_based` and optional `openai` provider mode.
- Added safe fallback to rule-based insight if OpenAI call fails.

## Stage 2.0 notes

- Added Pomodoro MVP with backend persistence.
- Added endpoints to start/complete/list pomodoro sessions.
- Completing pomodoro writes `pomodoro_completed` event.
- Daily summary now includes `pomodoros_completed`.
