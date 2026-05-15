from beanie.odm.fields import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_current_user, get_project_or_404, require_admin, require_owner_or_admin, require_project_member
from models import Comment, Project, Task, User
from schemas.project import AddMemberRequest, ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


async def project_out(project: Project) -> ProjectOut:
    member_ids = list(dict.fromkeys([project.owner_id, *project.member_ids]))
    members = await User.find({"_id": {"$in": member_ids}}).to_list() if member_ids else []
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        member_ids=project.member_ids,
        members=members,
        created_at=project.created_at,
    )


@router.get("", response_model=list[ProjectOut])
async def list_projects(current_user: User = Depends(get_current_user)) -> list[ProjectOut]:
    if current_user.role == "admin":
        projects = await Project.find_all().sort("-created_at").to_list()
    else:
        projects = await Project.find(
        {"$or": [{"owner_id": current_user.id}, {"member_ids": current_user.id}]}
        ).sort("-created_at").to_list()
    return [await project_out(project) for project in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, current_user: User = Depends(require_admin)) -> Project:
    project = Project(
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
        member_ids=[current_user.id],
    )
    await project.insert()
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)) -> ProjectOut:
    project = await get_project_or_404(project_id)
    await require_project_member(project, current_user)
    return await project_out(project)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
) -> ProjectOut:
    project = await get_project_or_404(project_id)
    await require_owner_or_admin(project, current_user)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(project, key, value)
    await project.save()
    return await project_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)) -> None:
    project = await get_project_or_404(project_id)
    await require_owner_or_admin(project, current_user)
    tasks = await Task.find(Task.project_id == project.id).to_list()
    task_ids = [task.id for task in tasks]
    if task_ids:
        await Comment.find({"task_id": {"$in": task_ids}}).delete()
    await Task.find(Task.project_id == project.id).delete()
    await project.delete()


@router.post("/{project_id}/members", response_model=ProjectOut)
async def add_member(
    project_id: str,
    payload: AddMemberRequest,
    _: User = Depends(require_admin),
) -> ProjectOut:
    project = await get_project_or_404(project_id)
    user = await User.find_one(User.email == payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_id = PydanticObjectId(user.id)
    if user_id not in project.member_ids:
        project.member_ids.append(user_id)
        await project.save()
    return await project_out(project)
