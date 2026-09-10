import { useEffect, useMemo, useState } from "react";
import { Smartphone, Plus, Pencil, Trash2, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getScreenTime, saveScreenTime } from "../utils/db";
import {
  calculatePercentage,
  formatMinutes,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../utils/calculations";

const CATEGORIES = ["Learning", "Coding", "Entertainment", "Other"];

const emptyForm = {
  category: "Learning",
  minutes: "",
  date: getTodayLocalDateKey(),
  note: "",
};

function ScreenTime() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        setRecords(await getScreenTime());
      } catch (error) {
        console.error("Failed to load screen time:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setRecords(updated);
    try {
      await saveScreenTime(updated);
    } catch (error) {
      console.error("Failed to save screen time:", error);
    }
  }

  const today = getTodayLocalDateKey();
  const todaysRecords = useMemo(
    () => records.filter((r) => r.date === today),
    [records, today]
  );

  const stats = useMemo(() => {
    const total = sumBy(todaysRecords, "minutes");
    const byCategory = {};
    CATEGORIES.forEach((c) => {
      byCategory[c] = sumBy(
        todaysRecords.filter((r) => r.category === c),
        "minutes"
      );
    });
    return { total, byCategory };
  }, [todaysRecords]);

  const weeklyChartData = useMemo(() => {
    const keys = getLastNLocalDateKeys(7);
    return keys.map((key) => {
      const dayRecords = records.filter((r) => r.date === key);
      return {
        day: getWeekdayLabel(key),
        hours: Math.round((sumBy(dayRecords, "minutes") / 60) * 10) / 10,
      };
    });
  }, [records]);

  function openAddForm() {
    setEditingRecord(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(record) {
    setEditingRecord(record);
    setForm({
      category: record.category,
      minutes: record.minutes,
      date: record.date,
      note: record.note || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRecord(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const minutes = Math.max(0, Number(form.minutes) || 0);
    if (minutes <= 0 || !form.date) return;

    if (editingRecord) {
      persist(
        records.map((r) =>
          r.id === editingRecord.id ? { ...r, ...form, minutes } : r
        )
      );
    } else {
      persist([...records, { id: Date.now(), ...form, minutes }]);
    }
    closeForm();
  }

  function deleteRecord(record) {
    const confirmed = window.confirm("Delete this screen time entry?");
    if (!confirmed) return;
    persist(records.filter((r) => r.id !== record.id));
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>📱 Screen Time</h1>
        <p>Loading screen time...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>📱 Screen Time</h1>
          <p>See where your screen hours are actually going.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Log Screen Time
        </button>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <Smartphone size={25} />
          <span>Total Today</span>
          <strong>{formatMinutes(stats.total)}</strong>
        </div>
        {CATEGORIES.map((c) => (
          <div className="stat-card" key={c}>
            <span>{c}</span>
            <strong>{calculatePercentage(stats.byCategory[c], stats.total)}%</strong>
            <span>{formatMinutes(stats.byCategory[c])}</span>
          </div>
        ))}
      </section>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingRecord ? "Edit Entry" : "Log Screen Time"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
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
              <label>Minutes</label>
              <input
                type="number"
                min="1"
                placeholder="Example: 45"
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
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
              <label>Note (optional)</label>
              <input
                type="text"
                placeholder="Example: YouTube tutorials"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <button type="submit" className="save-topic-button">
              {editingRecord ? "Save Changes" : "Add Entry"}
            </button>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-title">
          <Smartphone size={22} />
          <h2>Weekly Trend</h2>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis unit="h" />
              <Tooltip formatter={(value) => [`${value}h`, "Screen time"]} />
              <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="learning-section">
        <div className="topic-header">
          <div>
            <h2>Today's Entries</h2>
            <p>Every logged block for today.</p>
          </div>
        </div>
        <div className="topic-list">
          {todaysRecords.map((record) => (
            <div className="topic-row" key={record.id}>
              <div className="topic-information">
                <strong>{record.category}</strong>
                <span>
                  {formatMinutes(record.minutes)}
                  {record.note ? ` • ${record.note}` : ""}
                </span>
              </div>
              <div className="topic-actions">
                <button className="edit-button" onClick={() => openEditForm(record)}>
                  <Pencil size={17} />
                </button>
                <button className="delete-button" onClick={() => deleteRecord(record)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          {todaysRecords.length === 0 && (
            <p className="empty-topics">No screen time logged today.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ScreenTime;
