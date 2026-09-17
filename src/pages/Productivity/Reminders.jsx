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
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import {
  getTodayLocalDateKey,
} from "../../utils/calculations";

const REMINDERS_COLLECTION = "reminders";

/* =========================================================
   DATE HELPERS
========================================================= */

function getToday() {
  return getTodayLocalDateKey();
}

function isNativeApp() {
  return (
    typeof window !== "undefined" &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform ===
      "function" &&
    window.Capacitor.isNativePlatform()
  );
}

function getReminderDateTime(reminder) {
  if (
    !reminder?.date ||
    !reminder?.time
  ) {
    return null;
  }

  const value = new Date(
    `${reminder.date}T${reminder.time}:00`
  );

  return Number.isNaN(value.getTime())
    ? null
    : value;
}

/* =========================================================
   NOTIFICATION ID
========================================================= */

function getNotificationId(reminder) {
  const raw = String(
    reminder?.id ?? ""
  );

  let hash = 0;

  for (
    let index = 0;
    index < raw.length;
    index += 1
  ) {
    hash =
      (hash * 31 +
        raw.charCodeAt(index)) %
      2147483647;
  }

  return Math.max(
    1,
    Math.abs(hash)
  );
}

/* =========================================================
   BROWSER NOTIFICATION KEY
========================================================= */

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

/* =========================================================
   FORMAT TIME
========================================================= */

