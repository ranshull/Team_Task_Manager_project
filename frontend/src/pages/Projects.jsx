import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject, useProjects } from "../api/hooks/useProjects.js";
import Modal from "../components/Modal.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import "./Projects.css";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const project = await createProject.mutateAsync(form);
    setNotice("Project created. Opening the workspace...");
    setForm({ name: "", description: "" });
    setOpen(false);
    setTimeout(() => navigate(`/projects/${project.id}`), 700);
  };

  return (
    <main className="page projects-page">
      <div className="projects-page__header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Open workspaces and task boards.</p>
        </div>
        <button className="button" onClick={() => setOpen(true)}>New Project</button>
      </div>
      {notice && <p className="notice success">{notice}</p>}
      {isLoading ? <p className="loading-state"><span className="spinner" />Loading projects...</p> : (
        <section className="projects-grid">
          {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </section>
      )}
      <Modal title="New project" open={open} onClose={() => setOpen(false)}>
        <form className="stack-form" onSubmit={submit}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" /></label>
          <button className="button button--loading" disabled={createProject.isPending}>
            {createProject.isPending && <span className="spinner" />}
            {createProject.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>
    </main>
  );
}
