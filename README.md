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

API endpoints:
- `GET /health`
- `POST /events`
- `GET /events?limit=20&offset=0&event_type=work_started`
- `POST /iot/button/work`
- `POST /iot/button/cleaning`
- `POST /tasks`
- `GET /tasks?limit=20&offset=0&status=todo`
- `PATCH /tasks/{task_id}/status`

## 3) Run backend tests

```bash
cd backend
pytest
```
## 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Set API URL if needed:
```bash
set NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open http://localhost:3000

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

## Stage 1.2 notes

- Added a `tasks` module as the first productivity feature.
- Task status flow: `todo -> in_progress -> done`.
- When status changes to `in_progress` or `done`, backend also writes
  an event (`task_in_progress` or `task_completed`) into `events`.
