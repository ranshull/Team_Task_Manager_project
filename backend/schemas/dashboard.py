from pydantic import BaseModel


class DashboardOut(BaseModel):
    total_tasks: int
    completed_pct: float
    overdue_count: int
    by_status: dict[str, int]
