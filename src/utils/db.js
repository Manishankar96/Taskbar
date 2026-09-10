// src/utils/db.js

const DB_NAME = "personalDashboardDB";
const DB_VERSION = 6;

const STORES = {
  topics: "topics",
  goals: "goals",
  timetable: "timetable",
  diet: "diet",
  water: "water",
  screenTime: "screenTime",
  activities: "activities",
  assessments: "assessments",
  quickTasks: "quickTasks",
  streak: "streak",
  profile: "profile",
  dailyReports: "dailyReports",
};

let dbPromise = null;

/* =========================================================
   DATABASE
========================================================= */

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("IndexedDB upgrade is blocked.");
    };
  });

  return dbPromise;
}

/* =========================================================
   GENERIC CRUD
========================================================= */

export async function getItems(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getItem(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function putItem(storeName, item) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export const addItem = putItem;
export const updateItem = putItem;

export async function deleteItem(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/* =========================================================
   FIXED SAVE ITEMS
   ---------------------------------------------------------
   IMPORTANT:
   saveItems now treats the passed array as the COMPLETE
   current list.

   If an old item is missing from the new array, it is deleted
   from IndexedDB.

   This fixes:
   Goal deleted -> refresh -> Goal appears again.
========================================================= */

export async function saveItems(storeName, items) {
  const db = await openDatabase();

  if (!Array.isArray(items)) {
    throw new Error("saveItems expects an array");
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve(items);

    transaction.onerror = () => reject(transaction.error);

    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error("Transaction aborted")
      );
    };

    const incomingIds = new Set(
      items
        .map((item) => item?.id)
        .filter(
          (id) =>
            id !== undefined &&
            id !== null
        )
    );

    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const existingItems =
        getAllRequest.result || [];

      existingItems.forEach((existingItem) => {
        if (!incomingIds.has(existingItem?.id)) {
          store.delete(existingItem.id);
        }
      });

      items.forEach((item) => {
        store.put(item);
      });
    };

    getAllRequest.onerror = () => {
      reject(getAllRequest.error);
    };
  });
}

