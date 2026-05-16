from pydantic import BaseModel


class SignupSettingsOut(BaseModel):
    allow_signup_role_selection: bool


class SignupSettingsUpdate(BaseModel):
    allow_signup_role_selection: bool
