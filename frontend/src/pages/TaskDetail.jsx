import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import { useProject } from "../api/hooks/useProjects.js";
import { useDeleteTask, useTask, useUpdateTask } from "../api/hooks/useTasks.js";
import CommentSection from "../components/CommentSection.jsx";
import "./TaskDetail.css";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: task, isLoading } = useTask(id);
  const { data: project } = useProject(task?.project_id);
  const updateTask = useUpdateTask(task?.project_id);
  const deleteTask = useDeleteTask(task?.project_id);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("todo");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || ""
      });
      setStatus(task.status);
    }
  }, [task]);

  if (isLoading || !form) {
    return (
      <main className="page loading-state">
        <span className="spinner" />
        Loading task...
      </main>
    );
  }

  const assignee = project?.members?.find((member) => member.id === task.assigned_to);
  const canManageTask = isAdmin || project?.owner_id === user?.id;
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const saveStatus = async (nextStatus) => {
    setStatus(nextStatus);
    setError("");
    setNotice("");
    try {
      await updateTask.mutateAsync({ id, payload: { status: nextStatus } });
      setNotice("Progress updated.");
    } catch (err) {
      setStatus(task.status);
      setError(err.response?.data?.detail || "Unable to update progress");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
    try {
      await updateTask.mutateAsync({ id, payload });
      setEditing(false);
      setNotice("Task details saved.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update task");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this task and its comments?")) return;
    await deleteTask.mutateAsync(id);
    navigate(`/projects/${task.project_id}`);
  };

  return (
    <main className="page task-detail">
      <section className="task-summary">
        <div className="task-summary__header">
          <div>
            <p className="task-summary__eyebrow">Task detail</p>
            <h1>{task.title}</h1>
            <p className="muted">{project?.name || "Project"}</p>
          </div>
          <div className="task-summary__actions">
            {canManageTask && <button className="button secondary" onClick={() => setEditing((current) => !current)}>{editing ? "Close edit" : "Edit task"}</button>}
            {canManageTask && <button className="button danger" onClick={remove} disabled={deleteTask.isPending}>{deleteTask.isPending ? "Deleting..." : "Delete"}</button>}
          </div>
        </div>

        <div className="task-summary__grid">
          <SummaryItem label="Progress">
            <select value={status} onChange={(event) => saveStatus(event.target.value)} disabled={updateTask.isPending}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </SummaryItem>
          <SummaryItem label="Priority" value={task.priority} />
          <SummaryItem label="Assignee" value={assignee ? `${assignee.username} (${assignee.email})` : "Unassigned legacy task"} />
          <SummaryItem label="Due date" value={task.due_date || "No due date"} />
        </div>

        <article className="task-summary__description">
          <span>Description</span>
          <p>{task.description || "No description added yet."}</p>
        </article>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice success">{notice}</p>}
      </section>

      {canManageTask && editing && (
        <section className="task-editor">
          <div className="task-editor__header">
            <h2>Edit task</h2>
          </div>
          <form className="stack-form" onSubmit={submit}>
            <label className="field"><span>Title</span><input value={form.title} onChange={update("title")} required /></label>
            <label className="field"><span>Description</span><textarea rows="5" value={form.description} onChange={update("description")} /></label>
            <div className="form-grid">
              <label className="field"><span>Status</span><select value={form.status} onChange={update("status")}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
              <label className="field"><span>Priority</span><select value={form.priority} onChange={update("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </div>
            <label className="field">
              <span>Assign to</span>
              <select value={form.assigned_to} onChange={update("assigned_to")}>
                {task.assigned_to ? null : <option value="">Unassigned legacy task</option>}
                {project?.members?.map((member) => (
                  <option key={member.id} value={member.id}>{member.username} ({member.email})</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Due date</span><input type="date" value={form.due_date} onChange={update("due_date")} /></label>
            <button className="button button--loading" disabled={updateTask.isPending}>
              {updateTask.isPending && <span className="spinner" />}
              {updateTask.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>
      )}

      <CommentSection taskId={id} />
    </main>
  );
}

function SummaryItem({ label, value, children }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      {children || <strong>{value}</strong>}
    </div>
  );
}
