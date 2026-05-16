import { Link } from "react-router-dom";
import "./TaskCard.css";

export default function TaskCard({ task, assigneeLabel }) {
  return (
    <Link to={`/tasks/${task.id}`} className={`task-card priority-${task.priority}`}>
      <div className="task-card__top">
        <h4>{task.title}</h4>
        <span>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
      <small>Assigned to {assigneeLabel || "unassigned"}</small>
      {task.due_date && <small>Due {task.due_date}</small>}
    </Link>
  );
}
