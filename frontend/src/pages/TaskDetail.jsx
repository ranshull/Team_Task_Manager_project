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
  const { isAdmin } = useAuth();
  const { data: task, isLoading } = useTask(id);
  const { data: project } = useProject(task?.project_id);
  const updateTask = useUpdateTask(task?.project_id);
  const deleteTask = useDeleteTask(task?.project_id);
  const [form, setForm] = useState(null);
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
    }
  }, [task]);

  if (isLoading || !form) return <main className="page">Loading task...</main>;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = isAdmin
      ? { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null }
      : { status: form.status };
    try {
      await updateTask.mutateAsync({ id, payload });
      setNotice("Changes saved. Returning to the project board...");
      setTimeout(() => navigate(`/projects/${task.project_id}`), 800);
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
      <section className="task-editor">
        <div className="task-editor__header">
          <h1>{task.title}</h1>
          {isAdmin && <button className="button danger" onClick={remove}>Delete</button>}
        </div>
        <form className="stack-form" onSubmit={submit}>
          {isAdmin && (
            <>
              <label className="field"><span>Title</span><input value={form.title} onChange={update("title")} required /></label>
              <label className="field"><span>Description</span><textarea rows="5" value={form.description} onChange={update("description")} /></label>
            </>
          )}
          <div className="form-grid">
            <label className="field"><span>Status</span><select value={form.status} onChange={update("status")}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
            {isAdmin && <label className="field"><span>Priority</span><select value={form.priority} onChange={update("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>}
          </div>
          {isAdmin && (
            <label className="field">
              <span>Assign to</span>
              <select value={form.assigned_to} onChange={update("assigned_to")}>
                <option value="">All members</option>
                {project?.members?.map((member) => (
                  <option key={member.id} value={member.id}>{member.username} ({member.email})</option>
                ))}
              </select>
            </label>
          )}
          {isAdmin && <label className="field"><span>Due date</span><input type="date" value={form.due_date} onChange={update("due_date")} /></label>}
          {error && <p className="error">{error}</p>}
          {notice && <p className="notice success">{notice}</p>}
          <button className="button" disabled={updateTask.isPending}>
            {updateTask.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
      <CommentSection taskId={id} />
    </main>
  );
}
