# Life OS

A personal **Life OS** — a single place I use to run day-to-day productivity, home routines, money, and reflection. It is built like a small product: a FastAPI backend, PostgreSQL, and a Next.js UI, with an **events-first** core so activity stays traceable and insights can grow on top of real data.

---

## Contents

- [What it does](#what-it-does)
- [Why events-first](#why-events-first)
- [Tech stack](#tech-stack)
- [Frontend navigation](#frontend-navigation)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Optional AI](#optional-ai)
- [Selected API routes](#selected-api-routes)
- [Backend tests](#backend-tests)
- [Docker cheat sheet](#docker-cheat-sheet)
- [Migrations](#migrations)
- [Security](#security)
- [License](#license)

---

## What it does

- **Productivity** — tasks, focus sessions, Pomodoro  
- **Finance** — income, expenses, balance signals  
- **Home** — cleaning zones and status  
- **Insights** — daily summary and recommendations (rule-based by default; optional OpenAI)  
- **Events** — structured activity log (IoT-friendly via HTTP)

## Why events-first

Important actions write rows to the `events` table. Analytics and insights read from that stream, so the system stays consistent as features evolve.

## Tech stack

| Layer        | Technology                    |
| ------------ | ----------------------------- |
| Backend      | FastAPI (Python), SQLAlchemy  |
| Database     | PostgreSQL (Docker locally)   |
| Migrations   | Alembic                       |
| Frontend     | Next.js, TypeScript, Tailwind |

## Frontend navigation

The UI is split into **five primary areas** (top bar on desktop, bottom bar on narrow screens). Each area can expose **tabs** for related screens. Older URLs still work and **redirect** to the new routes.

| Area            | Base path          | Tabs / notes |
| --------------- | ------------------ | ------------ |
| **Dashboard**   | `/dashboard/...`   | Overview, Command Center, Daily Plan, Recommendations, Notifications |
| **Work**        | `/work/...`        | Tasks, Focus, Pomodoro |
| **Life**        | `/life/...`        | Cleaning, Home Health, Consistency |
| **Finance**     | `/finance/...`     | Dashboard (month totals), Transactions (form + list) |
| **Insights**    | `/insights/...`    | Activity, Timeline, Review, AI Daily Insight |

**Redirects (examples):** `/` → `/dashboard/overview`; `/tasks` → `/work/tasks`; `/finance` → `/finance/dashboard`; `/activity` → `/insights/activity`; and similar for other legacy paths.

**Mobile:** horizontal overflow is handled where it matters; primary actions use touch-friendly targets (e.g. min height ~44px); the bottom nav mirrors the five areas.

## Repository layout

```
Life OS/
├── backend/          # FastAPI app, Alembic, tests
├── frontend/         # Next.js app
└── docker-compose.yml
```

Run commands from the **repository root** unless a section says otherwise.

## Prerequisites

- **Docker** (local PostgreSQL)
- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)

## Quick start

### 1) Start PostgreSQL

```bash
docker compose up -d
```

PostgreSQL is on host port **5433** (container `5432`) to avoid clashing with a local Postgres on `5432`.

```bash
docker compose ps
```

### 2) Backend (FastAPI)

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **Windows (cmd):** `.venv\Scripts\activate.bat`
- **macOS / Linux:** `source .venv/bin/activate`

Then:

```bash
pip install -r requirements.txt
```

Create a local env file (do **not** commit real secrets):

```bash
# Windows (cmd)
copy .env.example .env

# PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` if your database URL or ports differ. Defaults match `docker-compose.yml`.

Apply migrations and run the API:

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

Run these from the **`backend`** directory so the `app` package resolves.

- Interactive API docs: `http://127.0.0.1:8765/docs`
- Health: `http://127.0.0.1:8765/health`

**Windows:** If binding fails with `WinError 10013`, port **8000** is often reserved. Prefer **`8765`** (as above) or another free port, and set `NEXT_PUBLIC_API_URL` on the frontend to match.

### 3) Frontend (Next.js)

In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Next.js prints (often `http://localhost:3000`). If the port is busy:

```bash
npm run dev -- -p 3001
```

Point the app at your API (defaults to `http://localhost:8765` if unset):

- **PowerShell:** `$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8765"`
- **cmd:** `set NEXT_PUBLIC_API_URL=http://127.0.0.1:8765`
- **macOS / Linux:** `export NEXT_PUBLIC_API_URL=http://127.0.0.1:8765`

Restart `npm run dev` after changing `NEXT_PUBLIC_*` variables.

This repo’s `package.json` may pin the dev server to a specific port (e.g. **3001**); use whatever URL Next.js prints after `npm run dev`.

## Optional AI

Configure in `.env` (see `.env.example`):

- `AI_PROVIDER=rule_based` — default, no external API  
- `AI_PROVIDER=openai` — requires `OPENAI_API_KEY` (paid per provider pricing)

Never commit API keys or personal `.env` files.

## Selected API routes

| Method     | Path | Purpose |
| ---------- | ---- | ------- |
| GET        | `/health` | Liveness |
| POST       | `/events` | Create event |
| GET        | `/events` | List events |
| POST       | `/tasks` | Create task |
| GET        | `/tasks` | List tasks |
| PATCH      | `/tasks/{task_id}/status` | Update task status |
| GET        | `/analytics/daily-summary` | Daily aggregates |
| GET        | `/analytics/daily-insight` | Insight payload |
| GET        | `/finance/summary/range?from=&to=` | Income / expense / balance for `[from, to)` |
| POST / GET | `/finance/transactions` | Finance usage |
| POST / GET | `/cleaning/zones` | Cleaning zones |
| POST       | `/cleaning/zones/{zone_id}/done` | Mark cleaned |
| POST / GET | `/focus/sessions` | Focus sessions |
| POST / GET | `/pomodoro/sessions` | Pomodoro sessions |
| POST       | `/iot/button/work` | IoT-friendly shortcut |
| POST       | `/iot/button/cleaning` | IoT-friendly shortcut |

The full contract lives at `/docs` when the API is running.

## Backend tests

```bash
cd backend
pytest
```

Use the same `.venv` you use to run the app.

## Docker cheat sheet

| Command | What it does |
| ------- | ------------ |
| `docker compose up -d` | Start services in the background |
| `docker compose ps` | Container status |
| `docker compose logs -f db` | Follow Postgres logs |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Same + delete the DB volume (full reset) |

## Migrations

Schema changes live under `backend/alembic/versions/`. After pulling new code, from `backend/` with the venv active:

```bash
python -m alembic upgrade head
```

## Security

- Keep secrets only in local `.env` files.  
- Do not commit API keys, personal database URLs, or machine-specific paths.  
- Use `.env.example` as the template others can copy.

## License

This repository does not include a `LICENSE` file yet. If you fork or republish, choose a license that fits how you want the code used.
