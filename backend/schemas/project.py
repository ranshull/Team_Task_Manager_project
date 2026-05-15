from datetime import datetime

from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from schemas.user import UserSummary


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


class AddMemberRequest(BaseModel):
    email: EmailStr


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={PydanticObjectId: str})

    id: PydanticObjectId
    name: str
    description: str
    owner_id: PydanticObjectId
    member_ids: list[PydanticObjectId]
    members: list[UserSummary] = []
    created_at: datetime
