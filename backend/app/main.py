import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.ai import router as ai_router
from app.routers.analytics import router as analytics_router
from app.routers.cleaning import router as cleaning_router
from app.routers.events import router as events_router
from app.routers.finance import router as finance_router
from app.routers.goals import router as goals_router
from app.routers.habits import router as habits_router
from app.routers.focus import router as focus_router
from app.routers.iot import router as iot_router
from app.routers.pomodoro import router as pomodoro_router
from app.routers.recommendations import router as recommendations_router
from app.routers.tasks import router as tasks_router
from app.services.realtime.broker import broker


@asynccontextmanager
async def lifespan(app: FastAPI):
    broker.attach_loop(asyncio.get_running_loop())
    yield


app = FastAPI(title="Life OS API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    # Next.js may pick another port (e.g. 3002); LAN dev uses 127.0.0.1 — keep explicit list + regex for local dev.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(ai_router)
app.include_router(events_router)
app.include_router(iot_router)
app.include_router(tasks_router)
app.include_router(analytics_router)
app.include_router(finance_router)
app.include_router(goals_router)
app.include_router(habits_router)
app.include_router(cleaning_router)
app.include_router(focus_router)
app.include_router(pomodoro_router)
app.include_router(recommendations_router)
