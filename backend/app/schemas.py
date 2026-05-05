from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


EventType = Literal["work_started", "task_in_progress", "task_completed", "expense_added", "cleaning_done"]
EventSource = Literal["web", "iot", "system"]
TaskStatus = Literal["todo", "in_progress", "done"]


class EventCreate(BaseModel):
    type: EventType
    source: EventSource = "web"
    payload: dict[str, Any] = Field(default_factory=dict)


class EventRead(BaseModel):
    id: str
    type: str
    source: str
    payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    id: str
    title: str
    status: TaskStatus
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
