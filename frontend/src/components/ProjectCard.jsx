import { Link } from "react-router-dom";
import "./ProjectCard.css";

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <h3>{project.name}</h3>
      <p>{project.description || "No description yet."}</p>
      <span>{project.member_ids.length} members</span>
    </Link>
  );
}
