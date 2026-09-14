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
  getDailyTargets,
  saveDailyTargets,
} from "../utils/db";

import {
  getTodayLocalDateKey,
} from "../utils/calculations";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../firebase/firestore";

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

  /*
   * ============================================================
   * INITIAL LOAD + FIREBASE SYNC
   * ============================================================
   */

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function load() {
      try {
        // --------------------------------------------------------
        // 1. Load local IndexedDB data first
        // --------------------------------------------------------

        const localData = await getDailyTargets();

        const localTargets = Array.isArray(localData)
          ? localData
          : [];

        if (isMounted) {
          setTargets(localTargets);
        }

        // --------------------------------------------------------
        // 2. Get cloud data from Firestore
        // --------------------------------------------------------

        let cloudTargets = [];

        try {
          cloudTargets =
            await getItemsFromFirestore("dailyTargets");

          if (!Array.isArray(cloudTargets)) {
            cloudTargets = [];
          }
        } catch (error) {
          console.error(
            "Failed to load daily targets from Firestore:",
            error
          );
        }

        // --------------------------------------------------------
        // 3. Merge local + cloud data
        //    Cloud version wins when the same ID exists.
        // --------------------------------------------------------

        const mergedMap = new Map();

        localTargets.forEach((item) => {
          if (item?.id !== undefined && item?.id !== null) {
            mergedMap.set(String(item.id), {
              ...item,
              id: String(item.id),
            });
          }
        });

        cloudTargets.forEach((item) => {
          if (item?.id !== undefined && item?.id !== null) {
            mergedMap.set(String(item.id), {
              ...item,
              id: String(item.id),
            });
          }
        });

        const mergedTargets = Array.from(
          mergedMap.values()
        );

        if (isMounted) {
          setTargets(mergedTargets);
        }

        // --------------------------------------------------------
        // 4. Save merged data locally
        // --------------------------------------------------------

        await saveDailyTargets(mergedTargets);

        // --------------------------------------------------------
        // 5. Upload local-only targets to Firestore
        // --------------------------------------------------------

        const cloudIds = new Set(
          cloudTargets.map((item) => String(item.id))
        );

        for (const item of localTargets) {
          const itemId = String(item.id);

          if (!cloudIds.has(itemId)) {
            try {
              await saveItemToFirestore(
                "dailyTargets",
                itemId,
                {
                  ...item,
                  id: itemId,
                }
              );
            } catch (error) {
              console.error(
                "Failed to upload daily target:",
                error
              );
            }
          }
        }

        // --------------------------------------------------------
        // 6. Listen for real-time Firestore changes
        // --------------------------------------------------------

        unsubscribe =
          subscribeToFirestoreCollection(
            "dailyTargets",
            async (firestoreItems) => {
              if (!isMounted) {
                return;
              }

              const normalizedItems =
                Array.isArray(firestoreItems)
                  ? firestoreItems.map((item) => ({
                      ...item,
                      id: String(item.id),
                    }))
                  : [];

              setTargets(normalizedItems);

              try {
                await saveDailyTargets(
                  normalizedItems
                );
              } catch (error) {
                console.error(
                  "Failed to update IndexedDB from Firestore:",
                  error
                );
              }
            }
          );
      } catch (error) {
        console.error(
          "Failed to load daily targets:",
          error
        );
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

  /*
   * ============================================================
   * SAVE DATA
   * ============================================================
   */

  async function persist(updated, changedTarget = null) {
    const normalizedTargets = updated.map((item) => ({
      ...item,
      id: String(item.id),
    }));

    // Update UI immediately
    setTargets(normalizedTargets);

    // Save locally
    try {
      await saveDailyTargets(normalizedTargets);
    } catch (error) {
      console.error(
        "Failed to save daily targets locally:",
        error
      );
    }

    // Save changed item to Firestore
    if (changedTarget) {
      try {
        await saveItemToFirestore(
          "dailyTargets",
          String(changedTarget.id),
          {
            ...changedTarget,
            id: String(changedTarget.id),
          }
        );
      } catch (error) {
        console.error(
          "Failed to save daily target to Firestore:",
          error
        );
      }
    }
  }

  /*
   * ============================================================
   * ADD FORM
   * ============================================================
   */

  function openAddForm() {
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  /*
   * ============================================================
   * EDIT FORM
   * ============================================================
   */

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

  /*
   * ============================================================
   * CLOSE FORM
   * ============================================================
   */

  function closeForm() {
    setShowForm(false);
    setEditingTarget(null);
    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });
  }

  /*
   * ============================================================
   * ADD / UPDATE TARGET
   * ============================================================
   */

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

    if (editingTarget) {
      const updatedTarget = {
        ...editingTarget,
        title: form.title.trim(),
        target: targetValue,
        unit: form.unit.trim(),
        date: form.date,
        completed:
          editingTarget.completed === true,
        completedAt:
          editingTarget.completedAt || null,
      };

      const updated = targets.map((item) =>
        String(item.id) ===
        String(editingTarget.id)
          ? updatedTarget
          : item
      );

      await persist(
        updated,
        updatedTarget
      );
    } else {
      const newTarget = {
        id: String(Date.now()),
        title: form.title.trim(),
        target: targetValue,
        unit: form.unit.trim(),
        date: form.date,
        completed: false,
        completedAt: null,
      };

      await persist(
        [...targets, newTarget],
        newTarget
      );
    }

    closeForm();
  }

  /*
   * ============================================================
   * COMPLETE / INCOMPLETE
   * ============================================================
   */

  async function toggleComplete(target) {
    const completed =
      target.completed !== true;

    const updatedTarget = {
      ...target,
      completed,
      completedAt: completed
        ? new Date().toISOString()
        : null,
    };

    const updated = targets.map((item) =>
      String(item.id) ===
      String(target.id)
        ? updatedTarget
        : item
    );

    await persist(
      updated,
      updatedTarget
    );
  }

  /*
   * ============================================================
   * DELETE TARGET
   * ============================================================
   */

  async function deleteTarget(target) {
    const confirmed =
      window.confirm(
        `Delete "${target.title}"?`
      );

    if (!confirmed) {
      return;
    }

    const updated = targets.filter(
      (item) =>
        String(item.id) !==
        String(target.id)
    );

    // Update local state
    setTargets(updated);

    // Save locally
    try {
      await saveDailyTargets(updated);
    } catch (error) {
      console.error(
        "Failed to delete target locally:",
        error
      );
    }

    // Delete from Firestore
    try {
      await deleteItemFromFirestore(
        "dailyTargets",
        String(target.id)
      );
    } catch (error) {
      console.error(
        "Failed to delete target from Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * TODAY'S DATA
   * ============================================================
   */

  const today =
    getTodayLocalDateKey();

  const todaysTargets =
    useMemo(
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

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

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
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Target
        </button>

      </div>


      {/* STATS */}

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


      {/* FORM */}

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

            {/* TITLE */}

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


      {/* TODAY'S TARGETS */}

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


      {/* OTHER DATES */}

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

        {targets.filter(
          (target) =>
            target.date !== today
        ).length > 0 && (

          <div
            style={{
              marginTop: 14,
            }}
          >

            {targets
              .filter(
                (target) =>
                  target.date !==
                  today
              )
              .sort(
                (a, b) =>
                  String(
                    a.date
                  ).localeCompare(
                    String(
                      b.date
                    )
                  )
              )
              .map(
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