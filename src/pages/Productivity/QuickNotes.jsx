import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
} from "lucide-react";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

const QUICK_NOTES_COLLECTION = "quickNotes";

const emptyForm = {
  title: "",
  content: "",
};

function QuickNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [search, setSearch] =
    useState("");

  /* =========================================================
     LOAD FIRESTORE DATA
  ========================================================= */

  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;

    async function loadNotes() {
      try {
        const cloudNotes =
          await getItemsFromFirestore(
            QUICK_NOTES_COLLECTION
          );

        if (!mounted) return;

        const normalizedNotes =
          Array.isArray(cloudNotes)
            ? cloudNotes
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

        setNotes(normalizedNotes);

        /* =====================================================
           REAL-TIME FIRESTORE SYNC
        ===================================================== */

        unsubscribe =
          subscribeToFirestoreCollection(
            QUICK_NOTES_COLLECTION,
            (cloudItems) => {
              if (!mounted) return;

              const normalizedItems =
                Array.isArray(cloudItems)
                  ? cloudItems
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

              setNotes(normalizedItems);
            },
            (error) => {
              console.error(
                "Quick Notes real-time sync error:",
                error
              );
            }
          );
      } catch (error) {
        console.error(
          "Failed to load Quick Notes:",
          error
        );

        if (mounted) {
          setNotes([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadNotes();

    return () => {
      mounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     ADD FORM
  ========================================================= */

  function openAddForm() {
    setEditingNote(null);

    setForm({
      title: "",
      content: "",
    });

    setShowForm(true);
  }

  /* =========================================================
     EDIT FORM
  ========================================================= */

  function openEditForm(note) {
    setEditingNote(note);

    setForm({
      title: note.title || "",
      content: note.content || "",
    });

    setShowForm(true);
  }

  /* =========================================================
     CLOSE FORM
  ========================================================= */

  function closeForm() {
    setShowForm(false);
    setEditingNote(null);

    setForm({
      title: "",
      content: "",
    });
  }

  /* =========================================================
     SAVE NOTE
  ========================================================= */

  async function persistNote(
    updatedNotes,
    changedNote
  ) {
    setNotes(updatedNotes);

    try {
      await saveItemToFirestore(
        QUICK_NOTES_COLLECTION,
        String(changedNote.id),
        {
          ...changedNote,
          id: String(changedNote.id),
        }
      );

      return true;
    } catch (error) {
      console.error(
        "Failed to save Quick Note:",
        error
      );

      alert(
        "Failed to save note. Please try again."
      );

      return false;
    }
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.title.trim() &&
      !form.content.trim()
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    /* =======================================================
       EDIT EXISTING NOTE
    ======================================================= */

    if (editingNote) {
      const updatedNote = {
        ...editingNote,

        id: String(editingNote.id),

        title:
          form.title.trim() ||
          "Untitled Note",

        content:
          form.content.trim(),

        updatedAt: now,
      };

      const updatedNotes =
        notes.map((item) =>
          String(item.id) ===
          String(editingNote.id)
            ? updatedNote
            : item
        );

      const success =
        await persistNote(
          updatedNotes,
          updatedNote
        );

      if (success) {
        closeForm();
      }

      return;
    }

    /* =======================================================
       CREATE NEW NOTE
    ======================================================= */

    const newNote = {
      id: String(Date.now()),

      title:
        form.title.trim() ||
        "Untitled Note",

      content:
        form.content.trim(),

      createdAt: now,
      updatedAt: now,
    };

    const updatedNotes = [
      newNote,
      ...notes,
    ];

    const success =
      await persistNote(
        updatedNotes,
        newNote
      );

    if (success) {
      closeForm();
    }
  }

  /* =========================================================
     DELETE NOTE
  ========================================================= */

  async function deleteNote(note) {
    const confirmed =
      window.confirm(
        `Delete "${note.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteItemFromFirestore(
        QUICK_NOTES_COLLECTION,
        String(note.id)
      );

      setNotes((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(note.id)
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete Quick Note:",
        error
      );

      alert(
        "Failed to delete note. Please try again."
      );
    }
  }

  /* =========================================================
     SEARCH
  ========================================================= */

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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="module-page">
        <h1>
          📝 Quick Notes
        </h1>

        <p>
          Loading notes...
        </p>
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

          <h1>
            📝 Quick Notes
          </h1>

          <p>
            Save useful information without
            turning it into a task.
          </p>

        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          New Note
        </button>

      </div>

      {/* =====================================================
          NOTE COUNT
      ===================================================== */}

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

      {/* =====================================================
          SEARCH
      ===================================================== */}

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

      {/* =====================================================
          ADD / EDIT FORM
      ===================================================== */}

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
                Title
              </label>

              <input
                type="text"
                placeholder="Example: Spring interview notes"
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

            {/* CONTENT */}

            <div className="form-group">

              <label>
                Note
              </label>

              <textarea
                rows="7"
                placeholder="Write your note here..."
                value={form.content}
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

      {/* =====================================================
          NOTES
      ===================================================== */}

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
              Synced with your Taskbar account.
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
                      lineHeight: 1.6,
                    }}
                  >
                    {note.content ||
                      "No content"}
                  </span>

                </div>

                <div className="topic-actions">

                  {/* EDIT */}

                  <button
                    type="button"
                    className="edit-button"
                    title="Edit note"
                    onClick={() =>
                      openEditForm(note)
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
                    title="Delete note"
                    onClick={() =>
                      deleteNote(note)
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