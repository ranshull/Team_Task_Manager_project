from datetime import datetime, timezone

from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import Field


class Comment(Document):
    body: str
    task_id: PydanticObjectId
    author_id: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "comments"
