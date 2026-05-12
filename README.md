# Life OS

Life OS is a production-style personal operating system that combines:

- **Productivity** — tasks, focus sessions, Pomodoro
- **Finance** — income, expenses, balance signals
- **Home** — cleaning zones and status
- **Insights** — daily summary and AI-style recommendations (rule-based by default, optional OpenAI)
- **Events** — structured activity log (IoT-ready via HTTP)

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | FastAPI (Python), SQLAlchemy        |
| Database | PostgreSQL (Docker locally)         |
| Migrations | Alembic                           |
| Frontend | Next.js, TypeScript, Tailwind       |

The app is **events-first**: important actions write rows to the `events` table. Analytics and insights are built on that stream.

## Prerequisites

- **Docker** (for local PostgreSQL)
- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)

## Quick start

Run everything from the **repository root** (the folder that contains `backend/`, `frontend/`, and `docker-compose.yml`).

### 1) Start PostgreSQL

```bash
docker compose up -d
```

PostgreSQL is exposed on host port **5433** (mapped from container `5432`) to avoid clashes with a local Postgres on `5432`.

Check status:

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

Create your local env file (do **not** commit real secrets):

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
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run these commands from the **`backend`** directory so the `app` package resolves correctly.

- Interactive API docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

#### AI (optional)

Configure in `.env` (see `.env.example`):

- `AI_PROVIDER=rule_based` — default, no external API
- `AI_PROVIDER=openai` — requires `OPENAI_API_KEY` (paid usage per provider pricing)

Never commit API keys or personal `.env` files.

### 3) Frontend (Next.js)

In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Next.js prints (usually `http://localhost:3000`). If the port is busy:

```bash
npm run dev -- -p 3001
```

Point the browser app at your API (defaults to `http://localhost:8000` if unset):

- **PowerShell:** `$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000"`
- **cmd:** `set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
- **macOS / Linux:** `export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

Restart `npm run dev` after changing `NEXT_PUBLIC_*` variables.

## Selected API routes

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/health` | Liveness |
| POST | `/events` | Create event |
| GET | `/events` | List events |
| POST | `/tasks` | Create task |
| GET | `/tasks` | List tasks |
| PATCH | `/tasks/{task_id}/status` | Update task status |
| GET | `/analytics/daily-summary` | Daily aggregates |
| GET | `/analytics/daily-insight` | Insight payload |
| GET | `/finance/summary/range?from=&to=` | Income / expense / balance for `[from, to)` (all rows) |
| POST / GET | `/finance/transactions` | Finance CRUD-style usage |
| POST / GET | `/cleaning/zones` | Cleaning zones |
| POST | `/cleaning/zones/{zone_id}/done` | Mark cleaned |
| POST / GET | `/focus/sessions` | Focus sessions |
| POST / GET | `/pomodoro/sessions` | Pomodoro sessions |
| POST | `/iot/button/work` | IoT-friendly shortcut |
| POST | `/iot/button/cleaning` | IoT-friendly shortcut |

See `/docs` for the full, up-to-date contract.

## Backend tests

```bash
cd backend
pytest
```

(Activate the same `.venv` you use to run the app.)

## Docker cheat sheet

| Command | What it does |
| ------- | ------------ |
| `docker compose up -d` | Start services in the background |
| `docker compose ps` | Show container status |
| `docker compose logs -f db` | Follow Postgres logs |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Same + delete the DB volume (full reset) |

## Migrations

Schema changes live under `backend/alembic/versions/`. After pulling new code, run `python -m alembic upgrade head` from `backend/` with your venv active.

## Security notes for contributors

- Keep secrets only in local `.env` files.
- Do not commit real API keys, personal database URLs, or machine-specific paths.
- Use `.env.example` as the template others can copy.
