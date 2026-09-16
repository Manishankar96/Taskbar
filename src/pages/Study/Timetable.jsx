import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Bell,
  BellOff,
} from "lucide-react";

import {
  getTimetable,
  saveTimetable,
} from "../../utils/db";

import {
  getTodayLocalDateKey,
} from "../../utils/calculations";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CATEGORIES = [
  "Study",
  "College",
  "Work",
  "Personal",
  "Other",
];

const emptyForm = {
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  activity: "",
  category: "Study",
  status: "planned",
  notificationsEnabled: true,
};

function Timetable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] =
    useState(null);
  const [form, setForm] =
    useState(emptyForm);
  const [notificationMessage, setNotificationMessage] =
    useState("");

  /*
   * Load timetable
   */
  useEffect(() => {
    async function load() {
      try {
        const saved =
          await getTimetable();

        setEntries(
          Array.isArray(saved)
            ? saved
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load timetable:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /*
   * Ask for browser notification permission
   * when the user enables timetable notifications.
   */
  async function requestNotificationPermission() {
    if (
      typeof Notification ===
        "undefined"
    ) {
      setNotificationMessage(
        "Browser notifications are not supported here."
      );
      return false;
    }

    if (
      Notification.permission ===
      "granted"
    ) {
      return true;
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      setNotificationMessage(
        "Notifications are blocked in your browser settings."
      );
      return false;
    }

    try {
      const permission =
        await Notification.requestPermission();

      if (
        permission !== "granted"
      ) {
        setNotificationMessage(
          "Notification permission was not granted."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Notification permission error:",
        error
      );

      setNotificationMessage(
        "Could not request notification permission."
      );

      return false;
    }
  }

  /*
   * Save timetable
   */
  async function persist(updated) {
    setEntries(updated);

    try {
      await saveTimetable(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to save timetable:",
        error
      );
    }
  }

  /*
   * Add entry
   */
  async function openAddForm() {
    setEditingEntry(null);
    setForm({
      ...emptyForm,
      date: getTodayLocalDateKey(),
    });
    setShowForm(true);
    setNotificationMessage("");
  }

  /*
   * Edit entry
   */
  function openEditForm(entry) {
    setEditingEntry(entry);

    setForm({
      date:
        entry.date ||
        getTodayLocalDateKey(),
      startTime:
        entry.startTime ||
        "09:00",
      endTime:
        entry.endTime ||
        "10:00",
      activity:
        entry.activity ||
        "",
      category:
        entry.category ||
        "Study",
      status:
        entry.status ||
        "planned",
      notificationsEnabled:
        entry.notificationsEnabled !==
        false,
    });

    setShowForm(true);
    setNotificationMessage("");
  }

  /*
   * Close form
   */
  function closeForm() {
    setShowForm(false);
    setEditingEntry(null);
    setNotificationMessage("");
  }

  /*
   * Submit timetable entry
   */
  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (!form.activity.trim()) {
      return;
    }

    if (
      form.startTime >=
      form.endTime
    ) {
      alert(
        "End time must be later than start time."
      );
      return;
    }

    let notificationsEnabled =
      form.notificationsEnabled;

    if (
      notificationsEnabled
    ) {
      const permissionGranted =
        await requestNotificationPermission();

      if (!permissionGranted) {
        notificationsEnabled = false;
      }
    }

    const cleanedEntry = {
      ...(editingEntry || {}),
      date: form.date,
      day: getDayNameFromDate(form.date),
      startTime:
        form.startTime,
      endTime:
        form.endTime,
      activity:
        form.activity.trim(),
      category:
        form.category,
      status:
        form.status,
      notificationsEnabled,
    };

    if (editingEntry) {
      await persist(
        entries.map((entry) =>
          entry.id ===
          editingEntry.id
            ? cleanedEntry
            : entry
        )
      );
    } else {
      await persist([
        ...entries,
        {
          ...cleanedEntry,
          id:
            Date.now(),
        },
      ]);
    }

    closeForm();
  }

  /*
   * Delete timetable entry
   */
  async function deleteEntry(
    entry
  ) {
    const confirmed =
      window.confirm(
        `Delete "${entry.activity}" from the timetable?`
      );

    if (!confirmed) {
      return;
    }

    await persist(
      entries.filter(
        (item) =>
          item.id !== entry.id
      )
    );
  }

  /*
   * Toggle notifications for an
   * existing timetable entry.
   */
  async function toggleNotification(
    entry
  ) {
    const newValue =
      entry.notificationsEnabled ===
      false;

    if (newValue) {
      const permissionGranted =
        await requestNotificationPermission();

      if (!permissionGranted) {
        return;
      }
    }

    await persist(
      entries.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              notificationsEnabled:
                newValue,
            }
          : item
      )
    );
  }

  /*
   * Calendar: today and the next 10 days.
   */
  const calendarDays = useMemo(() => {
    const todayKey = getTodayLocalDateKey();
    const [year, month, day] = todayKey.split("-").map(Number);
    const today = new Date(year, month - 1, day);

    return Array.from({ length: 11 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = formatDateKey(date);

      return {
        key,
        date,
        label: index === 0 ? "Today" : formatShortDate(date),
        dayName: DAY_NAMES[date.getDay()],
      };
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(
    getTodayLocalDateKey()
  );

  const selectedDay =
    calendarDays.find((item) => item.key === selectedDate) ||
    calendarDays[0];

  const selectedEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.date === selectedDate)
      .sort((a, b) =>
        String(a.startTime || "").localeCompare(String(b.startTime || ""))
      );
  }, [entries, selectedDate]);

  const todaysEntries = useMemo(() => {
    const todayKey = getTodayLocalDateKey();
    return entries
      .filter((entry) => entry.date === todayKey)
      .sort((a, b) =>
        String(a.startTime || "").localeCompare(String(b.startTime || ""))
      );
  }, [entries]);

  const currentDay = DAY_NAMES[new Date().getDay()];

  const nextEntry = useMemo(() => {
    if (selectedDate !== getTodayLocalDateKey()) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return (
      todaysEntries
        .filter(
          (entry) =>
            entry.notificationsEnabled !== false &&
            timeToMinutes(entry.startTime) >= currentMinutes
        )
        .sort(
          (a, b) =>
            timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
        )[0] || null
    );
  }, [selectedDate, todaysEntries]);

  /*
   * Timetable notification checker.
   *
   * Important:
   * Browser JavaScript timers cannot guarantee
   * notifications after the app/browser is fully
   * terminated. They work while the app/page is
   * active.
   */
  useEffect(() => {
    if (
      typeof Notification ===
        "undefined" ||
      Notification.permission !==
        "granted"
    ) {
      return undefined;
    }

    const checkTimetable =
      () => {
        const now =
          new Date();

        const today = getTodayLocalDateKey();

        const currentMinutes =
          now.getHours() *
            60 +
          now.getMinutes();

        entries.forEach(
          (entry) => {
            if (
              entry.date !== today ||
              entry.notificationsEnabled ===
                false
            ) {
              return;
            }

            const startMinutes =
              timeToMinutes(
                entry.startTime
              );

            /*
             * Notify during the minute the
             * timetable entry starts.
             */
            if (
              startMinutes !==
              currentMinutes
            ) {
              return;
            }

            const notificationKey =
              `taskbar-timetable-notified-${getTodayLocalDateKey()}-${entry.id}-${entry.startTime}`;

            if (
              localStorage.getItem(
                notificationKey
              )
            ) {
              return;
            }

            try {
              new Notification(
                "Taskbar Timetable",
                {
                  body: `${entry.activity} starts now.`,
                  tag: notificationKey,
                }
              );

              localStorage.setItem(
                notificationKey,
                "true"
              );
            } catch (error) {
              console.error(
                "Failed to show timetable notification:",
                error
              );
            }
          }
        );
      };

    checkTimetable();

    const intervalId =
      window.setInterval(
        checkTimetable,
        30000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [entries]);

  /*
   * Send a test notification.
   */
  async function testNotification() {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    try {
      new Notification(
        "Taskbar Timetable",
        {
          body:
            "Timetable notifications are working.",
        }
      );

      setNotificationMessage(
        "Test notification sent."
      );
    } catch (error) {
      console.error(
        "Test notification failed:",
        error
      );

      setNotificationMessage(
        "Could not show the test notification."
      );
    }
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>
          📅 Timetable
        </h1>
        <p>
          Loading timetable...
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
            📅 Timetable
          </h1>

          <p>
            Plan your regular schedule and get
            browser alerts when entries start.
          </p>

        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />
          Add Entry
        </button>

      </div>


      {/* TODAY / NOTIFICATION STATUS */}

      <section className="stat-grid">

        <div className="stat-card">

          <CalendarDays
            size={25}
          />

          <span>
            Today
          </span>

          <strong>
            {currentDay}
          </strong>

        </div>


        <div className="stat-card">

          <Bell size={25} />

          <span>
            Today's Entries
          </span>

          <strong>
            {todaysEntries.length}
          </strong>

        </div>


        <div className="stat-card">

          <Bell size={25} />

          <span>
            Next Entry
          </span>

          <strong>
            {nextEntry
              ? nextEntry.startTime
              : "None"}
          </strong>

        </div>

      </section>


      {/* NOTIFICATION CONTROLS */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Bell size={22} />

          <h2>
            Timetable Notifications
          </h2>

        </div>

        <p>
          Notifications are connected to your
          existing timetable entries. No separate
          timetable is created.
        </p>

        <div
          className="backup-actions"
          style={{
            marginTop: 14,
          }}
        >

          <button
            type="button"
            className="add-topic-button"
            onClick={
              testNotification
            }
          >
            <Bell size={17} />
            Test Notification
          </button>

        </div>

        {notificationMessage && (
          <p
            style={{
              marginTop: 12,
            }}
          >
            {notificationMessage}
          </p>
        )}

        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            opacity: 0.75,
          }}
        >
          Browser notifications work while
          Taskbar is active. A normal page timer
          cannot guarantee an alert after the
          browser/PWA has been completely closed.
        </p>

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
              {editingEntry
                ? "Edit Timetable Entry"
                : "Add Timetable Entry"}
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
                Date
              </label>

              <input
                type="date"
                min={calendarDays[0]?.key}
                max={calendarDays[10]?.key}
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                required
              />

              {form.date && (
                <small style={{ opacity: 0.7 }}>
                  {getDayNameFromDate(form.date)}
                </small>
              )}

            </div>


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


            <div className="form-group">

              <label>
                Activity
              </label>

              <input
                type="text"
                placeholder="Example: Java Study"
                value={
                  form.activity
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    activity:
                      event.target.value,
                  })
                }
              />

            </div>


            <div className="form-group">

              <label>
                Category
              </label>

              <select
                value={
                  form.category
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    category:
                      event.target.value,
                  })
                }
              >
                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

            </div>


            <div className="form-group">

              <label>
                Status
              </label>

              <select
                value={
                  form.status
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    status:
                      event.target.value,
                  })
                }
              >

                <option value="planned">
                  Planned
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

              </select>

            </div>


            <label
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
                cursor:
                  "pointer",
              }}
            >

              <input
                type="checkbox"
                checked={
                  form.notificationsEnabled
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    notificationsEnabled:
                      event.target
                        .checked,
                  })
                }
              />

              <span>
                Enable notification when this
                entry starts
              </span>

            </label>


            <button
              type="submit"
              className="save-topic-button"
            >
              {editingEntry
                ? "Save Changes"
                : "Add Entry"}
            </button>

          </form>

        </section>
      )}


      {/* 11-DAY CALENDAR */}

      <section
        className="learning-section"
        style={{ marginTop: 20 }}
      >
        <div className="topic-header">
          <div>
            <h2>11-Day Calendar</h2>
            <p>Plan your timetable for today and the next 10 days.</p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {calendarDays.map((calendarDay) => (
            <button
              key={calendarDay.key}
              type="button"
              onClick={() => setSelectedDate(calendarDay.key)}
              style={{
                padding: "12px 8px",
                borderRadius: 12,
                border:
                  selectedDate === calendarDay.key
                    ? "2px solid currentColor"
                    : "1px solid currentColor",
                background:
                  selectedDate === calendarDay.key
                    ? "rgba(255,255,255,0.12)"
                    : "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <strong style={{ display: "block" }}>{calendarDay.label}</strong>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                {calendarDay.dayName}
              </span>
            </button>
          ))}
        </div>

        <div className="topic-header">
          <div>
            <h3>
              {selectedDay?.label} • {selectedDay?.dayName}
            </h3>
            <p>{selectedDate}</p>
          </div>
        </div>

        <div className="topic-list">
          {selectedEntries.length === 0 ? (
            <p className="empty-topics">No timetable entries for this date.</p>
          ) : (
            selectedEntries.map((entry) => (
              <div className="topic-row" key={entry.id}>
                <div className="topic-information">
                  <strong>{entry.activity}</strong>
                  <span>
                    {entry.startTime} - {entry.endTime} • {entry.category} • {entry.status}
                  </span>
                </div>

                <div className="topic-actions">
                  <button
                    type="button"
                    className="edit-button"
                    title={entry.notificationsEnabled === false ? "Enable notification" : "Disable notification"}
                    onClick={() => toggleNotification(entry)}
                  >
                    {entry.notificationsEnabled === false ? <BellOff size={17} /> : <Bell size={17} />}
                  </button>

                  <button
                    type="button"
                    className="edit-button"
                    title="Edit"
                    onClick={() => openEditForm(entry)}
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    title="Delete"
                    onClick={() => deleteEntry(entry)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}

/*
 * Convert HH:MM into minutes.
 */
function timeToMinutes(
  time
) {
  if (
    typeof time !==
      "string" ||
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

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getDayNameFromDate(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

export default Timetable;