// ============================================================
// TASKBAR - SMART NOTIFICATION SERVICE
// ============================================================
// Purpose:
// - Keep all intelligent notification logic in ONE place.
// - Use actual TASKBAR data.
// - Generate up to 3 useful notifications per day.
// - Keep manual reminders separate.
// - Personalize messages with the user's profile name.
// - Prefer important tasks/deadlines over generic motivation.
// - Use LOCAL dates, never UTC.
// ============================================================

import { LocalNotifications } from "@capacitor/local-notifications";

import {
  getProfile,
  getTopics,
  getGoals,
  getWater,
  getActivities,
  getAssessments,
  getTodoList,
  getStudySessions,
  getDiet,
  getScreenTime,
} from "./db";

import {
  getTodayLocalDateKey,
  diffInLocalDays,
} from "./calculations";

// ============================================================
// CONFIGURATION
// ============================================================

const STORAGE_KEY = "taskbar-smart-notification-state";

const MAX_NOTIFICATIONS_PER_DAY = 3;

// Three daily notification opportunities.
// These are intentionally separated through the day.
const DAILY_WINDOWS = [
  {
    key: "morning",
    hour: 9,
    minute: 0,
  },
  {
    key: "afternoon",
    hour: 14,
    minute: 0,
  },
  {
    key: "evening",
    hour: 19,
    minute: 0,
  },
];

// Notification IDs are kept away from manual reminder IDs.
const SMART_NOTIFICATION_BASE_ID = 700000;

// ============================================================
// BASIC HELPERS
// ============================================================

function isNativeApp() {
  try {
    return Boolean(
      window?.Capacitor &&
        typeof window.Capacitor.isNativePlatform === "function" &&
        window.Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function getDateKey(value) {
  if (!value) return null;

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return null;
}

function isCompleted(item) {
  if (!item) return false;

  return (
    item.completed === true ||
    item.isCompleted === true ||
    item.done === true ||
    item.status === "completed" ||
    item.status === "Completed" ||
    item.status === "done"
  );
}

function isPending(item) {
  return !isCompleted(item);
}

// ============================================================
// SETTINGS
// ============================================================

function areSmartNotificationsEnabled() {
  try {
    const raw = localStorage.getItem("taskbar-settings");

    if (!raw) {
      return true;
    }

    const settings = JSON.parse(raw);

    return settings?.remindersEnabled !== false;
  } catch {
    return true;
  }
}

function getProfileName(profile) {
  if (!profile) return "there";

  const possibleNames = [
    profile.name,
    profile.fullName,
    profile.displayName,
    profile.username,
    profile.firstName,
  ];

  for (const value of possibleNames) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().split(" ")[0];
    }
  }

  return "there";
}

// ============================================================
// SMART NOTIFICATION STATE
// ============================================================

function getNotificationState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        date: getTodayLocalDateKey(),
        sent: [],
      };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || parsed.date !== getTodayLocalDateKey()) {
      return {
        date: getTodayLocalDateKey(),
        sent: [],
      };
    }

    return {
      date: parsed.date,
      sent: safeArray(parsed.sent),
    };
  } catch {
    return {
      date: getTodayLocalDateKey(),
      sent: [],
    };
  }
}

function saveNotificationState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        date: getTodayLocalDateKey(),
        sent: safeArray(state.sent),
      })
    );
  } catch {
    // Local storage failure should never break TASKBAR.
  }
}

function hasSentToday(key) {
  const state = getNotificationState();

  return state.sent.includes(key);
}

function markSent(key) {
  const state = getNotificationState();

  if (!state.sent.includes(key)) {
    state.sent.push(key);
  }

  saveNotificationState(state);
}

// ============================================================
// NOTIFICATION ID
// ============================================================

function getSmartNotificationId(windowKey, dateKey) {
  let hash = 0;

  const value = `${windowKey}-${dateKey}`;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return (
    SMART_NOTIFICATION_BASE_ID +
    Math.abs(hash % 100000)
  );
}

// ============================================================
// PERMISSION
// ============================================================

export async function requestSmartNotificationPermission() {
  if (!isNativeApp()) {
    return {
      granted: false,
      native: false,
    };
  }

  try {
    let permission = await LocalNotifications.checkPermissions();

    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }

    return {
      granted: permission.display === "granted",
      native: true,
    };
  } catch (error) {
    console.error(
      "TASKBAR smart notification permission error:",
      error
    );

    return {
      granted: false,
      native: true,
    };
  }
}

// ============================================================
// LOAD ALL TASKBAR DATA
// ============================================================

