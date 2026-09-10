import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { getQuickTasks, saveQuickTasks } from "../utils/db";
import { getTodayLocalDateKey, calculateDaysRemaining, getLocalDateKey } from "../utils/calculations";

const emptyForm = {
  task: "",
  dueDate: "",
  priority: "Medium",
  status: "pending",
};

function QuickTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        setTasks(await getQuickTasks());
      } catch (error) {
        console.error("Failed to load quick tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setTasks(updated);
    try {
      await saveQuickTasks(updated);
    } catch (error) {
      console.error("Failed to save quick tasks:", error);
    }
  }

  const today = getTodayLocalDateKey();

  const grouped = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "completed");
    const todays = pending.filter((t) => t.dueDate === today);
    const overdue = pending.filter((t) => t.dueDate && t.dueDate < today);
    const upcoming = pending.filter((t) => !t.dueDate || t.dueDate > today);
    const completed = tasks.filter((t) => t.status === "completed");
    return { todays, overdue, upcoming, completed };
  }, [tasks, today]);

  function openAddForm() {
    setEditingTask(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(task) {
    setEditingTask(task);
    setForm({
      task: task.task,
      dueDate: task.dueDate || "",
      priority: task.priority,
      status: task.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.task.trim()) return;

    if (editingTask) {
      persist(
        tasks.map((t) => (t.id === editingTask.id ? { ...t, ...form, task: form.task.trim() } : t))
      );
    } else {
      persist([...tasks, { id: Date.now(), ...form, task: form.task.trim() }]);
    }
    closeForm();
  }

  function deleteTask(task) {
    const confirmed = window.confirm(`Delete "${task.task}"?`);
    if (!confirmed) return;
    persist(tasks.filter((t) => t.id !== task.id));
  }

  function toggleComplete(task) {
    persist(
      tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: t.status === "completed" ? "pending" : "completed",
              completedAt: t.status === "completed" ? undefined : getLocalDateKey(),
            }
          : t
      )
    );
  }

  function TaskRow({ task }) {
    const days = task.dueDate ? calculateDaysRemaining(task.dueDate) : null;
    return (
      <div className={`topic-row priority-${task.priority.toLowerCase()}`}>
        <div className="topic-information">
          <label className="task-checkbox-label">
            <input
              type="checkbox"
              checked={task.status === "completed"}
              onChange={() => toggleComplete(task)}
            />
            <strong className={task.status === "completed" ? "strike" : ""}>{task.task}</strong>
          </label>
          <span>
            <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            {task.dueDate &&
              ` • Due ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("en-IN")}`}
            {days !== null && task.status !== "completed" && days < 0 && " • Overdue"}
          </span>
        </div>
        <div className="topic-actions">
          <button className="edit-button" onClick={() => toggleComplete(task)} title="Toggle complete">
            <Check size={17} />
          </button>
          <button className="edit-button" onClick={() => openEditForm(task)} title="Edit task">
            <Pencil size={17} />
          </button>
          <button className="delete-button" onClick={() => deleteTask(task)} title="Delete task">
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>⚡ Quick Tasks</h1>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>⚡ Quick Tasks</h1>
          <p>Small, fast to-dos that don't deserve their own project.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Task
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <CheckSquare size={25} />
          <span>Today</span>
          <strong>{grouped.todays.length}</strong>
        </div>
        <div className="stat-card">
          <span>Overdue</span>
          <strong>{grouped.overdue.length}</strong>
        </div>
        <div className="stat-card">
          <span>Upcoming</span>
          <strong>{grouped.upcoming.length}</strong>
        </div>
        <div className="stat-card">
          <span>Completed</span>
          <strong>{grouped.completed.length}</strong>
        </div>
      </section>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingTask ? "Edit Task" : "Add Task"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Task</label>
              <input
                type="text"
                placeholder="Example: Update resume"
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button type="submit" className="save-topic-button">
              {editingTask ? "Save Changes" : "Add Task"}
            </button>
          </form>
        </section>
      )}

      <section className="learning-section">
        <div className="topic-header">
          <h2>Today & Overdue</h2>
        </div>
        <div className="topic-list">
          {[...grouped.overdue, ...grouped.todays].map((task) => (
            <TaskRow task={task} key={task.id} />
          ))}
          {grouped.overdue.length === 0 && grouped.todays.length === 0 && (
            <p className="empty-topics">Nothing due today. Nice.</p>
          )}
        </div>
      </section>

      <section className="learning-section" style={{ marginTop: 20 }}>
        <div className="topic-header">
          <h2>Upcoming</h2>
        </div>
        <div className="topic-list">
          {grouped.upcoming.map((task) => (
            <TaskRow task={task} key={task.id} />
          ))}
          {grouped.upcoming.length === 0 && <p className="empty-topics">No upcoming tasks.</p>}
        </div>
      </section>

      <section className="learning-section" style={{ marginTop: 20 }}>
        <div className="topic-header">
          <h2>Completed</h2>
        </div>
        <div className="topic-list">
          {grouped.completed.map((task) => (
            <TaskRow task={task} key={task.id} />
          ))}
          {grouped.completed.length === 0 && <p className="empty-topics">No completed tasks yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default QuickTasks;
