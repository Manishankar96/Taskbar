import { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import {
  calculatePercentage,
  formatMinutes,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../../utils/calculations";

const SCREEN_TIME_COLLECTION = "screenTime";

const CATEGORIES = [
  "Learning",
  "Coding",
  "Entertainment",
  "Other",
];

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
  const [editingRecord, setEditingRecord] =
    useState(null);

  const [form, setForm] = useState(emptyForm);

  /*
   * ============================================================
   * LOAD SCREEN TIME FROM FIRESTORE
   * ============================================================
   */

  useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    async function load() {
      try {
        const data =
          await getItemsFromFirestore(
            SCREEN_TIME_COLLECTION
          );

        if (mounted) {
          const normalized = Array.isArray(data)
            ? data.map((item) => ({
                ...item,
                id: String(item.id),
                category:
                  item.category || "Learning",
                minutes:
                  Number(item.minutes) || 0,
                date: item.date || "",
                note: item.note || "",
              }))
            : [];

          setRecords(normalized);
        }

        /*
         * ========================================================
         * FIRESTORE REAL-TIME LISTENER
         * ========================================================
         */

        unsubscribe =
          subscribeToFirestoreCollection(
            SCREEN_TIME_COLLECTION,
            (firestoreItems) => {
              if (!mounted) return;

              const normalized = Array.isArray(
                firestoreItems
              )
                ? firestoreItems.map((item) => ({
                    ...item,
                    id: String(item.id),
                    category:
                      item.category ||
                      "Learning",
                    minutes:
                      Number(item.minutes) || 0,
                    date: item.date || "",
                    note: item.note || "",
                  }))
                : [];

              setRecords(normalized);
            }
          );
      } catch (error) {
        console.error(
          "Failed to load screen time from Firestore:",
          error
        );

        if (mounted) {
          setRecords([]);
        }
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
   * SAVE SCREEN TIME RECORD
   * ============================================================
   */

  async function persist(
    updated,
    changedRecord = null
  ) {
    const normalized = updated.map((record) => ({
      ...record,
      id: String(record.id),
      category:
        record.category || "Learning",
      minutes: Number(record.minutes) || 0,
      date: record.date || "",
      note: record.note || "",
    }));

    setRecords(normalized);

    if (!changedRecord) return;

    try {
      const normalizedRecord = {
        ...changedRecord,
        id: String(changedRecord.id),
        category:
          changedRecord.category || "Learning",
        minutes:
          Number(changedRecord.minutes) || 0,
        date: changedRecord.date || "",
        note: changedRecord.note || "",
      };

      await saveItemToFirestore(
        SCREEN_TIME_COLLECTION,
        String(normalizedRecord.id),
        normalizedRecord
      );
    } catch (error) {
      console.error(
        "Failed to save screen time to Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * TODAY
   * ============================================================
   */

  const today = getTodayLocalDateKey();

  const todaysRecords = useMemo(
    () =>
      records.filter(
        (record) => record.date === today
      ),
    [records, today]
  );

  /*
   * ============================================================
   * TODAY'S STATISTICS
   * ============================================================
   */

  const stats = useMemo(() => {
    const total = sumBy(
      todaysRecords,
      "minutes"
    );

    const byCategory = {};

    CATEGORIES.forEach((category) => {
      byCategory[category] = sumBy(
        todaysRecords.filter(
          (record) =>
            record.category === category
        ),
        "minutes"
      );
    });

    return {
      total,
      byCategory,
    };
  }, [todaysRecords]);

  /*
   * ============================================================
   * WEEKLY CHART DATA
   * ============================================================
   */

  const weeklyChartData = useMemo(() => {
    const keys =
      getLastNLocalDateKeys(7);

    return keys.map((key) => {
      const dayRecords = records.filter(
        (record) => record.date === key
      );

      return {
        day: getWeekdayLabel(key),
        hours:
          Math.round(
            (sumBy(
              dayRecords,
              "minutes"
            ) /
              60) *
              10
          ) / 10,
      };
    });
  }, [records]);

  /*
   * ============================================================
   * ADD FORM
   * ============================================================
   */

  function openAddForm() {
    setEditingRecord(null);

    setForm({
      ...emptyForm,
      date: today,
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
      category:
        record.category || "Learning",
      minutes: record.minutes ?? "",
      date: record.date || today,
      note: record.note || "",
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
      date: today,
    });
  }

  /*
   * ============================================================
   * ADD / EDIT SCREEN TIME
   * ============================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    const minutes = Math.max(
      0,
      Number(form.minutes) || 0
    );

    if (
      minutes <= 0 ||
      !form.date
    ) {
      return;
    }

    if (editingRecord) {
      const updatedRecord = {
        ...editingRecord,
        id: String(editingRecord.id),
        category: form.category,
        minutes,
        date: form.date,
        note: form.note || "",
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
        category: form.category,
        minutes,
        date: form.date,
        note: form.note || "",
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
   * DELETE SCREEN TIME
   * ============================================================
   */

  async function deleteRecord(record) {
    const confirmed = window.confirm(
      "Delete this screen time entry?"
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
        SCREEN_TIME_COLLECTION,
        recordId
      );
    } catch (error) {
      console.error(
        "Failed to delete screen time from Firestore:",
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
        <h1>📱 Screen Time</h1>
        <p>
          Loading screen time...
        </p>
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
          <h1>📱 Screen Time</h1>

          <p>
            See where your screen hours
            are actually going.
          </p>
        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Log Screen Time
        </button>
      </div>

      {/* STATS */}

      <section className="stat-grid">
        <div className="stat-card">
          <Smartphone size={25} />

          <span>Total Today</span>

          <strong>
            {formatMinutes(
              stats.total
            )}
          </strong>
        </div>

        {CATEGORIES.map((category) => (
          <div
            className="stat-card"
            key={category}
          >
            <span>{category}</span>

            <strong>
              {calculatePercentage(
                stats.byCategory[
                  category
                ],
                stats.total
              )}
              %
            </strong>

            <span>
              {formatMinutes(
                stats.byCategory[
                  category
                ]
              )}
            </span>
          </div>
        ))}
      </section>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>
              {editingRecord
                ? "Edit Entry"
                : "Log Screen Time"}
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
              <label>
                Category
              </label>

              <select
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category:
                      event.target.value,
                  })
                }
              >
                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-group">
              <label>
                Minutes
              </label>

              <input
                type="number"
                min="1"
                placeholder="Example: 45"
                value={form.minutes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    minutes:
                      event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Date</label>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date:
                      event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Note (optional)
              </label>

              <input
                type="text"
                placeholder="Example: YouTube tutorials"
                value={form.note}
                onChange={(event) =>
                  setForm({
                    ...form,
                    note:
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
                : "Add Entry"}
            </button>
          </form>
        </section>
      )}

      {/* WEEKLY TREND */}

      <section className="section-card">
        <div className="section-title">
          <Smartphone size={22} />

          <h2>Weekly Trend</h2>
        </div>

        <div
          style={{
            width: "100%",
            height: 260,
          }}
        >
          <ResponsiveContainer>
            <BarChart
              data={weeklyChartData}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis dataKey="day" />

              <YAxis unit="h" />

              <Tooltip
                formatter={(value) => [
                  `${value}h`,
                  "Screen time",
                ]}
              />

              <Bar
                dataKey="hours"
                fill="#2563eb"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* TODAY'S ENTRIES */}

      <section className="learning-section">
        <div className="topic-header">
          <div>
            <h2>
              Today's Entries
            </h2>

            <p>
              Every logged block for
              today.
            </p>
          </div>
        </div>

        <div className="topic-list">
          {todaysRecords.map(
            (record) => (
              <div
                className="topic-row"
                key={record.id}
              >
                <div className="topic-information">
                  <strong>
                    {record.category}
                  </strong>

                  <span>
                    {formatMinutes(
                      record.minutes
                    )}

                    {record.note
                      ? ` • ${record.note}`
                      : ""}
                  </span>
                </div>

                <div className="topic-actions">
                  <button
                    type="button"
                    className="edit-button"
                    title="Edit screen time"
                    onClick={() =>
                      openEditForm(
                        record
                      )
                    }
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    title="Delete screen time"
                    onClick={() =>
                      deleteRecord(
                        record
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            )
          )}

          {todaysRecords.length ===
            0 && (
            <p className="empty-topics">
              No screen time logged
              today.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ScreenTime;