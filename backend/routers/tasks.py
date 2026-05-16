from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_current_user, get_project_or_404, get_task_or_404, require_owner_or_admin, require_project_member
from models import Comment, Project, Task, User
from schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(tags=["tasks"])


def ensure_assignee_is_member(project: Project, assigned_to) -> None:
    if assigned_to is not None and assigned_to != project.owner_id and assigned_to not in project.member_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assigned_to must be a project member")


@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskOut])
async def list_tasks(project_id: str, current_user: User = Depends(get_current_user)) -> list[Task]:
    project = await get_project_or_404(project_id)
    await require_project_member(project, current_user)
    return await Task.find(Task.project_id == project.id).sort("-updated_at").to_list()


@router.post("/api/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> Task:
    project = await get_project_or_404(project_id)
    await require_owner_or_admin(project, current_user)
    ensure_assignee_is_member(project, payload.assigned_to)
    task = Task(project_id=project.id, created_by=current_user.id, **payload.model_dump())
    await task.insert()
    return task


@router.get("/api/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)) -> Task:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_project_member(project, current_user)
    return task


@router.put("/api/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
) -> Task:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_project_member(project, current_user)
    data = payload.model_dump(exclude_unset=True)
    if current_user.role != "admin" and project.owner_id != current_user.id:
        disallowed = set(data) - {"status"}
        if disallowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project members may only update task status")
    ensure_assignee_is_member(project, data.get("assigned_to"))
    for key, value in data.items():
        setattr(task, key, value)
    task.updated_at = datetime.now(timezone.utc)
    await task.save()
    return task


@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)) -> None:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_owner_or_admin(project, current_user)
    await Comment.find(Comment.task_id == task.id).delete()
    await task.delete()
