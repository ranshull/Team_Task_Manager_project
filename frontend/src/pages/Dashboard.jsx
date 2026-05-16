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
  const [selectedInsight, setSelectedInsight] = useState(null);
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
  const insightTasks = useMemo(() => {
    if (!selectedInsight) return [];
    return scopedTasks.filter((task) => matchesInsight(task, selectedInsight));
  }, [scopedTasks, selectedInsight]);

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
            <select value={projectId} onChange={(event) => {
              setProjectId(event.target.value);
              setSelectedInsight(null);
            }}>
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
        <StatusChart data={dashboard.by_status} selected={selectedInsight} onSelect={setSelectedInsight} />
        <PriorityChart data={dashboard.by_priority} selected={selectedInsight} onSelect={setSelectedInsight} />
        <DueChart data={dashboard.due_health} selected={selectedInsight} onSelect={setSelectedInsight} />
        <ProjectLoad projects={projectSummaries} activeProjectId={projectId} onProjectSelect={(nextProjectId) => {
          setProjectId(nextProjectId);
          setSelectedInsight(null);
        }} />
        <CompletionChart data={dashboard.by_status} selected={selectedInsight} onSelect={setSelectedInsight} />
        <RecentTasks tasks={dashboard.recent_tasks} />
        <InsightPanel insight={selectedInsight} tasks={insightTasks} onClear={() => setSelectedInsight(null)} />
      </section>
    </main>
  );
}

