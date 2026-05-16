import { Link } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./ProjectCard.css";

export default function ProjectCard({ project }) {
  const { user } = useAuth();
  const isLeader = project.owner_id === user?.id;
  const leader = project.members?.find((member) => member.id === project.owner_id);

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <h3>{project.name}</h3>
      <p>{project.description || "No description yet."}</p>
      <div className="project-card__footer">
        <span>{project.member_ids.length} members</span>
        {isLeader ? (
          <em className="project-card__role project-card__role--leader">Leader</em>
        ) : (
          <em className="project-card__role project-card__role--member">Leader: {leader?.username || "Unknown"}</em>
        )}
      </div>
    </Link>
  );
}
