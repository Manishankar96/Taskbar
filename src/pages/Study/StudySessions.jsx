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
} from "../../utils/db";

import {
  formatMinutes,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../../utils/calculations";

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

  /*
   * Calculate duration automatically
   * from Start Time and End Time.
   */
  function calculateDuration() {
    if (
      !form.startTime ||
      !form.endTime
    ) {
      return 0;
    }

    const start =
      timeToMinutes(form.startTime);

    const end =
      timeToMinutes(form.endTime);

    if (end > start) {
      return end - start;
    }

    return 0;
  }

  /*
   * Handle 12-hour time selection.
   *
   * The actual stored value remains HH:MM
   * so existing data continues to work.
   */
  function updateTime(field, hour, minute, period) {
    if (!hour || !minute || !period) {
      setForm((previous) => ({
        ...previous,
        [field]: "",
        duration: calculateDurationWithTimes(
          field === "startTime"
            ? ""
            : previous.startTime,
          field === "endTime"
            ? ""
            : previous.endTime
        ),
      }));

      return;
    }

    const hourNumber = Number(hour);
    let hour24 = hourNumber;

    if (period === "AM") {
      hour24 =
        hourNumber === 12
          ? 0
          : hourNumber;
    } else {
      hour24 =
        hourNumber === 12
          ? 12
          : hourNumber + 12;
    }

    const value = `${String(hour24).padStart(
      2,
      "0"
    )}:${minute}`;

    const newStartTime =
      field === "startTime"
        ? value
        : form.startTime;

    const newEndTime =
      field === "endTime"
        ? value
        : form.endTime;

    const newDuration =
      calculateDurationWithTimes(
        newStartTime,
        newEndTime
      );

    setForm((previous) => ({
      ...previous,
      [field]: value,
      duration: newDuration,
    }));
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
        "Please select a valid Start Time and End Time."
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

  /*
   * Convert stored HH:MM value
   * into 12-hour display values.
   */
  const startParts =
    timeTo12HourParts(
      form.startTime
    );

  const endParts =
    timeTo12HourParts(
      form.endTime
    );

  const automaticDuration =
    calculateDuration();

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

            <TimePicker
              label="Start Time"
              parts={startParts}
              onChange={(
                hour,
                minute,
                period
              ) =>
                updateTime(
                  "startTime",
                  hour,
                  minute,
                  period
                )
              }
            />


            {/* END TIME */}

            <TimePicker
              label="End Time"
              parts={endParts}
              onChange={(
                hour,
                minute,
                period
              ) =>
                updateTime(
                  "endTime",
                  hour,
                  minute,
                  period
                )
              }
            />


            {/* AUTOMATIC DURATION */}

            <div className="form-group">

              <label>
                Duration
              </label>

              <input
                type="text"
                readOnly
                value={
                  automaticDuration > 0
                    ? formatDuration(
                        automaticDuration
                      )
                    : ""
                }
                placeholder="Select Start and End Time"
                style={{
                  cursor: "not-allowed",
                  opacity: 0.85,
                }}
              />

              <small>
                Duration is calculated automatically from Start Time and End Time.
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
                      ? ` • ${formatDisplayTime(
                          session.startTime
                        )} - ${formatDisplayTime(
                          session.endTime
                        )}`
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
 * Time picker component.
 *
 * Gives the user:
 * Hour → Minute → AM/PM
 *
 * instead of a 24-hour time input.
 */
function TimePicker({
  label,
  parts,
  onChange,
}) {
  const hours = Array.from(
    { length: 12 },
    (_, index) =>
      String(index + 1)
  );

  const minutes = [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ];

  /*
   * Keep the three visible selections locally.
   *
   * Previously, selecting Hour first immediately called
   * the parent with an empty Minute/AM-PM value. The parent
   * then cleared the entire time, so the user could not
   * select Hour -> Minute -> AM/PM normally.
   *
   * Now each dropdown keeps its selection until all three
   * values are available. Only then do we update the stored
   * HH:MM value in the parent.
   */
  const [selectedHour, setSelectedHour] =
    useState(parts.hour || "");

  const [selectedMinute, setSelectedMinute] =
    useState(parts.minute || "");

  const [selectedPeriod, setSelectedPeriod] =
    useState(parts.period || "");

  /*
   * Keep the local picker synchronized when:
   * - a new form is opened
   * - an existing session is edited
   * - the parent changes the stored time
   */
  useEffect(() => {
    setSelectedHour(parts.hour || "");
    setSelectedMinute(parts.minute || "");
    setSelectedPeriod(parts.period || "");
  }, [
    parts.hour,
    parts.minute,
    parts.period,
  ]);

  function handleHourChange(event) {
    const value = event.target.value;

    setSelectedHour(value);

    if (
      value &&
      selectedMinute &&
      selectedPeriod
    ) {
      onChange(
        value,
        selectedMinute,
        selectedPeriod
      );
    }
  }

  function handleMinuteChange(event) {
    const value = event.target.value;

    setSelectedMinute(value);

    if (
      selectedHour &&
      value &&
      selectedPeriod
    ) {
      onChange(
        selectedHour,
        value,
        selectedPeriod
      );
    }
  }

  function handlePeriodChange(event) {
    const value = event.target.value;

    setSelectedPeriod(value);

    if (
      selectedHour &&
      selectedMinute &&
      value
    ) {
      onChange(
        selectedHour,
        selectedMinute,
        value
      );
    }
  }

  return (
    <div className="form-group">

      <label>
        {label}
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr 1fr",
          gap: 8,
        }}
      >

        {/* HOUR */}

        <select
          value={selectedHour}
          onChange={
            handleHourChange
          }
        >
          <option value="">
            Hour
          </option>

          {hours.map(
            (hour) => (
              <option
                key={hour}
                value={hour}
              >
                {hour}
              </option>
            )
          )}
        </select>


        {/* MINUTE */}

        <select
          value={selectedMinute}
          onChange={
            handleMinuteChange
          }
        >
          <option value="">
            Min
          </option>

          {minutes.map(
            (minute) => (
              <option
                key={minute}
                value={minute}
              >
                {minute}
              </option>
            )
          )}
        </select>


        {/* AM / PM */}

        <select
          value={selectedPeriod}
          onChange={
            handlePeriodChange
          }
        >
          <option value="">
            AM/PM
          </option>

          <option value="AM">
            AM
          </option>

          <option value="PM">
            PM
          </option>
        </select>

      </div>

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


/*
 * Calculate duration using two HH:MM values.
 */
function calculateDurationWithTimes(
  startTime,
  endTime
) {
  if (
    !startTime ||
    !endTime
  ) {
    return "";
  }

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  if (end > start) {
    return end - start;
  }

  return "";
}


/*
 * Convert HH:MM into:
 *
 * {
 *   hour: "6",
 *   minute: "30",
 *   period: "PM"
 * }
 */
function timeTo12HourParts(time) {
  if (
    typeof time !== "string" ||
    !time.includes(":")
  ) {
    return {
      hour: "",
      minute: "",
      period: "",
    };
  }

  const [
    hoursString,
    minutes,
  ] = time.split(":");

  const hours =
    Number(hoursString);

  if (
    Number.isNaN(hours)
  ) {
    return {
      hour: "",
      minute: "",
      period: "",
    };
  }

  const period =
    hours >= 12
      ? "PM"
      : "AM";

  let hour12 =
    hours % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  return {
    hour: String(hour12),
    minute: minutes,
    period,
  };
}


/*
 * Convert HH:MM into readable
 * AM/PM format.
 *
 * Example:
 * 18:30 → 6:30 PM
 */
function formatDisplayTime(time) {
  const parts =
    timeTo12HourParts(time);

  if (
    !parts.hour ||
    !parts.minute ||
    !parts.period
  ) {
    return time;
  }

  return `${parts.hour}:${parts.minute} ${parts.period}`;
}


/*
 * Convert minutes into readable duration.
 *
 * Examples:
 * 60 → 1h
 * 90 → 1h 30m
 * 30 → 30m
 */
function formatDuration(minutes) {
  const total =
    Number(minutes) || 0;

  const hours =
    Math.floor(total / 60);

  const remainingMinutes =
    total % 60;

  if (
    hours > 0 &&
    remainingMinutes > 0
  ) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

export default StudySessions;