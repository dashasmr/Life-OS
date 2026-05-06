# Life OS

Life OS is a production-style personal operating system that combines:
- productivity (tasks, focus sessions, pomodoro)
- personal finance (income, expenses, balance)
- home maintenance (cleaning zones and status)
- AI-powered daily insight (rule-based with optional LLM)
- IoT-ready events (ESP32 buttons via simple HTTP)

Tech stack:
- FastAPI (Python) backend
- PostgreSQL database
- Next.js + TypeScript + Tailwind frontend
- Docker for local Postgres
- Alembic migrations

The system is **events-first**: every important action (task completed, expense added, cleaning done, focus started, pomodoro completed) writes a structured event to the `events` table. Analytics and AI insights are built on top of these events.

## 1) Start PostgreSQL (Docker)

```bash
docker compose up -d
```

## 2) Run backend (FastAPI)

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

AI configuration (optional):
- `AI_PROVIDER=rule_based` (default, free)
- `AI_PROVIDER=openai` + `OPENAI_API_KEY=...` (paid API usage)

## 3) API surface (selected)
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

## 4) Run backend tests

```bash
cd backend
pytest
```
## 5) Run frontend (Next.js)

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

## Docker basics

- `docker compose up -d` starts services in background.
- `docker compose ps` shows service status.
- `docker compose logs -f db` streams PostgreSQL logs.
- `docker compose down` stops and removes containers.
- `docker compose down -v` also removes DB volume (full reset).
- This project maps PostgreSQL to host port `5433` to avoid conflicts
  with local PostgreSQL installations on `5432`.

## Migrations with Alembic

This project uses Alembic to keep the PostgreSQL schema in versioned migration files, so every environment (local, staging, production) can apply the same schema history in a reproducible way.
