from datetime import datetime, timezone

from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import Field


class Project(Document):
    name: str
    description: str = ""
    owner_id: PydanticObjectId
    member_ids: list[PydanticObjectId] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "projects"
