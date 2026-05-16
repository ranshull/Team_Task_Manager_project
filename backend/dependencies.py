from beanie.odm.fields import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from config import get_settings
from models import Project, Task, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    settings = get_settings()
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc

    user = await User.get(PydanticObjectId(user_id))
    if user is None:
        raise credentials_error
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def is_project_member(project: Project, user: User) -> bool:
    user_id = user.id
    return user.role == "admin" or project.owner_id == user_id or user_id in project.member_ids


def is_project_leader(project: Project, user: User) -> bool:
    return user.role == "admin" or project.owner_id == user.id


def can_access_task(project: Project, task: Task, user: User) -> bool:
    return is_project_leader(project, user) or (user.id in project.member_ids and task.assigned_to == user.id)


async def get_project_or_404(project_id: str) -> Project:
    project = await Project.get(PydanticObjectId(project_id))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def get_task_or_404(task_id: str) -> Task:
    task = await Task.get(PydanticObjectId(task_id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def require_project_member(project: Project, user: User) -> None:
    if not is_project_member(project, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project membership required")


async def require_owner_or_admin(project: Project, user: User) -> None:
    if not is_project_leader(project, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project leader access required")


async def require_task_access(project: Project, task: Task, user: User) -> None:
    if not can_access_task(project, task, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Task assignment required")
