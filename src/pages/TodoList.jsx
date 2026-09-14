import { useEffect, useMemo, useState } from "react";
import {
  ListTodo,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";

import {
  getTodoList,
  saveTodoList,
} from "../utils/db";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../firebase/firestore";

const emptyForm = {
  title: "",
};

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
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
        // 1. Load local IndexedDB data
        // --------------------------------------------------------

        const localData = await getTodoList();

        const localTodos = Array.isArray(localData)
          ? localData
          : [];

        if (isMounted) {
          setTodos(
            localTodos.map((item) => ({
              ...item,
              id: String(item.id),
            }))
          );
        }

        // --------------------------------------------------------
        // 2. Load cloud data from Firestore
        // --------------------------------------------------------

        let cloudTodos = [];

        try {
          cloudTodos =
            await getItemsFromFirestore("todoList");

          if (!Array.isArray(cloudTodos)) {
            cloudTodos = [];
          }
        } catch (error) {
          console.error(
            "Failed to load todo list from Firestore:",
            error
          );
        }

        // --------------------------------------------------------
        // 3. Normalize cloud IDs
        // --------------------------------------------------------

        cloudTodos = cloudTodos.map((item) => ({
          ...item,
          id: String(item.id),
        }));

        // --------------------------------------------------------
        // 4. Merge local + cloud
        //    Cloud version wins when same ID exists.
        // --------------------------------------------------------

        const mergedMap = new Map();

        localTodos.forEach((item) => {
          if (
            item?.id !== undefined &&
            item?.id !== null
          ) {
            const normalized = {
              ...item,
              id: String(item.id),
            };

            mergedMap.set(
              String(item.id),
              normalized
            );
          }
        });

        cloudTodos.forEach((item) => {
          if (
            item?.id !== undefined &&
            item?.id !== null
          ) {
            mergedMap.set(
              String(item.id),
              item
            );
          }
        });

        const mergedTodos =
          Array.from(mergedMap.values());

        if (isMounted) {
          setTodos(mergedTodos);
        }

        // --------------------------------------------------------
        // 5. Save merged data locally
        // --------------------------------------------------------

        await saveTodoList(mergedTodos);

        // --------------------------------------------------------
        // 6. Upload local-only tasks to Firestore
        // --------------------------------------------------------

        const cloudIds = new Set(
          cloudTodos.map((item) =>
            String(item.id)
          )
        );

        for (const item of localTodos) {
          if (
            item?.id === undefined ||
            item?.id === null
          ) {
            continue;
          }

          const itemId = String(item.id);

          if (!cloudIds.has(itemId)) {
            try {
              await saveItemToFirestore(
                "todoList",
                itemId,
                {
                  ...item,
                  id: itemId,
                }
              );
            } catch (error) {
              console.error(
                "Failed to upload todo task:",
                error
              );
            }
          }
        }

        // --------------------------------------------------------
        // 7. Real-time Firestore listener
        // --------------------------------------------------------

        unsubscribe =
          subscribeToFirestoreCollection(
            "todoList",
            async (firestoreItems) => {
              if (!isMounted) {
                return;
              }

              const normalizedItems =
                Array.isArray(firestoreItems)
                  ? firestoreItems.map(
                      (item) => ({
                        ...item,
                        id: String(item.id),
                      })
                    )
                  : [];

              setTodos(normalizedItems);

              try {
                await saveTodoList(
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
          "Failed to load todo list:",
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
   * PERSIST
   * ============================================================
   */

  async function persist(
    updated,
    changedTodo = null
  ) {
    const normalizedTodos =
      updated.map((item) => ({
        ...item,
        id: String(item.id),
      }));

    // Update UI immediately
    setTodos(normalizedTodos);

    // Save locally
    try {
      await saveTodoList(
        normalizedTodos
      );
    } catch (error) {
      console.error(
        "Failed to save todo list locally:",
        error
      );
    }

    // Save changed task to Firestore
    if (changedTodo) {
      try {
        await saveItemToFirestore(
          "todoList",
          String(changedTodo.id),
          {
            ...changedTodo,
            id: String(changedTodo.id),
          }
        );
      } catch (error) {
        console.error(
          "Failed to save todo task to Firestore:",
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
    setEditingTodo(null);
    setForm({
      ...emptyForm,
    });
    setShowForm(true);
  }

  /*
   * ============================================================
   * EDIT FORM
   * ============================================================
   */

  function openEditForm(todo) {
    setEditingTodo(todo);

    setForm({
      title: todo.title || "",
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
    setEditingTodo(null);
    setForm({
      ...emptyForm,
    });
  }

  /*
   * ============================================================
   * ADD / EDIT TASK
   * ============================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (editingTodo) {
      const updatedTodo = {
        ...editingTodo,
        id: String(editingTodo.id),
        title: form.title.trim(),
        completed:
          editingTodo.completed === true,
        completedAt:
          editingTodo.completedAt || null,
      };

      const updated =
        todos.map((item) =>
          String(item.id) ===
          String(editingTodo.id)
            ? updatedTodo
            : item
        );

      await persist(
        updated,
        updatedTodo
      );
    } else {
      const newTodo = {
        id: String(Date.now()),
        title: form.title.trim(),
        completed: false,
        completedAt: null,
      };

      await persist(
        [...todos, newTodo],
        newTodo
      );
    }

    closeForm();
  }

  /*
   * ============================================================
   * COMPLETE / INCOMPLETE
   * ============================================================
   */

  async function toggleTodo(todo) {
    const completed =
      todo.completed !== true;

    const updatedTodo = {
      ...todo,
      id: String(todo.id),
      completed,
      completedAt: completed
        ? new Date().toISOString()
        : null,
    };

    const updated =
      todos.map((item) =>
        String(item.id) ===
        String(todo.id)
          ? updatedTodo
          : item
      );

    await persist(
      updated,
      updatedTodo
    );
  }

  /*
   * ============================================================
   * DELETE
   * ============================================================
   */

  async function deleteTodo(todo) {
    const confirmed =
      window.confirm(
        `Delete "${todo.title}"?`
      );

    if (!confirmed) {
      return;
    }

    const updated =
      todos.filter(
        (item) =>
          String(item.id) !==
          String(todo.id)
      );

    // Update local state
    setTodos(updated);

    // Save locally
    try {
      await saveTodoList(updated);
    } catch (error) {
      console.error(
        "Failed to delete todo locally:",
        error
      );
    }

    // Delete from Firestore
    try {
      await deleteItemFromFirestore(
        "todoList",
        String(todo.id)
      );
    } catch (error) {
      console.error(
        "Failed to delete todo from Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * FILTERED DATA
   * ============================================================
   */

  const pendingTodos = useMemo(
    () =>
      todos.filter(
        (todo) =>
          todo.completed !== true
      ),
    [todos]
  );

  const completedTodos = useMemo(
    () =>
      todos.filter(
        (todo) =>
          todo.completed === true
      ),
    [todos]
  );

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="module-page">
        <h1>✅ General To-Do</h1>

        <p>
          Loading to-do list...
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
            ✅ General To-Do
          </h1>

          <p>
            Manage general personal tasks outside your other Taskbar systems.
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
          Add Task
        </button>

      </div>


      {/* STATS */}

      <section className="stat-grid">

        <div className="stat-card">

          <ListTodo size={25} />

          <span>
            Total Tasks
          </span>

          <strong>
            {todos.length}
          </strong>

        </div>


        <div className="stat-card">

          <Circle size={25} />

          <span>
            Pending
          </span>

          <strong>
            {pendingTodos.length}
          </strong>

        </div>


        <div className="stat-card">

          <CheckCircle2 size={25} />

          <span>
            Completed
          </span>

          <strong>
            {completedTodos.length}
          </strong>

        </div>

      </section>


      {/* ADD / EDIT FORM */}

      {showForm && (
        <section
          className="module-form-card"
          style={{
            marginTop: 20,
          }}
        >

          <div className="add-topic-header">

            <h2>
              {editingTodo
                ? "Edit Task"
                : "Add General Task"}
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
                Task *
              </label>

              <input
                type="text"
                placeholder="Example: Clean study table"
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


            <button
              type="submit"
              className="save-topic-button"
            >
              {editingTodo
                ? "Save Changes"
                : "Add Task"}
            </button>

          </form>

        </section>
      )}


      {/* PENDING TASKS */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <div>

            <h2>
              Pending Tasks
            </h2>

            <p>
              General personal tasks that still need to be completed.
            </p>

          </div>

        </div>


        <div className="topic-list">

          {pendingTodos.map(
            (todo) => (
              <div
                className="topic-row"
                key={todo.id}
              >

                <div className="topic-information">

                  <strong>
                    {todo.title}
                  </strong>

                  <span>
                    Pending
                  </span>

                </div>


                <div className="topic-actions">

                  <button
                    type="button"
                    className="edit-button"
                    title="Mark complete"
                    onClick={() =>
                      toggleTodo(todo)
                    }
                  >
                    <CheckCircle2
                      size={18}
                    />
                  </button>


                  <button
                    type="button"
                    className="edit-button"
                    title="Edit task"
                    onClick={() =>
                      openEditForm(todo)
                    }
                  >
                    <Pencil
                      size={17}
                    />
                  </button>


                  <button
                    type="button"
                    className="delete-button"
                    title="Delete task"
                    onClick={() =>
                      deleteTodo(todo)
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


          {pendingTodos.length ===
            0 && (
            <p className="empty-topics">
              No pending general tasks.
            </p>
          )}

        </div>

      </section>


      {/* COMPLETED TASKS */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <div>

            <h2>
              Completed Tasks
            </h2>

            <p>
              General tasks you have finished.
            </p>

          </div>

        </div>


        <div className="topic-list">

          {completedTodos.map(
            (todo) => (
              <div
                className="topic-row"
                key={todo.id}
              >

                <div className="topic-information">

                  <strong
                    style={{
                      textDecoration:
                        "line-through",
                    }}
                  >
                    {todo.title}
                  </strong>

                  <span>
                    Completed
                  </span>

                </div>


                <div className="topic-actions">

                  <button
                    type="button"
                    className="edit-button"
                    title="Mark incomplete"
                    onClick={() =>
                      toggleTodo(todo)
                    }
                  >
                    <Circle
                      size={18}
                    />
                  </button>


                  <button
                    type="button"
                    className="edit-button"
                    title="Edit task"
                    onClick={() =>
                      openEditForm(todo)
                    }
                  >
                    <Pencil
                      size={17}
                    />
                  </button>


                  <button
                    type="button"
                    className="delete-button"
                    title="Delete task"
                    onClick={() =>
                      deleteTodo(todo)
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


          {completedTodos.length ===
            0 && (
            <p className="empty-topics">
              No completed general tasks.
            </p>
          )}

        </div>

      </section>

    </div>
  );
}

export default TodoList;