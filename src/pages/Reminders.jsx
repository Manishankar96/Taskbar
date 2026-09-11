import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  X,
  BellOff,
  CheckCircle2,
} from "lucide-react";

import {
  getReminders,
  saveReminders,
} from "../utils/db";

import {
  getTodayLocalDateKey,
} from "../utils/calculations";


function getToday() {
  return getTodayLocalDateKey();
}

function getReminderDateTime(reminder) {
  if (!reminder?.date || !reminder?.time) {
    return null;
  }

  const value = new Date(
    `${reminder.date}T${reminder.time}:00`
  );

  return Number.isNaN(value.getTime())
    ? null
    : value;
}

function getNotificationKey(reminder) {
  return `taskbar-reminder-${reminder.id}-${reminder.date}-${reminder.time}`;
}

function formatReminderTime(time) {
  if (!time) return "";

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatReminderDate(dateString) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const emptyForm = {
  title: "",
  date: getToday(),
  time: "",
};


function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notificationMessage, setNotificationMessage] =
    useState("");
  const [notificationPermission, setNotificationPermission] =
    useState(
      typeof Notification !== "undefined"
        ? Notification.permission
        : "unsupported"
    );


  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    async function load() {
      try {
        const saved = await getReminders();

        const normalized = (
          Array.isArray(saved) ? saved : []
        ).map((reminder) => ({
          ...reminder,
          enabled:
            reminder.enabled !== false,
          notified:
            reminder.notified === true,
        }));

        setReminders(normalized);
      } catch (error) {
        console.error(
          "Failed to load reminders:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);


  /* =========================================================
     PERSIST
  ========================================================= */

  async function persist(updated) {
    setReminders(updated);

    try {
      await saveReminders(updated);
    } catch (error) {
      console.error(
        "Failed to save reminders:",
        error
      );
    }
  }


  /* =========================================================
     BROWSER PERMISSION
  ========================================================= */

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setNotificationMessage(
        "This browser does not support notifications."
      );
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      setNotificationMessage(
        "Browser notifications are enabled."
      );
      return true;
    }

    if (Notification.permission === "denied") {
      setNotificationPermission("denied");
      setNotificationMessage(
        "Notifications are blocked. Allow notifications for localhost in your browser settings."
      );
      return false;
    }

    try {
      const permission =
        await Notification.requestPermission();

      setNotificationPermission(permission);

      if (permission === "granted") {
        setNotificationMessage(
          "Browser notifications are enabled."
        );
        return true;
      }

      setNotificationMessage(
        "Notification permission was not granted."
      );
      return false;
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


  /* =========================================================
     ENABLE ALL BROWSER NOTIFICATIONS
  ========================================================= */

  async function enableBrowserNotifications() {
    const granted =
      await requestNotificationPermission();

    if (!granted) return;

    /*
      Existing reminders remain enabled.
      Reset only reminders whose scheduled time
      has not already passed.
    */
    const now = new Date();

    const updated = reminders.map((reminder) => {
      const scheduled =
        getReminderDateTime(reminder);

      if (
        scheduled &&
        scheduled.getTime() > now.getTime()
      ) {
        return {
          ...reminder,
          enabled: true,
          notified: false,
        };
      }

      return reminder;
    });

    await persist(updated);
  }


  /* =========================================================
     ADD
  ========================================================= */

  function openAddForm() {
    setEditingReminder(null);

    setForm({
      title: "",
      date: getToday(),
      time: "",
    });

    setNotificationMessage("");
    setShowForm(true);
  }


  /* =========================================================
     EDIT
  ========================================================= */

  function openEditForm(reminder) {
    setEditingReminder(reminder);

    setForm({
      title: reminder.title || "",
      date: reminder.date || getToday(),
      time: reminder.time || "",
    });

    setNotificationMessage("");
    setShowForm(true);
  }


  /* =========================================================
     CLOSE
  ========================================================= */

  function closeForm() {
    setShowForm(false);
    setEditingReminder(null);

    setForm({
      title: "",
      date: getToday(),
      time: "",
    });

    setNotificationMessage("");
  }


  /* =========================================================
     SAVE FORM
  ========================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.date ||
      !form.time
    ) {
      setNotificationMessage(
        "Please enter reminder title, date and time."
      );
      return;
    }

    const scheduled = new Date(
      `${form.date}T${form.time}:00`
    );

    if (
      Number.isNaN(scheduled.getTime())
    ) {
      setNotificationMessage(
        "Invalid reminder date or time."
      );
      return;
    }

    if (
      scheduled.getTime() <= Date.now()
    ) {
      setNotificationMessage(
        "Please select a future date and time."
      );
      return;
    }

    /*
      The reminder itself is enabled independently
      from browser permission.

      This prevents a reminder from becoming
      permanently "Disabled" just because the browser
      permission has not been granted yet.
    */
    const reminder = {
      ...(editingReminder || {}),
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      enabled:
        editingReminder?.enabled !== false,
      notified: false,
    };

    if (editingReminder) {
      await persist(
        reminders.map((item) =>
          item.id === editingReminder.id
            ? reminder
            : item
        )
      );
    } else {
      await persist([
        ...reminders,
        {
          ...reminder,
          id: Date.now(),
        },
      ]);
    }

    /*
      Ask for permission after saving.
      The reminder remains active even if permission
      is not granted.
    */
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      setNotificationMessage(
        "Reminder saved as Active. Allow browser notifications if you want the popup notification."
      );
    }

    closeForm();
  }


  /* =========================================================
     ENABLE / DISABLE INDIVIDUAL REMINDER
  ========================================================= */

  async function toggleReminder(reminder) {
    const newEnabled =
      reminder.enabled === false;

    /*
      Disable:
      Turn the reminder off immediately.

      Enable:
      The reminder itself becomes Active immediately.
      Browser notification permission is handled separately.

      This is important because a browser permission problem
      must NOT permanently prevent the user from switching
      a reminder from Disabled back to Active.
    */

    if (newEnabled) {
      const scheduled =
        getReminderDateTime(reminder);

      if (!scheduled) {
        setNotificationMessage(
          "This reminder has an invalid date or time. Edit it first."
        );
        return;
      }

      /*
        If the scheduled time has already passed, the reminder
        cannot be meaningfully re-enabled for that old time.
        Edit it and choose a future date/time.
      */
      if (
        scheduled.getTime() <= Date.now()
      ) {
        setNotificationMessage(
          "This reminder time has already passed. Edit it and choose a future date and time."
        );
        return;
      }

      /*
        Enable the reminder FIRST.

        Notification permission is requested separately.
        Even if permission is denied, the reminder stays Active.
      */
      await persist(
        reminders.map((item) =>
          item.id === reminder.id
            ? {
                ...item,
                enabled: true,
                notified: false,
              }
            : item
        )
      );

      const granted =
        await requestNotificationPermission();

      if (!granted) {
        setNotificationMessage(
          "Reminder is Active, but browser notifications are not allowed. Enable browser notifications if you want popup alerts."
        );
      }

      return;
    }

    /*
      Disable immediately.
    */
    await persist(
      reminders.map((item) =>
        item.id === reminder.id
          ? {
              ...item,
              enabled: false,
            }
          : item
      )
    );
  }


  /* =========================================================
     DELETE
  ========================================================= */

  async function deleteReminder(reminder) {
    const confirmed = window.confirm(
      `Delete "${reminder.title}"?`
    );

    if (!confirmed) return;

    localStorage.removeItem(
      getNotificationKey(reminder)
    );

    await persist(
      reminders.filter(
        (item) =>
          item.id !== reminder.id
      )
    );
  }


  /* =========================================================
     REMINDER SCHEDULER
  ========================================================= */

  useEffect(() => {
    if (loading) return undefined;

    let cancelled = false;

    async function checkReminders() {
      if (cancelled) return;

      const now = Date.now();
      let changed = false;

      const updated = reminders.map(
        (reminder) => {
          if (
            reminder.enabled === false ||
            reminder.notified === true
          ) {
            return reminder;
          }

          const scheduled =
            getReminderDateTime(reminder);

          if (!scheduled) {
            return reminder;
          }

          /*
            Only fire after the exact scheduled
            date/time has arrived.

            No hardcoded hour or minute.
          */
          if (
            scheduled.getTime() > now
          ) {
            return reminder;
          }

          if (
            typeof Notification === "undefined" ||
            Notification.permission !== "granted"
          ) {
            return reminder;
          }

          const key =
            getNotificationKey(reminder);

          if (
            localStorage.getItem(key)
          ) {
            changed = true;

            return {
              ...reminder,
              notified: true,
            };
          }

          try {
            new Notification(
              "🔔 Taskbar Reminder",
              {
                body: reminder.title,
                tag: key,
              }
            );

            localStorage.setItem(
              key,
              "true"
            );

            changed = true;

            return {
              ...reminder,
              notified: true,
            };
          } catch (error) {
            console.error(
              "Failed to show reminder:",
              error
            );

            return reminder;
          }
        }
      );

      if (changed && !cancelled) {
        setReminders(updated);

        try {
          await saveReminders(updated);
        } catch (error) {
          console.error(
            "Failed to save notification state:",
            error
          );
        }
      }
    }

    /*
      Check immediately.
    */
    checkReminders();

    /*
      Check every 15 seconds so a reminder does
      not depend on landing exactly on a minute.
    */
    const intervalId =
      window.setInterval(
        checkReminders,
        15000
      );

    /*
      Check again when the user returns to the tab.
    */
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        checkReminders();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [reminders, loading]);


  /* =========================================================
     DATE GROUPS
  ========================================================= */

  const today = getToday();

  const todayReminders = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.date === today
        )
        .sort(
          (a, b) =>
            String(a.time || "").localeCompare(
              String(b.time || "")
            )
        ),
    [reminders, today]
  );

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.date > today
        )
        .sort(
          (a, b) =>
            `${a.date} ${a.time}`.localeCompare(
              `${b.date} ${b.time}`
            )
        ),
    [reminders, today]
  );

  const pastReminders = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.date < today
        )
        .sort(
          (a, b) =>
            `${b.date} ${b.time}`.localeCompare(
              `${a.date} ${a.time}`
            )
        ),
    [reminders, today]
  );

  const activeCount =
    reminders.filter(
      (reminder) =>
        reminder.enabled !== false
    ).length;


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="module-page">
        <h1>🔔 Reminders</h1>
        <p>Loading reminders...</p>
      </div>
    );
  }


  /* =========================================================
     REMINDER ROW
  ========================================================= */

  function ReminderRow({ reminder }) {
    const scheduled =
      getReminderDateTime(reminder);

    const isPast =
      scheduled &&
      scheduled.getTime() <= Date.now();

    const isToday =
      reminder.date === today;

    const status =
      reminder.enabled === false
        ? "Disabled"
        : reminder.notified
          ? "Notified"
          : isPast
            ? "Missed"
            : "Active";

    return (
      <div
        className="topic-row"
        key={reminder.id}
      >
        <div className="topic-information">

          <strong>
            {reminder.title}
          </strong>

          <span>
            {!isToday &&
              `${formatReminderDate(reminder.date)} • `}
            {formatReminderTime(reminder.time)}
            {" • "}
            {status}
          </span>

        </div>

        <div className="topic-actions">

          <button
            type="button"
            className="edit-button"
            title={
              reminder.enabled === false
                ? "Enable reminder"
                : "Disable reminder"
            }
            onClick={() =>
              toggleReminder(reminder)
            }
          >
            {reminder.enabled === false ? (
              <BellOff size={17} />
            ) : (
              <Bell size={17} />
            )}
          </button>

          <button
            type="button"
            className="edit-button"
            title="Edit reminder"
            onClick={() =>
              openEditForm(reminder)
            }
          >
            <Pencil size={17} />
          </button>

          <button
            type="button"
            className="delete-button"
            title="Delete reminder"
            onClick={() =>
              deleteReminder(reminder)
            }
          >
            <Trash2 size={17} />
          </button>

        </div>
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
          <h1>🔔 Reminders</h1>

          <p>
            Set date and time based reminders.
          </p>
        </div>

        <button
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Reminder
        </button>

      </div>


      {/* STATS */}

      <section className="stat-grid">

        <div className="stat-card">
          <Bell size={25} />

          <span>Total Reminders</span>

          <strong>
            {reminders.length}
          </strong>
        </div>

        <div className="stat-card">
          <CheckCircle2 size={25} />

          <span>Active</span>

          <strong>
            {activeCount}
          </strong>
        </div>

        <div className="stat-card">
          <Bell size={25} />

          <span>Today</span>

          <strong>
            {todayReminders.length}
          </strong>
        </div>

      </section>


      {/* BROWSER NOTIFICATIONS */}

      <section
        className="section-card"
        style={{ marginTop: 20 }}
      >

        <div className="section-title">

          <Bell size={22} />

          <h2>
            Browser Notifications
          </h2>

        </div>

        <p>
          Enable browser notifications to receive
          a popup when an active reminder reaches
          its selected date and time.
        </p>

        <p
          style={{
            marginTop: 10,
            fontSize: 13,
            opacity: 0.75,
          }}
        >
          Permission status:{" "}
          <strong>
            {notificationPermission}
          </strong>
        </p>

        {notificationPermission !==
          "granted" && (
          <button
            type="button"
            className="save-topic-button"
            onClick={
              enableBrowserNotifications
            }
            style={{
              marginTop: 12,
              width: "fit-content",
            }}
          >
            <Bell size={17} />
            Enable Browser Notifications
          </button>
        )}

        {notificationMessage && (
          <p style={{ marginTop: 10 }}>
            {notificationMessage}
          </p>
        )}

        <p
          style={{
            marginTop: 10,
            fontSize: 13,
            opacity: 0.75,
          }}
        >
          Important: a normal JavaScript timer
          cannot guarantee a notification when the
          browser is completely closed.
        </p>

      </section>


      {/* FORM */}

      {showForm && (

        <section
          className="module-form-card"
          style={{ marginTop: 20 }}
        >

          <div className="add-topic-header">

            <h2>
              {editingReminder
                ? "Edit Reminder"
                : "Add Reminder"}
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
                Reminder *
              </label>

              <input
                type="text"
                placeholder="Example: Apply for Java jobs"
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

            <div className="form-group">

              <label>
                Date *
              </label>

              <input
                type="date"
                value={form.date}
                min={today}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date:
                      event.target.value,
                  })
                }
              />

            </div>

            <div className="form-group">

              <label>
                Time *
              </label>

              <input
                type="time"
                value={form.time}
                onChange={(event) =>
                  setForm({
                    ...form,
                    time:
                      event.target.value,
                  })
                }
              />

            </div>

            <button
              type="submit"
              className="save-topic-button"
            >
              {editingReminder
                ? "Save Changes"
                : "Add Reminder"}
            </button>

          </form>

        </section>
      )}


      {/* TODAY */}

      <section
        className="learning-section"
        style={{ marginTop: 20 }}
      >

        <div className="topic-header">

          <div>
            <h2>
              Today's Reminders
            </h2>

            <p>
              Reminders scheduled for today.
            </p>
          </div>

        </div>

        <div className="topic-list">

          {todayReminders.map(
            (reminder) => (
              <ReminderRow
                reminder={reminder}
                key={reminder.id}
              />
            )
          )}

          {todayReminders.length === 0 && (
            <p className="empty-topics">
              No reminders for today.
            </p>
          )}

        </div>

      </section>


      {/* UPCOMING */}

      <section
        className="learning-section"
        style={{ marginTop: 20 }}
      >

        <div className="topic-header">

          <div>
            <h2>
              Upcoming Reminders
            </h2>

            <p>
              Reminders scheduled after today.
            </p>
          </div>

        </div>

        <div className="topic-list">

          {upcomingReminders.map(
            (reminder) => (
              <ReminderRow
                reminder={reminder}
                key={reminder.id}
              />
            )
          )}

          {upcomingReminders.length === 0 && (
            <p className="empty-topics">
              No upcoming reminders.
            </p>
          )}

        </div>

      </section>


      {/* PAST */}

      {pastReminders.length > 0 && (

        <section
          className="learning-section"
          style={{ marginTop: 20 }}
        >

          <div className="topic-header">

            <div>
              <h2>
                Past Reminders
              </h2>

              <p>
                Previous reminder dates.
              </p>
            </div>

          </div>

          <div className="topic-list">

            {pastReminders.map(
              (reminder) => (
                <ReminderRow
                  reminder={reminder}
                  key={reminder.id}
                />
              )
            )}

          </div>

        </section>
      )}

    </div>
  );
}

export default Reminders;
