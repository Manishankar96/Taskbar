// src/utils/db.js

const DB_NAME = "personalDashboardDB";
const DB_VERSION = 9;

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

  // PHASE 1
  quickNotes: "quickNotes",
  dailyTargets: "dailyTargets",
  reminders: "reminders",
  todoList: "todoList",
  studySessions: "studySessions",

  // CAREER
  jobPreparation: "jobPreparation",
  applications: "applications",
  savedJobs: "savedJobs",
  resumes: "resumes",
  interviews: "interviews",
  projects: "projects",

  // FINANCE
  income: "income",
  expenses: "expenses",
  budget: "budget",

  // SETTINGS
  settings: "settings",
};

let dbPromise = null;

/* =========================================================
   DATABASE
========================================================= */

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, {
            keyPath: "id",
          });
        }
      });
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
        dbPromise = null;
      };

      resolve(database);
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
    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const store = transaction.objectStore(
      storeName
    );

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getItem(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const store = transaction.objectStore(
      storeName
    );

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putItem(storeName, item) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(
      storeName
    );

    const request = store.put(item);

    request.onsuccess = () => {
      resolve(item);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const addItem = putItem;
export const updateItem = putItem;

export async function deleteItem(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(
      storeName
    );

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   SAVE COMPLETE LIST
========================================================= */

export async function saveItems(storeName, items) {
  const db = await openDatabase();

  if (!Array.isArray(items)) {
    throw new Error(
      "saveItems expects an array"
    );
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(
      storeName
    );

    transaction.oncomplete = () => {
      resolve(items);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

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
        if (
          !incomingIds.has(
            existingItem?.id
          )
        ) {
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

    const store = transaction.objectStore(
      storeName
    );

    const request = store.clear();

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   EXISTING PAGE HELPERS
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
   QUICK NOTES
========================================================= */

export const getQuickNotes = () =>
  getItems(STORES.quickNotes);

export const saveQuickNotes = (items) =>
  saveItems(STORES.quickNotes, items);

export const addQuickNote = (note) =>
  putItem(STORES.quickNotes, note);

export const updateQuickNote = (note) =>
  putItem(STORES.quickNotes, note);

export const deleteQuickNote = (id) =>
  deleteItem(STORES.quickNotes, id);

/* =========================================================
   DAILY TARGETS
========================================================= */

export const getDailyTargets = () =>
  getItems(STORES.dailyTargets);

export const saveDailyTargets = (items) =>
  saveItems(STORES.dailyTargets, items);

export const addDailyTarget = (target) =>
  putItem(STORES.dailyTargets, target);

export const updateDailyTarget = (target) =>
  putItem(STORES.dailyTargets, target);

export const deleteDailyTarget = (id) =>
  deleteItem(STORES.dailyTargets, id);

/* =========================================================
   REMINDERS
========================================================= */

export const getReminders = () =>
  getItems(STORES.reminders);

export const saveReminders = (items) =>
  saveItems(STORES.reminders, items);

export const addReminder = (reminder) =>
  putItem(STORES.reminders, reminder);

export const updateReminder = (reminder) =>
  putItem(STORES.reminders, reminder);

export const deleteReminder = (id) =>
  deleteItem(STORES.reminders, id);

/* =========================================================
   TODO LIST
========================================================= */

export const getTodoList = () =>
  getItems(STORES.todoList);

export const saveTodoList = (items) =>
  saveItems(STORES.todoList, items);

export const addTodoItem = (item) =>
  putItem(STORES.todoList, item);

export const updateTodoItem = (item) =>
  putItem(STORES.todoList, item);

export const deleteTodoItem = (id) =>
  deleteItem(STORES.todoList, id);

/* =========================================================
   STUDY SESSIONS
========================================================= */

export const getStudySessions = () =>
  getItems(STORES.studySessions);

export const saveStudySessions = (items) =>
  saveItems(STORES.studySessions, items);

export const addStudySession = (session) =>
  putItem(STORES.studySessions, session);

export const updateStudySession = (session) =>
  putItem(STORES.studySessions, session);

export const deleteStudySession = (id) =>
  deleteItem(STORES.studySessions, id);

/* =========================================================
   CAREER
========================================================= */

export const getJobPreparation = () =>
  getItems(STORES.jobPreparation);

export const saveJobPreparation = (items) =>
  saveItems(STORES.jobPreparation, items);

export const addJobPreparation = (item) =>
  putItem(STORES.jobPreparation, item);

export const updateJobPreparation = (item) =>
  putItem(STORES.jobPreparation, item);

export const deleteJobPreparation = (id) =>
  deleteItem(STORES.jobPreparation, id);

export const getApplications = () =>
  getItems(STORES.applications);

export const saveApplications = (items) =>
  saveItems(STORES.applications, items);

export const addApplication = (item) =>
  putItem(STORES.applications, item);

export const updateApplication = (item) =>
  putItem(STORES.applications, item);

export const deleteApplication = (id) =>
  deleteItem(STORES.applications, id);

export const getSavedJobs = () =>
  getItems(STORES.savedJobs);

export const saveSavedJobs = (items) =>
  saveItems(STORES.savedJobs, items);

export const addSavedJob = (item) =>
  putItem(STORES.savedJobs, item);

export const updateSavedJob = (item) =>
  putItem(STORES.savedJobs, item);

export const deleteSavedJob = (id) =>
  deleteItem(STORES.savedJobs, id);

export const getResumes = () =>
  getItems(STORES.resumes);

export const saveResumes = (items) =>
  saveItems(STORES.resumes, items);

export const addResume = (item) =>
  putItem(STORES.resumes, item);

export const updateResume = (item) =>
  putItem(STORES.resumes, item);

export const deleteResume = (id) =>
  deleteItem(STORES.resumes, id);

export const getInterviews = () =>
  getItems(STORES.interviews);

export const saveInterviews = (items) =>
  saveItems(STORES.interviews, items);

export const addInterview = (item) =>
  putItem(STORES.interviews, item);

export const updateInterview = (item) =>
  putItem(STORES.interviews, item);

export const deleteInterview = (id) =>
  deleteItem(STORES.interviews, id);

export const getProjects = () =>
  getItems(STORES.projects);

export const saveProjects = (items) =>
  saveItems(STORES.projects, items);

export const addProject = (item) =>
  putItem(STORES.projects, item);

export const updateProject = (item) =>
  putItem(STORES.projects, item);

export const deleteProject = (id) =>
  deleteItem(STORES.projects, id);

/* =========================================================
   FINANCE
========================================================= */

export const getIncome = () =>
  getItems(STORES.income);

export const saveIncome = (items) =>
  saveItems(STORES.income, items);

export const addIncome = (item) =>
  putItem(STORES.income, item);

export const updateIncome = (item) =>
  putItem(STORES.income, item);

export const deleteIncome = (id) =>
  deleteItem(STORES.income, id);

export const getExpenses = () =>
  getItems(STORES.expenses);

export const saveExpenses = (items) =>
  saveItems(STORES.expenses, items);

export const addExpense = (item) =>
  putItem(STORES.expenses, item);

export const updateExpense = (item) =>
  putItem(STORES.expenses, item);

export const deleteExpense = (id) =>
  deleteItem(STORES.expenses, id);

export const getBudget = () =>
  getItems(STORES.budget);

export const saveBudget = (items) =>
  saveItems(STORES.budget, items);

export const addBudget = (item) =>
  putItem(STORES.budget, item);

export const updateBudget = (item) =>
  putItem(STORES.budget, item);

export const deleteBudget = (id) =>
  deleteItem(STORES.budget, id);

/* =========================================================
   SETTINGS
========================================================= */

export async function getSettings() {
  return getItem(
    STORES.settings,
    "settings"
  );
}

export async function saveSettings(settings) {
  if (!settings) {
    throw new Error(
      "Settings data is required"
    );
  }

  return putItem(
    STORES.settings,
    {
      ...settings,
      id: "settings",
    }
  );
}

export const updateSettings =
  saveSettings;

/* =========================================================
   PROFILE
========================================================= */

export async function getProfile() {
  const profile = await getItem(
    STORES.profile,
    "profile"
  );

  if (profile) {
    return profile;
  }

  /*
   * Migration fallback:
   * If an older version saved the profile
   * with another ID, find it and migrate it
   * to the permanent "profile" ID.
   */

  const items = await getItems(
    STORES.profile
  );

  if (!items.length) {
    return null;
  }

  const oldProfile = items[0];

  const migratedProfile = {
    ...oldProfile,
    id: "profile",
  };

  await saveProfile(
    migratedProfile
  );

  return migratedProfile;
}

export async function saveProfile(profile) {
  if (!profile) {
    throw new Error(
      "Profile data is required"
    );
  }

  /*
   * PROFILE IS A SINGLE RECORD.
   *
   * Always use the same IndexedDB key:
   * "profile"
   */

  const profileData = {
    ...profile,

    id: "profile",

    /*
     * Keep only valid custom shortcuts
     * and never allow more than 4.
     */
    customShortcuts:
      Array.isArray(
        profile.customShortcuts
      )
        ? profile.customShortcuts
            .filter(
              (shortcut) =>
                shortcut?.name?.trim() &&
                shortcut?.url?.trim()
            )
            .slice(0, 4)
        : [],
  };

  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORES.profile,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORES.profile
        );

      /*
       * Remove old profile records first.
       */
      const getAllRequest =
        store.getAll();

      getAllRequest.onsuccess =
        () => {
          const existingProfiles =
            getAllRequest.result ||
            [];

          existingProfiles.forEach(
            (existingProfile) => {
              if (
                existingProfile?.id !==
                "profile"
              ) {
                store.delete(
                  existingProfile.id
                );
              }
            }
          );

          /*
           * Save exactly one profile.
           */
          store.put(
            profileData
          );
        };

      getAllRequest.onerror =
        () => {
          reject(
            getAllRequest.error
          );
        };

      transaction.oncomplete =
        () => {
          resolve(
            profileData
          );
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error ||
              new Error(
                "Profile save transaction aborted"
              )
          );
        };
    }
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getLocalDateString(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return getLocalDateString(
      value
    );
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return getLocalDateString(
    parsed
  );
}

function itemMatchesDate(
  item,
  targetDate
) {
  if (!item || !targetDate) {
    return false;
  }

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

  return fields.some(
    (field) => {
      return (
        normalizeDate(
          item[field]
        ) === targetDate
      );
    }
  );
}

function safeNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/* =========================================================
   STUDY SESSION HELPERS
========================================================= */

function getStudySessionMinutes(
  session
) {
  if (!session) {
    return 0;
  }

  const directDuration =
    safeNumber(
      session.duration ??
        session.durationMinutes ??
        session.minutes
    );

  if (
    directDuration > 0
  ) {
    return directDuration;
  }

  if (
    session.startTime &&
    session.endTime
  ) {
    const startParts =
      String(
        session.startTime
      )
        .split(":")
        .map(Number);

    const endParts =
      String(
        session.endTime
      )
        .split(":")
        .map(Number);

    if (
      startParts.length >= 2 &&
      endParts.length >= 2 &&
      Number.isFinite(
        startParts[0]
      ) &&
      Number.isFinite(
        startParts[1]
      ) &&
      Number.isFinite(
        endParts[0]
      ) &&
      Number.isFinite(
        endParts[1]
      )
    ) {
      const start =
        startParts[0] * 60 +
        startParts[1];

      const end =
        endParts[0] * 60 +
        endParts[1];

      let difference =
        end - start;

      if (
        difference < 0
      ) {
        difference +=
          24 * 60;
      }

      return Math.max(
        0,
        difference
      );
    }
  }

  return 0;
}

function getStudySessionsForDate(
  studySessions,
  targetDate
) {
  return studySessions.filter(
    (session) =>
      itemMatchesDate(
        session,
        targetDate
      )
  );
}

/* =========================================================
   DAILY REPORTS
========================================================= */

export async function getDailyReports() {
  const reports =
    await getItems(
      STORES.dailyReports
    );

  return reports.sort(
    (a, b) =>
      String(
        b.date
      ).localeCompare(
        String(a.date)
      )
  );
}

export async function getDailyReport(
  date
) {
  const dateString =
    normalizeDate(date);

  if (!dateString) {
    return null;
  }

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

  if (!dateString) {
    return false;
  }

  return deleteItem(
    STORES.dailyReports,
    dateString
  );
}

/* =========================================================
   SAVE DAILY REPORT
========================================================= */

export async function saveDailyReport(
  report
) {
  if (
    !report ||
    !report.date
  ) {
    throw new Error(
      "Daily report date is required"
    );
  }

  const date =
    normalizeDate(
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

  const reports =
    await getDailyReports();

  if (
    reports.length > 50
  ) {
    const oldReports =
      reports.slice(50);

    for (
      const oldReport of oldReports
    ) {
      await deleteItem(
        STORES.dailyReports,
        oldReport.id
      );
    }
  }

  return reportData;
}

/* =========================================================
   DAILY REPORT BUILDER
========================================================= */

export async function createDailyReportForDate(
  targetDate
) {
  const date =
    normalizeDate(
      targetDate
    );

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
    studySessions,
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
    getStudySessions(),
  ]);

  /* -------------------------
     LEARNING
  ------------------------- */

  const dailyTopics =
    topics.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const learningCompleted =
    dailyTopics.filter(
      (item) =>
        item.completed === true ||
        item.status ===
          "completed" ||
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
     STUDY SESSIONS
  ------------------------- */

  const dailyStudySessions =
    getStudySessionsForDate(
      studySessions,
      date
    );

  const studySessionMinutes =
    dailyStudySessions.reduce(
      (total, session) =>
        total +
        getStudySessionMinutes(
          session
        ),
      0
    );

  /* -------------------------
     GOALS
  ------------------------- */

  const goalsCompleted =
    goals.filter(
      (goal) =>
        goal.status ===
          "completed" ||
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
        (value) =>
          value >= 0
      );

  const averageGoalProgress =
    goalProgressValues.length >
    0
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
    timetable.filter(
      (item) =>
        itemMatchesDate(
          item,
          date
        )
    );

  const timetableCompleted =
    dailyTimetable.filter(
      (item) =>
        item.status ===
          "completed" ||
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
    diet.filter(
      (item) =>
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
    water.filter(
      (item) =>
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

        return category.includes(
          "coding"
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
        item.status ===
          "completed" ||
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
        item.status ===
          "completed" ||
        item.isCompleted === true
    ).length;

  /* =========================================================
     PRODUCTIVITY SCORE
  ========================================================= */

  const waterTarget =
    Math.max(
      ...dailyWater.map(
        (item) =>
          safeNumber(
            item?.target ??
              item?.targetMl ??
              item?.dailyTargetMl
          )
      ),
      0
    );

  const waterPercentage =
    waterTarget > 0
      ? Math.min(
          100,
          Math.round(
            (waterConsumed /
              waterTarget) *
              100
          )
        )
      : 0;

  const taskCompletionRate =
    dailyTasks.length > 0
      ? Math.round(
          (tasksCompleted /
            dailyTasks.length) *
            100
        )
      : tasksCompleted > 0
        ? 100
        : 0;

  const learningScore =
    learningCompleted > 0
      ? 25
      : 0;

  const goalScore =
    Math.round(
      averageGoalProgress *
        0.20
    );

  const taskScore =
    Math.round(
      taskCompletionRate *
        0.20
    );

  const waterScore =
    Math.round(
      waterPercentage *
        0.15
    );

  const activityScore =
    activityMinutes > 0
      ? 10
      : 0;

  const studyScore =
    studySessionMinutes > 0
      ? 10
      : 0;

  const productivityScore =
    Math.min(
      100,
      Math.max(
        0,
        learningScore +
          goalScore +
          taskScore +
          waterScore +
          activityScore +
          studyScore
      )
    );

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

  /* =========================================================
     FINAL REPORT
  ========================================================= */

  const report = {
    id: date,

    date,

    createdAt:
      new Date().toISOString(),

    productivityScore,

    learning: {
      total:
        dailyTopics.length,

      completed:
        learningCompleted,

      studyMinutes:
        learningTime,
    },

    studySessions: {
      count:
        dailyStudySessions.length,

      minutes:
        studySessionMinutes,
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

      other:
        Math.max(
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
        dailyTasks.length +
        dailyStudySessions.length,

      totalCompleted:
        learningCompleted +
        timetableCompleted +
        assessmentsCompleted +
        tasksCompleted,

      studyMinutes:
        studySessionMinutes,

      studySessionMinutes:
        studySessionMinutes,

      screenMinutes:
        totalScreenMinutes,

      waterConsumed:
        waterConsumed,

      activityMinutes:
        activityMinutes,

      learningCompleted:
        learningCompleted,

      tasksCompleted:
        tasksCompleted,

      productivityScore:
        productivityScore,
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
  IMPORTANT:

  Every historical date containing data
  is rebuilt.

  We DO NOT trust an old productivityScore.

  The report is recalculated from the
  actual data.
*/

export async function ensureDailyReportHistory() {
  const today =
    getLocalDateString();

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
    studySessions,
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
    getStudySessions(),
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
    ...studySessions,
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
        date <= today
      ) {
        datesWithData.add(
          date
        );
      }
    });
  });

  /*
    Rebuild ALL dates.
  */

  const datesToUpdate =
    [...datesWithData].sort();

  for (
    const date of datesToUpdate
  ) {
    await createDailyReportForDate(
      date
    );
  }

  /*
    Also rebuild already existing
    reports, even if their source
    data is no longer detected.
  */

  const existingReports =
    await getDailyReports();

  for (
    const report of existingReports
  ) {
    if (
      report?.date &&
      report.date <= today &&
      !datesWithData.has(
        report.date
      )
    ) {
      /*
        Only rebuild if the report
        contains meaningful tracking
        information.
      */

      const hasStoredData =
        safeNumber(
          report?.activities
            ?.durationMinutes
        ) > 0 ||
        safeNumber(
          report?.water
            ?.consumedMl
        ) > 0 ||
        safeNumber(
          report?.studySessions
            ?.minutes
        ) > 0 ||
        safeNumber(
          report?.learning
            ?.completed
        ) > 0 ||
        safeNumber(
          report?.quickTasks
            ?.completed
        ) > 0;

      if (hasStoredData) {
        await createDailyReportForDate(
          report.date
        );
      }
    }
  }

  /*
    Keep newest 50 reports.
  */

  const reports =
    await getDailyReports();

  if (
    reports.length > 50
  ) {
    const oldReports =
      reports.slice(50);

    for (
      const report of oldReports
    ) {
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

    // PHASE 1
    quickNotes,
    dailyTargets,
    reminders,
    todoList,
    studySessions,

    jobPreparation,
    applications,
    savedJobs,
    resumes,
    interviews,
    projects,
    income,
    expenses,
    budget,
    settings,
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

    getQuickNotes(),
    getDailyTargets(),
    getReminders(),
    getTodoList(),
    getStudySessions(),

    getJobPreparation(),
    getApplications(),
    getSavedJobs(),
    getResumes(),
    getInterviews(),
    getProjects(),
    getIncome(),
    getExpenses(),
    getBudget(),
    getSettings(),
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

    // PHASE 1
    quickNotes,
    dailyTargets,
    reminders,
    todoList,
    studySessions,

    jobPreparation,
    applications,
    savedJobs,
    resumes,
    interviews,
    projects,
    income,
    expenses,
    budget,
    settings,
  };
}

/* =========================================================
   BACKUP VALIDATION
========================================================= */

export function validateBackup(data) {
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

    // PHASE 1
    "quickNotes",
    "dailyTargets",
    "reminders",
    "todoList",
    "studySessions",

    "jobPreparation",
    "applications",
    "savedJobs",
    "resumes",
    "interviews",
    "projects",
    "income",
    "expenses",
    "budget",
  ];

  for (
    const key of arrayStores
  ) {
    if (
      data[key] !== undefined &&
      !Array.isArray(
        data[key]
      )
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

  if (
    data.settings !== undefined &&
    data.settings !== null &&
    typeof data.settings !== "object"
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   IMPORT ALL DATA
========================================================= */

export async function importAllData(data) {
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

    // PHASE 1
    "quickNotes",
    "dailyTargets",
    "reminders",
    "todoList",
    "studySessions",

    "jobPreparation",
    "applications",
    "savedJobs",
    "resumes",
    "interviews",
    "projects",
    "income",
    "expenses",
    "budget",
  ];

  for (
    const key of arrayStores
  ) {
    if (
      Array.isArray(
        data[key]
      )
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

      id: "profile",
    });
  }

  if (data.settings) {
    await clearStore(
      STORES.settings
    );

    await saveSettings({
      ...data.settings,
      id: "settings",
    });
  }

  return true;
}

/* =========================================================
   EXPORTS
========================================================= */

export {
  STORES
};