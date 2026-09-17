import { useEffect, useMemo, useState } from "react";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import { getTodayLocalDateKey } from "../../utils/calculations";

const DAILY_TARGETS_COLLECTION = "dailyTargets";

const emptyForm = {
  title: "",
  target: "",
  unit: "",
  date: getTodayLocalDateKey(),
};

function DailyTargets() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  /* ============================================================
     INITIAL LOAD + FIREBASE REAL-TIME SYNC
     ============================================================ */

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function load() {
      try {
        const firestoreTargets =
          await getItemsFromFirestore(
            DAILY_TARGETS_COLLECTION
          );

        const normalizedTargets = Array.isArray(
          firestoreTargets
        )
          ? firestoreTargets
              .filter(
                (item) =>
                  item?.id !== undefined &&
                  item?.id !== null
              )
              .map((item) => ({
                ...item,
                id: String(item.id),
              }))
          : [];

        if (isMounted) {
          setTargets(normalizedTargets);
        }

        /* ========================================================
           REAL-TIME FIRESTORE LISTENER
           ======================================================== */

        unsubscribe =
          subscribeToFirestoreCollection(
            DAILY_TARGETS_COLLECTION,
            (firestoreItems) => {
              if (!isMounted) return;

              const normalizedItems =
                Array.isArray(firestoreItems)
                  ? firestoreItems
                      .filter(
                        (item) =>
                          item?.id !== undefined &&
                          item?.id !== null
                      )
                      .map((item) => ({
                        ...item,
                        id: String(item.id),
                      }))
                  : [];

              setTargets(normalizedItems);
            }
          );
      } catch (error) {
        console.error(
          "Failed to load daily targets:",
          error
        );

        if (isMounted) {
          setTargets([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /* ============================================================
     SAVE SINGLE TARGET TO FIREBASE
     ============================================================ */

  async function persistTarget(target) {
    const normalizedTarget = {
      ...target,
      id: String(target.id),
    };

    try {
      await saveItemToFirestore(
        DAILY_TARGETS_COLLECTION,
        String(normalizedTarget.id),
        normalizedTarget
      );

      return true;
    } catch (error) {
      console.error(
        "Failed to save daily target:",
        error
      );

      alert(
        "Failed to save daily target. Please try again."
      );

      return false;
    }
  }

  /* ============================================================
     ADD FORM
     ============================================================ */

  function openAddForm() {
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  /* ============================================================
     EDIT FORM
     ============================================================ */

  function openEditForm(target) {
    setEditingTarget(target);

    setForm({
      title: target.title || "",
      target: target.target ?? "",
      unit: target.unit || "",
      date:
        target.date ||
        getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  /* ============================================================
     CLOSE FORM
     ============================================================ */

  function closeForm() {
    setShowForm(false);
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });
  }

  /* ============================================================
     ADD / UPDATE TARGET
     ============================================================ */

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.date
    ) {
      return;
    }

    const targetValue = Math.max(
      0,
      Number(form.target) || 0
    );

    if (targetValue <= 0) {
      alert(
        "Enter a target greater than 0."
      );
      return;
    }

    /* ========================================================
       UPDATE
       ======================================================== */

    if (editingTarget) {
      const updatedTarget = {
        ...editingTarget,
        id: String(editingTarget.id),
        title: form.title.trim(),
        target: targetValue,
        unit: form.unit.trim(),
        date: form.date,
        completed:
          editingTarget.completed === true,
        completedAt:
          editingTarget.completedAt || null,
        updatedAt:
          new Date().toISOString(),
      };

      const success =
        await persistTarget(updatedTarget);

      if (success) {
        setTargets((previous) =>
          previous.map((item) =>
            String(item.id) ===
            String(editingTarget.id)
              ? updatedTarget
              : item
          )
        );

        closeForm();
      }

      return;
    }

    /* ========================================================
       ADD
       ======================================================== */

    const newTarget = {
      id: String(Date.now()),
      title: form.title.trim(),
      target: targetValue,
      unit: form.unit.trim(),
      date: form.date,
      completed: false,
      completedAt: null,
      createdAt:
        new Date().toISOString(),
    };

    const success =
      await persistTarget(newTarget);

    if (success) {
      setTargets((previous) => [
        ...previous,
        newTarget,
      ]);

      closeForm();
    }
  }

  /* ============================================================
     COMPLETE / INCOMPLETE
     ============================================================ */

  async function toggleComplete(target) {
    const completed =
      target.completed !== true;

    const updatedTarget = {
      ...target,
      id: String(target.id),
      completed,
      completedAt: completed
        ? new Date().toISOString()
        : null,
      updatedAt:
        new Date().toISOString(),
    };

    const success =
      await persistTarget(updatedTarget);

    if (success) {
      setTargets((previous) =>
        previous.map((item) =>
          String(item.id) ===
          String(target.id)
            ? updatedTarget
            : item
        )
      );
    }
  }

  /* ============================================================
     DELETE TARGET
     ============================================================ */

  async function deleteTarget(target) {
    const confirmed =
      window.confirm(
        `Delete "${target.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteItemFromFirestore(
        DAILY_TARGETS_COLLECTION,
        String(target.id)
      );

      setTargets((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(target.id)
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete daily target:",
        error
      );

      alert(
        "Failed to delete target. Please try again."
      );
    }
  }

  /* ============================================================
     TODAY'S DATA
     ============================================================ */

  const today =
    getTodayLocalDateKey();

  const todaysTargets = useMemo(
    () =>
      targets.filter(
        (target) =>
          target.date === today
      ),
    [targets, today]
  );

  const completedCount =
    todaysTargets.filter(
      (target) =>
        target.completed === true
    ).length;

  const completionPercentage =
    todaysTargets.length === 0
      ? 0
      : Math.round(
          (completedCount /
            todaysTargets.length) *
            100
        );

  /* ============================================================
     OTHER DATE TARGETS
     ============================================================ */

  const otherDateTargets = useMemo(() => {
    return targets
      .filter(
        (target) =>
          target.date !== today
      )
      .sort((a, b) =>
        String(a.date).localeCompare(
          String(b.date)
        )
      );
  }, [targets, today]);

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <div className="module-page">
        <h1>
          🎯 Daily Targets
        </h1>

        <p>
          Loading daily targets...
        </p>
      </div>
    );
  }

  /* ============================================================
     UI
     ============================================================ */

  return (
    <div className="module-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="page-header">

        <div>

          <h1>
            🎯 Daily Targets
          </h1>

          <p>
            Set measurable objectives for a specific day.
          </p>

          <p
            style={{
              fontSize: "13px",
              opacity: 0.7,
              marginTop: "4px",
            }}
          >
            Synced with your Taskbar account.
          </p>

        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Target
        </button>

      </div>

      {/* ======================================================
          STATS
          ====================================================== */}

      <section className="stat-grid">

        <div className="stat-card">

          <Target size={25} />

          <span>
            Today's Targets
          </span>

          <strong>
            {todaysTargets.length}
          </strong>

        </div>

        <div className="stat-card">

          <CheckCircle2 size={25} />

          <span>
            Completed
          </span>

          <strong>
            {completedCount}
          </strong>

        </div>

        <div className="stat-card">

          <Target size={25} />

          <span>
            Completion
          </span>

          <strong>
            {completionPercentage}%
          </strong>

        </div>

      </section>

      {/* ======================================================
          FORM
          ====================================================== */}

      {showForm && (

        <section
          className="module-form-card"
          style={{
            marginTop: 20,
          }}
        >

          <div className="add-topic-header">

            <h2>
              {editingTarget
                ? "Edit Daily Target"
                : "Add Daily Target"}
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

            {/* TARGET */}

            <div className="form-group">

              <label>
                Target *
              </label>

              <input
                type="text"
                placeholder="Example: Solve 3 DSA problems"
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title:
                      event.target.value,
                  })
                }
              />

            </div>

            {/* VALUE */}

            <div className="form-group">

              <label>
                Target Value *
              </label>

              <input
                type="number"
                min="1"
                placeholder="Example: 3"
                value={form.target}
                onChange={(event) =>
                  setForm({
                    ...form,
                    target:
                      event.target.value,
                  })
                }
              />

            </div>

            {/* UNIT */}

            <div className="form-group">

              <label>
                Unit
              </label>

              <input
                type="text"
                placeholder="Example: problems, hours, pages"
                value={form.unit}
                onChange={(event) =>
                  setForm({
                    ...form,
                    unit:
                      event.target.value,
                  })
                }
              />

            </div>

            {/* DATE */}

            <div className="form-group">

              <label>
                Date *
              </label>

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

            <button
              type="submit"
              className="save-topic-button"
            >
              {editingTarget
                ? "Save Changes"
                : "Add Target"}
            </button>

          </form>

        </section>

      )}

      {/* ======================================================
          TODAY'S TARGETS
          ====================================================== */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <div>

            <h2>
              Today's Targets
            </h2>

            <p>
              Measurable objectives you've set for today.
            </p>

          </div>

        </div>

        <div className="topic-list">

          {todaysTargets.map(
            (target) => (

              <div
                className="topic-row"
                key={target.id}
              >

                <div className="topic-information">

                  <strong
                    style={{
                      textDecoration:
                        target.completed
                          ? "line-through"
                          : "none",
                    }}
                  >
                    {target.title}
                  </strong>

                  <span>
                    Target:{" "}
                    {target.target}

                    {target.unit
                      ? ` ${target.unit}`
                      : ""}
                  </span>

                </div>

                <div className="topic-actions">

                  {/* COMPLETE */}

                  <button
                    type="button"
                    className="edit-button"
                    title={
                      target.completed
                        ? "Mark incomplete"
                        : "Mark complete"
                    }
                    onClick={() =>
                      toggleComplete(
                        target
                      )
                    }
                  >

                    {target.completed ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <Circle
                        size={18}
                      />
                    )}

                  </button>

                  {/* EDIT */}

                  <button
                    type="button"
                    className="edit-button"
                    title="Edit target"
                    onClick={() =>
                      openEditForm(
                        target
                      )
                    }
                  >
                    <Pencil
                      size={17}
                    />
                  </button>

                  {/* DELETE */}

                  <button
                    type="button"
                    className="delete-button"
                    title="Delete target"
                    onClick={() =>
                      deleteTarget(
                        target
                      )
                    }
                  >
                    <Trash2
                      size={17}
                    />
                  </button>

                </div>

              </div>
            )
          )}

          {todaysTargets.length ===
            0 && (
            <p className="empty-topics">
              No targets set for today.
            </p>
          )}

        </div>

      </section>

      {/* ======================================================
          OTHER DATES
          ====================================================== */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Target size={22} />

          <h2>
            Other Dates
          </h2>

        </div>

        <p>
          Targets for other dates remain stored and
          will not be mixed into today's target list.
        </p>

        {otherDateTargets.length > 0 && (

          <div
            style={{
              marginTop: 14,
            }}
          >

            {otherDateTargets.map(
              (target) => (

                <div
                  className="topic-row"
                  key={target.id}
                >

                  <div className="topic-information">

                    <strong>
                      {target.title}
                    </strong>

                    <span>

                      {target.date}

                      {" • "}

                      {target.target}

                      {target.unit
                        ? ` ${target.unit}`
                        : ""}

                      {" • "}

                      {target.completed
                        ? "Completed"
                        : "Pending"}

                    </span>

                  </div>

                  <div className="topic-actions">

                    {/* EDIT */}

                    <button
                      type="button"
                      className="edit-button"
                      title="Edit target"
                      onClick={() =>
                        openEditForm(
                          target
                        )
                      }
                    >
                      <Pencil
                        size={17}
                      />
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      className="delete-button"
                      title="Delete target"
                      onClick={() =>
                        deleteTarget(
                          target
                        )
                      }
                    >
                      <Trash2
                        size={17}
                      />
                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}

export default DailyTargets;