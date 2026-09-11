import { useEffect, useMemo, useState } from "react";
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
} from "lucide-react";

import {
  getQuickNotes,
  saveQuickNotes,
} from "../utils/db";

const emptyForm = {
  title: "",
  content: "",
};

function QuickNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] =
    useState(null);
  const [form, setForm] =
    useState(emptyForm);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const saved =
          await getQuickNotes();

        setNotes(
          Array.isArray(saved)
            ? saved
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load quick notes:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function persist(updated) {
    setNotes(updated);

    try {
      await saveQuickNotes(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to save quick notes:",
        error
      );
    }
  }

  function openAddForm() {
    setEditingNote(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(note) {
    setEditingNote(note);

    setForm({
      title: note.title || "",
      content: note.content || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingNote(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.title.trim() &&
      !form.content.trim()
    ) {
      return;
    }

    const note = {
      ...(editingNote || {}),
      title:
        form.title.trim() ||
        "Untitled Note",
      content:
        form.content.trim(),
      updatedAt:
        new Date().toISOString(),
    };

    if (editingNote) {
      await persist(
        notes.map((item) =>
          item.id ===
          editingNote.id
            ? note
            : item
        )
      );
    } else {
      await persist([
        {
          ...note,
          id: Date.now(),
          createdAt:
            new Date().toISOString(),
        },
        ...notes,
      ]);
    }

    closeForm();
  }

  async function deleteNote(note) {
    const confirmed =
      window.confirm(
        `Delete "${note.title}"?`
      );

    if (!confirmed) {
      return;
    }

    await persist(
      notes.filter(
        (item) =>
          item.id !== note.id
      )
    );
  }

  const filteredNotes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return notes;
      }

      return notes.filter(
        (note) =>
          String(
            note.title || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            note.content || ""
          )
            .toLowerCase()
            .includes(query)
      );
    }, [notes, search]);

  if (loading) {
    return (
      <div className="module-page">
        <h1>📝 Quick Notes</h1>
        <p>
          Loading notes...
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
            📝 Quick Notes
          </h1>

          <p>
            Save useful information without turning it into a task.
          </p>

        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />
          New Note
        </button>

      </div>


      {/* NOTE COUNT */}

      <section className="stat-grid">

        <div className="stat-card">

          <StickyNote size={25} />

          <span>
            Total Notes
          </span>

          <strong>
            {notes.length}
          </strong>

        </div>

        <div className="stat-card">

          <StickyNote size={25} />

          <span>
            Showing
          </span>

          <strong>
            {filteredNotes.length}
          </strong>

        </div>

      </section>


      {/* SEARCH */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >

          <Search size={20} />

          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            style={{
              flex: 1,
            }}
          />

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
              {editingNote
                ? "Edit Note"
                : "New Note"}
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

            <div className="form-group">

              <label>
                Title
              </label>

              <input
                type="text"
                placeholder="Example: Spring interview notes"
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


            <div className="form-group">

              <label>
                Note
              </label>

              <textarea
                rows="7"
                placeholder="Write your note here..."
                value={
                  form.content
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    content:
                      event.target.value,
                  })
                }
              />

            </div>


            <button
              type="submit"
              className="save-topic-button"
            >
              {editingNote
                ? "Save Changes"
                : "Save Note"}
            </button>

          </form>

        </section>
      )}


      {/* NOTES */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <div>

            <h2>
              Your Notes
            </h2>

            <p>
              Information stored locally in Taskbar.
            </p>

          </div>

        </div>


        <div className="topic-list">

          {filteredNotes.map(
            (note) => (
              <div
                className="topic-row"
                key={note.id}
                style={{
                  alignItems:
                    "flex-start",
                }}
              >

                <div
                  className="topic-information"
                  style={{
                    flex: 1,
                  }}
                >

                  <strong>
                    {note.title}
                  </strong>

                  <span
                    style={{
                      whiteSpace:
                        "pre-wrap",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {note.content ||
                      "No content"}
                  </span>

                </div>


                <div className="topic-actions">

                  <button
                    type="button"
                    className="edit-button"
                    title="Edit note"
                    onClick={() =>
                      openEditForm(
                        note
                      )
                    }
                  >
                    <Pencil
                      size={17}
                    />
                  </button>


                  <button
                    type="button"
                    className="delete-button"
                    title="Delete note"
                    onClick={() =>
                      deleteNote(
                        note
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


          {filteredNotes.length ===
            0 && (
            <p className="empty-topics">
              {search.trim()
                ? "No notes match your search."
                : "No notes yet. Create your first note."}
            </p>
          )}

        </div>

      </section>

    </div>
  );
}

export default QuickNotes;