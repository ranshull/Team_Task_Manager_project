from datetime import date, datetime, timezone
from typing import Literal

from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import Field


class Task(Document):
    title: str
    description: str = ""
    project_id: PydanticObjectId
    assigned_to: PydanticObjectId | None = None
    status: Literal["todo", "in_progress", "done"] = "todo"
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: date | None = None
    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tasks"
