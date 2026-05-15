from datetime import date, datetime
from typing import Literal

from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = ""
    assigned_to: PydanticObjectId | None = None
    status: Literal["todo", "in_progress", "done"] = "todo"
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: date | None = None

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("due_date must not be in the past")
        return value


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    assigned_to: PydanticObjectId | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    due_date: date | None = None

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("due_date must not be in the past")
        return value


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={PydanticObjectId: str})

    id: PydanticObjectId
    title: str
    description: str
    project_id: PydanticObjectId
    assigned_to: PydanticObjectId | None
    status: Literal["todo", "in_progress", "done"]
    priority: Literal["low", "medium", "high"]
    due_date: date | None
    created_by: PydanticObjectId
    created_at: datetime
    updated_at: datetime
