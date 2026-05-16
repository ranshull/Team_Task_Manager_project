from datetime import datetime
from typing import Literal

from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    phone: str = ""


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={PydanticObjectId: str})

    id: PydanticObjectId
    email: EmailStr
    username: str
    phone: str = ""
    role: Literal["admin", "member"]
    created_at: datetime


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={PydanticObjectId: str})

    id: PydanticObjectId
    email: EmailStr
    username: str
    phone: str = ""
    role: Literal["admin", "member"]


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    type: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserRoleUpdate(BaseModel):
    role: Literal["admin", "member"]


class UserProfileUpdate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    phone: str = ""
