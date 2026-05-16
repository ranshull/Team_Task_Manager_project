from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import (
    get_current_user,
    get_project_or_404,
    get_task_or_404,
    is_project_leader,
    require_owner_or_admin,
    require_project_member,
    require_task_access,
)
from models import Comment, Project, Task, User
from schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(tags=["tasks"])


def ensure_assignee_is_member(project: Project, assigned_to) -> None:
    if assigned_to is not None and assigned_to != project.owner_id and assigned_to not in project.member_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assigned_to must be a project member")


def ensure_assignees_are_members(project: Project, assignee_ids) -> None:
    for assignee_id in assignee_ids:
        ensure_assignee_is_member(project, assignee_id)


@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskOut])
async def list_tasks(project_id: str, current_user: User = Depends(get_current_user)) -> list[Task]:
    project = await get_project_or_404(project_id)
    await require_project_member(project, current_user)
    if is_project_leader(project, current_user):
        return await Task.find(Task.project_id == project.id).sort("-updated_at").to_list()
    return await Task.find(
        {"project_id": project.id, "assigned_to": current_user.id}
    ).sort("-updated_at").to_list()


@router.post("/api/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> Task:
    project = await get_project_or_404(project_id)
    await require_owner_or_admin(project, current_user)
    ensure_assignee_is_member(project, payload.assigned_to)
    if payload.assigned_to_ids:
        assignee_ids = list(dict.fromkeys(payload.assigned_to_ids))
    elif payload.assigned_to is not None:
        assignee_ids = [payload.assigned_to]
    else:
        assignee_ids = [
            member_id for member_id in dict.fromkeys(project.member_ids) if member_id != project.owner_id
        ]
    ensure_assignees_are_members(project, assignee_ids)
    if not assignee_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose at least one project member")
    payload_data = payload.model_dump(exclude={"assigned_to_ids"})
    created_tasks = []
    for assignee_id in assignee_ids:
        task = Task(
            project_id=project.id,
            created_by=current_user.id,
            **{**payload_data, "assigned_to": assignee_id},
        )
        await task.insert()
        created_tasks.append(task)
    task = created_tasks[0]
    return task


@router.get("/api/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)) -> Task:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_task_access(project, task, current_user)
    return task


@router.put("/api/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
) -> Task:
    task = await get_task_or_404(task_id)
    project = await get_project_or_404(str(task.project_id))
    await require_task_access(project, task, current_user)
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
