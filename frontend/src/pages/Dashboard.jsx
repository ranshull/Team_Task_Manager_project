import { useDashboard } from "../api/hooks/useDashboard.js";
import "./Dashboard.css";

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading) return <main className="page">Loading dashboard...</main>;
  const max = Math.max(...Object.values(data.by_status), 1);
  const bars = [
    ["todo", "To do", "#4F46E5"],
    ["in_progress", "In progress", "#F59E0B"],
    ["done", "Done", "#10B981"]
  ];

  return (
    <main className="page dashboard">
      <div className="page-heading">
        <h1>Dashboard</h1>
        <p className="muted">Team progress across projects you can access.</p>
      </div>
      <section className="stats">
        <Stat label="Total tasks" value={data.total_tasks} />
        <Stat label="Completed" value={`${data.completed_pct}%`} />
        <Stat label="Overdue" value={data.overdue_count} />
      </section>
      <section className="dashboard-chart">
        <h2>Tasks by status</h2>
        <svg viewBox="0 0 640 260" role="img" aria-label="Tasks by status bar chart">
          {bars.map(([key, label, color], index) => {
            const value = data.by_status[key];
            const height = (value / max) * 170;
            const x = 90 + index * 170;
            return (
              <g key={key}>
                <rect x={x} y={210 - height} width="84" height={height} rx="8" fill={color} />
                <text x={x + 42} y="236" textAnchor="middle">{label}</text>
                <text x={x + 42} y={198 - height} textAnchor="middle" fontWeight="700">{value}</text>
              </g>
            );
          })}
        </svg>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