export async function clearStore(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store =
      transaction.objectStore(storeName);

    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/* =========================================================
   PAGE DATA HELPERS
========================================================= */

export const getTopics = () =>
  getItems(STORES.topics);

export const saveTopics = (items) =>
  saveItems(STORES.topics, items);

export const getGoals = () =>
  getItems(STORES.goals);

export const saveGoals = (items) =>
  saveItems(STORES.goals, items);

export const getTimetable = () =>
  getItems(STORES.timetable);

export const saveTimetable = (items) =>
  saveItems(STORES.timetable, items);

export const getDiet = () =>
  getItems(STORES.diet);

export const saveDiet = (items) =>
  saveItems(STORES.diet, items);

export const getWater = () =>
  getItems(STORES.water);

export const saveWater = (items) =>
  saveItems(STORES.water, items);

export const getScreenTime = () =>
  getItems(STORES.screenTime);

export const saveScreenTime = (items) =>
  saveItems(STORES.screenTime, items);

export const getActivities = () =>
  getItems(STORES.activities);

export const saveActivities = (items) =>
  saveItems(STORES.activities, items);

export const getAssessments = () =>
  getItems(STORES.assessments);

export const saveAssessments = (items) =>
  saveItems(STORES.assessments, items);

export const getQuickTasks = () =>
  getItems(STORES.quickTasks);

export const saveQuickTasks = (items) =>
  saveItems(STORES.quickTasks, items);

export const getStreak = () =>
  getItems(STORES.streak);

export const saveStreak = (items) =>
  saveItems(STORES.streak, items);

/* =========================================================
   PROFILE
========================================================= */

export async function getProfile() {
  const items = await getItems(STORES.profile);

  return items.length > 0
    ? items[0]
    : null;
}

export async function saveProfile(profile) {
  if (!profile) {
    throw new Error("Profile data is required");
  }

  const profileData = {
    ...profile,
    id: profile.id || "profile",
  };

  return putItem(
    STORES.profile,
    profileData
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getLocalDateString(
  date = new Date()
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) return null;

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return getLocalDateString(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return getLocalDateString(parsed);
}

function itemMatchesDate(
  item,
  targetDate
) {
  if (!item || !targetDate) {
    return false;
  }

  const possibleDateFields = [
    "date",
    "createdAt",
    "completedAt",
    "updatedAt",
    "targetDate",
    "assessmentDate",
    "scheduledDate",
    "startDate",
    "endDate",
  ];

  return possibleDateFields.some(
    (field) => {
      const normalized =
        normalizeDate(item[field]);

      return normalized === targetDate;
    }
  );
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/* =========================================================
   DAILY REPORTS
========================================================= */

export async function getDailyReports() {
  const reports =
    await getItems(STORES.dailyReports);

  return reports.sort((a, b) =>
    String(b.date).localeCompare(
      String(a.date)
    )
  );
}

export async function getDailyReport(
  date
) {
  const dateString =
    normalizeDate(date);

  if (!dateString) return null;

  return getItem(
    STORES.dailyReports,
    dateString
  );
}

export async function deleteDailyReport(
  date
) {
  const dateString =
    normalizeDate(date);

  if (!dateString) return false;

  return deleteItem(
    STORES.dailyReports,
    dateString
  );
}
/* =========================================================
   SAVE DAILY REPORT
========================================================= */

/*
  Save one daily report.

  Each date has exactly one report:
  id = YYYY-MM-DD

  The database keeps only the newest 50 reports.
*/

export async function saveDailyReport(report) {
  if (!report || !report.date) {
    throw new Error(
      "Daily report date is required"
    );
  }

  const date = normalizeDate(
    report.date
  );

  if (!date) {
    throw new Error(
      "Invalid daily report date"
    );
  }

  const reportData = {
    ...report,
    id: date,
    date,
  };

  await putItem(
    STORES.dailyReports,
    reportData
  );

  // Keep only latest 50
  const reports =
    await getDailyReports();

  if (reports.length > 50) {
    const oldReports =
      reports.slice(50);

    for (const oldReport of oldReports) {
      await deleteItem(
        STORES.dailyReports,
        oldReport.id
      );
    }
  }

  return reportData;
}

/* =========================================================
   DAILY REPORT SNAPSHOT BUILDER
========================================================= */

export async function createDailyReportForDate(
  targetDate
) {
  const date =
    normalizeDate(targetDate);

  if (!date) {
    throw new Error(
      "Invalid date"
    );
  }

  const [
    topics,
    goals,
    timetable,
    diet,
    water,
    screenTime,
    activities,
    assessments,
    quickTasks,
    streak,
  ] = await Promise.all([
    getTopics(),
    getGoals(),
    getTimetable(),
    getDiet(),
    getWater(),
    getScreenTime(),
    getActivities(),
    getAssessments(),
    getQuickTasks(),
    getStreak(),
  ]);

  /* -------------------------
     LEARNING
  ------------------------- */

  const dailyTopics =
    topics.filter((item) =>
      itemMatchesDate(
        item,
        date
      )
    );

  const learningCompleted =
    dailyTopics.filter(
      (item) =>
        item.completed === true ||
        item.status === "completed" ||
        item.isCompleted === true
    ).length;

  const learningTime =
    dailyTopics.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.timeSpent ??
            item.studyTime ??
            item.minutes ??
            item.duration
        ),
      0
    );

  /* -------------------------
     GOALS
  ------------------------- */

  const goalsCompleted =
    goals.filter(
      (goal) =>
        goal.status === "completed" ||
        goal.completed === true ||
        goal.isCompleted === true
    ).length;

  const goalProgressValues =
    goals
      .map((goal) =>
        safeNumber(
          goal.progress ??
            goal.progressPercentage ??
            goal.percentage
        )
      )
      .filter(
        (value) => value >= 0
      );

  const averageGoalProgress =
    goalProgressValues.length > 0
      ? Math.round(
          goalProgressValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
            goalProgressValues.length
        )
      : 0;

  /* -------------------------
     TIMETABLE
  ------------------------- */

  const dailyTimetable =
    timetable.filter((item) =>
      itemMatchesDate(
        item,
        date
      )
    );

  const timetableCompleted =
    dailyTimetable.filter(
      (item) =>
        item.status === "completed" ||
        item.completed === true ||
        item.isCompleted === true
    ).length;

  const timetableMissed =
    dailyTimetable.filter(
      (item) =>
        item.status === "missed" ||
        item.missed === true
    ).length;

  /* -------------------------
     DIET
  ------------------------- */

  const dailyDiet =
    diet.filter((item) =>
      itemMatchesDate(
        item,
        date
      )
    );

  const healthyDiet =
    dailyDiet.filter(
      (item) =>
        item.healthy === true ||
        item.isHealthy === true ||
        item.type === "healthy"
    ).length;

  /* -------------------------
     WATER
  ------------------------- */

  const dailyWater =
    water.filter((item) =>
      itemMatchesDate(
        item,
        date
      )
    );

  const dailyWaterRecord =
    dailyWater.find(
      (item) =>
        item?.consumed !==
          undefined ||
        item?.consumedMl !==
          undefined
    );

  const waterConsumed =
    dailyWaterRecord
      ? Math.max(
          0,
          safeNumber(
            dailyWaterRecord.consumed ??
              dailyWaterRecord.consumedMl
          )
        )
      : dailyWater.reduce(
          (total, item) =>
            total +
            safeNumber(
              item.amountMl ??
                item.amount ??
                item.water ??
                item.quantity ??
                item.ml
            ),
          0
        );

  /* -------------------------
     SCREEN TIME
  ------------------------- */

  const dailyScreenTime =
    screenTime.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const totalScreenMinutes =
    dailyScreenTime.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.minutes ??
            item.duration ??
            item.time
        ),
      0
    );

  const codingMinutes =
    dailyScreenTime
      .filter((item) => {
        const category =
          String(
            item.category ??
              item.type ??
              item.name ??
              ""
          ).toLowerCase();

        return (
          category.includes(
            "coding"
          ) ||
          category.includes(
            "study"
          ) ||
          category.includes(
            "learning"
          )
        );
      })
      .reduce(
        (total, item) =>
          total +
          safeNumber(
            item.minutes ??
              item.duration ??
              item.time
          ),
        0
      );

  /* -------------------------
     ACTIVITIES
  ------------------------- */

  const dailyActivities =
    activities.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const activityMinutes =
    dailyActivities.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.duration ??
            item.minutes ??
            item.time
        ),
      0
    );

  /* -------------------------
     ASSESSMENTS
  ------------------------- */

  const dailyAssessments =
    assessments.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const assessmentsCompleted =
    dailyAssessments.filter(
      (item) =>
        item.status === "completed" ||
        item.completed === true ||
        item.isCompleted === true
    ).length;

  const assessmentsMissed =
    dailyAssessments.filter(
      (item) =>
        item.status === "missed" ||
        item.missed === true
    ).length;

  /* -------------------------
     QUICK TASKS
  ------------------------- */

  const dailyTasks =
    quickTasks.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const tasksCompleted =
    dailyTasks.filter(
      (item) =>
        item.completed === true ||
        item.status === "completed" ||
        item.isCompleted === true
    ).length;

  /* -------------------------
     STREAK
  ------------------------- */

  const streakData =
    Array.isArray(streak)
      ? streak[0] || {}
      : streak || {};

  const currentStreak =
    safeNumber(
      streakData.currentStreak ??
        streakData.current ??
        streakData.streak
    );

  const bestStreak =
    safeNumber(
      streakData.bestStreak ??
        streakData.best
    );

  /* -------------------------
     REPORT
  ------------------------- */

  const report = {
    id: date,

    date,

    createdAt:
      new Date().toISOString(),

    learning: {
      total:
        dailyTopics.length,

      completed:
        learningCompleted,

      studyMinutes:
        learningTime,
    },

    goals: {
      total:
        goals.length,

      completed:
        goalsCompleted,

      averageProgress:
        averageGoalProgress,
    },

    timetable: {
      planned:
        dailyTimetable.length,

      completed:
        timetableCompleted,

      missed:
        timetableMissed,
    },

    diet: {
      total:
        dailyDiet.length,

      healthy:
        healthyDiet,

      other: Math.max(
        0,
        dailyDiet.length -
          healthyDiet
      ),
    },

    water: {
      consumedMl:
        waterConsumed,
    },

    screenTime: {
      totalMinutes:
        totalScreenMinutes,

      codingMinutes:
        codingMinutes,
    },

    activities: {
      count:
        dailyActivities.length,

      durationMinutes:
        activityMinutes,
    },

    assessments: {
      total:
        dailyAssessments.length,

      completed:
        assessmentsCompleted,

      missed:
        assessmentsMissed,
    },

    quickTasks: {
      total:
        dailyTasks.length,

      completed:
        tasksCompleted,
    },

    streak: {
      current:
        currentStreak,

      best:
        bestStreak,
    },

    summary: {
      totalTrackedItems:
        dailyTopics.length +
        dailyDiet.length +
        dailyActivities.length +
        dailyAssessments.length +
        dailyTasks.length,

      totalCompleted:
        learningCompleted +
        timetableCompleted +
        assessmentsCompleted +
        tasksCompleted,

      studyMinutes:
        learningTime +
        codingMinutes,
    },
  };

  return saveDailyReport(
    report
  );
}
/* =========================================================
   DAILY HISTORY
========================================================= */

