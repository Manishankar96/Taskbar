import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getTimetable, saveTimetable } from "../utils/db";

const CATEGORIES = ["Learning", "Coding", "Reading", "Exercise", "Personal", "Other"];

const emptyForm = {
  day: "",
  startTime: "",
  endTime: "",
  activity: "",
  category: "Learning",
  status: "planned",
};

function Timetable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dayFilter, setDayFilter] = useState("all");

  // LOAD
  useEffect(() => {
    async function load() {
      try {
        const saved = await getTimetable();
        setEntries(saved);
      } catch (error) {
        console.error("Failed to load timetable:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setEntries(updated);
    try {
      await saveTimetable(updated);
    } catch (error) {
      console.error("Failed to save timetable:", error);
    }
  }

  const days = useMemo(() => {
    const set = new Set(entries.map((e) => e.day).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  const stats = useMemo(() => {
    const planned = entries.filter((e) => e.status === "planned").length;
    const completed = entries.filter((e) => e.status === "completed").length;
    const missed = entries.filter((e) => e.status === "missed").length;
    return { total: entries.length, planned, completed, missed };
  }, [entries]);

  const filteredEntries = entries
    .filter((e) => dayFilter === "all" || e.day === dayFilter)
    .sort((a, b) => {
      if (a.day !== b.day) return (a.day || "").localeCompare(b.day || "");
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

  function openAddForm() {
    setEditingEntry(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(entry) {
    setEditingEntry(entry);
    setForm({
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      activity: entry.activity,
      category: entry.category,
      status: entry.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEntry(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.day || !form.startTime || !form.endTime || !form.activity.trim()) {
      return;
    }

    if (editingEntry) {
      const updated = entries.map((e) =>
        e.id === editingEntry.id ? { ...e, ...form, activity: form.activity.trim() } : e
      );
      persist(updated);
    } else {
      const newEntry = { id: Date.now(), ...form, activity: form.activity.trim() };
      persist([...entries, newEntry]);
    }

    closeForm();
  }

  function deleteEntry(entry) {
    const confirmed = window.confirm(
      `Delete "${entry.activity}"?\n\nThis timetable entry will be permanently removed.`
    );
    if (!confirmed) return;
    persist(entries.filter((e) => e.id !== entry.id));
  }

  function setStatus(id, status) {
    const updated = entries.map((e) => (e.id === id ? { ...e, status } : e));
    persist(updated);
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>🗓️ Timetable</h1>
        <p>Loading timetable...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>🗓️ Timetable</h1>
          <p>Plan your day and track what actually gets done.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Entry
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <CalendarClock size={25} />
          <span>Total Entries</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <span>Planned</span>
          <strong>{stats.planned}</strong>
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
            <h2>{editingEntry ? "Edit Entry" : "Add Timetable Entry"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>

          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Day / Date</label>
              <input
                type="date"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Activity</label>
              <input
                type="text"
                placeholder="Example: DSA Practice"
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <button type="submit" className="save-topic-button">
              {editingEntry ? "Save Changes" : "Add Entry"}
            </button>
          </form>
        </section>
      )}

      <section className="learning-section">
        <div className="topic-header">
          <div>
            <h2>Schedule</h2>
            <p>All planned and logged time blocks.</p>
          </div>
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
            <option value="all">All Days</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </option>
            ))}
          </select>
        </div>

        <div className="topic-list">
          {filteredEntries.map((entry) => (
            <div className={`topic-row status-${entry.status}`} key={entry.id}>
              <div className="topic-information">
                <strong>{entry.activity}</strong>
                <span>
                  {new Date(`${entry.day}T00:00:00`).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  • {entry.startTime}–{entry.endTime} • {entry.category}
                </span>
              </div>

              <div className="topic-actions">
                {entry.status !== "completed" && (
                  <button
                    type="button"
                    className="edit-button"
                    title="Mark completed"
                    onClick={() => setStatus(entry.id, "completed")}
                  >
                    <CheckCircle2 size={17} />
                  </button>
                )}
                {entry.status !== "missed" && (
                  <button
                    type="button"
                    className="delete-button"
                    title="Mark missed"
                    onClick={() => setStatus(entry.id, "missed")}
                  >
                    <XCircle size={17} />
                  </button>
                )}
                <button
                  type="button"
                  className="edit-button"
                  onClick={() => openEditForm(entry)}
                  title="Edit entry"
                >
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteEntry(entry)}
                  title="Delete entry"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="empty-state">
              <p>No timetable entries yet.</p>
              <button className="add-topic-button" onClick={openAddForm}>
                <Plus size={18} />
                Add Entry
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Timetable;