async function loadTaskbarData() {
  const [
    profile,
    topics,
    goals,
    water,
    activities,
    assessments,
    todoList,
    studySessions,
    diet,
    screenTime,
  ] = await Promise.all([
    getProfile().catch(() => null),
    getTopics().catch(() => []),
    getGoals().catch(() => []),
    getWater().catch(() => []),
    getActivities().catch(() => []),
    getAssessments().catch(() => []),
    getTodoList().catch(() => []),
    getStudySessions().catch(() => []),
    getDiet().catch(() => []),
    getScreenTime().catch(() => []),
  ]);

  return {
    profile,
    topics: safeArray(topics),
    goals: safeArray(goals),
    water: safeArray(water),
    activities: safeArray(activities),
    assessments: safeArray(assessments),
    todoList: safeArray(todoList),
    studySessions: safeArray(studySessions),
    diet: safeArray(diet),
    screenTime: safeArray(screenTime),
  };
}

// ============================================================
// TODAY DATA HELPERS
// ============================================================

function getTodayItems(items, possibleDateFields = []) {
  const today = getTodayLocalDateKey();

  return safeArray(items).filter((item) => {
    for (const field of possibleDateFields) {
      const dateKey = getDateKey(item?.[field]);

      if (dateKey === today) {
        return true;
      }
    }

    return false;
  });
}

function getOverdueItems(items, possibleDateFields = []) {
  const today = getTodayLocalDateKey();

  return safeArray(items).filter((item) => {
    if (isCompleted(item)) return false;

    for (const field of possibleDateFields) {
      const dateKey = getDateKey(item?.[field]);

      if (!dateKey) continue;

      try {
        return diffInLocalDays(dateKey, today) > 0;
      } catch {
        return false;
      }
    }

    return false;
  });
}

function getUpcomingItems(
  items,
  possibleDateFields = [],
  days = 3
) {
  const today = getTodayLocalDateKey();

  return safeArray(items).filter((item) => {
    if (isCompleted(item)) return false;

    for (const field of possibleDateFields) {
      const dateKey = getDateKey(item?.[field]);

      if (!dateKey) continue;

      try {
        const difference = diffInLocalDays(today, dateKey);

        return difference >= 0 && difference <= days;
      } catch {
        return false;
      }
    }

    return false;
  });
}

// ============================================================
// ITEM TITLE
// ============================================================

function getItemTitle(
  item,
  fallback = "something"
) {
  if (!item) return fallback;

  const fields = [
    "title",
    "name",
    "task",
    "taskName",
    "topic",
    "topicName",
    "goal",
    "goalName",
    "subject",
    "description",
  ];

  for (const field of fields) {
    if (
      typeof item[field] === "string" &&
      item[field].trim()
    ) {
      return item[field].trim();
    }
  }

  return fallback;
}

// ============================================================
// WATER ANALYSIS
// ============================================================

function getWaterStats(water) {
  const today = getTodayLocalDateKey();

  const todayRecords = safeArray(water).filter(
    (item) => {
      const dateKey =
        getDateKey(item?.date) ||
        getDateKey(item?.createdAt) ||
        getDateKey(item?.timestamp);

      return dateKey === today;
    }
  );

  let consumed = 0;
  let target = 0;

  for (const record of todayRecords) {
    consumed += safeNumber(
      record?.amount ??
        record?.amountMl ??
        record?.ml ??
        record?.consumed ??
        record?.consumedMl
    );

    if (!target) {
      target = safeNumber(
        record?.target ??
          record?.targetMl ??
          record?.dailyTarget
      );
    }
  }

  // If records don't contain target, use common TASKBAR default.
  if (target <= 0) {
    target = 2500;
  }

  return {
    consumed,
    target,
    percentage: Math.min(
      100,
      Math.round((consumed / target) * 100)
    ),
  };
}

// ============================================================
// ACTIVITY ANALYSIS
// ============================================================

function getActivityStats(activities) {
  const today = getTodayLocalDateKey();

  const todayActivities = safeArray(
    activities
  ).filter((item) => {
    const dateKey =
      getDateKey(item?.date) ||
      getDateKey(item?.createdAt) ||
      getDateKey(item?.timestamp);

    return dateKey === today;
  });

  let minutes = 0;

  for (const activity of todayActivities) {
    minutes += safeNumber(
      activity?.minutes ??
        activity?.duration ??
        activity?.durationMinutes
    );
  }

  return {
    minutes,
    hasActivity:
      minutes > 0 || todayActivities.length > 0,
  };
}

