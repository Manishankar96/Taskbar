import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Clock3,
} from "lucide-react";

import {
  getStudySessions,
  saveStudySessions,
} from "../utils/db";

import {
  formatMinutes,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../utils/calculations";

const emptyForm = {
  subject: "",
  topic: "",
  date: getTodayLocalDateKey(),
  startTime: "",
  endTime: "",
  duration: "",
  notes: "",
};

function StudySessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] =
    useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        const saved = await getStudySessions();

        setSessions(
          Array.isArray(saved) ? saved : []
        );
      } catch (error) {
        console.error(
          "Failed to load study sessions:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function persist(updated) {
    setSessions(updated);

    try {
      await saveStudySessions(updated);
    } catch (error) {
      console.error(
        "Failed to save study sessions:",
        error
      );
    }
  }

  function openAddForm() {
    setEditingSession(null);

    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });

    setShowForm(true);
  }

  function openEditForm(session) {
    setEditingSession(session);

    setForm({
      subject: session.subject || "",
      topic: session.topic || "",
      date:
        session.date ||
        getTodayLocalDateKey(),
      startTime: session.startTime || "",
      endTime: session.endTime || "",
      duration:
        session.duration ?? "",
      notes: session.notes || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingSession(null);
  }

  function calculateDuration() {
    /*
     * If start and end time are provided,
     * calculate the actual duration.
     */
    if (
      form.startTime &&
      form.endTime
    ) {
      const start =
        timeToMinutes(
          form.startTime
        );

      const end =
        timeToMinutes(
          form.endTime
        );

      if (end > start) {
        return end - start;
      }

      return 0;
    }

    /*
     * Otherwise use manually entered duration.
     */
    return Math.max(
      0,
      Number(form.duration) || 0
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.subject.trim() ||
      !form.date
    ) {
      return;
    }

    const duration =
      calculateDuration();

    if (duration <= 0) {
      alert(
        "Enter a valid duration or a valid start and end time."
      );
      return;
    }

    const session = {
      ...(editingSession || {}),
      subject:
        form.subject.trim(),
      topic:
        form.topic.trim(),
      date: form.date,
      startTime:
        form.startTime,
      endTime:
        form.endTime,
      duration,
      notes:
        form.notes.trim(),
    };

    if (editingSession) {
      await persist(
        sessions.map((item) =>
          item.id ===
          editingSession.id
            ? session
            : item
        )
      );
    } else {
      await persist([
        ...sessions,
        {
          ...session,
          id: Date.now(),
        },
      ]);
    }

    closeForm();
  }

  async function deleteSession(session) {
    const confirmed =
      window.confirm(
        `Delete this ${session.subject} study session?`
      );

    if (!confirmed) {
      return;
    }

    await persist(
      sessions.filter(
        (item) =>
          item.id !== session.id
      )
    );
  }

  const today =
    getTodayLocalDateKey();

  const todaySessions =
    useMemo(
      () =>
        sessions
          .filter(
            (session) =>
              session.date === today
          )
          .sort(
            (a, b) =>
              String(
                a.startTime || ""
              ).localeCompare(
                String(
                  b.startTime || ""
                )
              )
          ),
      [sessions, today]
    );

  const todayMinutes =
    useMemo(
      () =>
        sumBy(
          todaySessions,
          "duration"
        ),
      [todaySessions]
    );

  const totalMinutes =
    useMemo(
      () =>
        sumBy(
          sessions,
          "duration"
        ),
      [sessions]
    );

  const weeklyChartData =
    useMemo(() => {
      const keys =
        getLastNLocalDateKeys(
          7
        );

      return keys.map(
        (key) => {
          const daySessions =
            sessions.filter(
              (session) =>
                session.date ===
                key
            );

          return {
            day:
              getWeekdayLabel(
                key
              ),
            hours:
              Math.round(
                (sumBy(
                  daySessions,
                  "duration"
                ) /
                  60) *
                  10
              ) / 10,
          };
        }
      );
    }, [sessions]);

  if (loading) {
    return (
      <div className="module-page">
        <h1>📚 Study Sessions</h1>
        <p>
          Loading study sessions...
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
            📚 Study Sessions
          </h1>

          <p>
            Track your actual intentional study time.
          </p>
        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />
          Add Study Session
        </button>

      </div>


      {/* STATS */}

      <section className="stat-grid">

        <div className="stat-card">
          <Clock3 size={25} />

          <span>
            Study Time Today
          </span>

          <strong>
            {formatMinutes(
              todayMinutes
            )}
          </strong>
        </div>


        <div className="stat-card">
          <BookOpen size={25} />

          <span>
            Sessions Today
          </span>

          <strong>
            {todaySessions.length}
          </strong>
        </div>


        <div className="stat-card">
          <Clock3 size={25} />

          <span>
            Total Logged
          </span>

          <strong>
            {formatMinutes(
              totalMinutes
            )}
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
              {editingSession
                ? "Edit Study Session"
                : "Add Study Session"}
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

            {/* SUBJECT */}

            <div className="form-group">

              <label>
                Subject *
              </label>

              <input
                type="text"
                placeholder="Example: Java"
                value={
                  form.subject
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    subject:
                      event.target.value,
                  })
                }
              />

            </div>


            {/* TOPIC */}

            <div className="form-group">

              <label>
                Topic
              </label>

              <input
                type="text"
                placeholder="Example: Collections"
                value={
                  form.topic
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    topic:
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


            {/* START TIME */}

            <div className="form-group">

              <label>
                Start Time
              </label>

              <input
                type="time"
                value={
                  form.startTime
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    startTime:
                      event.target.value,
                  })
                }
              />

            </div>


            {/* END TIME */}

            <div className="form-group">

              <label>
                End Time
              </label>

              <input
                type="time"
                value={
                  form.endTime
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    endTime:
                      event.target.value,
                  })
                }
              />

            </div>


            {/* DURATION */}

            <div className="form-group">

              <label>
                Duration (minutes)
              </label>

              <input
                type="number"
                min="1"
                placeholder="Example: 60"
                value={
                  form.duration
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    duration:
                      event.target.value,
                  })
                }
              />

              <small>
                If Start Time and End Time are
                entered, duration is calculated
                automatically.
              </small>

            </div>


            {/* NOTES */}

            <div className="form-group">

              <label>
                Notes
              </label>

              <input
                type="text"
                placeholder="Example: Practiced ArrayList"
                value={
                  form.notes
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes:
                      event.target.value,
                  })
                }
              />

            </div>


            {/* SAVE */}

            <button
              type="submit"
              className="save-topic-button"
            >
              {editingSession
                ? "Save Changes"
                : "Add Session"}
            </button>

          </form>

        </section>
      )}


      {/* WEEKLY TREND */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Clock3 size={22} />

          <h2>
            Weekly Study Time
          </h2>

        </div>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(7, minmax(80px, 1fr))",
              gap: 10,
              minWidth: 560,
              marginTop: 15,
            }}
          >

            {weeklyChartData.map(
              (item) => (
                <div
                  key={item.day}
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "14px 8px",
                    borderRadius:
                      10,
                    border:
                      "1px solid var(--border-color, #e5e7eb)",
                  }}
                >

                  <strong>
                    {item.day}
                  </strong>

                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    {item.hours}h
                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </section>


      {/* TODAY'S SESSIONS */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >

        <div className="topic-header">

          <div>

            <h2>
              Today's Sessions
            </h2>

            <p>
              Actual study sessions logged for today.
            </p>

          </div>

        </div>


        <div className="topic-list">

          {todaySessions.map(
            (session) => (
              <div
                className="topic-row"
                key={session.id}
              >

                <div className="topic-information">

                  <strong>
                    {session.subject}
                    {session.topic
                      ? ` • ${session.topic}`
                      : ""}
                  </strong>

                  <span>
                    {formatMinutes(
                      session.duration
                    )}

                    {session.startTime &&
                    session.endTime
                      ? ` • ${session.startTime} - ${session.endTime}`
                      : ""}

                    {session.notes
                      ? ` • ${session.notes}`
                      : ""}
                  </span>

                </div>


                <div className="topic-actions">

                  <button
                    type="button"
                    className="edit-button"
                    title="Edit"
                    onClick={() =>
                      openEditForm(
                        session
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
                    title="Delete"
                    onClick={() =>
                      deleteSession(
                        session
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


          {todaySessions.length ===
            0 && (
            <p className="empty-topics">
              No study sessions logged today.
            </p>
          )}

        </div>

      </section>

    </div>
  );
}

/*
 * Convert HH:MM into minutes.
 */
function timeToMinutes(time) {
  if (
    typeof time !== "string" ||
    !time.includes(":")
  ) {
    return 0;
  }

  const [
    hours,
    minutes,
  ] = time
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

export default StudySessions;