function formatReminderTime(time) {
  if (!time) return "";

  const [hours, minutes] =
    String(time)
      .split(":")
      .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatReminderDate(
  dateString
) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   FORM
========================================================= */

const emptyForm = {
  title: "",
  date: getToday(),
  time: "",
};

/* =========================================================
   COMPONENT
========================================================= */

function Reminders() {
  const [reminders, setReminders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingReminder,
    setEditingReminder,
  ] = useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState("");

  const [
    notificationPermission,
    setNotificationPermission,
  ] = useState("unknown");

  /* =========================================================
     NORMALIZE FIRESTORE DATA
  ========================================================= */

  function normalizeReminders(items) {
    return (
      Array.isArray(items)
        ? items
        : []
    )
      .filter(
        (reminder) =>
          reminder?.id !==
            undefined &&
          reminder?.id !== null
      )
      .map((reminder) => ({
        ...reminder,
        id: String(reminder.id),

        enabled:
          reminder.enabled !==
          false,

        notified:
          reminder.notified ===
          true,
      }));
  }

  /* =========================================================
     LOAD FROM FIRESTORE
  ========================================================= */

  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;

    async function load() {
      try {
        const cloudReminders =
          await getItemsFromFirestore(
            REMINDERS_COLLECTION
          );

        if (!mounted) {
          return;
        }

        const normalized =
          normalizeReminders(
            cloudReminders
          );

        setReminders(normalized);

        /* =====================================================
           REAL-TIME FIRESTORE SYNC
        ===================================================== */

        unsubscribe =
          subscribeToFirestoreCollection(
            REMINDERS_COLLECTION,
            (items) => {
              if (!mounted) {
                return;
              }

              const normalizedItems =
                normalizeReminders(
                  items
                );

              setReminders(
                normalizedItems
              );
            },
            (error) => {
              console.error(
                "Reminders real-time sync error:",
                error
              );
            }
          );
      } catch (error) {
        console.error(
          "Failed to load reminders:",
          error
        );

        if (mounted) {
          setReminders([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     FIRESTORE SAVE
  ========================================================= */

  async function persistReminder(
    reminder
  ) {
    const normalizedReminder = {
      ...reminder,

      id: String(reminder.id),

      enabled:
        reminder.enabled !== false,

      notified:
        reminder.notified === true,
    };

    try {
      await saveItemToFirestore(
        REMINDERS_COLLECTION,
        String(
          normalizedReminder.id
        ),
        normalizedReminder
      );

      return true;
    } catch (error) {
      console.error(
        "Failed to save reminder:",
        error
      );

      alert(
        "Failed to save reminder. Please try again."
      );

      return false;
    }
  }

  /* =========================================================
     CHECK NOTIFICATION PERMISSION
  ========================================================= */

  useEffect(() => {
    async function checkPermission() {
      try {
        if (isNativeApp()) {
          const result =
            await LocalNotifications.checkPermissions();

          setNotificationPermission(
            result.display ||
              "unknown"
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

  /* =========================================================
     REQUEST NOTIFICATION PERMISSION
  ========================================================= */

  async function requestNotificationPermission() {
    try {
      /* =====================================================
         ANDROID / CAPACITOR
      ===================================================== */

      if (isNativeApp()) {
        let permission =
          await LocalNotifications.checkPermissions();

        if (
          permission.display !==
          "granted"
        ) {
          permission =
            await LocalNotifications.requestPermissions();
        }

        setNotificationPermission(
          permission.display
        );

        if (
          permission.display ===
          "granted"
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

      /* =====================================================
         WEB FALLBACK
      ===================================================== */

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

  /* =========================================================
     SCHEDULE NATIVE NOTIFICATION
  ========================================================= */

  async function scheduleNativeNotification(
    reminder
  ) {
    if (!isNativeApp()) {
      return false;
    }

    const scheduled =
      getReminderDateTime(
        reminder
      );

    if (!scheduled) {
      return false;
    }

    if (
      scheduled.getTime() <=
      Date.now()
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
        getNotificationId(
          reminder
        );

      /* Cancel previous notification */

      try {
        await LocalNotifications.cancel(
          {
            notifications: [
              {
                id: notificationId,
              },
            ],
          }
        );
      } catch {
        // Notification may not exist yet.
      }

      await LocalNotifications.schedule(
        {
          notifications: [
            {
              id: notificationId,

              title:
                "🔔 Taskbar Reminder",

              body:
                reminder.title,

              schedule: {
                at: scheduled,
                allowWhileIdle:
                  true,
              },

              sound: "default",

              extra: {
                reminderId:
                  String(
                    reminder.id
                  ),
              },
            },
          ],
        }
      );

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

  /* =========================================================
     CANCEL NATIVE NOTIFICATION
  ========================================================= */

  async function cancelNativeNotification(
    reminder
  ) {
    if (!isNativeApp()) {
      return;
    }

    try {
      await LocalNotifications.cancel(
        {
          notifications: [
            {
              id:
                getNotificationId(
                  reminder
                ),
            },
          ],
        }
      );
    } catch (error) {
      console.error(
        "Failed to cancel native notification:",
        error
      );
    }
  }

  /* =========================================================
     SCHEDULE ALL ACTIVE NATIVE REMINDERS
  ========================================================= */

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
        reminder.enabled ===
        false
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

  /* =========================================================
     ENABLE NOTIFICATIONS
  ========================================================= */

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

    /* =====================================================
       WEB FALLBACK
    ===================================================== */

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

    setReminders(updated);

    try {
      await Promise.all(
        updated.map((reminder) =>
          persistReminder(
            reminder
          )
        )
      );
    } catch (error) {
      console.error(
        "Failed to update reminders:",
        error
      );
    }

    setNotificationMessage(
      "Browser notifications are enabled."
    );
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

  function openEditForm(
    reminder
  ) {
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

  async function handleSubmit(
    event
  ) {
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

    /* =====================================================
       CANCEL OLD NATIVE NOTIFICATION
    ===================================================== */

    if (editingReminder) {
      await cancelNativeNotification(
        editingReminder
      );
    }

    const reminder = {
      ...(editingReminder || {}),

      id: String(
        editingReminder?.id ??
          Date.now()
      ),

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

      updatedAt:
        new Date().toISOString(),

      createdAt:
        editingReminder?.createdAt ||
        new Date().toISOString(),
    };

    /* =====================================================
       SAVE TO FIRESTORE FIRST
    ===================================================== */

    const success =
      await persistReminder(
        reminder
      );

    if (!success) {
      return;
    }

    /* =====================================================
       UPDATE LOCAL UI
    ===================================================== */

    setReminders((previous) => {
      if (editingReminder) {
        return previous.map(
          (item) =>
            String(item.id) ===
            String(
              editingReminder.id
            )
              ? reminder
              : item
        );
      }

      return [
        ...previous,
        reminder,
      ];
    });

    /* =====================================================
       NATIVE ANDROID
    ===================================================== */

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
      /* ===================================================
         WEB
      =================================================== */

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

  /* =========================================================
     ENABLE / DISABLE INDIVIDUAL REMINDER
  ========================================================= */

  async function toggleReminder(
    reminder
  ) {
    const newEnabled =
      reminder.enabled === false;

    const scheduled =
      getReminderDateTime(
        reminder
      );

    /* =====================================================
       ENABLE
    ===================================================== */

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
        updatedAt:
          new Date().toISOString(),
      };

      const success =
        await persistReminder(
          updatedReminder
        );

      if (!success) {
        return;
      }

      setReminders((previous) =>
        previous.map((item) =>
          String(item.id) ===
          String(reminder.id)
            ? updatedReminder
            : item
        )
      );

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

    /* =====================================================
       DISABLE
    ===================================================== */

    await cancelNativeNotification(
      reminder
    );

    try {
      localStorage.removeItem(
        getNotificationKey(
          reminder
        )
      );
    } catch (error) {
      console.error(
        "Failed to clear browser notification key:",
        error
      );
    }

    const updatedReminder = {
      ...reminder,
      enabled: false,
      updatedAt:
        new Date().toISOString(),
    };

    const success =
      await persistReminder(
        updatedReminder
      );

    if (!success) {
      return;
    }

    setReminders((previous) =>
      previous.map((item) =>
        String(item.id) ===
        String(reminder.id)
          ? updatedReminder
          : item
      )
    );
  }

  /* =========================================================
     DELETE
  ========================================================= */

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

    try {
      localStorage.removeItem(
        getNotificationKey(
          reminder
        )
      );
    } catch (error) {
      console.error(
        "Failed to clear browser notification key:",
        error
      );
    }

    try {
      await deleteItemFromFirestore(
        REMINDERS_COLLECTION,
        String(reminder.id)
      );

      setReminders((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(reminder.id)
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete reminder:",
        error
      );

      alert(
        "Failed to delete reminder. Please try again."
      );
    }
  }

  /* =========================================================
     WEB FALLBACK SCHEDULER
  ========================================================= */

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

      const now = Date.now();

      const changedReminders = [];

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

            let alreadyNotified =
              false;

            try {
              alreadyNotified =
                Boolean(
                  localStorage.getItem(
                    key
                  )
                );
            } catch {
              alreadyNotified = false;
            }

            if (alreadyNotified) {
              const updatedReminder = {
                ...reminder,
                notified: true,
              };

              changedReminders.push(
                updatedReminder
              );

              return updatedReminder;
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

              try {
                localStorage.setItem(
                  key,
                  "true"
                );
              } catch {
                // Ignore localStorage failure.
              }

              const updatedReminder = {
                ...reminder,
                notified: true,
              };

              changedReminders.push(
                updatedReminder
              );

              return updatedReminder;
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
        changedReminders.length >
          0 &&
        !cancelled
      ) {
        setReminders(updated);

        try {
          await Promise.all(
            changedReminders.map(
              (reminder) =>
                persistReminder(
                  reminder
                )
            )
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

  /* =========================================================
     RESCHEDULE NATIVE REMINDERS WHEN APP LOADS
  ========================================================= */

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
    reminders,
  ]);

  /* =========================================================
     DATE GROUPS
  ========================================================= */

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

  /* =========================================================
     LOADING
  ========================================================= */

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

  /* =========================================================
     REMINDER ROW
  ========================================================= */

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

          {/* ENABLE / DISABLE */}

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

          {/* EDIT */}

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

          {/* DELETE */}

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
            🔔 Reminders
          </h1>

          <p>
            Set date and time based reminders.
          </p>

        </div>

        <button
          type="button"
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />
          Add Reminder
        </button>

      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

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

      {/* =====================================================
          NOTIFICATION STATUS
      ===================================================== */}

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
            {
              notificationPermission
            }
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
            {
              notificationMessage
            }
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
            Android notifications are
            scheduled natively and do not
            depend on a JavaScript timer.
          </p>
        )}

      </section>

      {/* =====================================================
          FORM
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

            {/* REMINDER */}

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
                      event.target
                        .value,
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
                min={today}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date:
                      event.target
                        .value,
                  })
                }
              />

            </div>

            {/* TIME */}

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
                      event.target
                        .value,
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

      {/* =====================================================
          TODAY
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
                reminder={
                  reminder
                }
                key={
                  reminder.id
                }
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

      {/* =====================================================
          UPCOMING
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
                reminder={
                  reminder
                }
                key={
                  reminder.id
                }
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

      {/* =====================================================
          PAST
      ===================================================== */}

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
                  reminder={
                    reminder
                  }
                  key={
                    reminder.id
                  }
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