// ============================================================
// STUDY ANALYSIS
// ============================================================

function getStudyStats(
  studySessions,
  topics
) {
  const today = getTodayLocalDateKey();

  const todaySessions = safeArray(
    studySessions
  ).filter((session) => {
    const dateKey =
      getDateKey(session?.date) ||
      getDateKey(session?.startTime) ||
      getDateKey(session?.createdAt);

    return dateKey === today;
  });

  let minutes = 0;

  for (const session of todaySessions) {
    minutes += safeNumber(
      session?.minutes ??
        session?.duration ??
        session?.durationMinutes
    );
  }

  const todayCompletedTopics =
    safeArray(topics).filter((topic) => {
      if (!isCompleted(topic)) return false;

      const dateKey =
        getDateKey(topic?.completedDate) ||
        getDateKey(topic?.completedAt) ||
        getDateKey(topic?.date);

      return dateKey === today;
    });

  return {
    minutes,
    completedTopics:
      todayCompletedTopics.length,
    hasStudy:
      minutes > 0 ||
      todayCompletedTopics.length > 0,
  };
}

// ============================================================
// SCREEN TIME ANALYSIS
// ============================================================

function getScreenTimeStats(screenTime) {
  const today = getTodayLocalDateKey();

  const todayRecords = safeArray(
    screenTime
  ).filter((item) => {
    const dateKey =
      getDateKey(item?.date) ||
      getDateKey(item?.createdAt);

    return dateKey === today;
  });

  let minutes = 0;

  for (const record of todayRecords) {
    minutes += safeNumber(
      record?.minutes ??
        record?.duration ??
        record?.screenTime
    );
  }

  return {
    minutes,
  };
}

// ============================================================
// DIET ANALYSIS
// ============================================================

function getDietStats(diet) {
  const today = getTodayLocalDateKey();

  const todayRecords = safeArray(diet).filter(
    (item) => {
      const dateKey =
        getDateKey(item?.date) ||
        getDateKey(item?.createdAt);

      return dateKey === today;
    }
  );

  let sugar = 0;
  let protein = 0;

  for (const record of todayRecords) {
    sugar += safeNumber(
      record?.sugar ??
        record?.sugarIntake ??
        record?.sugarGrams
    );

    protein += safeNumber(
      record?.protein ??
        record?.proteinIntake ??
        record?.proteinGrams
    );
  }

  return {
    sugar,
    protein,
  };
}

// ============================================================
// CENTRAL TODO ANALYSIS
// ============================================================

function getTodoStats(todoList) {
  const today = getTodayLocalDateKey();

  const pending = safeArray(todoList).filter(
    (item) => !isCompleted(item)
  );

  const todayPending = pending.filter((item) => {
    const dateKey =
      getDateKey(item?.date) ||
      getDateKey(item?.taskDate) ||
      getDateKey(item?.dueDate) ||
      getDateKey(item?.scheduledDate);

    return dateKey === today;
  });

  const overdue = pending.filter((item) => {
    const dateKey =
      getDateKey(item?.date) ||
      getDateKey(item?.taskDate) ||
      getDateKey(item?.dueDate) ||
      getDateKey(item?.scheduledDate);

    if (!dateKey) return false;

    try {
      return diffInLocalDays(dateKey, today) > 0;
    } catch {
      return false;
    }
  });

  return {
    pending,
    todayPending,
    overdue,
  };
}

// ============================================================
// IMPORTANCE DETECTION
// ============================================================

function isImportant(item) {
  if (!item) return false;

  if (
    item.priority === "high" ||
    item.priority === "High" ||
    item.priority === "urgent" ||
    item.priority === "Urgent"
  ) {
    return true;
  }

  if (
    item.important === true ||
    item.isImportant === true
  ) {
    return true;
  }

  const priorityNumber = safeNumber(
    item.priority
  );

  if (priorityNumber >= 8) {
    return true;
  }

  return false;
}

// ============================================================
// CAREER DATA
// ============================================================

// Career data has historically been stored separately from
// IndexedDB. We read it safely when available.

function readLocalStorageArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getCareerStats() {
  const jobPreparation =
    readLocalStorageArray(
      "taskbar-job-preparation"
    );

  const applications =
    readLocalStorageArray(
      "taskbar-job-applications"
    );

  const savedJobs =
    readLocalStorageArray(
      "taskbar-saved-jobs"
    );

  const interviews =
    readLocalStorageArray(
      "taskbar-interviews"
    );

  const today = getTodayLocalDateKey();

  const duePreparation =
    jobPreparation.filter((item) => {
      if (isCompleted(item)) return false;

      const dateKey =
        getDateKey(item?.dueDate) ||
        getDateKey(item?.date);

      if (!dateKey) return false;

      return (
        diffInLocalDays(
          dateKey,
          today
        ) <= 0
      );
    });

  const followUps = applications.filter(
    (item) => {
      if (isCompleted(item)) return false;

      const dateKey =
        getDateKey(item?.followUpDate) ||
        getDateKey(item?.nextFollowUp);

      return dateKey === today;
    }
  );

  const upcomingInterviews =
    interviews.filter((item) => {
      if (isCompleted(item)) return false;

      const dateKey =
        getDateKey(item?.date) ||
        getDateKey(item?.interviewDate);

      if (!dateKey) return false;

      const days = diffInLocalDays(
        today,
        dateKey
      );

      return days >= 0 && days <= 2;
    });

  return {
    duePreparation,
    followUps,
    upcomingInterviews,
    savedJobs,
  };
}

// ============================================================
// FINANCE DATA
// ============================================================

function getFinanceStats() {
  const income =
    readLocalStorageArray(
      "taskbar-income"
    );

  const expenses =
    readLocalStorageArray(
      "taskbar-expenses"
    );

  const budgets =
    readLocalStorageArray(
      "taskbar-budget"
    );

  const today = getTodayLocalDateKey();

  const todayExpenses = expenses.filter(
    (item) => {
      const dateKey =
        getDateKey(item?.date) ||
        getDateKey(item?.createdAt);

      return dateKey === today;
    }
  );

  let todayExpenseAmount = 0;

  for (const expense of todayExpenses) {
    todayExpenseAmount += safeNumber(
      expense?.amount ??
        expense?.value ??
        expense?.cost
    );
  }

  let budgetAmount = 0;

  for (const budget of budgets) {
    budgetAmount += safeNumber(
      budget?.amount ??
        budget?.limit ??
        budget?.budget
    );
  }

  return {
    income,
    expenses,
    budgets,
    todayExpenseAmount,
    budgetAmount,
  };
}

// ============================================================
// SMART CANDIDATE CREATION
// ============================================================

function createCandidate({
  key,
  type,
  priority,
  title,
  body,
  reason,
}) {
  return {
    key,
    type,
    priority,
    title,
    body,
    reason,
  };
}

// ============================================================
// BUILD SMART CANDIDATES
// ============================================================

