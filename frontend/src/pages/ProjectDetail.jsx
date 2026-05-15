import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import { useAddMember, useProject } from "../api/hooks/useProjects.js";
import { useCreateTask, useProjectTasks, useUpdateTask } from "../api/hooks/useTasks.js";
import KanbanBoard from "../components/KanbanBoard.jsx";
import Modal from "../components/Modal.jsx";
import "./ProjectDetail.css";

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(id);
  const updateTask = useUpdateTask(id);
  const createTask = useCreateTask(id);
  const addMember = useAddMember(id);
  const [taskOpen, setTaskOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    status: "todo",
    due_date: ""
  });

  if (projectLoading) return <main className="page">Loading project...</main>;

  const create = async (event) => {
    event.preventDefault();
    const payload = {
      ...taskForm,
      assigned_to: taskForm.assigned_to || null,
      due_date: taskForm.due_date || null
    };
    await createTask.mutateAsync(payload);
    setTaskOpen(false);
    setTaskForm({ title: "", description: "", assigned_to: "", priority: "medium", status: "todo", due_date: "" });
  };

  const add = async (event) => {
    event.preventDefault();
    await addMember.mutateAsync(memberEmail);
    setMemberEmail("");
  };

  return (
    <main className="page project-detail">
      <div className="project-detail__header">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || "No description yet."}</p>
        </div>
        {isAdmin && <button className="button" onClick={() => setTaskOpen(true)}>Add Task</button>}
      </div>
      {isAdmin && (
        <section className="member-panel">
          <div>
            <h2>Manage members</h2>
            <p className="muted">{project.member_ids.length} current members</p>
          </div>
          <form onSubmit={add}>
            <input type="email" placeholder="Member email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} required />
            <button className="button secondary">Add</button>
          </form>
        </section>
      )}
      <section className="member-list">
        <h2>Members</h2>
        <div>
          {project.members?.map((member) => (
            <article key={member.id}>
              <strong>{member.username}</strong>
              <span>{member.email}</span>
              <em>{member.role}</em>
            </article>
          ))}
        </div>
      </section>
      {tasksLoading ? <p>Loading tasks...</p> : (
        <KanbanBoard
          tasks={tasks}
          members={project.members || []}
          onStatusChange={(taskId, status) => updateTask.mutate({ id: taskId, payload: { status } })}
        />
      )}
      <Modal title="Add task" open={taskOpen} onClose={() => setTaskOpen(false)}>
        <form className="stack-form" onSubmit={create}>
          <label className="field"><span>Title</span><input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required /></label>
          <label className="field"><span>Description</span><textarea rows="4" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></label>
          <label className="field">
            <span>Assign to</span>
            <select value={taskForm.assigned_to} onChange={(event) => setTaskForm({ ...taskForm, assigned_to: event.target.value })}>
              <option value="">All members</option>
              {project.members?.map((member) => (
                <option key={member.id} value={member.id}>{member.username} ({member.email})</option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field"><span>Status</span><select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
            <label className="field"><span>Priority</span><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          </div>
          <label className="field"><span>Due date</span><input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} /></label>
          <button className="button">Create task</button>
        </form>
      </Modal>
    </main>
  );
}
