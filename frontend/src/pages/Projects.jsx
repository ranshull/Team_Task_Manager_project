import { useState } from "react";
import { useAuth } from "../api/hooks/useAuth.js";
import { useCreateProject, useProjects } from "../api/hooks/useProjects.js";
import Modal from "../components/Modal.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import "./Projects.css";

export default function Projects() {
  const { isAdmin } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const submit = async (event) => {
    event.preventDefault();
    await createProject.mutateAsync(form);
    setForm({ name: "", description: "" });
    setOpen(false);
  };

  return (
    <main className="page projects-page">
      <div className="projects-page__header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Open workspaces and task boards.</p>
        </div>
        {isAdmin && <button className="button" onClick={() => setOpen(true)}>New Project</button>}
      </div>
      {isLoading ? <p>Loading projects...</p> : (
        <section className="projects-grid">
          {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </section>
      )}
      <Modal title="New project" open={open} onClose={() => setOpen(false)}>
        <form className="stack-form" onSubmit={submit}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" /></label>
          <button className="button">Create</button>
        </form>
      </Modal>
    </main>
  );
}
