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

const emptyForm = {
  title: "",
};

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] =
    useState(null);
  const [form, setForm] =
    useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        const saved =
          await getTodoList();

        setTodos(
          Array.isArray(saved)
            ? saved
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load todo list:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function persist(updated) {
    setTodos(updated);

    try {
      await saveTodoList(updated);
    } catch (error) {
      console.error(
        "Failed to save todo list:",
        error
      );
    }
  }

  function openAddForm() {
    setEditingTodo(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(todo) {
    setEditingTodo(todo);

    setForm({
      title: todo.title || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTodo(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    const todo = {
      ...(editingTodo || {}),
      title: form.title.trim(),
      completed:
        editingTodo?.completed === true,
      completedAt:
        editingTodo?.completedAt || null,
    };

    if (editingTodo) {
      await persist(
        todos.map((item) =>
          item.id === editingTodo.id
            ? todo
            : item
        )
      );
    } else {
      await persist([
        ...todos,
        {
          ...todo,
          id: Date.now(),
        },
      ]);
    }

    closeForm();
  }

  async function toggleTodo(todo) {
    const completed =
      todo.completed !== true;

    await persist(
      todos.map((item) =>
        item.id === todo.id
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

  async function deleteTodo(todo) {
    const confirmed =
      window.confirm(
        `Delete "${todo.title}"?`
      );

    if (!confirmed) {
      return;
    }

    await persist(
      todos.filter(
        (item) =>
          item.id !== todo.id
      )
    );
  }

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