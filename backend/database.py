from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from config import get_settings
from models import Comment, Project, Task, User

client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    global client
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.database_name],
        document_models=[User, Project, Task, Comment],
    )


async def close_db() -> None:
    if client is not None:
        client.close()
