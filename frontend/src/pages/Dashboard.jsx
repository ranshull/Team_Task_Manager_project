import { useMemo, useState } from "react";
import { useProjects } from "../api/hooks/useProjects.js";
import { useProjectTaskQueries } from "../api/hooks/useTasks.js";
import "./Dashboard.css";

const STATUS_BARS = [
  ["todo", "To do", "#4F46E5"],
  ["in_progress", "In progress", "#F59E0B"],
  ["done", "Done", "#10B981"]
];

const PRIORITY_SEGMENTS = [
  ["high", "High", "#EF4444"],
  ["medium", "Medium", "#F59E0B"],
  ["low", "Low", "#10B981"]
];

const DUE_SEGMENTS = [
  ["overdue", "Overdue", "#EF4444"],
  ["due_soon", "Due soon", "#F59E0B"],
  ["healthy", "Healthy", "#10B981"],
  ["unscheduled", "Unscheduled", "#94A3B8"]
];

export default function Dashboard() {
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const { data: projectOptions = [], isLoading: projectsLoading } = useProjects();
  const taskQueries = useProjectTaskQueries(projectOptions);

  const selectedProject = projectOptions.find((project) => project.id === projectId);
  const taskQueriesLoading = taskQueries.some((query) => query.isLoading);
  const tasksByProject = useMemo(() => {
    return projectOptions.map((project, index) => ({
      project,
      tasks: taskQueries[index]?.data || []
    }));
  }, [projectOptions, taskQueries]);
  const projectSummaries = useMemo(() => buildProjectSummaries(tasksByProject), [tasksByProject]);
  const scopedTasks = useMemo(() => {
    const source = projectId
      ? tasksByProject.filter((entry) => entry.project.id === projectId)
      : tasksByProject;
    return source.flatMap(({ project, tasks }) => tasks.map((task) => ({ ...task, project_name: project.name })));
  }, [projectId, tasksByProject]);
  const dashboard = useMemo(
    () => buildDashboard(scopedTasks, selectedProject?.name || "All projects"),
    [scopedTasks, selectedProject]
  );

  const projects = projectOptions;
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projectSearch, projects]);

  const activeProjectName = projectId
    ? projects.find((project) => project.id === projectId)?.name || "Selected project"
    : "All projects";

  if (projectsLoading || taskQueriesLoading) {
    return <main className="page">Loading dashboard...</main>;
  }

  return (
    <main className="page dashboard">
      <div className="dashboard__hero">
        <div>
          <p className="dashboard__eyebrow">Analytics overview</p>
          <h1>Dashboard</h1>
          <p className="muted">Filtered progress, delivery health, and workload across accessible projects.</p>
        </div>
        <div className="dashboard-filter">
          <label className="field">
            <span>Search projects</span>
            <input
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder="Search by project name"
            />
          </label>
          <label className="field">
            <span>Project filter</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">All projects</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="stats">
        <Stat label="Scope" value={activeProjectName} compact />
        <Stat label="Total tasks" value={dashboard.total_tasks} />
        <Stat label="Completed" value={`${dashboard.completed_pct}%`} />
        <Stat label="Overdue" value={dashboard.overdue_count} tone={dashboard.overdue_count ? "danger" : "success"} />
      </section>

      <section className="dashboard-grid">
        <StatusChart data={dashboard.by_status} />
        <PriorityChart data={dashboard.by_priority} />
        <DueChart data={dashboard.due_health} />
        <ProjectLoad projects={projectSummaries} />
        <RecentTasks tasks={dashboard.recent_tasks} />
      </section>
    </main>
  );
}

function buildDashboard(tasks) {
  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  const byPriority = { low: 0, medium: 0, high: 0 };
  const dueHealth = { overdue: 0, due_soon: 0, healthy: 0, unscheduled: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tasks.forEach((task) => {
    byStatus[task.status] += 1;
    byPriority[task.priority] += 1;
    if (!task.due_date) {
      dueHealth.unscheduled += 1;
      return;
    }
    const dueDate = new Date(`${task.due_date}T00:00:00`);
    const daysUntilDue = Math.round((dueDate - today) / 86400000);
    if (dueDate < today && task.status !== "done") {
      dueHealth.overdue += 1;
    } else if (daysUntilDue <= 7 && task.status !== "done") {
      dueHealth.due_soon += 1;
    } else {
      dueHealth.healthy += 1;
    }
  });

  const total = tasks.length;
  const completedPct = total ? Math.round((byStatus.done / total) * 1000) / 10 : 0;
  return {
    total_tasks: total,
    completed_pct: completedPct,
    overdue_count: dueHealth.overdue,
    by_status: byStatus,
    by_priority: byPriority,
    due_health: dueHealth,
    recent_tasks: [...tasks].sort(sortByUpdatedAt).slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      project_name: task.project_name,
      status: task.status,
      priority: task.priority
    }))
  };
}

