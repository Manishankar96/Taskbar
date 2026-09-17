import { useEffect, useMemo, useState } from "react";
import {
  Candy,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  X,
  Target,
} from "lucide-react";

import {
  getItemsFromFirestore,
  getItemFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import {
  formatMinutes,
  getTodayLocalDateKey,
  sumBy,
} from "../../utils/calculations";

const DIET_COLLECTION = "diet";
const DIET_SETTINGS_COLLECTION = "dietSettings";
const PROTEIN_TARGET_ID = "proteinTarget";

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

  const [dateFilter, setDateFilter] = useState(
    getTodayLocalDateKey()
  );

  const [proteinTarget, setProteinTarget] = useState(60);

  const [showTargetForm, setShowTargetForm] =
    useState(false);

  const [targetInput, setTargetInput] =
    useState("60");

  /*
   * ============================================================
   * LOAD DIET DATA + PROTEIN TARGET
   * ============================================================
   */

  useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    async function load() {
      try {
        const [dietData, targetData] =
          await Promise.all([
            getItemsFromFirestore(DIET_COLLECTION),
            getItemFromFirestore(
              DIET_SETTINGS_COLLECTION,
              PROTEIN_TARGET_ID
            ),
          ]);

        if (mounted) {
          const list = Array.isArray(dietData)
            ? dietData
            : [];

          setRecords(
            list.filter(
              (item) =>
                item &&
                typeof item === "object" &&
                ("sugar" in item ||
                  "protein" in item) &&
                item.date
            ).map((item) => ({
              ...item,
              id: String(item.id),
              sugar: Number(item.sugar) || 0,
              protein: Number(item.protein) || 0,
              date: item.date || "",
              notes: item.notes || "",
            }))
          );

          const savedTarget = Number(
            targetData?.value
          );

          if (
            Number.isFinite(savedTarget) &&
            savedTarget > 0
          ) {
            setProteinTarget(savedTarget);
            setTargetInput(String(savedTarget));
          } else {
            setProteinTarget(60);
            setTargetInput("60");
          }
        }

        /*
         * ========================================================
         * FIRESTORE REAL-TIME LISTENER
         * ========================================================
         */

        unsubscribe =
          subscribeToFirestoreCollection(
            DIET_COLLECTION,
            (firestoreItems) => {
              if (!mounted) return;

              const list = Array.isArray(
                firestoreItems
              )
                ? firestoreItems
                : [];

              const normalized = list
                .filter(
                  (item) =>
                    item &&
                    typeof item === "object" &&
                    ("sugar" in item ||
                      "protein" in item) &&
                    item.date
                )
                .map((item) => ({
                  ...item,
                  id: String(item.id),
                  sugar: Number(item.sugar) || 0,
                  protein:
                    Number(item.protein) || 0,
                  date: item.date || "",
                  notes: item.notes || "",
                }));

              setRecords(normalized);
            }
          );
      } catch (error) {
        console.error(
          "Failed to load diet data from Firestore:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * ============================================================
   * PERSIST DIET RECORD
   * ============================================================
   */

  async function persist(
    updated,
    changedRecord = null
  ) {
    const normalized = updated.map((item) => ({
      ...item,
      id: String(item.id),
      sugar: Number(item.sugar) || 0,
      protein: Number(item.protein) || 0,
      date: item.date || "",
      notes: item.notes || "",
    }));

    setRecords(normalized);

    if (!changedRecord) return;

    try {
      const normalizedRecord = {
        ...changedRecord,
        id: String(changedRecord.id),
        sugar: Number(changedRecord.sugar) || 0,
        protein:
          Number(changedRecord.protein) || 0,
        date: changedRecord.date || "",
        notes: changedRecord.notes || "",
      };

      await saveItemToFirestore(
        DIET_COLLECTION,
        String(normalizedRecord.id),
        normalizedRecord
      );
    } catch (error) {
      console.error(
        "Failed to save diet record to Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * DATE FILTER
   * ============================================================
   */

  const dayRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.date === dateFilter
      ),
    [records, dateFilter]
  );

  /*
   * ============================================================
   * DAILY TOTALS
   * ============================================================
   */

  const totals = useMemo(
    () =>
      dayRecords.reduce(
        (result, record) => ({
          sugar:
            result.sugar +
            (Number(record.sugar) || 0),

          protein:
            result.protein +
            (Number(record.protein) || 0),
        }),
        {
          sugar: 0,
          protein: 0,
        }
      ),
    [dayRecords]
  );

  const sugarExceeded =
    totals.sugar > SUGAR_TARGET;

  const proteinProgress =
    proteinTarget > 0
      ? Math.min(
          (totals.protein / proteinTarget) *
            100,
          100
        )
      : 0;

  /*
   * ============================================================
   * ADD FORM
   * ============================================================
   */

  function openAddForm() {
    setEditingRecord(null);

    setForm({
      ...emptyForm,
      date: dateFilter,
    });

    setShowForm(true);
  }

  /*
   * ============================================================
   * EDIT FORM
   * ============================================================
   */

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

  /*
   * ============================================================
   * CLOSE FORM
   * ============================================================
   */

  function closeForm() {
    setShowForm(false);
    setEditingRecord(null);

    setForm({
      ...emptyForm,
      date: dateFilter,
    });
  }

  /*
   * ============================================================
   * ADD / EDIT DIET RECORD
   * ============================================================
   */

  async function handleSubmit(event) {
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
      updatedAt:
        new Date().toISOString(),
    };

    if (editingRecord) {
      const updatedRecord = {
        ...editingRecord,
        ...cleaned,
        id: String(editingRecord.id),
      };

      const updated = records.map(
        (record) =>
          String(record.id) ===
          String(editingRecord.id)
            ? updatedRecord
            : record
      );

      await persist(
        updated,
        updatedRecord
      );
    } else {
      const newRecord = {
        id: String(Date.now()),
        ...cleaned,
        createdAt:
          new Date().toISOString(),
      };

      await persist(
        [...records, newRecord],
        newRecord
      );
    }

    closeForm();
  }

  /*
   * ============================================================
   * DELETE RECORD
   * ============================================================
   */

  async function deleteRecord(record) {
    const confirmed = window.confirm(
      `Delete the diet record for ${record.date}?`
    );

    if (!confirmed) return;

    const recordId = String(record.id);

    setRecords((current) =>
      current.filter(
        (item) =>
          String(item.id) !== recordId
      )
    );

    try {
      await deleteItemFromFirestore(
        DIET_COLLECTION,
        recordId
      );
    } catch (error) {
      console.error(
        "Failed to delete diet record from Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * SAVE PROTEIN TARGET
   * ============================================================
   */

  async function saveProteinTarget(event) {
    event.preventDefault();

    const value = Number(targetInput);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }

    try {
      await saveItemToFirestore(
        DIET_SETTINGS_COLLECTION,
        PROTEIN_TARGET_ID,
        {
          id: PROTEIN_TARGET_ID,
          value,
          updatedAt:
            new Date().toISOString(),
        }
      );

      setProteinTarget(value);
      setTargetInput(String(value));
      setShowTargetForm(false);
    } catch (error) {
      console.error(
        "Failed to save protein target to Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="module-page">
        <h1>🥗 Diet</h1>
        <p>Loading diet data...</p>
      </div>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="module-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>🥗 Diet Tracker</h1>

          <p>
            Track your daily sugar and protein
            intake.
          </p>
        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Daily Intake
        </button>
      </div>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>
              {editingRecord
                ? "Edit Daily Intake"
                : "Add Daily Intake"}
            </h2>

            <button
              type="button"
              className="close-button"
              onClick={closeForm}
            >
              <X size={20} />
            </button>
          </div>

          <form
            className="grid-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label>Date</label>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
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
                  setForm({
                    ...form,
                    sugar:
                      event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>
                Protein Intake (g)
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Example: 60"
                value={form.protein}
                onChange={(event) =>
                  setForm({
                    ...form,
                    protein:
                      event.target.value,
                  })
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
                  setForm({
                    ...form,
                    notes:
                      event.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="save-topic-button"
            >
              {editingRecord
                ? "Save Changes"
                : "Add Intake"}
            </button>
          </form>
        </section>
      )}

      {/* SUGAR + PROTEIN */}

      <section className="two-column">
        {/* SUGAR */}

        <div className="section-card">
          <div className="section-title">
            <Candy size={22} />
            <h2>Sugar Intake</h2>
          </div>

          <input
            type="date"
            className="diet-date-filter"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value
              )
            }
          />

          <div className="finance-stats-grid">
            <div className="stat-card">
              <span>Today's Sugar</span>

              <strong>
                {totals.sugar.toFixed(1)} g
              </strong>
            </div>

            <div className="stat-card">
              <span>Daily Target</span>

              <strong>
                &lt; {SUGAR_TARGET} g
              </strong>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Sugar Progress</span>

              <strong>
                {totals.sugar.toFixed(1)} g
              </strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    (totals.sugar /
                      SUGAR_TARGET) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>

            <p>
              {sugarExceeded
                ? `Sugar is ${(
                    totals.sugar -
                    SUGAR_TARGET
                  ).toFixed(
                    1
                  )} g above the target.`
                : `${(
                    SUGAR_TARGET -
                    totals.sugar
                  ).toFixed(
                    1
                  )} g remaining to stay below the target.`}
            </p>
          </div>
        </div>

        {/* PROTEIN */}

        <div className="section-card">
          <div className="section-title">
            <Dumbbell size={22} />
            <h2>Protein Intake</h2>
          </div>

          <div className="finance-stats-grid">
            <div className="stat-card">
              <span>Today's Protein</span>

              <strong>
                {totals.protein.toFixed(1)} g
              </strong>
            </div>

            <div className="stat-card">
              <span>Protein Target</span>

              <strong>
                {proteinTarget.toFixed(1)} g
              </strong>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>
                Protein Progress
              </span>

              <strong>
                {proteinProgress.toFixed(0)}%
              </strong>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${proteinProgress}%`,
                }}
              />
            </div>

            <p>
              {totals.protein >=
              proteinTarget
                ? "Protein target reached."
                : `${(
                    proteinTarget -
                    totals.protein
                  ).toFixed(
                    1
                  )} g remaining to reach the target.`}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setTargetInput(
                String(proteinTarget)
              );
              setShowTargetForm(true);
            }}
          >
            <Target size={17} />
            Set Protein Target
          </button>
        </div>
      </section>

      {/* PROTEIN TARGET FORM */}

      {showTargetForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>Set Protein Target</h2>

            <button
              type="button"
              className="close-button"
              onClick={() =>
                setShowTargetForm(false)
              }
            >
              <X size={20} />
            </button>
          </div>

          <form
            className="grid-form"
            onSubmit={saveProteinTarget}
          >
            <div className="form-group">
              <label>
                Daily Protein Target (g)
              </label>

              <input
                type="number"
                min="1"
                step="0.1"
                value={targetInput}
                onChange={(event) =>
                  setTargetInput(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <button
              type="submit"
              className="save-topic-button"
            >
              Save Target
            </button>
          </form>
        </section>
      )}

      {/* DAILY HISTORY */}

      <section className="section-card">
        <div className="section-title">
          <UtensilsIcon />
          <h2>Daily Intake History</h2>
        </div>

        <div className="topic-list">
          {[...dayRecords]
            .sort(
              (a, b) =>
                (Number(b.id) || 0) -
                (Number(a.id) || 0)
            )
            .map((record) => (
              <div
                className="topic-row"
                key={record.id}
              >
                <div className="topic-information">
                  <strong>
                    {record.date}
                  </strong>

                  <span>
                    Sugar:{" "}
                    {Number(
                      record.sugar
                    ).toFixed(1)}{" "}
                    g • Protein:{" "}
                    {Number(
                      record.protein
                    ).toFixed(1)}{" "}
                    g
                    {record.notes
                      ? ` • ${record.notes}`
                      : ""}
                  </span>
                </div>

                <div className="topic-actions">
                  <button
                    type="button"
                    className="edit-button"
                    title="Edit diet record"
                    onClick={() =>
                      openEditForm(record)
                    }
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    title="Delete diet record"
                    onClick={() =>
                      deleteRecord(record)
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}

          {dayRecords.length === 0 && (
            <p className="empty-topics">
              No diet intake recorded for
              this day.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/*
 * ============================================================
 * PROTEIN TARGET / UTILITY ICON
 * ============================================================
 */

function UtensilsIcon() {
  return (
    <span aria-hidden="true">
      🍽️
    </span>
  );
}

export default Diet;