function buildCandidates(data) {
  const {
    profile,
    topics,
    goals,
    water,
    activities,
    assessments,
    todoList,
    studySessions,
    diet,
    screenTime,
  } = data;

  const name = getProfileName(profile);

  const candidates = [];

  // ----------------------------------------------------------
  // 1. IMPORTANT / OVERDUE TODO
  // ----------------------------------------------------------

  const todoStats =
    getTodoStats(todoList);

  const importantTodo =
    todoStats.overdue.find(isImportant) ||
    todoStats.todayPending.find(isImportant);

  if (importantTodo) {
    const taskName =
      getItemTitle(
        importantTodo,
        "important task"
      );

    candidates.push(
      createCandidate({
        key: "important-task",
        type: "task",
        priority: 100,
        title:
          `🌟 ${name}, one important thing is waiting`,
        body:
          `${taskName} needs your attention. Take it one step at a time — you've got this. 💪✨`,
        reason: "important task",
      })
    );
  }

  // ----------------------------------------------------------
  // 2. OVERDUE TASK
  // ----------------------------------------------------------

  if (todoStats.overdue.length > 0) {
    const task =
      todoStats.overdue[0];

    candidates.push(
      createCandidate({
        key: "overdue-task",
        type: "task",
        priority: 95,
        title:
          `💙 ${name}, something is still waiting`,
        body:
          `${getItemTitle(
            task,
            "A pending task"
          )} is overdue. No pressure — just take the next small step. 🌱`,
        reason: "overdue task",
      })
    );
  }

  // ----------------------------------------------------------
  // 3. TODAY TODO
  // ----------------------------------------------------------

  if (
    todoStats.todayPending.length > 0
  ) {
    const task =
      todoStats.todayPending[0];

    candidates.push(
      createCandidate({
        key: "today-task",
        type: "task",
        priority: 90,
        title:
          `🌟 ${name}, a little task is waiting`,
        body:
          `${getItemTitle(
            task,
            "One task"
          )} is on today's list. Finish one thing and enjoy that small win. ✨`,
        reason: "today task",
      })
    );
  }

  // ----------------------------------------------------------
  // 4. INTERVIEW
  // ----------------------------------------------------------

  const career =
    getCareerStats();

  if (
    career.upcomingInterviews.length > 0
  ) {
    const interview =
      career.upcomingInterviews[0];

    const interviewDate =
      getDateKey(interview?.date) ||
      getDateKey(
        interview?.interviewDate
      );

    let body =
      "Your interview is coming up. A little preparation today can make tomorrow easier. 💼✨";

    if (interviewDate) {
      const days =
        diffInLocalDays(
          getTodayLocalDateKey(),
          interviewDate
        );

      if (days === 0) {
        body =
          "Your interview is today. Take a breath, trust your preparation, and do your best. 💼❤️";
      } else if (days === 1) {
        body =
          "Your interview is tomorrow. Give yourself a calm preparation session today. 💼✨";
      }
    }

    candidates.push(
      createCandidate({
        key: "career-interview",
        type: "career",
        priority: 98,
        title:
          `💼 ${name}, your career goal needs a little attention`,
        body,
        reason: "upcoming interview",
      })
    );
  }

  // ----------------------------------------------------------
  // 5. APPLICATION FOLLOW-UP
  // ----------------------------------------------------------

  if (
    career.followUps.length > 0
  ) {
    candidates.push(
      createCandidate({
        key: "career-followup",
        type: "career",
        priority: 94,
        title:
          `💼 ${name}, there's a career follow-up today`,
        body:
          "Take a few minutes to check your application follow-up. Small actions can keep opportunities moving. 🚀",
        reason:
          "application follow-up",
      })
    );
  }

  // ----------------------------------------------------------
  // 6. JOB PREPARATION
  // ----------------------------------------------------------

  if (
    career.duePreparation.length > 0
  ) {
    const item =
      career.duePreparation[0];

    candidates.push(
      createCandidate({
        key: "career-preparation",
        type: "career",
        priority: 88,
        title:
          `🚀 ${name}, your future self is waiting`,
        body:
          `${getItemTitle(
            item,
            "Your job preparation"
          )} is due. Even 20 focused minutes can move you forward. 💼✨`,
        reason:
          "career preparation",
      })
    );
  }

  // ----------------------------------------------------------
  // 7. ASSESSMENT
  // ----------------------------------------------------------

  const todayAssessments =
    getTodayItems(
      assessments,
      ["date", "scheduledDate"]
    ).filter(isPending);

  if (
    todayAssessments.length > 0
  ) {
    const assessment =
      todayAssessments[0];

    candidates.push(
      createCandidate({
        key: "assessment",
        type: "study",
        priority: 92,
        title:
          `📚 ${name}, you have an assessment today`,
        body:
          `${getItemTitle(
            assessment,
            "Your assessment"
          )} is waiting. Stay calm, focus, and give it your best. ✨`,
        reason:
          "today assessment",
      })
    );
  }

  // ----------------------------------------------------------
  // 8. STUDY
  // ----------------------------------------------------------

  const studyStats =
    getStudyStats(
      studySessions,
      topics
    );

  if (!studyStats.hasStudy) {
    const pendingTopics =
      topics.filter(isPending);

    if (
      pendingTopics.length > 0
    ) {
      candidates.push(
        createCandidate({
          key: "study",
          type: "study",
          priority: 80,
          title:
            `📚✨ ${name}, your future self is counting on you`,
          body:
            "You don't need a huge session. Just start with 20 focused minutes. One small step is enough for today. ❤️",
          reason:
            "no study recorded today",
        })
      );
    }
  }

  // ----------------------------------------------------------
  // 9. GOALS
  // ----------------------------------------------------------

  const goalsDue =
    getUpcomingItems(
      goals,
      [
        "targetDate",
        "dueDate",
        "date",
      ],
      1
    );

  if (
    goalsDue.length > 0
  ) {
    const goal =
      goalsDue[0];

    candidates.push(
      createCandidate({
        key: "goal",
        type: "goal",
        priority: 82,
        title:
          `🎯 ${name}, your goal deserves a little attention`,
        body:
          `${getItemTitle(
            goal,
            "Your goal"
          )} is close to its target date. A small action today can make a difference. 🌱`,
        reason:
          "goal deadline",
      })
    );
  }

  // ----------------------------------------------------------
  // 10. WATER
  // ----------------------------------------------------------

  const waterStats =
    getWaterStats(water);

  if (
    waterStats.target > 0 &&
    waterStats.percentage < 60
  ) {
    candidates.push(
      createCandidate({
        key: "water",
        type: "wellness",
        priority: 70,
        title:
          `💧 ${name}, your body is waiting for a little water`,
        body:
          `You've had about ${Math.round(
            waterStats.consumed
          )} ml so far. Take a small water break — you'll feel better. 💙`,
        reason:
          "low water intake",
      })
    );
  }

  // ----------------------------------------------------------
  // 11. ACTIVITY
  // ----------------------------------------------------------

  const activityStats =
    getActivityStats(
      activities
    );

  if (
    !activityStats.hasActivity
  ) {
    candidates.push(
      createCandidate({
        key: "activity",
        type: "wellness",
        priority: 65,
        title:
          `❤️ ${name}, give yourself a little movement`,
        body:
          "A few minutes of walking or stretching can be enough. Your body deserves some care today. 🏃✨",
        reason:
          "no activity recorded today",
      })
    );
  }

  // ----------------------------------------------------------
  // 12. DIET / SUGAR
  // ----------------------------------------------------------

  const dietStats =
    getDietStats(diet);

  if (
    dietStats.sugar >= 10
  ) {
    candidates.push(
      createCandidate({
        key: "diet-sugar",
        type: "wellness",
        priority: 55,
        title:
          `🥗 ${name}, let's take care of today's choices`,
        body:
          "Your sugar intake has reached today's target. A lighter choice for the next meal can help you stay balanced. 💚",
        reason:
          "sugar target reached",
      })
    );
  }

  // ----------------------------------------------------------
  // 13. SCREEN TIME
  // ----------------------------------------------------------

  const screenStats =
    getScreenTimeStats(
      screenTime
    );

  if (
    screenStats.minutes >= 180
  ) {
    candidates.push(
      createCandidate({
        key: "screen-time",
        type: "wellness",
        priority: 50,
        title:
          `👀 ${name}, your eyes deserve a little break`,
        body:
          "You've spent quite a while on screens today. Step away for a few minutes, stretch, and come back refreshed. 💙",
        reason:
          "high screen time",
      })
    );
  }

  // ----------------------------------------------------------
  // 14. POSITIVE BACKUP
  // ----------------------------------------------------------

  candidates.push(
    createCandidate({
      key: "positive",
      type: "motivation",
      priority: 20,
      title:
        `✨ ${name}, you're doing better than you think`,
      body:
        "Keep going gently. You don't have to finish everything today — just make one meaningful step. ❤️",
      reason:
        "positive encouragement",
    })
  );

  return candidates;
}

