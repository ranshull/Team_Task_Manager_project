import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import { useAddMember, useDeleteProject, useProject, useRemoveMember, useUpdateProject } from "../api/hooks/useProjects.js";
import { useCreateTask, useProjectTasks, useUpdateTask } from "../api/hooks/useTasks.js";
import { useUserSearch } from "../api/hooks/useUsers.js";
import KanbanBoard from "../components/KanbanBoard.jsx";
import Modal from "../components/Modal.jsx";
import "./ProjectDetail.css";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(id);
  const updateTask = useUpdateTask(id);
  const createTask = useCreateTask(id);
  const addMember = useAddMember(id);
  const removeMember = useRemoveMember(id);
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [taskAssigneeQuery, setTaskAssigneeQuery] = useState("");
  const [taskAssigneeOpen, setTaskAssigneeOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignmentMode: "all",
    assigned_to_ids: [],
    priority: "medium",
    status: "todo",
    due_date: ""
  });

  const canManageProject = Boolean(project && (isAdmin || project.owner_id === user?.id));
  const memberSearch = useUserSearch(memberEmail, canManageProject && memberSearchOpen);
  if (projectLoading) return <main className="page loading-state"><span className="spinner" />Loading project...</main>;

  const memberIds = new Set((project.member_ids || []).map(String));
  const memberSuggestions = (memberSearch.data || []).filter((member) => !memberIds.has(String(member.id)));
  const assignableMembers = (project.members || []).filter((member) => member.id !== project.owner_id);
  const selectedAssignees = assignableMembers.filter((member) => taskForm.assigned_to_ids.includes(member.id));
  const filteredAssignableMembers = assignableMembers.filter((member) => {
    const query = taskAssigneeQuery.trim().toLowerCase();
    if (!query) return true;
    return member.username.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
  });

  const openProjectEditor = () => {
    setProjectForm({ name: project.name, description: project.description || "" });
    setProjectOpen(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      await updateProject.mutateAsync(projectForm);
      setProjectOpen(false);
      setNotice("Project details saved.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save project details");
    }
  };

  const removeProject = async () => {
    if (!window.confirm("Delete this project, its tasks, and all task comments?")) return;
    setNotice("");
    setError("");
    try {
      await deleteProject.mutateAsync(project.id);
      navigate("/projects");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete project");
    }
  };

  const create = async (event) => {
    event.preventDefault();
    const isForAllMembers = taskForm.assignmentMode === "all";
    const selectedIds = taskForm.assignmentMode === "selected" ? taskForm.assigned_to_ids : [];
    if (taskForm.assignmentMode === "selected" && selectedIds.length === 0) {
      setError("Select at least one member for this task.");
      return;
    }
    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: selectedIds.length === 1 ? selectedIds[0] : null,
      assigned_to_ids: selectedIds.length > 1 ? selectedIds : null,
      status: taskForm.status,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null
    };
    setNotice("");
    setError("");
    try {
      const task = await createTask.mutateAsync(payload);
      const assignedCount = isForAllMembers ? assignableMembers.length : selectedIds.length;
      setNotice(
        assignedCount > 1
          ? `Task created for ${assignedCount} members. Each member now has their own progress.`
          : "Task created. Opening task details..."
      );
      setTaskOpen(false);
      setTaskAssigneeQuery("");
      setTaskAssigneeOpen(false);
      setTaskForm({ title: "", description: "", assignmentMode: "all", assigned_to_ids: [], priority: "medium", status: "todo", due_date: "" });
      if (assignedCount === 1) {
        setTimeout(() => navigate(`/tasks/${task.id}`), 700);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create task");
    }
  };

  const toggleTaskAssignee = (memberId) => {
    setTaskForm((current) => {
      const selected = current.assigned_to_ids.includes(memberId)
        ? current.assigned_to_ids.filter((id) => id !== memberId)
        : [...current.assigned_to_ids, memberId];
      return { ...current, assignmentMode: "selected", assigned_to_ids: selected };
    });
  };

  const clearTaskAssignee = (memberId) => {
    setTaskForm((current) => ({
      ...current,
      assigned_to_ids: current.assigned_to_ids.filter((id) => id !== memberId)
    }));
  };

  const add = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      await addMember.mutateAsync(memberEmail);
      setNotice("Member added successfully.");
      setMemberEmail("");
      setMemberSearchOpen(false);
    } catch (err) {
      setError(err.response?.status === 404 ? "User doesn't exist." : err.response?.data?.detail || "Unable to add member");
    }
  };

  const chooseMemberSuggestion = (member) => {
    setMemberEmail(member.email);
    setMemberSearchOpen(false);
    setError("");
  };

  const removeSelectedMember = async () => {
    if (!selectedMember) return;
    if (!window.confirm(`Remove ${selectedMember.username} from this project?`)) return;
    setNotice("");
    setError("");
    try {
      await removeMember.mutateAsync(selectedMember.id);
      setNotice(`${selectedMember.username} was removed from the project.`);
      setSelectedMember(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to remove member");
    }
  };

  const updateStatus = (taskId, status) => {
    updateTask.mutate(
      { id: taskId, payload: { status } },
      { onSuccess: () => setNotice("Task status saved.") }
    );
  };

  return (
    <main className="page project-detail">
      <div className="project-detail__header">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || "No description yet."}</p>
        </div>
        {canManageProject && (
          <div className="project-detail__actions">
            <button className="button secondary" onClick={openProjectEditor}>Edit project</button>
            <button className="button danger button--loading" onClick={removeProject} disabled={deleteProject.isPending}>
              {deleteProject.isPending && <span className="spinner" />}
              {deleteProject.isPending ? "Deleting..." : "Delete project"}
            </button>
            <button className="button" onClick={() => setTaskOpen(true)}>Add Task</button>
          </div>
        )}
      </div>
      {notice && <p className="notice success">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {canManageProject && (
        <section className="member-panel">
          <div>
            <h2>Manage members</h2>
            <p className="muted">{project.member_ids.length} current members</p>
          </div>
          <form onSubmit={add}>
            <div className="member-search">
              <div className="member-search__bar">
                <input
                  type="email"
                  placeholder="Search by name or email"
                  value={memberEmail}
                  onChange={(event) => {
                    setMemberEmail(event.target.value);
                    setMemberSearchOpen(true);
                  }}
                  onFocus={() => setMemberSearchOpen(true)}
                  required
                />
                <button className="button secondary button--loading" disabled={addMember.isPending}>
                  {addMember.isPending && <span className="spinner" />}
                  {addMember.isPending ? "Adding..." : "Add"}
                </button>
              </div>
              {memberSearchOpen && memberEmail.trim() && (
                <div className="member-search__menu">
                  {memberSearch.isLoading && <span>Searching...</span>}
                  {!memberSearch.isLoading && memberSuggestions.map((member) => (
                    <button key={member.id} type="button" onMouseDown={() => chooseMemberSuggestion(member)}>
                      <strong>{member.username}</strong>
                      <span>{member.email}</span>
                    </button>
                  ))}
                  {!memberSearch.isLoading && memberSuggestions.length === 0 && (
                    <span>No matching users found.</span>
                  )}
                </div>
              )}
            </div>
          </form>
        </section>
      )}
      <section className="member-list">
        <h2>Members</h2>
        <div>
          {project.members?.map((member) => (
            <button key={member.id} type="button" className="member-card" onClick={() => setSelectedMember(member)}>
              <strong>{member.username}</strong>
              <span>{member.email}</span>
              <em>{member.id === project.owner_id ? "leader" : member.role}</em>
            </button>
          ))}
        </div>
      </section>
      {tasksLoading ? <p className="loading-state"><span className="spinner" />Loading tasks...</p> : (
        <KanbanBoard
          tasks={tasks}
          members={project.members || []}
          onStatusChange={updateStatus}
        />
      )}
      <Modal title="Add task" open={canManageProject && taskOpen} onClose={() => setTaskOpen(false)}>
        <form className="stack-form" onSubmit={create}>
          <label className="field"><span>Title</span><input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required /></label>
          <label className="field"><span>Description</span><textarea rows="4" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></label>
          <label className="field">
            <span>Assign to</span>
            <div className="task-assignee">
              <label className="task-assignee__mode">
                <input
                  type="radio"
                  checked={taskForm.assignmentMode === "all"}
                  onChange={() => setTaskForm((current) => ({ ...current, assignmentMode: "all", assigned_to_ids: [] }))}
                />
                <span>All members, excluding project leader</span>
              </label>
              <label className="task-assignee__mode">
                <input
                  type="radio"
                  checked={taskForm.assignmentMode === "selected"}
                  onChange={() => setTaskForm((current) => ({ ...current, assignmentMode: "selected" }))}
                />
                <span>Choose specific members</span>
              </label>
              {taskForm.assignmentMode === "selected" && (
                <div className="task-assignee__picker">
                  <button
                    type="button"
                    className="task-assignee__trigger"
                    onClick={() => setTaskAssigneeOpen((current) => !current)}
                  >
                    <span>{selectedAssignees.length ? `${selectedAssignees.length} selected` : "Select members"}</span>
                    <strong>{taskAssigneeOpen ? "Close" : "Open"}</strong>
                  </button>
                  {selectedAssignees.length > 0 && (
                    <div className="task-assignee__chips">
                      {selectedAssignees.map((member) => (
                        <button key={member.id} type="button" onClick={() => clearTaskAssignee(member.id)}>
                          {member.username}
                          <span>Remove</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {taskAssigneeOpen && (
                    <div className="task-assignee__dropdown">
                      <input
                        value={taskAssigneeQuery}
                        onChange={(event) => setTaskAssigneeQuery(event.target.value)}
                        placeholder="Search project members"
                      />
                      <div className="task-assignee__options">
                        {filteredAssignableMembers.map((member) => {
                          const checked = taskForm.assigned_to_ids.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              className={checked ? "is-selected" : ""}
                              onClick={() => toggleTaskAssignee(member.id)}
                            >
                              <span className="task-assignee__check">{checked ? "on" : ""}</span>
                              <span>
                                <strong>{member.username}</strong>
                                <small>{member.email}</small>
                              </span>
                            </button>
                          );
                        })}
                        {filteredAssignableMembers.length === 0 && <p className="muted">No project members match this search.</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </label>
          <div className="form-grid">
            <label className="field"><span>Status</span><select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
            <label className="field"><span>Priority</span><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          </div>
          <label className="field"><span>Due date</span><input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} /></label>
          <button className="button button--loading" disabled={createTask.isPending}>
            {createTask.isPending && <span className="spinner" />}
            {createTask.isPending ? "Creating..." : "Create task"}
          </button>
        </form>
      </Modal>
      <Modal title="Edit project" open={canManageProject && projectOpen} onClose={() => setProjectOpen(false)}>
        <form className="stack-form" onSubmit={saveProject}>
          <label className="field">
            <span>Name</span>
            <input
              value={projectForm.name}
              onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows="4"
              value={projectForm.description}
              onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <button className="button button--loading" disabled={updateProject.isPending}>
            {updateProject.isPending && <span className="spinner" />}
            {updateProject.isPending ? "Saving..." : "Save project"}
          </button>
        </form>
      </Modal>
      <Modal title="Member profile" open={Boolean(selectedMember)} onClose={() => setSelectedMember(null)}>
        {selectedMember && (
          <section className="member-profile">
            <div className="member-profile__avatar">{initials(selectedMember.username)}</div>
            <div>
              <h3>{selectedMember.username}</h3>
              <p>{selectedMember.email}</p>
            </div>
            <ProfileRow label="Phone" value={selectedMember.phone || "Not added"} />
            <ProfileRow label="Project access" value={selectedMember.id === project.owner_id ? "Project leader" : "Project member"} />
            <ProfileRow label="System role" value={selectedMember.role} />
            {canManageProject && selectedMember.id !== project.owner_id && (
              <button className="button danger button--loading" onClick={removeSelectedMember} disabled={removeMember.isPending}>
                {removeMember.isPending && <span className="spinner" />}
                {removeMember.isPending ? "Removing..." : "Remove from project"}
              </button>
            )}
          </section>
        )}
      </Modal>
    </main>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="member-profile__row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function initials(name = "") {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}
