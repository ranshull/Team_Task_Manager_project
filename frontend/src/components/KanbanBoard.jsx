import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard.jsx";
import "./KanbanBoard.css";

const columns = [
  ["todo", "To do"],
  ["in_progress", "In progress"],
  ["done", "Done"]
];

export default function KanbanBoard({ tasks = [], members = [], onStatusChange }) {
  const grouped = Object.fromEntries(columns.map(([key]) => [key, tasks.filter((task) => task.status === key)]));
  const memberById = Object.fromEntries(members.map((member) => [member.id, member]));

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;
    const task = tasks.find((item) => item.id === active.id);
    if (task && task.status !== over.id) {
      onStatusChange(task.id, over.id);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="kanban">
        {columns.map(([status, label]) => (
          <KanbanColumn key={status} id={status} label={label} tasks={grouped[status]} memberById={memberById} />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ id, label, tasks, memberById }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className={`kanban__column ${isOver ? "is-over" : ""}`} ref={setNodeRef}>
      <header>
        <h3>{label}</h3>
        <span>{tasks.length}</span>
      </header>
      <div className="kanban__tasks">
        {tasks.map((task) => <DraggableTask key={task.id} task={task} memberById={memberById} />)}
      </div>
    </section>
  );
}

function DraggableTask({ task, memberById }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "kanban__dragging" : ""}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} assigneeLabel={memberById[task.assigned_to]?.username} />
    </div>
  );
}