// ============================================================
// CHOOSE NOTIFICATION FOR A WINDOW
// ============================================================

function chooseCandidate(
  candidates,
  usedTypes,
  windowKey
) {
  const available = candidates
    .filter(
      (candidate) =>
        !usedTypes.has(candidate.type)
    )
    .sort(
      (a, b) =>
        b.priority - a.priority
    );

  // Morning:
  // Prefer important productivity/career/study.
  if (windowKey === "morning") {
    const preferred =
      available.find(
        (item) =>
          item.type === "task" ||
          item.type === "career" ||
          item.type === "study" ||
          item.type === "goal"
      );

    if (preferred) {
      return preferred;
    }
  }

  // Afternoon:
  // Prefer wellness or unfinished work.
  if (windowKey === "afternoon") {
    const preferred =
      available.find(
        (item) =>
          item.type === "wellness" ||
          item.type === "task" ||
          item.type === "study"
      );

    if (preferred) {
      return preferred;
    }
  }

  // Evening:
  // Prefer unfinished work, wellness, then positive.
  if (windowKey === "evening") {
    const preferred =
      available.find(
        (item) =>
          item.type === "task" ||
          item.type === "career" ||
          item.type === "goal" ||
          item.type === "wellness" ||
          item.type === "motivation"
      );

    if (preferred) {
      return preferred;
    }
  }

  return available[0] || null;
}

// ============================================================
// BUILD TODAY'S NOTIFICATION PLAN
// ============================================================

export async function buildSmartNotificationPlan() {
  if (!areSmartNotificationsEnabled()) {
    return [];
  }

  try {
    const data =
      await loadTaskbarData();

    const candidates =
      buildCandidates(data);

    const plan = [];
    const usedTypes = new Set();

    for (
      const window of DAILY_WINDOWS
    ) {
      const candidate =
        chooseCandidate(
          candidates,
          usedTypes,
          window.key
        );

      if (!candidate) {
        continue;
      }

      plan.push({
        window: window.key,
        hour: window.hour,
        minute: window.minute,
        ...candidate,
      });

      usedTypes.add(
        candidate.type
      );
    }

    // Never exceed the configured daily limit.
    return plan.slice(
      0,
      MAX_NOTIFICATIONS_PER_DAY
    );
  } catch (error) {
    console.error(
      "TASKBAR smart notification plan error:",
      error
    );

    return [];
  }
}
// ============================================================
// GET NEXT DATE/TIME FOR A DAILY WINDOW
// ============================================================

