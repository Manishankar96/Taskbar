import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, Plus, Pencil, Trash2, X } from "lucide-react";
import { getActivities, saveActivities } from "../../utils/db";
import { formatMinutes, getTodayLocalDateKey, sumBy } from "../../utils/calculations";

const CATEGORIES = ["Coding", "Story Writing", "Reading", "Exercise", "Other Skills"];

const emptyForm = {
  activity: "",
  category: "Coding",
  duration: "",
  date: getTodayLocalDateKey(),
  notes: "",
};

function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        setActivities(await getActivities());
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setActivities(updated);
    try {
      await saveActivities(updated);
    } catch (error) {
      console.error("Failed to save activities:", error);
    }
  }

  const today = getTodayLocalDateKey();
  const todaysActivities = useMemo(
    () => activities.filter((a) => a.date === today),
    [activities, today]
  );

  const totalTimeToday = sumBy(todaysActivities, "duration");

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((c) => ({
      category: c,
      minutes: sumBy(
        todaysActivities.filter((a) => a.category === c),
        "duration"
      ),
    })).filter((c) => c.minutes > 0);
  }, [todaysActivities]);

  function openAddForm() {
    setEditingActivity(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(activity) {
    setEditingActivity(activity);
    setForm({
      activity: activity.activity,
      category: activity.category,
      duration: activity.duration,
      date: activity.date,
      notes: activity.notes || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingActivity(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const duration = Math.max(0, Number(form.duration) || 0);
    if (!form.activity.trim() || duration <= 0 || !form.date) return;

    if (editingActivity) {
      persist(
        activities.map((a) =>
          a.id === editingActivity.id
            ? { ...a, ...form, activity: form.activity.trim(), duration }
            : a
        )
      );
    } else {
      persist([
        ...activities,
        { id: Date.now(), ...form, activity: form.activity.trim(), duration },
      ]);
    }
    closeForm();
  }

  function deleteActivity(activity) {
    const confirmed = window.confirm(`Delete "${activity.activity}"?`);
    if (!confirmed) return;
    persist(activities.filter((a) => a.id !== activity.id));
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>✍️ Activities</h1>
        <p>Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>✍️ Activities</h1>
          <p>Log coding, writing, reading, exercise and other pursuits.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Activity
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <ActivityIcon size={25} />
          <span>Today's Total Time</span>
          <strong>{formatMinutes(totalTimeToday)}</strong>
        </div>
        <div className="stat-card">
          <span>Activities Today</span>
          <strong>{todaysActivities.length}</strong>
        </div>
        <div className="stat-card">
          <span>All-time Logged</span>
          <strong>{activities.length}</strong>
        </div>
      </section>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingActivity ? "Edit Activity" : "Add Activity"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Activity</label>
              <input
                type="text"
                placeholder="Example: LeetCode practice"
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
              <label>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                placeholder="Example: 30"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
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
              <label>Notes (optional)</label>
              <input
                type="text"
                placeholder="Anything worth remembering"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="save-topic-button">
              {editingActivity ? "Save Changes" : "Add Activity"}
            </button>
          </form>
        </section>
      )}

      <section className="two-column">
        <div className="section-card">
          <div className="section-title">
            <ActivityIcon size={22} />
            <h2>Today's Activities</h2>
          </div>
          <div className="topic-list">
            {todaysActivities.map((activity) => (
              <div className="topic-row" key={activity.id}>
                <div className="topic-information">
                  <strong>{activity.activity}</strong>
                  <span>
                    {activity.category} • {formatMinutes(activity.duration)}
                    {activity.notes ? ` • ${activity.notes}` : ""}
                  </span>
                </div>
                <div className="topic-actions">
                  <button className="edit-button" onClick={() => openEditForm(activity)}>
                    <Pencil size={17} />
                  </button>
                  <button className="delete-button" onClick={() => deleteActivity(activity)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            {todaysActivities.length === 0 && (
              <p className="empty-topics">No activities logged today.</p>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-title">
            <ActivityIcon size={22} />
            <h2>Category Breakdown (Today)</h2>
          </div>
          {categoryBreakdown.length === 0 && (
            <p className="empty-topics">Nothing to break down yet.</p>
          )}
          {categoryBreakdown.map((c) => (
            <div className="water-week-row" key={c.category}>
              <span>{c.category}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${totalTimeToday ? Math.round((c.minutes / totalTimeToday) * 100) : 0}%`,
                  }}
                />
              </div>
              <span>{formatMinutes(c.minutes)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Activities;
