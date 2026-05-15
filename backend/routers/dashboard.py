from datetime import date

from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import Project, Task, User
from schemas.dashboard import DashboardOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
async def dashboard(current_user: User = Depends(get_current_user)) -> DashboardOut:
    if current_user.role == "admin":
        projects = await Project.find_all().to_list()
    else:
        projects = await Project.find(
            {"$or": [{"owner_id": current_user.id}, {"member_ids": current_user.id}]}
        ).to_list()
    project_ids = [project.id for project in projects]
    by_status = {"todo": 0, "in_progress": 0, "done": 0}
    overdue_count = 0
    total = 0
    if project_ids:
        tasks = await Task.find({"project_id": {"$in": project_ids}}).to_list()
        today = date.today()
        for task in tasks:
            total += 1
            by_status[task.status] += 1
            if task.due_date is not None and task.due_date < today and task.status != "done":
                overdue_count += 1
    completed_pct = round((by_status["done"] / total) * 100, 1) if total else 0.0
    return DashboardOut(
        total_tasks=total,
        completed_pct=completed_pct,
        overdue_count=overdue_count,
        by_status=by_status,
    )
