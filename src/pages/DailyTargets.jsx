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
  const [editingTarget, setEditingTarget] =
    useState(null);
  const [form, setForm] =
    useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        const saved =
          await getDailyTargets();

        setTargets(
          Array.isArray(saved)
            ? saved
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load daily targets:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function persist(updated) {
    setTargets(updated);

    try {
      await saveDailyTargets(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to save daily targets:",
        error
      );
    }
  }

  function openAddForm() {
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  function openEditForm(target) {
    setEditingTarget(target);

    setForm({
      title: target.title || "",
      target:
        target.target ?? "",
      unit: target.unit || "",
      date:
        target.date ||
        getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTarget(null);
    setForm(emptyForm);
  }

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

    const target = {
      ...(editingTarget || {}),
      title:
        form.title.trim(),
      target: targetValue,
      unit:
        form.unit.trim(),
      date: form.date,
      completed:
        editingTarget?.completed ===
        true,
      completedAt:
        editingTarget?.completedAt ||
        null,
    };

    if (editingTarget) {
      await persist(
        targets.map((item) =>
          item.id ===
          editingTarget.id
            ? target
            : item
        )
      );
    } else {
      await persist([
        ...targets,
        {
          ...target,
          id: Date.now(),
        },
      ]);
    }

    closeForm();
  }

  async function toggleComplete(target) {
    const completed =
      target.completed !== true;

    await persist(
      targets.map((item) =>
        item.id === target.id
          ? {
              ...item,
              completed,
              completedAt: completed
                ? new Date().toISOString()
                : null,
            }
          : item
      )
    );
  }

  async function deleteTarget(target) {
    const confirmed =
      window.confirm(
        `Delete "${target.title}"?`
      );

    if (!confirmed) {
      return;
    }

    await persist(
      targets.filter(
        (item) =>
          item.id !== target.id
      )
    );
  }

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

        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
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
              onClick={
                closeForm
              }
            >
              <X size={20} />
            </button>

          </div>


          <form
            className="grid-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* TITLE */}

            <div className="form-group">

              <label>
                Target *
              </label>

              <input
                type="text"
                placeholder="Example: Solve 3 DSA problems"
                value={
                  form.title
                }
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
                value={
                  form.target
                }
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
                value={
                  form.unit
                }
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
                value={
                  form.date
                }
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
                          size={
                            17
                          }
                        />
                      </button>


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
                          size={
                            17
                          }
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