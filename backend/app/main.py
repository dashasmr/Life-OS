from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.events import router as events_router
from app.routers.iot import router as iot_router
from app.routers.tasks import router as tasks_router

app = FastAPI(title="Life OS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(events_router)
app.include_router(iot_router)
app.include_router(tasks_router)