function getWindowDate(window) {
  const now = new Date();

  const scheduled = new Date();

  scheduled.setHours(
    window.hour,
    window.minute,
    0,
    0
  );

  // If today's window has already passed,
  // schedule it for tomorrow.
  if (
    scheduled.getTime() <=
    now.getTime()
  ) {
    scheduled.setDate(
      scheduled.getDate() + 1
    );
  }

  return scheduled;
}

// ============================================================
// SCHEDULE ONE SMART NOTIFICATION
// ============================================================

export async function scheduleSmartNotification(
  notification,
  dateOverride = null
) {
  if (!isNativeApp()) {
    return false;
  }

  // Respect Settings -> Reminders & Smart Notifications.
  if (!areSmartNotificationsEnabled()) {
    return false;
  }

  try {
    const permission =
      await requestSmartNotificationPermission();

    if (!permission.granted) {
      return false;
    }

    const window =
      DAILY_WINDOWS.find(
        (item) =>
          item.key === notification.window
      );

    if (!window) {
      return false;
    }

    let scheduledDate;

    if (dateOverride) {
      scheduledDate =
        new Date(dateOverride);
    } else {
      scheduledDate =
        getWindowDate(window);
    }

    if (
      Number.isNaN(
        scheduledDate.getTime()
      )
    ) {
      return false;
    }

    const dateKey =
      getDateKey(scheduledDate);

    const notificationId =
      getSmartNotificationId(
        notification.window,
        dateKey
      );

    // Remove an existing notification
    // with the same smart-notification ID.
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,

          title:
            notification.title,

          body:
            notification.body,

          schedule: {
            at: scheduledDate,
            allowWhileIdle: true,
          },

          sound: undefined,

          extra: {
            type:
              "taskbar-smart-notification",
            window:
              notification.window,
            reason:
              notification.reason,
            date:
              dateKey,
          },
        },
      ],
    });

    return true;
  } catch (error) {
    console.error(
      "TASKBAR smart notification scheduling error:",
      error
    );

    return false;
  }
}

// ============================================================
// CANCEL ALL SMART NOTIFICATIONS
// ============================================================

export async function cancelSmartNotifications() {
  if (!isNativeApp()) {
    return false;
  }

  try {
    const pending =
      await LocalNotifications.getPending();

    const smartNotifications =
      safeArray(
        pending.notifications
      ).filter(
        (notification) =>
          notification?.extra?.type ===
          "taskbar-smart-notification"
      );

    if (
      smartNotifications.length === 0
    ) {
      return true;
    }

    await LocalNotifications.cancel({
      notifications:
        smartNotifications.map(
          (notification) => ({
            id: notification.id,
          })
        ),
    });

    return true;
  } catch (error) {
    console.error(
      "TASKBAR smart notification cancellation error:",
      error
    );

    return false;
  }
}

// ============================================================
// SCHEDULE TODAY'S SMART NOTIFICATIONS
// ============================================================

export async function scheduleTodaySmartNotifications() {
  if (!isNativeApp()) {
    return {
      scheduled: 0,
      plan: [],
    };
  }

  // Respect Settings.
  if (!areSmartNotificationsEnabled()) {
    return {
      scheduled: 0,
      plan: [],
    };
  }

  try {
    const permission =
      await requestSmartNotificationPermission();

    if (!permission.granted) {
      return {
        scheduled: 0,
        plan: [],
      };
    }

    const plan =
      await buildSmartNotificationPlan();

    const now = new Date();

    let scheduledCount = 0;

    for (
      const notification of plan
    ) {
      const window =
        DAILY_WINDOWS.find(
          (item) =>
            item.key ===
            notification.window
        );

      if (!window) {
        continue;
      }

      const scheduled =
        new Date();

      scheduled.setHours(
        window.hour,
        window.minute,
        0,
        0
      );

      // Only schedule windows that
      // haven't passed today.
      if (
        scheduled.getTime() <=
        now.getTime()
      ) {
        continue;
      }

      const success =
        await scheduleSmartNotification(
          notification,
          scheduled
        );

      if (success) {
        scheduledCount += 1;
      }
    }

    return {
      scheduled:
        scheduledCount,
      plan,
    };
  } catch (error) {
    console.error(
      "TASKBAR today's smart notification setup error:",
      error
    );

    return {
      scheduled: 0,
      plan: [],
    };
  }
}

