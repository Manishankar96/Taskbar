import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Plus, Pencil, Trash2, X } from "lucide-react";
import { getAssessments, saveAssessments } from "../../utils/db";
import { calculateDaysRemaining, formatDaysRemaining } from "../../utils/calculations";

const TYPES = ["Coding Assessment", "Interview", "Assignment", "Online Test", "Project Submission"];

const emptyForm = {
  title: "",
  type: "Coding Assessment",
  date: "",
  status: "upcoming",
  notes: "",
};

function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        setAssessments(await getAssessments());
      } catch (error) {
        console.error("Failed to load assessments:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setAssessments(updated);
    try {
      await saveAssessments(updated);
    } catch (error) {
      console.error("Failed to save assessments:", error);
    }
  }

  const stats = useMemo(() => {
    const upcoming = assessments.filter((a) => a.status === "upcoming").length;
    const completed = assessments.filter((a) => a.status === "completed").length;
    const missed = assessments.filter((a) => a.status === "missed").length;
    return { total: assessments.length, upcoming, completed, missed };
  }, [assessments]);

  const sorted = [...assessments].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  function openAddForm() {
    setEditingItem(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingItem(item);
    setForm({
      title: item.title,
      type: item.type,
      date: item.date,
      status: item.status,
      notes: item.notes || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) return;

    if (editingItem) {
      persist(
        assessments.map((a) =>
          a.id === editingItem.id ? { ...a, ...form, title: form.title.trim() } : a
        )
      );
    } else {
      persist([...assessments, { id: Date.now(), ...form, title: form.title.trim() }]);
    }
    closeForm();
  }

  function deleteItem(item) {
    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;
    persist(assessments.filter((a) => a.id !== item.id));
  }

  function setStatus(id, status) {
    persist(assessments.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>📝 Assessments</h1>
        <p>Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>📝 Assessments</h1>
          <p>Track interviews, tests, and submissions with real deadlines.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Assessment
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <ClipboardCheck size={25} />
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <span>Upcoming</span>
          <strong>{stats.upcoming}</strong>
        </div>
        <div className="stat-card">
          <span>Completed</span>
          <strong>{stats.completed}</strong>
        </div>
        <div className="stat-card">
          <span>Missed</span>
          <strong>{stats.missed}</strong>
        </div>
      </section>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingItem ? "Edit Assessment" : "Add Assessment"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                placeholder="Example: Backend Round 2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <input
                type="text"
                placeholder="Prep links, contacts, etc."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="save-topic-button">
              {editingItem ? "Save Changes" : "Add Assessment"}
            </button>
          </form>
        </section>
      )}

      <section className="learning-section">
        <div className="topic-header">
          <div>
            <h2>All Assessments</h2>
            <p>Sorted by date.</p>
          </div>
        </div>
        <div className="topic-list">
          {sorted.map((item) => {
            const days = calculateDaysRemaining(item.date);
            return (
              <div className="topic-row" key={item.id}>
                <div className="topic-information">
                  <strong>{item.title}</strong>
                  <span>
                    {item.type} •{" "}
                    {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN")} •{" "}
                    {item.status === "upcoming" ? formatDaysRemaining(days) : item.status}
                  </span>
                </div>
                <div className="topic-actions">
                  <select value={item.status} onChange={(e) => setStatus(item.id, e.target.value)}>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                  <button className="edit-button" onClick={() => openEditForm(item)}>
                    <Pencil size={17} />
                  </button>
                  <button className="delete-button" onClick={() => deleteItem(item)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <p className="empty-topics">No assessments added yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default Assessments;
