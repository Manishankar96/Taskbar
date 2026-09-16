import { useEffect, useMemo, useState } from "react";
import { Candy, Dumbbell, Plus, Pencil, Trash2, X, Target } from "lucide-react";
import { getDiet, saveDiet } from "../../utils/db";
import { getTodayLocalDateKey } from "../../utils/calculations";

const SUGAR_TARGET = 10;

const emptyForm = {
  date: getTodayLocalDateKey(),
  sugar: "",
  protein: "",
  notes: "",
};

function Diet() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dateFilter, setDateFilter] = useState(getTodayLocalDateKey());
  const [proteinTarget, setProteinTarget] = useState(() => {
    const saved = localStorage.getItem("taskbar-protein-target");
    return saved ? Number(saved) : 60;
  });
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetInput, setTargetInput] = useState(() => {
    const saved = localStorage.getItem("taskbar-protein-target");
    return saved ? String(Number(saved)) : "60";
  });

  useEffect(() => {
    async function load() {
      try {
        const stored = await getDiet();
        const list = Array.isArray(stored) ? stored : [];

        // Only use the new sugar/protein record format.
        setRecords(
          list.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              ("sugar" in item || "protein" in item) &&
              item.date
          )
        );
      } catch (error) {
        console.error("Failed to load diet data:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function persist(updated) {
    setRecords(updated);
    try {
      await saveDiet(updated);
    } catch (error) {
      console.error("Failed to save diet data:", error);
    }
  }

  const dayRecords = useMemo(
    () => records.filter((record) => record.date === dateFilter),
    [records, dateFilter]
  );

  const totals = useMemo(
    () =>
      dayRecords.reduce(
        (result, record) => ({
          sugar: result.sugar + (Number(record.sugar) || 0),
          protein: result.protein + (Number(record.protein) || 0),
        }),
        { sugar: 0, protein: 0 }
      ),
    [dayRecords]
  );

  const sugarExceeded = totals.sugar > SUGAR_TARGET;
  const proteinProgress =
    proteinTarget > 0
      ? Math.min((totals.protein / proteinTarget) * 100, 100)
      : 0;

  function openAddForm() {
    setEditingRecord(null);
    setForm({ ...emptyForm, date: dateFilter });
    setShowForm(true);
  }

  function openEditForm(record) {
    setEditingRecord(record);
    setForm({
      date: record.date,
      sugar: record.sugar ?? "",
      protein: record.protein ?? "",
      notes: record.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRecord(null);
    setForm(emptyForm);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.date) return;

    const sugar = Number(form.sugar);
    const protein = Number(form.protein);

    if (
      form.sugar === "" ||
      form.protein === "" ||
      !Number.isFinite(sugar) ||
      !Number.isFinite(protein) ||
      sugar < 0 ||
      protein < 0
    ) {
      return;
    }

    const cleaned = {
      date: form.date,
      sugar,
      protein,
      notes: form.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingRecord) {
      persist(
        records.map((record) =>
          record.id === editingRecord.id
            ? { ...record, ...cleaned }
            : record
        )
      );
    } else {
      persist([
        ...records,
        {
          id: Date.now(),
          ...cleaned,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    closeForm();
  }

  function deleteRecord(record) {
    const confirmed = window.confirm(
      `Delete the diet record for ${record.date}?`
    );

    if (!confirmed) return;

    persist(records.filter((item) => item.id !== record.id));
  }

  function saveProteinTarget(event) {
    event.preventDefault();

    const value = Number(targetInput);

    if (!Number.isFinite(value) || value <= 0) return;

    setProteinTarget(value);
    localStorage.setItem("taskbar-protein-target", String(value));
    setShowTargetForm(false);
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>🥗 Diet</h1>
        <p>Loading diet data...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>🥗 Diet Tracker</h1>
          <p>Track your daily sugar and protein intake.</p>
        </div>

        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Daily Intake
        </button>
      </div>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingRecord ? "Edit Daily Intake" : "Add Daily Intake"}</h2>

            <button
              type="button"
              className="close-button"
              onClick={closeForm}
            >
              <X size={20} />
            </button>
          </div>

          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Sugar Intake (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Example: 8"
                value={form.sugar}
                onChange={(event) =>
                  setForm({ ...form, sugar: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Protein Intake (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Example: 60"
                value={form.protein}
                onChange={(event) =>
                  setForm({ ...form, protein: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                placeholder="Optional"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>

            <button type="submit" className="save-topic-button">
              {editingRecord ? "Save Changes" : "Add Intake"}
            </button>
          </form>
        </section>
      )}

      <section className="two-column">
        <div className="section-card">
          <div className="section-title">
            <Candy size={22} />
            <h2>Sugar Intake</h2>
          </div>

          <input
            type="date"
            className="diet-date-filter"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />

          <div className="finance-stats-grid">
            <div className="stat-card">
              <span>Today's Sugar</span>
              <strong>{totals.sugar.toFixed(1)} g</strong>
            </div>

            <div className="stat-card">
              <span>Daily Target</span>
              <strong>&lt; {SUGAR_TARGET} g</strong>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Sugar Progress</span>
              <strong>{totals.sugar.toFixed(1)} g</strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    (totals.sugar / SUGAR_TARGET) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <p>
              {sugarExceeded
                ? `Sugar is ${(
                    totals.sugar - SUGAR_TARGET
                  ).toFixed(1)} g above the target.`
                : `${(SUGAR_TARGET - totals.sugar).toFixed(
                    1
                  )} g remaining to stay below the target.`}
            </p>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title">
            <Dumbbell size={22} />
            <h2>Protein Intake</h2>
          </div>

          <div className="finance-stats-grid">
            <div className="stat-card">
              <span>Today's Protein</span>
              <strong>{totals.protein.toFixed(1)} g</strong>
            </div>

            <div className="stat-card">
              <span>Protein Target</span>
              <strong>{proteinTarget.toFixed(1)} g</strong>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Protein Progress</span>
              <strong>{proteinProgress.toFixed(0)}%</strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${proteinProgress}%` }}
              />
            </div>

            <p>
              {totals.protein >= proteinTarget
                ? "Protein target reached."
                : `${(proteinTarget - totals.protein).toFixed(
                    1
                  )} g remaining to reach the target.`}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setTargetInput(String(proteinTarget));
              setShowTargetForm(true);
            }}
          >
            <Target size={17} />
            Set Protein Target
          </button>
        </div>
      </section>

      {showTargetForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>Set Protein Target</h2>

            <button
              type="button"
              className="close-button"
              onClick={() => setShowTargetForm(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form className="grid-form" onSubmit={saveProteinTarget}>
            <div className="form-group">
              <label>Daily Protein Target (g)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={targetInput}
                onChange={(event) => setTargetInput(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="save-topic-button">
              Save Target
            </button>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-title">
          <UtensilsIcon />
          <h2>Daily Intake History</h2>
        </div>

        <div className="topic-list">
          {[...dayRecords]
            .sort((a, b) => (b.id || 0) - (a.id || 0))
            .map((record) => (
              <div className="topic-row" key={record.id}>
                <div className="topic-information">
                  <strong>{record.date}</strong>

                  <span>
                    Sugar: {Number(record.sugar).toFixed(1)} g • Protein:{" "}
                    {Number(record.protein).toFixed(1)} g
                    {record.notes ? ` • ${record.notes}` : ""}
                  </span>
                </div>

                <div className="topic-actions">
                  <button
                    className="edit-button"
                    onClick={() => openEditForm(record)}
                    type="button"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deleteRecord(record)}
                    type="button"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}

          {dayRecords.length === 0 && (
            <p className="empty-topics">
              No diet intake recorded for this day.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function UtensilsIcon() {
  return <span aria-hidden="true">🍽️</span>;
}

export default Diet;