function matchesInsight(task, insight) {
  if (insight.type === "status") return task.status === insight.key;
  if (insight.type === "priority") return task.priority === insight.key;
  if (insight.type === "completion") return insight.key === "done" ? task.status === "done" : task.status !== "done";
  if (insight.type === "due") {
    if (insight.key === "overdue") return isOverdue(task);
    if (insight.key === "unscheduled") return !task.due_date;
    if (insight.key === "due_soon") return isDueSoon(task);
    if (insight.key === "healthy") return task.due_date && !isOverdue(task) && !isDueSoon(task);
  }
  return false;
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

function isDueSoon(task) {
  if (!task.due_date || task.status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${task.due_date}T00:00:00`);
  const daysUntilDue = Math.round((dueDate - today) / 86400000);
  return dueDate >= today && daysUntilDue <= 7;
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

function StatusChart({ data, selected, onSelect }) {
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
            <g
              key={key}
              className={`chart-hit ${selected?.type === "status" && selected.key === key ? "is-selected" : ""}`}
              role="button"
              tabIndex="0"
              onClick={() => onSelect({ type: "status", key, label })}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelect({ type: "status", key, label });
              }}
            >
              <rect x={x} y={222 - height} width="92" height={height} rx="9" fill={color} />
              <text x={x + 46} y="252" textAnchor="middle">{label}</text>
              <text x={x + 46} y={205 - height} textAnchor="middle" fontWeight="800">{value}</text>
              <title>{`${label}: ${value} tasks. Click to inspect.`}</title>
            </g>
          );
        })}
      </svg>
    </article>
  );
}

function PriorityChart({ data, selected, onSelect }) {
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
                className={`chart-hit ${selected?.type === "priority" && selected.key === key ? "is-selected" : ""}`}
                onClick={() => onSelect({ type: "priority", key, label })}
              />
            );
            dashOffset -= length;
            return segment;
          })}
          <text x="60" y="56" textAnchor="middle" fontWeight="900">{rawTotal}</text>
          <text x="60" y="72" textAnchor="middle">tasks</text>
        </svg>
        <ChartLegend
          items={PRIORITY_SEGMENTS.map(([key, label, color]) => [label, data[key], color, key])}
          type="priority"
          selected={selected}
          onSelect={onSelect}
        />
      </div>
    </article>
  );
}

function DueChart({ data, selected, onSelect }) {
  const rawTotal = Object.values(data).reduce((sum, value) => sum + value, 0);
  const total = Math.max(rawTotal, 1);
  return (
    <article className="chart-card chart-card--small">
      <ChartHeader title="Due health" meta="Schedule risk" />
      <div className="due-stack">
        {DUE_SEGMENTS.map(([key, label, color]) => (
          <button
            key={key}
            type="button"
            className={`due-row ${selected?.type === "due" && selected.key === key ? "is-selected" : ""}`}
            onClick={() => onSelect({ type: "due", key, label })}
          >
            <div>
              <span style={{ background: color }} />
              <strong>{label}</strong>
            </div>
            <div className="due-meter">
              <span style={{ width: `${(data[key] / total) * 100}%`, background: color }} />
            </div>
            <em>{data[key]}</em>
          </button>
        ))}
      </div>
    </article>
  );
}

function ProjectLoad({ projects, activeProjectId, onProjectSelect }) {
  const max = Math.max(...projects.map((project) => project.total_tasks), 1);
  return (
    <article className="chart-card chart-card--wide">
      <ChartHeader title="Project workload" meta={`${projects.length} projects`} />
      <div className="project-load">
        {projects.length ? projects.map((project) => (
          <button
            key={project.id}
            type="button"
            className={`project-load__row ${activeProjectId === project.id ? "is-selected" : ""}`}
            onClick={() => onProjectSelect(activeProjectId === project.id ? "" : project.id)}
          >
            <div>
              <strong>{project.name}</strong>
              <span>{project.completed_pct}% complete</span>
            </div>
            <div className="project-load__bar">
              <span style={{ width: `${(project.total_tasks / max) * 100}%` }} />
            </div>
            <em>{project.total_tasks}</em>
          </button>
        )) : <p className="muted">No projects available yet.</p>}
      </div>
    </article>
  );
}

function CompletionChart({ data, selected, onSelect }) {
  const done = data.done || 0;
  const open = (data.todo || 0) + (data.in_progress || 0);
  const total = Math.max(done + open, 1);
  const donePct = Math.round((done / total) * 100);
  const openPct = Math.round((open / total) * 100);

  return (
    <article className="chart-card chart-card--medium completion-card">
      <ChartHeader title="Completion" meta={`${donePct}% done`} />
      <div className="completion-ring">
        <svg viewBox="0 0 120 120" role="img" aria-label="Completion chart">
          <circle cx="60" cy="60" r="40" fill="none" stroke="#E2E8F0" strokeWidth="16" />
          <circle
            className={`chart-hit ${selected?.type === "completion" && selected.key === "done" ? "is-selected" : ""}`}
            cx="60"
            cy="60"
            r="40"
            fill="none"
            stroke="#10B981"
            strokeWidth="16"
            strokeDasharray={`${donePct} ${100 - donePct}`}
            strokeDashoffset="25"
            pathLength="100"
            onClick={() => onSelect({ type: "completion", key: "done", label: "Completed tasks" })}
          />
          <text x="60" y="58" textAnchor="middle" fontWeight="900">{donePct}%</text>
          <text x="60" y="74" textAnchor="middle">done</text>
        </svg>
      </div>
      <div className="completion-actions">
        <button
          type="button"
          className={selected?.type === "completion" && selected.key === "done" ? "is-selected" : ""}
          onClick={() => onSelect({ type: "completion", key: "done", label: "Completed tasks" })}
        >
          <span style={{ background: "#10B981" }} />
          <strong>Done</strong>
          <em>{done}</em>
        </button>
        <button
          type="button"
          className={selected?.type === "completion" && selected.key === "open" ? "is-selected" : ""}
          onClick={() => onSelect({ type: "completion", key: "open", label: "Open tasks" })}
        >
          <span style={{ background: "#4F46E5" }} />
          <strong>Open</strong>
          <em>{open}</em>
        </button>
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

function InsightPanel({ insight, tasks, onClear }) {
  return (
    <article className="chart-card chart-card--medium insight-panel">
      <ChartHeader title="Selected chart details" meta={insight ? `${tasks.length} matching tasks` : "No selection"} />
      {insight ? (
        <>
          <div className="insight-panel__title">
            <strong>{insight.label}</strong>
            <button className="button secondary" onClick={onClear}>Clear</button>
          </div>
          <div className="recent-list">
            {tasks.length ? tasks.slice(0, 5).map((task) => (
              <div key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.project_name} - {task.priority} - {task.status.replace("_", " ")}</span>
              </div>
            )) : <p className="muted">No tasks match this chart segment.</p>}
          </div>
        </>
      ) : (
        <p className="muted">This panel shows task details after you click a chart segment. Choose a status bar, priority item, due row, completion item, or project workload row.</p>
      )}
    </article>
  );
}

function ChartLegend({ items, type, selected, onSelect }) {
  return (
    <div className="chart-legend">
      {items.map(([label, value, color, key]) => (
        <button
          type="button"
          key={label}
          className={selected?.type === type && selected.key === key ? "is-selected" : ""}
          onClick={() => onSelect({ type, key, label })}
        >
          <span style={{ background: color }} />
          <strong>{label}</strong>
          <em>{value}</em>
        </button>
      ))}
    </div>
  );
}