function buildProjectSummaries(tasksByProject) {
  return tasksByProject.map(({ project, tasks }) => {
    const done = tasks.filter((task) => task.status === "done").length;
    const overdue = tasks.filter((task) => isOverdue(task)).length;
    return {
      id: project.id,
      name: project.name,
      total_tasks: tasks.length,
      completed_pct: tasks.length ? Math.round((done / tasks.length) * 1000) / 10 : 0,
      overdue_count: overdue
    };
  });
}

function isOverdue(task) {
  if (!task.due_date || task.status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.due_date}T00:00:00`) < today;
}

function sortByUpdatedAt(a, b) {
  return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
}

function Stat({ label, value, tone = "", compact = false }) {
  return (
    <article className={`stat ${tone ? `stat--${tone}` : ""} ${compact ? "stat--compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusChart({ data }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <article className="chart-card chart-card--wide">
      <ChartHeader title="Tasks by status" meta="Live workload split" />
      <svg viewBox="0 0 680 280" role="img" aria-label="Tasks by status bar chart">
        {STATUS_BARS.map(([key, label, color], index) => {
          const value = data[key];
          const height = (value / max) * 178;
          const x = 102 + index * 176;
          return (
            <g key={key}>
              <rect x={x} y={222 - height} width="92" height={height} rx="9" fill={color} />
              <text x={x + 46} y="252" textAnchor="middle">{label}</text>
              <text x={x + 46} y={205 - height} textAnchor="middle" fontWeight="800">{value}</text>
            </g>
          );
        })}
      </svg>
    </article>
  );
}

function PriorityChart({ data }) {
  const rawTotal = Object.values(data).reduce((sum, value) => sum + value, 0);
  const total = Math.max(rawTotal, 1);
  let dashOffset = 25;
  return (
    <article className="chart-card chart-card--medium">
      <ChartHeader title="Priority mix" meta={`${rawTotal} tasks`} />
      <div className="donut-layout">
        <svg viewBox="0 0 120 120" role="img" aria-label="Priority donut chart">
          <circle cx="60" cy="60" r="38" fill="none" stroke="#E2E8F0" strokeWidth="16" />
          {PRIORITY_SEGMENTS.map(([key, label, color]) => {
            const length = (data[key] / total) * 100;
            const segment = (
              <circle
                key={key}
                cx="60"
                cy="60"
                r="38"
                fill="none"
                stroke={color}
                strokeWidth="16"
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={dashOffset}
                pathLength="100"
              />
            );
            dashOffset -= length;
            return segment;
          })}
          <text x="60" y="56" textAnchor="middle" fontWeight="900">{rawTotal}</text>
          <text x="60" y="72" textAnchor="middle">tasks</text>
        </svg>
        <ChartLegend items={PRIORITY_SEGMENTS.map(([key, label, color]) => [label, data[key], color])} />
      </div>
    </article>
  );
}

function DueChart({ data }) {
  const rawTotal = Object.values(data).reduce((sum, value) => sum + value, 0);
  const total = Math.max(rawTotal, 1);
  return (
    <article className="chart-card chart-card--small">
      <ChartHeader title="Due health" meta="Schedule risk" />
      <div className="due-stack">
        {DUE_SEGMENTS.map(([key, label, color]) => (
          <div key={key} className="due-row">
            <div>
              <span style={{ background: color }} />
              <strong>{label}</strong>
            </div>
            <div className="due-meter">
              <span style={{ width: `${(data[key] / total) * 100}%`, background: color }} />
            </div>
            <em>{data[key]}</em>
          </div>
        ))}
      </div>
    </article>
  );
}

function ProjectLoad({ projects }) {
  const max = Math.max(...projects.map((project) => project.total_tasks), 1);
  return (
    <article className="chart-card chart-card--wide">
      <ChartHeader title="Project workload" meta={`${projects.length} projects`} />
      <div className="project-load">
        {projects.length ? projects.map((project) => (
          <div key={project.id} className="project-load__row">
            <div>
              <strong>{project.name}</strong>
              <span>{project.completed_pct}% complete</span>
            </div>
            <div className="project-load__bar">
              <span style={{ width: `${(project.total_tasks / max) * 100}%` }} />
            </div>
            <em>{project.total_tasks}</em>
          </div>
        )) : <p className="muted">No projects available yet.</p>}
      </div>
    </article>
  );
}

function RecentTasks({ tasks }) {
  return (
    <article className="chart-card chart-card--medium">
      <ChartHeader title="Recent movement" meta="Latest updates" />
      <div className="recent-list">
        {tasks.length ? tasks.map((task) => (
          <div key={task.id}>
            <strong>{task.title}</strong>
            <span>{task.project_name} - {task.priority} - {task.status.replace("_", " ")}</span>
          </div>
        )) : <p className="muted">No task activity yet.</p>}
      </div>
    </article>
  );
}

function ChartHeader({ title, meta }) {
  return (
    <header className="chart-card__header">
      <h2>{title}</h2>
      <span>{meta}</span>
    </header>
  );
}

function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map(([label, value, color]) => (
        <div key={label}>
          <span style={{ background: color }} />
          <strong>{label}</strong>
          <em>{value}</em>
        </div>
      ))}
    </div>
  );
}