/*
  Creates missing historical daily reports.

  Important:
  We only create a report for a date when at least one
  tracking item actually exists for that date.

  We do NOT invent fake zero-data reports.
*/

export async function ensureDailyReportHistory() {
  const today =
    getLocalDateString();

  const existingReports =
    await getDailyReports();

  const existingDates =
    new Set(
      existingReports.map(
        (report) => report.date
      )
    );

  const [
    topics,
    goals,
    timetable,
    diet,
    water,
    screenTime,
    activities,
    assessments,
    quickTasks,
  ] = await Promise.all([
    getTopics(),
    getGoals(),
    getTimetable(),
    getDiet(),
    getWater(),
    getScreenTime(),
    getActivities(),
    getAssessments(),
    getQuickTasks(),
  ]);

  const allItems = [
    ...topics,
    ...goals,
    ...timetable,
    ...diet,
    ...water,
    ...screenTime,
    ...activities,
    ...assessments,
    ...quickTasks,
  ];

  const datesWithData =
    new Set();

  allItems.forEach((item) => {
    const fields = [
      "date",
      "createdAt",
      "completedAt",
      "updatedAt",
      "targetDate",
      "assessmentDate",
      "scheduledDate",
      "startDate",
      "endDate",
    ];

    fields.forEach((field) => {
      const date =
        normalizeDate(
          item?.[field]
        );

      if (
        date &&
        date < today
      ) {
        datesWithData.add(date);
      }
    });
  });

  /*
    Rebuild every historical date
    that has data.

    This keeps historical reports
    synchronized with the latest
    stored data.
  */

  const datesToUpdate =
    [...datesWithData].sort();

  for (const date of datesToUpdate) {
    await createDailyReportForDate(
      date
    );
  }

  /*
    Final safety trim.
    Keep only latest 50 reports.
  */

  const reports =
    await getDailyReports();

  if (reports.length > 50) {
    const oldReports =
      reports.slice(50);

    for (const report of oldReports) {
      await deleteItem(
        STORES.dailyReports,
        report.id
      );
    }
  }

  return getDailyReports();
}

