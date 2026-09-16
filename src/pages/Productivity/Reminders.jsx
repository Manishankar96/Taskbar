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

import { LocalNotifications } from "@capacitor/local-notifications";

import {
  getReminders,
  saveReminders,
} from "../../utils/db";

import {
  getTodayLocalDateKey,
} from "../../utils/calculations";

function getToday() {
  return getTodayLocalDateKey();
}

function isNativeApp() {
  return (
    typeof window !== "undefined" &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform()
  );
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

function getNotificationId(reminder) {
  const raw = String(reminder?.id ?? "");

  let hash = 0;

  for (let index = 0; index < raw.length; index += 1) {
    hash =
      (hash * 31 + raw.charCodeAt(index)) %
      2147483647;
  }

  return Math.max(1, Math.abs(hash));
}

function getNotificationKey(reminder) {
  return (
    "taskbar-reminder-" +
    reminder.id +
    "-" +
    reminder.date +
    "-" +
    reminder.time
  );
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
  const [editingReminder, setEditingReminder] =
    useState(null);
  const [form, setForm] = useState(emptyForm);

  const [notificationMessage, setNotificationMessage] =
    useState("");

  const [notificationPermission, setNotificationPermission] =
    useState("unknown");

  /*
   * =========================================================
   * LOAD
   * =========================================================
   */

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

  /*
   * =========================================================
   * CHECK NOTIFICATION PERMISSION
   * =========================================================
   */

  useEffect(() => {
    async function checkPermission() {
      try {
        if (isNativeApp()) {
          const result =
            await LocalNotifications.checkPermissions();

          setNotificationPermission(
            result.display || "unknown"
          );

          return;
        }

        if (
          typeof Notification !==
          "undefined"
        ) {
          setNotificationPermission(
            Notification.permission
          );
        } else {
          setNotificationPermission(
            "unsupported"
          );
        }
      } catch (error) {
        console.error(
          "Failed to check notification permission:",
          error
        );
      }
    }

    checkPermission();
  }, []);

  /*
   * =========================================================
   * PERSIST
   * =========================================================
   */

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

  /*
   * =========================================================
   * REQUEST NOTIFICATION PERMISSION
   * =========================================================
   */

  async function requestNotificationPermission() {
    try {
      /*
       * ANDROID / CAPACITOR
       */

      if (isNativeApp()) {
        let permission =
          await LocalNotifications.checkPermissions();

        if (
          permission.display !== "granted"
        ) {
          permission =
            await LocalNotifications.requestPermissions();
        }

        setNotificationPermission(
          permission.display
        );

        if (
          permission.display === "granted"
        ) {
          setNotificationMessage(
            "Phone notifications are enabled."
          );

          return true;
        }

        setNotificationMessage(
          "Phone notification permission was not granted."
        );

        return false;
      }

      /*
       * WEB FALLBACK
       */

      if (
        typeof Notification ===
        "undefined"
      ) {
        setNotificationPermission(
          "unsupported"
        );

        setNotificationMessage(
          "This browser does not support notifications."
        );

        return false;
      }

      if (
        Notification.permission ===
        "granted"
      ) {
        setNotificationPermission(
          "granted"
        );

        return true;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        setNotificationPermission(
          "denied"
        );

        setNotificationMessage(
          "Browser notifications are blocked. Allow notifications in your browser settings."
        );

        return false;
      }

      const permission =
        await Notification.requestPermission();

      setNotificationPermission(
        permission
      );

      if (
        permission === "granted"
      ) {
        setNotificationMessage(
          "Browser notifications are enabled."
        );

        return true;
      }

      setNotificationMessage(
        "Browser notification permission was not granted."
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

  /*
   * =========================================================
   * SCHEDULE NATIVE NOTIFICATION
   * =========================================================
   */

  async function scheduleNativeNotification(
    reminder
  ) {
    if (!isNativeApp()) {
      return false;
    }

    const scheduled =
      getReminderDateTime(reminder);

    if (!scheduled) {
      return false;
    }

    if (
      scheduled.getTime() <= Date.now()
    ) {
      return false;
    }

    try {
      const granted =
        await requestNotificationPermission();

      if (!granted) {
        return false;
      }

      const notificationId =
        getNotificationId(reminder);

      /*
       * Cancel the old notification first.
       * This is important when editing a reminder.
       */

      try {
        await LocalNotifications.cancel({
          notifications: [
            {
              id: notificationId,
            },
          ],
        });
      } catch {
        // Notification may not exist yet.
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,

            title:
              "🔔 Taskbar Reminder",

            body:
              reminder.title,

            schedule: {
              at: scheduled,
              allowWhileIdle: true,
            },

            sound:
              "default",

            extra: {
              reminderId:
                String(reminder.id),
            },
          },
        ],
      });

      return true;
    } catch (error) {
      console.error(
        "Failed to schedule native notification:",
        error
      );

      setNotificationMessage(
        "Could not schedule the phone notification."
      );

      return false;
    }
  }

  /*
   * =========================================================
   * CANCEL NATIVE NOTIFICATION
   * =========================================================
   */

  async function cancelNativeNotification(
    reminder
  ) {
    if (!isNativeApp()) {
      return;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [
          {
            id:
              getNotificationId(
                reminder
              ),
          },
        ],
      });
    } catch (error) {
      console.error(
        "Failed to cancel native notification:",
        error
      );
    }
  }

  /*
   * =========================================================
   * SCHEDULE ALL ACTIVE REMINDERS
   * =========================================================
   */

  async function scheduleAllNativeReminders(
    reminderList
  ) {
    if (!isNativeApp()) {
      return;
    }

    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    for (const reminder of reminderList) {
      if (
        reminder.enabled === false
      ) {
        await cancelNativeNotification(
          reminder
        );

        continue;
      }

      const scheduled =
        getReminderDateTime(
          reminder
        );

      if (
        !scheduled ||
        scheduled.getTime() <=
          Date.now()
      ) {
        continue;
      }

      await scheduleNativeNotification(
        reminder
      );
    }
  }

  /*
   * =========================================================
   * ENABLE NOTIFICATIONS
   * =========================================================
   */

  async function enableNotifications() {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    if (isNativeApp()) {
      await scheduleAllNativeReminders(
        reminders
      );

      setNotificationMessage(
        "Phone notifications are enabled and active reminders are scheduled."
      );

      return;
    }

    /*
     * WEB FALLBACK
     */

    const now = new Date();

    const updated =
      reminders.map(
        (reminder) => {
          const scheduled =
            getReminderDateTime(
              reminder
            );

          if (
            scheduled &&
            scheduled.getTime() >
              now.getTime()
          ) {
            return {
              ...reminder,
              enabled: true,
              notified: false,
            };
          }

          return reminder;
        }
      );

    await persist(updated);

    setNotificationMessage(
      "Browser notifications are enabled."
    );
  }

  /*
   * =========================================================
   * ADD
   * =========================================================
   */

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

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  function openEditForm(reminder) {
    setEditingReminder(reminder);

    setForm({
      title:
        reminder.title || "",

      date:
        reminder.date ||
        getToday(),

      time:
        reminder.time || "",
    });

    setNotificationMessage("");
    setShowForm(true);
  }

  /*
   * =========================================================
   * CLOSE
   * =========================================================
   */

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

  /*
   * =========================================================
   * SAVE FORM
   * =========================================================
   */

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

    const scheduled =
      new Date(
        `${form.date}T${form.time}:00`
      );

    if (
      Number.isNaN(
        scheduled.getTime()
      )
    ) {
      setNotificationMessage(
        "Invalid reminder date or time."
      );

      return;
    }

    if (
      scheduled.getTime() <=
      Date.now()
    ) {
      setNotificationMessage(
        "Please select a future date and time."
      );

      return;
    }

    /*
     * If editing, cancel the old
     * native notification first.
     */

    if (editingReminder) {
      await cancelNativeNotification(
        editingReminder
      );
    }

    const reminder = {
      ...(editingReminder || {}),

      id:
        editingReminder?.id ??
        Date.now(),

      title:
        form.title.trim(),

      date:
        form.date,

      time:
        form.time,

      enabled:
        editingReminder?.enabled !==
        false,

      notified: false,
    };

    let updated;

    if (editingReminder) {
      updated =
        reminders.map(
          (item) =>
            item.id ===
            editingReminder.id
              ? reminder
              : item
        );
    } else {
      updated = [
        ...reminders,
        reminder,
      ];
    }

    await persist(updated);

    /*
     * Native Android
     */

    if (
      isNativeApp() &&
      reminder.enabled !== false
    ) {
      const scheduledSuccessfully =
        await scheduleNativeNotification(
          reminder
        );

      if (
        scheduledSuccessfully
      ) {
        setNotificationMessage(
          "Reminder saved and phone notification scheduled."
        );
      }
    } else {
      /*
       * Web
       */

      const granted =
        await requestNotificationPermission();

      if (!granted) {
        setNotificationMessage(
          "Reminder saved. Enable browser notifications for web alerts."
        );
      }
    }

    closeForm();
  }

  /*
   * =========================================================
   * ENABLE / DISABLE INDIVIDUAL REMINDER
   * =========================================================
   */

  async function toggleReminder(
    reminder
  ) {
    const newEnabled =
      reminder.enabled === false;

    const scheduled =
      getReminderDateTime(
        reminder
      );

    if (newEnabled) {
      if (!scheduled) {
        setNotificationMessage(
          "This reminder has an invalid date or time. Edit it first."
        );

        return;
      }

      if (
        scheduled.getTime() <=
        Date.now()
      ) {
        setNotificationMessage(
          "This reminder time has already passed. Edit it and choose a future date and time."
        );

        return;
      }

      const updatedReminder = {
        ...reminder,
        enabled: true,
        notified: false,
      };

      const updated =
        reminders.map(
          (item) =>
            item.id ===
            reminder.id
              ? updatedReminder
              : item
        );

      await persist(updated);

      if (isNativeApp()) {
        const scheduledSuccessfully =
          await scheduleNativeNotification(
            updatedReminder
          );

        if (
          scheduledSuccessfully
        ) {
          setNotificationMessage(
            "Reminder is Active and phone notification is scheduled."
          );
        }

        return;
      }

      const granted =
        await requestNotificationPermission();

      if (!granted) {
        setNotificationMessage(
          "Reminder is Active, but browser notifications are not allowed."
        );
      }

      return;
    }

    /*
     * Disable
     */

    await cancelNativeNotification(
      reminder
    );

    localStorage.removeItem(
      getNotificationKey(
        reminder
      )
    );

    const updated =
      reminders.map(
        (item) =>
          item.id ===
          reminder.id
            ? {
                ...item,
                enabled: false,
              }
            : item
      );

    await persist(updated);
  }

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  async function deleteReminder(
    reminder
  ) {
    const confirmed =
      window.confirm(
        `Delete "${reminder.title}"?`
      );

    if (!confirmed) {
      return;
    }

    await cancelNativeNotification(
      reminder
    );

    localStorage.removeItem(
      getNotificationKey(
        reminder
      )
    );

    await persist(
      reminders.filter(
        (item) =>
          item.id !==
          reminder.id
      )
    );
  }

  /*
   * =========================================================
   * WEB FALLBACK SCHEDULER
   * =========================================================
   *
   * This is used only when running
   * TASKBAR in a normal browser.
   *
   * Android uses native scheduled
   * notifications instead.
   */

  useEffect(() => {
    if (
      loading ||
      isNativeApp()
    ) {
      return undefined;
    }

    let cancelled = false;

    async function checkReminders() {
      if (cancelled) {
        return;
      }

      if (
        typeof Notification ===
          "undefined" ||
        Notification.permission !==
          "granted"
      ) {
        return;
      }

      const now =
        Date.now();

      let changed = false;

      const updated =
        reminders.map(
          (reminder) => {
            if (
              reminder.enabled ===
                false ||
              reminder.notified ===
                true
            ) {
              return reminder;
            }

            const scheduled =
              getReminderDateTime(
                reminder
              );

            if (!scheduled) {
              return reminder;
            }

            if (
              scheduled.getTime() >
              now
            ) {
              return reminder;
            }

            const key =
              getNotificationKey(
                reminder
              );

            if (
              localStorage.getItem(
                key
              )
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
                  body:
                    reminder.title,

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
                "Failed to show browser reminder:",
                error
              );

              return reminder;
            }
          }
        );

      if (
        changed &&
        !cancelled
      ) {
        setReminders(
          updated
        );

        try {
          await saveReminders(
            updated
          );
        } catch (error) {
          console.error(
            "Failed to save notification state:",
            error
          );
        }
      }
    }

    checkReminders();

    const intervalId =
      window.setInterval(
        checkReminders,
        15000
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
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

      window.clearInterval(
        intervalId
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    reminders,
    loading,
  ]);

  /*
   * =========================================================
   * RESCHEDULE NATIVE REMINDERS WHEN APP LOADS
   * =========================================================
   */

  useEffect(() => {
    if (
      loading ||
      !isNativeApp() ||
      reminders.length === 0
    ) {
      return;
    }

    async function scheduleExistingReminders() {
      await scheduleAllNativeReminders(
        reminders
      );
    }

    scheduleExistingReminders();
  }, [
    loading,
  ]);

  /*
   * =========================================================
   * DATE GROUPS
   * =========================================================
   */

  const today =
    getToday();

  const todayReminders =
    useMemo(
      () =>
        reminders
          .filter(
            (reminder) =>
              reminder.date ===
              today
          )
          .sort(
            (a, b) =>
              String(
                a.time || ""
              ).localeCompare(
                String(
                  b.time || ""
                )
              )
          ),
      [
        reminders,
        today,
      ]
    );

  const upcomingReminders =
    useMemo(
      () =>
        reminders
          .filter(
            (reminder) =>
              reminder.date >
              today
          )
          .sort(
            (a, b) =>
              `${a.date} ${a.time}`.localeCompare(
                `${b.date} ${b.time}`
              )
          ),
      [
        reminders,
        today,
      ]
    );

  const pastReminders =
    useMemo(
      () =>
        reminders
          .filter(
            (reminder) =>
              reminder.date <
              today
          )
          .sort(
            (a, b) =>
              `${b.date} ${b.time}`.localeCompare(
                `${a.date} ${a.time}`
              )
          ),
      [
        reminders,
        today,
      ]
    );

  const activeCount =
    reminders.filter(
      (reminder) =>
        reminder.enabled !==
        false
    ).length;

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="module-page">
        <h1>
          🔔 Reminders
        </h1>

        <p>
          Loading reminders...
        </p>
      </div>
    );
  }

  /*
   * =========================================================
   * REMINDER ROW
   * =========================================================
   */

  function ReminderRow({
    reminder,
  }) {
    const scheduled =
      getReminderDateTime(
        reminder
      );

    const isPast =
      scheduled &&
      scheduled.getTime() <=
        Date.now();

    const isToday =
      reminder.date ===
      today;

    const status =
      reminder.enabled ===
      false
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
              `${formatReminderDate(
                reminder.date
              )} • `}

            {formatReminderTime(
              reminder.time
            )}

            {" • "}

            {status}
          </span>

        </div>

        <div className="topic-actions">

          <button
            type="button"
            className="edit-button"
            title={
              reminder.enabled ===
              false
                ? "Enable reminder"
                : "Disable reminder"
            }
            onClick={() =>
              toggleReminder(
                reminder
              )
            }
          >
            {reminder.enabled ===
            false ? (
              <BellOff
                size={17}
              />
            ) : (
              <Bell
                size={17}
              />
            )}
          </button>

          <button
            type="button"
            className="edit-button"
            title="Edit reminder"
            onClick={() =>
              openEditForm(
                reminder
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
            title="Delete reminder"
            onClick={() =>
              deleteReminder(
                reminder
              )
            }
          >
            <Trash2
              size={17}
            />
          </button>

        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="module-page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>
            🔔 Reminders
          </h1>

          <p>
            Set date and time based reminders.
          </p>
        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />
          Add Reminder
        </button>

      </div>


      {/* STATS */}

      <section className="stat-grid">

        <div className="stat-card">
          <Bell size={25} />

          <span>
            Total Reminders
          </span>

          <strong>
            {reminders.length}
          </strong>
        </div>

        <div className="stat-card">
          <CheckCircle2
            size={25}
          />

          <span>
            Active
          </span>

          <strong>
            {activeCount}
          </strong>
        </div>

        <div className="stat-card">
          <Bell size={25} />

          <span>
            Today
          </span>

          <strong>
            {todayReminders.length}
          </strong>
        </div>

      </section>


      {/* NOTIFICATION STATUS */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Bell size={22} />

          <h2>
            {isNativeApp()
              ? "Phone Notifications"
              : "Browser Notifications"}
          </h2>

        </div>

        <p>
          {isNativeApp()
            ? "Enable phone notifications so Taskbar can alert you at the scheduled reminder time, even when the app is closed."
            : "Enable browser notifications to receive alerts while using Taskbar in your browser."}
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
              enableNotifications
            }
            style={{
              marginTop: 12,
              width: "fit-content",
            }}
          >
            <Bell size={17} />

            {isNativeApp()
              ? "Enable Phone Notifications"
              : "Enable Browser Notifications"}
          </button>
        )}

        {notificationMessage && (
          <p
            style={{
              marginTop: 10,
            }}
          >
            {notificationMessage}
          </p>
        )}

        {isNativeApp() && (
          <p
            style={{
              marginTop: 10,
              fontSize: 13,
              opacity: 0.75,
            }}
          >
            Android notifications are scheduled natively and do not depend on a JavaScript timer.
          </p>
        )}

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
              {editingReminder
                ? "Edit Reminder"
                : "Add Reminder"}
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
                Reminder *
              </label>

              <input
                type="text"
                placeholder="Example: Apply for Java jobs"
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
                Date *
              </label>

              <input
                type="date"
                value={
                  form.date
                }
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
                value={
                  form.time
                }
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
        style={{
          marginTop: 20,
        }}
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

          {todayReminders.length ===
            0 && (
            <p className="empty-topics">
              No reminders for today.
            </p>
          )}

        </div>

      </section>


      {/* UPCOMING */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
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

          {upcomingReminders.length ===
            0 && (
            <p className="empty-topics">
              No upcoming reminders.
            </p>
          )}

        </div>

      </section>


      {/* PAST */}

      {pastReminders.length >
        0 && (

        <section
          className="learning-section"
          style={{
            marginTop: 20,
          }}
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