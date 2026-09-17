import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import {
  formatMinutes,
  getTodayLocalDateKey,
  sumBy,
} from "../../utils/calculations";

const ACTIVITIES_COLLECTION = "activities";

const CATEGORIES = [
  "Coding",
  "Story Writing",
  "Reading",
  "Exercise",
  "Other Skills",
];

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

  /*
   * ============================================================
   * LOAD ACTIVITIES FROM FIRESTORE
   * ============================================================
   */

  useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    async function load() {
      try {
        const data = await getItemsFromFirestore(
          ACTIVITIES_COLLECTION
        );

        if (mounted) {
          const normalized = Array.isArray(data)
            ? data.map((item) => ({
                ...item,
                id: String(item.id),
                activity: item.activity || "",
                category: item.category || "Other Skills",
                duration: Number(item.duration) || 0,
                date: item.date || "",
                notes: item.notes || "",
              }))
            : [];

          setActivities(normalized);
        }

        /*
         * ========================================================
         * FIRESTORE REAL-TIME LISTENER
         * ========================================================
         */

        unsubscribe = subscribeToFirestoreCollection(
          ACTIVITIES_COLLECTION,
          (firestoreItems) => {
            if (!mounted) return;

            const normalized = Array.isArray(firestoreItems)
              ? firestoreItems.map((item) => ({
                  ...item,
                  id: String(item.id),
                  activity: item.activity || "",
                  category:
                    item.category || "Other Skills",
                  duration: Number(item.duration) || 0,
                  date: item.date || "",
                  notes: item.notes || "",
                }))
              : [];

            setActivities(normalized);
          }
        );
      } catch (error) {
        console.error(
          "Failed to load activities from Firestore:",
          error
        );

        if (mounted) {
          setActivities([]);
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
   * PERSIST
   * ============================================================
   */

  async function persist(updated, changedActivity = null) {
    const normalized = updated.map((item) => ({
      ...item,
      id: String(item.id),
      activity: item.activity || "",
      category: item.category || "Other Skills",
      duration: Number(item.duration) || 0,
      date: item.date || "",
      notes: item.notes || "",
    }));

    setActivities(normalized);

    if (!changedActivity) return;

    try {
      const normalizedActivity = {
        ...changedActivity,
        id: String(changedActivity.id),
        activity: changedActivity.activity || "",
        category:
          changedActivity.category || "Other Skills",
        duration: Number(changedActivity.duration) || 0,
        date: changedActivity.date || "",
        notes: changedActivity.notes || "",
      };

      await saveItemToFirestore(
        ACTIVITIES_COLLECTION,
        String(normalizedActivity.id),
        normalizedActivity
      );
    } catch (error) {
      console.error(
        "Failed to save activity to Firestore:",
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

  const todaysActivities = useMemo(
    () =>
      activities.filter(
        (activity) => activity.date === today
      ),
    [activities, today]
  );

  /*
   * ============================================================
   * TOTAL TIME
   * ============================================================
   */

  const totalTimeToday = sumBy(
    todaysActivities,
    "duration"
  );

  /*
   * ============================================================
   * CATEGORY BREAKDOWN
   * ============================================================
   */

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      minutes: sumBy(
        todaysActivities.filter(
          (activity) =>
            activity.category === category
        ),
        "duration"
      ),
    })).filter((category) => category.minutes > 0);
  }, [todaysActivities]);

  /*
   * ============================================================
   * ADD FORM
   * ============================================================
   */

  function openAddForm() {
    setEditingActivity(null);

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

  function openEditForm(activity) {
    setEditingActivity(activity);

    setForm({
      activity: activity.activity || "",
      category: activity.category || "Coding",
      duration: activity.duration || "",
      date: activity.date || today,
      notes: activity.notes || "",
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
    setEditingActivity(null);

    setForm({
      ...emptyForm,
      date: today,
    });
  }

  /*
   * ============================================================
   * ADD / EDIT ACTIVITY
   * ============================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    const duration = Math.max(
      0,
      Number(form.duration) || 0
    );

    if (
      !form.activity.trim() ||
      duration <= 0 ||
      !form.date
    ) {
      return;
    }

    if (editingActivity) {
      const updatedActivity = {
        ...editingActivity,
        id: String(editingActivity.id),
        activity: form.activity.trim(),
        category: form.category,
        duration,
        date: form.date,
        notes: form.notes || "",
      };

      const updated = activities.map((activity) =>
        String(activity.id) ===
        String(editingActivity.id)
          ? updatedActivity
          : activity
      );

      await persist(updated, updatedActivity);
    } else {
      const newActivity = {
        id: String(Date.now()),
        activity: form.activity.trim(),
        category: form.category,
        duration,
        date: form.date,
        notes: form.notes || "",
      };

      await persist(
        [...activities, newActivity],
        newActivity
      );
    }

    closeForm();
  }

  /*
   * ============================================================
   * DELETE ACTIVITY
   * ============================================================
   */

  async function deleteActivity(activity) {
    const confirmed = window.confirm(
      `Delete "${activity.activity}"?`
    );

    if (!confirmed) return;

    const activityId = String(activity.id);

    setActivities((current) =>
      current.filter(
        (item) => String(item.id) !== activityId
      )
    );

    try {
      await deleteItemFromFirestore(
        ACTIVITIES_COLLECTION,
        activityId
      );
    } catch (error) {
      console.error(
        "Failed to delete activity from Firestore:",
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
        <h1>✍️ Activities</h1>
        <p>Loading activities...</p>
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
          <h1>✍️ Activities</h1>

          <p>
            Log coding, writing, reading, exercise and
            other pursuits.
          </p>
        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Activity
        </button>
      </div>

      {/* STATS */}

      <section className="stat-grid">
        <div className="stat-card">
          <ActivityIcon size={25} />

          <span>Today's Total Time</span>

          <strong>
            {formatMinutes(totalTimeToday)}
          </strong>
        </div>

        <div className="stat-card">
          <span>Activities Today</span>

          <strong>
            {todaysActivities.length}
          </strong>
        </div>

        <div className="stat-card">
          <span>All-time Logged</span>

          <strong>{activities.length}</strong>
        </div>
      </section>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>
              {editingActivity
                ? "Edit Activity"
                : "Add Activity"}
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
              <label>Activity</label>

              <input
                type="text"
                placeholder="Example: LeetCode practice"
                value={form.activity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    activity: event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <select
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value,
                  })
                }
              >
                {CATEGORIES.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
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
                onChange={(event) =>
                  setForm({
                    ...form,
                    duration: event.target.value,
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
                    date: event.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>

              <input
                type="text"
                placeholder="Anything worth remembering"
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="save-topic-button"
            >
              {editingActivity
                ? "Save Changes"
                : "Add Activity"}
            </button>
          </form>
        </section>
      )}

      {/* TWO COLUMN CONTENT */}

      <section className="two-column">
        {/* TODAY'S ACTIVITIES */}

        <div className="section-card">
          <div className="section-title">
            <ActivityIcon size={22} />

            <h2>Today's Activities</h2>
          </div>

          <div className="topic-list">
            {todaysActivities.map((activity) => (
              <div
                className="topic-row"
                key={activity.id}
              >
                <div className="topic-information">
                  <strong>
                    {activity.activity}
                  </strong>

                  <span>
                    {activity.category} •{" "}
                    {formatMinutes(
                      activity.duration
                    )}
                    {activity.notes
                      ? ` • ${activity.notes}`
                      : ""}
                  </span>
                </div>

                <div className="topic-actions">
                  <button
                    type="button"
                    className="edit-button"
                    title="Edit activity"
                    onClick={() =>
                      openEditForm(activity)
                    }
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    title="Delete activity"
                    onClick={() =>
                      deleteActivity(activity)
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}

            {todaysActivities.length === 0 && (
              <p className="empty-topics">
                No activities logged today.
              </p>
            )}
          </div>
        </div>

        {/* CATEGORY BREAKDOWN */}

        <div className="section-card">
          <div className="section-title">
            <ActivityIcon size={22} />

            <h2>Category Breakdown (Today)</h2>
          </div>

          {categoryBreakdown.length === 0 && (
            <p className="empty-topics">
              Nothing to break down yet.
            </p>
          )}

          {categoryBreakdown.map((category) => (
            <div
              className="water-week-row"
              key={category.category}
            >
              <span>{category.category}</span>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      totalTimeToday
                        ? Math.round(
                            (category.minutes /
                              totalTimeToday) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>

              <span>
                {formatMinutes(category.minutes)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Activities;