// ============================================================
// RESCHEDULE SMART NOTIFICATIONS
// ============================================================
//
// Call this after important TASKBAR data changes.
//
// Examples:
// - task completed
// - new goal added
// - water updated
// - study session added
//
// This cancels old smart notifications and builds a fresh
// plan using the latest TASKBAR data.
// ============================================================

export async function refreshSmartNotifications() {
  if (!isNativeApp()) {
    return {
      scheduled: 0,
      plan: [],
    };
  }

  // If notifications are disabled,
  // make sure existing smart notifications
  // are removed.
  if (!areSmartNotificationsEnabled()) {
    await cancelSmartNotifications();

    return {
      scheduled: 0,
      plan: [],
    };
  }

  try {
    await cancelSmartNotifications();

    return await scheduleTodaySmartNotifications();
  } catch (error) {
    console.error(
      "TASKBAR smart notification refresh error:",
      error
    );

    return {
      scheduled: 0,
      plan: [],
    };
  }
}

// ============================================================
// INITIALIZE SMART NOTIFICATIONS
// ============================================================
//
// This is the main function the application will call.
//
// It:
// 1. Checks native Android.
// 2. Checks the Settings notification switch.
// 3. Requests notification permission.
// 4. Cancels stale smart notifications.
// 5. Reads current TASKBAR data.
// 6. Creates a fresh intelligent plan.
// 7. Schedules up to 3 useful notifications.
// ============================================================

export async function initializeSmartNotifications() {
  if (!isNativeApp()) {
    return {
      enabled: false,
      scheduled: 0,
      plan: [],
    };
  }

  // Settings -> Reminders & Smart Notifications OFF.
  if (!areSmartNotificationsEnabled()) {
    await cancelSmartNotifications();

    return {
      enabled: false,
      scheduled: 0,
      plan: [],
    };
  }

  try {
    const permission =
      await requestSmartNotificationPermission();

    if (!permission.granted) {
      return {
        enabled: false,
        scheduled: 0,
        plan: [],
      };
    }

    // Remove old smart notifications first.
    await cancelSmartNotifications();

    // Build a fresh plan from current TASKBAR data.
    const result =
      await scheduleTodaySmartNotifications();

    return {
      enabled: true,
      ...result,
    };
  } catch (error) {
    console.error(
      "TASKBAR smart notification initialization error:",
      error
    );

    return {
      enabled: false,
      scheduled: 0,
      plan: [],
    };
  }
}

// ============================================================
// MANUAL TEST NOTIFICATION
// ============================================================
//
// Useful during Android testing.
//
// It does NOT replace the intelligent notification system.
// ============================================================

export async function sendTestSmartNotification() {
  if (!isNativeApp()) {
    return false;
  }

  // Respect the Settings switch here too.
  if (!areSmartNotificationsEnabled()) {
    return false;
  }

  try {
    const permission =
      await requestSmartNotificationPermission();

    if (!permission.granted) {
      return false;
    }

    const profile =
      await getProfile().catch(
        () => null
      );

    const name =
      getProfileName(profile);

    const notificationId =
      SMART_NOTIFICATION_BASE_ID +
      99999;

    // Cancel an older test notification
    // before creating a new one.
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,

          title:
            `💙 ${name}, TASKBAR is here for you`,

          body:
            "Your smart notification system is working. Keep going one small step at a time. ✨",

          schedule: {
            at: new Date(
              Date.now() + 5000
            ),
            allowWhileIdle: true,
          },

          extra: {
            type:
              "taskbar-smart-test",
          },
        },
      ],
    });

    return true;
  } catch (error) {
    console.error(
      "TASKBAR smart test notification error:",
      error
    );

    return false;
  }
}

// ============================================================
// DEBUG / PREVIEW
// ============================================================
//
// This allows the UI to preview what TASKBAR would send
// without actually scheduling Android notifications.
// ============================================================

export async function previewSmartNotifications() {
  try {
    return await buildSmartNotificationPlan();
  } catch (error) {
    console.error(
      "TASKBAR smart notification preview error:",
      error
    );

    return [];
  }
}

// ============================================================
// EXPORT CONFIGURATION
// ============================================================

export {
  DAILY_WINDOWS,
  MAX_NOTIFICATIONS_PER_DAY,
};