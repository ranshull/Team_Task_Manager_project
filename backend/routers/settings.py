from fastapi import APIRouter, Depends

from dependencies import require_admin
from models import AppSetting, User
from schemas.settings import SignupSettingsOut, SignupSettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

SIGNUP_KEY = "signup"


async def get_signup_setting() -> AppSetting:
    setting = await AppSetting.find_one(AppSetting.key == SIGNUP_KEY)
    if setting is None:
        setting = AppSetting(key=SIGNUP_KEY, allow_signup_role_selection=False)
        await setting.insert()
    return setting


@router.get("/signup", response_model=SignupSettingsOut)
async def signup_settings() -> SignupSettingsOut:
    setting = await get_signup_setting()
    return SignupSettingsOut(allow_signup_role_selection=setting.allow_signup_role_selection)


@router.put("/signup", response_model=SignupSettingsOut)
async def update_signup_settings(
    payload: SignupSettingsUpdate,
    _: User = Depends(require_admin),
) -> SignupSettingsOut:
    setting = await get_signup_setting()
    setting.allow_signup_role_selection = payload.allow_signup_role_selection
    await setting.save()
    return SignupSettingsOut(allow_signup_role_selection=setting.allow_signup_role_selection)
