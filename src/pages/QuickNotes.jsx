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
  getQuickNotes,
  saveQuickNotes,
} from "../utils/db";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../firebase/firestore";


const emptyForm = {
  title: "",
  content: "",
};


function QuickNotes() {
  const [notes, setNotes] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [search, setSearch] =
    useState("");


  /* =========================================================
     LOAD LOCAL + CLOUD DATA
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadNotes() {
      try {
        /* -----------------------------------------
           STEP 1: Load IndexedDB first
        ----------------------------------------- */

        const localNotes =
          await getQuickNotes();

        if (mounted) {
          setNotes(
            Array.isArray(localNotes)
              ? localNotes
              : []
          );
        }


        /* -----------------------------------------
           STEP 2: Load Firestore
        ----------------------------------------- */

        try {
          const cloudNotes =
            await getItemsFromFirestore(
              "quickNotes"
            );

          if (!mounted) {
            return;
          }


          /* ---------------------------------------
             Merge local + cloud

             Cloud version wins when
             the same ID exists.
          --------------------------------------- */

          const mergedMap =
            new Map();


          if (
            Array.isArray(localNotes)
          ) {
            localNotes.forEach(
              (item) => {
                if (item?.id !== undefined) {
                  mergedMap.set(
                    String(item.id),
                    item
                  );
                }
              }
            );
          }


          if (
            Array.isArray(cloudNotes)
          ) {
            cloudNotes.forEach(
              (item) => {
                if (item?.id !== undefined) {
                  mergedMap.set(
                    String(item.id),
                    item
                  );
                }
              }
            );
          }


          const mergedNotes =
            Array.from(
              mergedMap.values()
            );


          setNotes(mergedNotes);


          /* ---------------------------------------
             Upload local-only notes
          --------------------------------------- */

          const cloudIds =
            new Set(
              cloudNotes.map(
                (item) =>
                  String(item.id)
              )
            );


          const localOnly =
            localNotes.filter(
              (item) =>
                !cloudIds.has(
                  String(item.id)
                )
            );


          for (const item of localOnly) {
            try {
              await saveItemToFirestore(
                "quickNotes",
                item.id,
                item
              );
            } catch (error) {
              console.error(
                "Failed to upload local note:",
                error
              );
            }
          }


          /* ---------------------------------------
             Keep IndexedDB updated
          --------------------------------------- */

          await saveQuickNotes(
            mergedNotes
          );

        } catch (cloudError) {
          console.error(
            "Firestore unavailable. Using IndexedDB:",
            cloudError
          );
        }

      } catch (error) {
        console.error(
          "Failed to load quick notes:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }


    loadNotes();


    return () => {
      mounted = false;
    };
  }, []);


  /* =========================================================
     REAL-TIME FIRESTORE SYNC
  ========================================================= */

  useEffect(() => {
    let unsubscribe;

    try {
      unsubscribe =
        subscribeToFirestoreCollection(
          "quickNotes",
          async (cloudNotes) => {

            setNotes(cloudNotes);

            try {
              await saveQuickNotes(
                cloudNotes
              );
            } catch (error) {
              console.error(
                "Failed to update IndexedDB from Firestore:",
                error
              );
            }
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
        "Failed to start Quick Notes sync:",
        error
      );
    }


    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);


  /* =========================================================
     SAVE LOCAL + FIRESTORE
  ========================================================= */

  async function persist(
    updated,
    changedNote = null
  ) {
    setNotes(updated);


    /* -----------------------------------------
       Always save locally first
    ----------------------------------------- */

    try {
      await saveQuickNotes(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to save Quick Notes locally:",
        error
      );
    }


    /* -----------------------------------------
       Then save changed item to Firestore
    ----------------------------------------- */

    if (changedNote) {
      try {
        await saveItemToFirestore(
          "quickNotes",
          changedNote.id,
          changedNote
        );
      } catch (error) {
        console.error(
          "Failed to save Quick Note to Firestore:",
          error
        );
      }
    }
  }


  /* =========================================================
     ADD FORM
  ========================================================= */

  function openAddForm() {
    setEditingNote(null);
    setForm(emptyForm);
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
    setForm(emptyForm);
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


    /* -----------------------------------------
       EDIT EXISTING NOTE
    ----------------------------------------- */

    if (editingNote) {

      const updatedNote = {
        ...editingNote,

        title:
          form.title.trim() ||
          "Untitled Note",

        content:
          form.content.trim(),

        updatedAt: now,
      };


      const updated =
        notes.map(
          (item) =>
            String(item.id) ===
            String(editingNote.id)
              ? updatedNote
              : item
        );


      await persist(
        updated,
        updatedNote
      );

    } else {

      /* ---------------------------------------
         CREATE NEW NOTE
      --------------------------------------- */

      const newNote = {
        id: Date.now(),

        title:
          form.title.trim() ||
          "Untitled Note",

        content:
          form.content.trim(),

        createdAt: now,

        updatedAt: now,
      };


      await persist(
        [
          newNote,
          ...notes,
        ],
        newNote
      );
    }


    closeForm();
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


    /* -----------------------------------------
       Delete locally
    ----------------------------------------- */

    const updated =
      notes.filter(
        (item) =>
          String(item.id) !==
          String(note.id)
      );


    setNotes(updated);


    try {
      await saveQuickNotes(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to update local notes after delete:",
        error
      );
    }


    /* -----------------------------------------
       Delete from Firestore
    ----------------------------------------- */

    try {
      await deleteItemFromFirestore(
        "quickNotes",
        note.id
      );
    } catch (error) {
      console.error(
        "Failed to delete Quick Note from Firestore:",
        error
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
        <h1>📝 Quick Notes</h1>

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