import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Pin,
  PinOff,
} from "lucide-react";

import {
  getQuickTasks,
  saveQuickTasks,
} from "../../utils/db";

import {
  getItemsFromFirestore,
  saveItemsToFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import {
  getTodayLocalDateKey,
  calculateDaysRemaining,
  getLocalDateKey,
} from "../../utils/calculations";


const emptyForm = {
  task: "",
  dueDate: "",
  priority: "Medium",
  status: "pending",
  pinned: false,
};


function QuickTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);


  /* =========================================================
     LOAD TASKS
  ========================================================= */

  useEffect(() => {
    let unsubscribe = () => {};
    let mounted = true;

    async function load() {
      try {
        const localTasks = await getQuickTasks();
        const cloudTasks = await getItemsFromFirestore("quickTasks");

        const normalize = (items) =>
          (Array.isArray(items) ? items : []).map((task) => ({
            ...task,
            id: String(task.id),
            pinned: task.pinned === true,
          }));

        const local = normalize(localTasks);
        const cloud = normalize(cloudTasks);

        const mergedMap = new Map();
        local.forEach((task) => mergedMap.set(task.id, task));
        cloud.forEach((task) => mergedMap.set(task.id, task));

        const merged = Array.from(mergedMap.values());

        if (!mounted) return;
        setTasks(merged);
        await saveQuickTasks(merged);

        // Upload tasks that existed only on this device.
        const cloudIds = new Set(cloud.map((task) => task.id));
        const localOnly = local.filter((task) => !cloudIds.has(task.id));
        if (localOnly.length > 0) {
          await saveItemsToFirestore("quickTasks", localOnly);
        }

        unsubscribe = subscribeToFirestoreCollection(
          "quickTasks",
          async (items) => {
            if (!mounted) return;

            const normalized = normalize(items);
            setTasks(normalized);
            await saveQuickTasks(normalized);
          }
        );
      } catch (error) {
        console.error(
          "Failed to load quick tasks:",
          error
        );

        try {
          const savedTasks = await getQuickTasks();
          const normalizedTasks = (
            Array.isArray(savedTasks) ? savedTasks : []
          ).map((task) => ({
            ...task,
            id: String(task.id),
            pinned: task.pinned === true,
          }));

          if (mounted) setTasks(normalizedTasks);
        } catch (localError) {
          console.error(
            "Failed to load local quick tasks:",
            localError
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);


  /* =========================================================
     SAVE TASKS
  ========================================================= */

  async function persist(updated, changedTask = null) {
    const normalized = updated.map((task) => ({
      ...task,
      id: String(task.id),
      pinned: task.pinned === true,
    }));

    setTasks(normalized);

    try {
      await saveQuickTasks(normalized);

      if (changedTask) {
        await saveItemToFirestore(
          "quickTasks",
          String(changedTask.id),
          {
            ...changedTask,
            id: String(changedTask.id),
            pinned: changedTask.pinned === true,
          }
        );
      }
    } catch (error) {
      console.error(
        "Failed to save quick task:",
        error
      );
    }
  }


  const today = getTodayLocalDateKey();


  /* =========================================================
     GROUP TASKS
  ========================================================= */

  const grouped = useMemo(() => {
    const pending = tasks.filter(
      (task) =>
        task.status !== "completed"
    );

    const todays = pending.filter(
      (task) =>
        task.dueDate === today
    );

    const overdue = pending.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < today
    );

    const upcoming = pending.filter(
      (task) =>
        !task.dueDate ||
        task.dueDate > today
    );

    const completed = tasks.filter(
      (task) =>
        task.status === "completed"
    );

    /*
      Pinned tasks are shown separately.
      Completed tasks are not included in the
      pinned section.
    */
    const pinned = pending.filter(
      (task) =>
        task.pinned === true
    );

    return {
      todays,
      overdue,
      upcoming,
      completed,
      pinned,
    };
  }, [tasks, today]);


  /* =========================================================
     ADD
  ========================================================= */

  function openAddForm() {
    setEditingTask(null);

    setForm({
      ...emptyForm,
    });

    setShowForm(true);
  }


  /* =========================================================
     EDIT
  ========================================================= */

  function openEditForm(task) {
    setEditingTask(task);

    setForm({
      task: task.task,
      dueDate: task.dueDate || "",
      priority: task.priority || "Medium",
      status: task.status || "pending",
      pinned: task.pinned === true,
    });

    setShowForm(true);
  }


  /* =========================================================
     CLOSE FORM
  ========================================================= */

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);

    setForm({
      ...emptyForm,
    });
  }


  /* =========================================================
     SUBMIT
  ========================================================= */

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.task.trim()) {
      return;
    }

    if (editingTask) {
      const updatedTask = {
        ...editingTask,
        ...form,
        id: String(editingTask.id),
        task: form.task.trim(),
        pinned: form.pinned === true,
      };

      persist(
        tasks.map((task) =>
          String(task.id) === String(editingTask.id)
            ? updatedTask
            : task
        ),
        updatedTask
      );
    } else {
      const newTask = {
        id: String(Date.now()),
        ...form,
        task: form.task.trim(),
        pinned: form.pinned === true,
      };

      persist(
        [...tasks, newTask],
        newTask
      );
    }

    closeForm();
  }


  /* =========================================================
     DELETE
  ========================================================= */

  function deleteTask(task) {
    const confirmed = window.confirm(
      `Delete "${task.task}"?`
    );

    if (!confirmed) {
      return;
    }

    persist(
      tasks.filter(
        (item) =>
          String(item.id) !== String(task.id)
      )
    );

    deleteItemFromFirestore(
      "quickTasks",
      String(task.id)
    ).catch((error) => {
      console.error(
        "Failed to delete quick task from Firestore:",
        error
      );
    });
  }


  /* =========================================================
     COMPLETE
  ========================================================= */

  function toggleComplete(task) {
    const isCurrentlyCompleted =
      task.status === "completed";

    const updatedTask = {
      ...task,
      status: isCurrentlyCompleted
        ? "pending"
        : "completed",
      completedAt: isCurrentlyCompleted
        ? undefined
        : getLocalDateKey(),
    };

    persist(
      tasks.map((item) =>
        String(item.id) === String(task.id)
          ? updatedTask
          : item
      ),
      updatedTask
    );
  }


  /* =========================================================
     PIN / UNPIN
  ========================================================= */

  function togglePin(task) {
    const updatedTask = {
      ...task,
      pinned: task.pinned !== true,
    };

    persist(
      tasks.map((item) =>
        String(item.id) === String(task.id)
          ? updatedTask
          : item
      ),
      updatedTask
    );
  }


  /* =========================================================
     TASK ROW
  ========================================================= */

  function TaskRow({ task }) {
    const days = task.dueDate
      ? calculateDaysRemaining(
          task.dueDate
        )
      : null;

    const isPinned =
      task.pinned === true;

    return (
      <div
        className={`topic-row priority-${(
          task.priority || "Medium"
        ).toLowerCase()}`}
      >

        <div className="topic-information">

          <label className="task-checkbox-label">

            <input
              type="checkbox"
              checked={
                task.status === "completed"
              }
              onChange={() =>
                toggleComplete(task)
              }
            />

            <strong
              className={
                task.status === "completed"
                  ? "strike"
                  : ""
              }
            >
              {task.task}
            </strong>

          </label>


          <span>

            <span
              className={`badge badge-priority-${(
                task.priority || "Medium"
              ).toLowerCase()}`}
            >
              {task.priority || "Medium"}
            </span>


            {task.dueDate &&
              ` • Due ${new Date(
                `${task.dueDate}T00:00:00`
              ).toLocaleDateString("en-IN")}`}


            {days !== null &&
              task.status !== "completed" &&
              days < 0 &&
              " • Overdue"}

          </span>

        </div>


        <div className="topic-actions">

          {/* PIN / UNPIN */}

          <button
            className="edit-button"
            onClick={() =>
              togglePin(task)
            }
            title={
              isPinned
                ? "Unpin task"
                : "Pin task"
            }
            aria-label={
              isPinned
                ? `Unpin ${task.task}`
                : `Pin ${task.task}`
            }
            style={{
              color: isPinned
                ? "#2563eb"
                : undefined,
              background: isPinned
                ? "#eff6ff"
                : undefined,
            }}
          >
            {isPinned ? (
              <PinOff size={17} />
            ) : (
              <Pin size={17} />
            )}
          </button>


          {/* COMPLETE */}

          <button
            className="edit-button"
            onClick={() =>
              toggleComplete(task)
            }
            title="Toggle complete"
          >
            <Check size={17} />
          </button>


          {/* EDIT */}

          <button
            className="edit-button"
            onClick={() =>
              openEditForm(task)
            }
            title="Edit task"
          >
            <Pencil size={17} />
          </button>


          {/* DELETE */}

          <button
            className="delete-button"
            onClick={() =>
              deleteTask(task)
            }
            title="Delete task"
          >
            <Trash2 size={17} />
          </button>

        </div>

      </div>
    );
  }


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="module-page">
        <h1>⚡ Quick Tasks</h1>
        <p>Loading tasks...</p>
      </div>
    );
  }


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="module-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">

        <div>
          <h1>⚡ Quick Tasks</h1>

          <p>
            Small, fast to-dos that don't
            deserve their own project.
          </p>

          <small style={{ opacity: 0.7 }}>
            Synced with your Taskbar account.
          </small>
        </div>


        <button
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Task
        </button>

      </div>


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="stat-grid">

        <div className="stat-card">
          <CheckSquare size={25} />

          <span>Today</span>

          <strong>
            {grouped.todays.length}
          </strong>
        </div>


        <div className="stat-card">

          <span>Overdue</span>

          <strong>
            {grouped.overdue.length}
          </strong>

        </div>


        <div className="stat-card">

          <span>Upcoming</span>

          <strong>
            {grouped.upcoming.length}
          </strong>

        </div>


        <div className="stat-card">

          <span>Completed</span>

          <strong>
            {grouped.completed.length}
          </strong>

        </div>

      </section>


      {/* =====================================================
          ADD / EDIT FORM
      ===================================================== */}

      {showForm && (

        <section className="module-form-card">

          <div className="add-topic-header">

            <h2>
              {editingTask
                ? "Edit Task"
                : "Add Task"}
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
                Task
              </label>

              <input
                type="text"
                placeholder="Example: Update resume"
                value={form.task}
                onChange={(event) =>
                  setForm({
                    ...form,
                    task: event.target.value,
                  })
                }
              />

            </div>


            <div className="form-group">

              <label>
                Due Date
              </label>

              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dueDate:
                      event.target.value,
                  })
                }
              />

            </div>


            <div className="form-group">

              <label>
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority:
                      event.target.value,
                  })
                }
              >
                <option value="Low">
                  Low
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="High">
                  High
                </option>
              </select>

            </div>


            <div className="form-group">

              <label>
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status:
                      event.target.value,
                  })
                }
              >

                <option value="pending">
                  Pending
                </option>

                <option value="completed">
                  Completed
                </option>

              </select>

            </div>


            {/* PIN OPTION */}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontWeight: 600,
                marginTop: "4px",
              }}
            >

              <input
                type="checkbox"
                checked={
                  form.pinned === true
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    pinned:
                      event.target.checked,
                  })
                }
              />

              <Pin size={17} />

              Pin this task

            </label>


            <button
              type="submit"
              className="save-topic-button"
            >
              {editingTask
                ? "Save Changes"
                : "Add Task"}
            </button>

          </form>

        </section>
      )}


      {/* =====================================================
          PINNED TASKS
      ===================================================== */}

      {grouped.pinned.length > 0 && (

        <section className="learning-section">

          <div className="topic-header">

            <h2>
              📌 Pinned Tasks
            </h2>

          </div>


          <div className="topic-list">

            {grouped.pinned.map(
              (task) => (
                <TaskRow
                  task={task}
                  key={task.id}
                />
              )
            )}

          </div>

        </section>
      )}


      {/* =====================================================
          TODAY & OVERDUE
      ===================================================== */}

      <section
        className="learning-section"
        style={{
          marginTop:
            grouped.pinned.length > 0
              ? 20
              : 0,
        }}
      >

        <div className="topic-header">

          <h2>
            Today & Overdue
          </h2>

        </div>


        <div className="topic-list">

          {[
            ...grouped.overdue,
            ...grouped.todays,
          ].map((task) => (

            <TaskRow
              task={task}
              key={task.id}
            />

          ))}


          {grouped.overdue.length === 0 &&
            grouped.todays.length === 0 && (

              <p className="empty-topics">
                Nothing due today. Nice.
              </p>

            )}

        </div>

      </section>


      {/* =====================================================
          UPCOMING
      ===================================================== */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <h2>
            Upcoming
          </h2>

        </div>


        <div className="topic-list">

          {grouped.upcoming.map(
            (task) => (
              <TaskRow
                task={task}
                key={task.id}
              />
            )
          )}


          {grouped.upcoming.length === 0 && (

            <p className="empty-topics">
              No upcoming tasks.
            </p>

          )}

        </div>

      </section>


      {/* =====================================================
          COMPLETED
      ===================================================== */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <h2>
            Completed
          </h2>

        </div>


        <div className="topic-list">

          {grouped.completed.map(
            (task) => (
              <TaskRow
                task={task}
                key={task.id}
              />
            )
          )}


          {grouped.completed.length === 0 && (

            <p className="empty-topics">
              No completed tasks yet.
            </p>

          )}

        </div>

      </section>

    </div>
  );
}


export default QuickTasks;