/* =========================================================
   BACKUP / RESTORE
========================================================= */

export async function exportAllData() {
  const [
    topics,
    goals,
    timetable,
    diet,
    water,
    screenTime,
    activities,
    assessments,
    quickTasks,
    streak,
    profile,
    dailyReports,
  ] = await Promise.all([
    getTopics(),
    getGoals(),
    getTimetable(),
    getDiet(),
    getWater(),
    getScreenTime(),
    getActivities(),
    getAssessments(),
    getQuickTasks(),
    getStreak(),
    getProfile(),
    getDailyReports(),
  ]);

  return {
    version:
      DB_VERSION,

    exportedAt:
      new Date().toISOString(),

    topics,
    goals,
    timetable,
    diet,
    water,
    screenTime,
    activities,
    assessments,
    quickTasks,
    streak,

    profile,

    dailyReports,
  };
}

/* =========================================================
   BACKUP VALIDATION
========================================================= */

export function validateBackup(
  data
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return false;
  }

  const arrayStores = [
    "topics",
    "goals",
    "timetable",
    "diet",
    "water",
    "screenTime",
    "activities",
    "assessments",
    "quickTasks",
    "streak",
    "dailyReports",
  ];

  for (
    const key of arrayStores
  ) {
    if (
      data[key] !== undefined &&
      !Array.isArray(data[key])
    ) {
      return false;
    }
  }

  if (
    data.profile !== undefined &&
    data.profile !== null &&
    typeof data.profile !== "object"
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   IMPORT ALL DATA
========================================================= */

export async function importAllData(
  data
) {
  if (
    !validateBackup(data)
  ) {
    throw new Error(
      "Invalid backup data"
    );
  }

  const arrayStores = [
    "topics",
    "goals",
    "timetable",
    "diet",
    "water",
    "screenTime",
    "activities",
    "assessments",
    "quickTasks",
    "streak",
    "dailyReports",
  ];

  for (
    const key of arrayStores
  ) {
    if (
      Array.isArray(data[key])
    ) {
      await clearStore(
        STORES[key]
      );

      await saveItems(
        STORES[key],
        data[key]
      );
    }
  }

  if (data.profile) {
    await clearStore(
      STORES.profile
    );

    await saveProfile({
      ...data.profile,
      id:
        data.profile.id ||
        "profile",
    });
  }

  return true;
}

/* =========================================================
   EXPORTS
========================================================= */

export { STORES };