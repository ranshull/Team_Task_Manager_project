from pydantic import BaseModel


class DashboardProjectOut(BaseModel):
    id: str
    name: str
    total_tasks: int
    completed_pct: float
    overdue_count: int


class DashboardTaskOut(BaseModel):
    id: str
    title: str
    project_id: str
    project_name: str
    status: str
    priority: str
    due_date: str | None


class DashboardOut(BaseModel):
    total_tasks: int
    completed_pct: float
    overdue_count: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    due_health: dict[str, int]
    projects: list[DashboardProjectOut]
    recent_tasks: list[DashboardTaskOut]
