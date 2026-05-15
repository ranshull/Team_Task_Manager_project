from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies import get_current_user
from models import Project, Task, User
from schemas.dashboard import DashboardOut, DashboardProjectOut, DashboardTaskOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
async def dashboard(
    project_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> DashboardOut:
    projects = await Project.find(
        {"$or": [{"owner_id": current_user.id}, {"member_ids": current_user.id}]}
    ).to_list()

    project_lookup = {str(project.id): project for project in projects}
    if project_id:
        if project_id not in project_lookup:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        chart_projects = [project_lookup[project_id]]
    else:
        chart_projects = projects

    all_project_ids = [project.id for project in projects]
    project_ids = [project.id for project in chart_projects]
    by_status = {"todo": 0, "in_progress": 0, "done": 0}
    by_priority = {"low": 0, "medium": 0, "high": 0}
    due_health = {"overdue": 0, "due_soon": 0, "unscheduled": 0, "healthy": 0}
    project_counts = {str(project.id): {"total": 0, "done": 0, "overdue": 0} for project in projects}
    overdue_count = 0
    total = 0
    recent_tasks = []
    all_tasks = []
    today = date.today()
    if all_project_ids:
        all_tasks = await Task.find({"project_id": {"$in": all_project_ids}}).sort("-updated_at").to_list()

    for task in all_tasks:
        task_project_id = str(task.project_id)
        if task_project_id in project_counts:
            project_counts[task_project_id]["total"] += 1
            if task.status == "done":
                project_counts[task_project_id]["done"] += 1
            if task.due_date is not None and task.due_date < today and task.status != "done":
                project_counts[task_project_id]["overdue"] += 1

        if task.project_id not in project_ids:
            continue

        project = project_lookup.get(task_project_id)
        total += 1
        by_status[task.status] += 1
        by_priority[task.priority] += 1
        if task.due_date is None:
            due_health["unscheduled"] += 1
        elif task.due_date < today and task.status != "done":
            overdue_count += 1
            due_health["overdue"] += 1
        elif (task.due_date - today).days <= 7 and task.status != "done":
            due_health["due_soon"] += 1
        else:
            due_health["healthy"] += 1
        if len(recent_tasks) < 5:
            recent_tasks.append(
                DashboardTaskOut(
                    id=str(task.id),
                    title=task.title,
                    project_id=task_project_id,
                    project_name=project.name if project else "Unknown project",
                    status=task.status,
                    priority=task.priority,
                    due_date=task.due_date.isoformat() if task.due_date else None,
                )
            )

    project_summaries = []
    for project in projects:
        counts = project_counts[str(project.id)]
        completed_pct_for_project = round((counts["done"] / counts["total"]) * 100, 1) if counts["total"] else 0.0
        project_summaries.append(
            DashboardProjectOut(
                id=str(project.id),
                name=project.name,
                total_tasks=counts["total"],
                completed_pct=completed_pct_for_project,
                overdue_count=counts["overdue"],
            )
        )

    completed_pct = round((by_status["done"] / total) * 100, 1) if total else 0.0
    return DashboardOut(
        total_tasks=total,
        completed_pct=completed_pct,
        overdue_count=overdue_count,
        by_status=by_status,
        by_priority=by_priority,
        due_health=due_health,
        projects=project_summaries,
        recent_tasks=recent_tasks,
    )
