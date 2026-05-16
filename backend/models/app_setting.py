from beanie import Document


class AppSetting(Document):
    key: str
    allow_signup_role_selection: bool = False

    class Settings:
        name = "app_settings"
