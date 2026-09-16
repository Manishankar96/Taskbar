import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Flame,
  History,
  RefreshCw,
} from "lucide-react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import {
  getTopics,
  getGoals,
  getWater,
  getScreenTime,
  getStudySessions,
  getActivities,
  getDiet,
  getQuickTasks,
  getTodoList,
  getTimetable,
  getAssessments,
  getStreak,
  getDailyReports,
  ensureDailyReportHistory,
} from "../../utils/db";


/* =========================================================
   HELPERS
========================================================= */

function getToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}


function getDateDaysAgo(days) {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}


function getLastDays(count) {
  const dates = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    dates.push(getDateDaysAgo(i));
  }

  return dates;
}


function formatDate(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


function shortDate(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}


function weekday(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString("en-IN", {
    weekday: "short",
  });
}


function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}


function formatMinutes(minutes) {
  const value = safeNumber(minutes);

  if (value <= 0) {
    return "0m";
  }

  const hours = Math.floor(value / 60);
  const mins = Math.round(value % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}


function formatLitres(ml) {
  return `${(safeNumber(ml) / 1000).toFixed(1)} L`;
}


function sumField(items, fields) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((total, item) => {
    for (const field of fields) {
      if (item?.[field] !== undefined) {
        return total + safeNumber(item[field]);
      }
    }

    return total;
  }, 0);
}


/* =========================================================
   STUDY TIME
   Study Time comes ONLY from Study Sessions.
========================================================= */

function getStudyMinutesForDate(studySessions, date) {
  if (!Array.isArray(studySessions)) {
    return 0;
  }

  return studySessions
    .filter((session) => session?.date === date)
    .reduce((total, session) => {
      return (
        total +
        Math.max(
          0,
          safeNumber(
            session?.duration ??
              session?.minutes ??
              session?.time
          )
        )
      );
    }, 0);
}


/* =========================================================
   WATER
========================================================= */

function getWaterForDate(waterRows, date) {
  if (!Array.isArray(waterRows)) {
    return 0;
  }

  const rows = waterRows.filter(
    (row) => row && row.date === date
  );

  const dailyRecord = rows.find(
    (row) =>
      row.consumed !== undefined ||
      row.consumedMl !== undefined
  );

  if (dailyRecord) {
    return Math.max(
      0,
      safeNumber(
        dailyRecord.consumed ??
          dailyRecord.consumedMl
      )
    );
  }

  return rows.reduce((total, row) => {
    return (
      total +
      safeNumber(
        row.amountMl ??
          row.amount ??
          row.water ??
          row.quantity ??
          row.ml
      )
    );
  }, 0);
}


function getWaterTargetForDate(waterRows, date) {
  if (!Array.isArray(waterRows)) {
    return 0;
  }

  return Math.max(
    ...waterRows
      .filter((row) => row?.date === date)
      .map((row) =>
        safeNumber(
          row?.target ??
            row?.targetMl ??
            row?.dailyTargetMl
        )
      ),
    0
  );
}


/* =========================================================
   TOPICS / TASKS
========================================================= */

function isCompleted(item) {
  return (
    item?.completed === true ||
    item?.status === "completed" ||
    item?.isCompleted === true
  );
}


function isDateForItem(item, date) {
  return (
    item?.date === date ||
    item?.completedAt === date
  );
}


/* =========================================================
   REPORTS
========================================================= */

function Reports() {
  const [topics, setTopics] = useState([]);
  const [goals, setGoals] = useState([]);
  const [water, setWater] = useState([]);
  const [screenTime, setScreenTime] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [diet, setDiet] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [todoList, setTodoList] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [jobPreparationData, setJobPreparationData] = useState({
    tasks: [],
  });
  const [applicationsList, setApplicationsList] = useState([]);
  const [savedJobsList, setSavedJobsList] = useState([]);
  const [interviewsList, setInterviewsList] = useState([]);

  const [streak, setStreak] = useState({
    current: 0,
    best: 0,
  });

  const [dailyReports, setDailyReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState("Daily");
  const [selectedHistoryDate, setSelectedHistoryDate] =
    useState(null);

  const [today, setToday] = useState(getToday());


  /* =======================================================
     DETECT NEW DAY
  ======================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      const newToday = getToday();

      setToday((oldToday) =>
        oldToday === newToday ? oldToday : newToday
      );
    }, 30000);

    return () => clearInterval(timer);
  }, []);


  /* =======================================================
     LOAD DATA
======================================================= */

  async function loadReports(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      }

      /*
        Historical reports are rebuilt for previous dates.
        Today's report is intentionally calculated live below.
      */
      await ensureDailyReportHistory();

      const [
        topicData,
        goalData,
        waterData,
        screenData,
        studyData,
        activityData,
        dietData,
        taskData,
        personalTodoData,
        timetableData,
        assessmentData,
        streakData,
        reportData,
      ] = await Promise.all([
        getTopics(),
        getGoals(),
        getWater(),
        getScreenTime(),
        getStudySessions(),
        getActivities(),
        getDiet(),
        getQuickTasks(),
        getTodoList(),
        getTimetable(),
        getAssessments(),
        getStreak(),
        getDailyReports(),
      ]);

      setTopics(
        Array.isArray(topicData) ? topicData : []
      );

      setGoals(
        Array.isArray(goalData) ? goalData : []
      );

      setWater(
        Array.isArray(waterData) ? waterData : []
      );

      setScreenTime(
        Array.isArray(screenData) ? screenData : []
      );

      setStudySessions(
        Array.isArray(studyData) ? studyData : []
      );

      setActivities(
        Array.isArray(activityData) ? activityData : []
      );

      setDiet(
        Array.isArray(dietData) ? dietData : []
      );

      setQuickTasks(
        Array.isArray(taskData) ? taskData : []
      );

      setTodoList(
        Array.isArray(personalTodoData) ? personalTodoData : []
      );

      setTimetable(
        Array.isArray(timetableData) ? timetableData : []
      );

      setAssessments(
        Array.isArray(assessmentData) ? assessmentData : []
      );

      try {
        const storedIncome = JSON.parse(
          localStorage.getItem("taskbar-income") || "[]"
        );
        const storedExpenses = JSON.parse(
          localStorage.getItem("taskbar-expenses") || "[]"
        );

        setIncomeList(
          Array.isArray(storedIncome) ? storedIncome : []
        );
        setExpenseList(
          Array.isArray(storedExpenses) ? storedExpenses : []
        );
      } catch (financeError) {
        console.error("Finance reports loading error:", financeError);
        setIncomeList([]);
        setExpenseList([]);
      }

      try {
        const storedJobPreparation = JSON.parse(
          localStorage.getItem("taskbar-job-preparation") || "{}"
        );
        const storedApplications = JSON.parse(
          localStorage.getItem("taskbar-job-applications") || "[]"
        );
        const storedSavedJobs = JSON.parse(
          localStorage.getItem("taskbar-saved-jobs") || "[]"
        );
        const storedInterviews = JSON.parse(
          localStorage.getItem("taskbar-interviews") || "[]"
        );

        setJobPreparationData(
          storedJobPreparation && typeof storedJobPreparation === "object"
            ? storedJobPreparation
            : { tasks: [] }
        );
        setApplicationsList(
          Array.isArray(storedApplications) ? storedApplications : []
        );
        setSavedJobsList(
          Array.isArray(storedSavedJobs) ? storedSavedJobs : []
        );
        setInterviewsList(
          Array.isArray(storedInterviews) ? storedInterviews : []
        );
      } catch (careerError) {
        console.error("Career reports loading error:", careerError);
        setJobPreparationData({ tasks: [] });
        setApplicationsList([]);
        setSavedJobsList([]);
        setInterviewsList([]);
      }

      if (
        Array.isArray(streakData) &&
        streakData.length > 0
      ) {
        setStreak(streakData[0]);
      } else {
        setStreak({
          current: 0,
          best: 0,
        });
      }

      setDailyReports(
        Array.isArray(reportData) ? reportData : []
      );
    } catch (error) {
      console.error("Reports loading error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  /* =======================================================
     INITIAL LOAD
======================================================= */

  useEffect(() => {
    loadReports();
  }, [today]);


  /* =======================================================
     AUTO SYNC

     Water, Learning, Tasks, Activities and Study Sessions
     can change from another page. Re-read the data so the
     Daily score and today's History stay synchronized.
======================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      loadReports();
    }, 5000);

    const refreshFinance = () => loadReports();
    const refreshCareer = () => loadReports();

    window.addEventListener("taskbar-finance-updated", refreshFinance);
    window.addEventListener("taskbarJobPreparationUpdated", refreshCareer);
    window.addEventListener("taskbarApplicationsUpdated", refreshCareer);
    window.addEventListener("taskbarSavedJobsUpdated", refreshCareer);
    window.addEventListener("taskbarInterviewsUpdated", refreshCareer);
    window.addEventListener("storage", refreshFinance);

    return () => {
      clearInterval(timer);
      window.removeEventListener(
        "taskbar-finance-updated",
        refreshFinance
      );
      window.removeEventListener(
        "taskbarJobPreparationUpdated",
        refreshCareer
      );
      window.removeEventListener(
        "taskbarApplicationsUpdated",
        refreshCareer
      );
      window.removeEventListener(
        "taskbarSavedJobsUpdated",
        refreshCareer
      );
      window.removeEventListener(
        "taskbarInterviewsUpdated",
        refreshCareer
      );
      window.removeEventListener("storage", refreshFinance);
    };
  }, []);


  /* =======================================================
     DAILY LIVE DATA
======================================================= */

  const daily = useMemo(() => {
    const waterToday = getWaterForDate(
      water,
      today
    );

    const waterTarget = getWaterTargetForDate(
      water,
      today
    );

    const screenToday = screenTime.filter(
      (item) => item?.date === today
    );

    const activityToday = activities.filter(
      (item) => item?.date === today
    );

    const studyMinutes =
      getStudyMinutesForDate(
        studySessions,
        today
      );

    const screenMinutes = sumField(
      screenToday,
      ["minutes", "duration", "time"]
    );

    const learningCompleted =
      topics.filter(
        (topic) =>
          isDateForItem(topic, today) &&
          isCompleted(topic)
      ).length;

    const todayTasks = quickTasks.filter(
      (task) => isDateForItem(task, today)
    );

    const tasksCompleted =
      todayTasks.filter(isCompleted).length;

    const goalValues = goals.map((goal) => {
      if (goal?.status === "completed") {
        return 100;
      }

      return Math.min(
        100,
        Math.max(
          0,
          safeNumber(goal?.progress)
        )
      );
    });

    const avgGoal =
      goalValues.length > 0
        ? Math.round(
            goalValues.reduce(
              (sum, value) => sum + value,
              0
            ) / goalValues.length
          )
        : 0;

    const waterPercentage =
      waterTarget > 0
        ? Math.min(
            100,
            Math.round(
              (waterToday / waterTarget) * 100
            )
          )
        : 0;

    const taskCompletionRate =
      todayTasks.length > 0
        ? Math.round(
            (tasksCompleted /
              todayTasks.length) *
              100
          )
        : tasksCompleted > 0
          ? 100
          : 0;

    /*
      SAME formula used by db.js for historical reports.
    */
    const productivityScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          learningCompleted > 0 ? 25 : 0
        ) +
          Math.round(avgGoal * 0.20) +
          Math.round(
            taskCompletionRate * 0.20
          ) +
          Math.round(
            waterPercentage * 0.15
          ) +
          (activityToday.length > 0 &&
          sumField(
            activityToday,
            ["duration", "minutes", "time"]
          ) > 0
            ? 10
            : 0) +
          (studyMinutes > 0 ? 10 : 0)
      )
    );

    return {
      waterToday,
      waterTarget,
      screenMinutes,
      studyMinutes,
      activityToday,
      activityMinutes: sumField(
        activityToday,
        ["duration", "minutes", "time"]
      ),
      learningCompleted,
      tasksCompleted,
      avgGoal,
      productivityScore,
    };
  }, [
    today,
    topics,
    goals,
    water,
    screenTime,
    studySessions,
    activities,
    quickTasks,
  ]);


  /* =======================================================
     TODAY LIVE REPORT

     This object is NOT stored in IndexedDB.
     It is created from the latest dashboard data.
======================================================= */

  const todayLiveReport = useMemo(() => {
    return {
      id: `live-${today}`,
      date: today,

      learning: {
        completed: daily.learningCompleted,
      },

      quickTasks: {
        completed: daily.tasksCompleted,
      },

      summary: {
        topicsCompleted:
          daily.learningCompleted,
        tasksCompleted:
          daily.tasksCompleted,
        avgGoalProgress:
          daily.avgGoal,
        studyMinutes:
          daily.studyMinutes,
        screenMinutes:
          daily.screenMinutes,
        waterConsumed:
          daily.waterToday,
        activityMinutes:
          daily.activityMinutes,
        productivityScore:
          daily.productivityScore,
      },

      productivityScore:
        daily.productivityScore,

      water: {
        consumedMl:
          daily.waterToday,
        target:
          daily.waterTarget,
      },
    };
  }, [today, daily]);


  /* =======================================================
     HISTORY DISPLAY

     IMPORTANT:
     - Today is ALWAYS represented by live data.
     - Previous days come from saved dailyReports.
     - If an old today record exists, it is replaced by the
       live today record so it cannot show stale 0%.
======================================================= */

  const historyReports = useMemo(() => {
    const previousReports =
      Array.isArray(dailyReports)
        ? dailyReports.filter(
            (report) =>
              report?.date !== today
          )
        : [];

    return [
      todayLiveReport,
      ...previousReports,
    ].sort((a, b) =>
      String(b.date).localeCompare(
        String(a.date)
      )
    );
  }, [
    dailyReports,
    today,
    todayLiveReport,
  ]);


  /* =======================================================
     SELECTED HISTORY DATE
======================================================= */

  useEffect(() => {
    if (historyReports.length === 0) {
      setSelectedHistoryDate(null);
      return;
    }

    setSelectedHistoryDate((oldDate) => {
      if (
        oldDate &&
        historyReports.some(
          (report) =>
            report.date === oldDate
        )
      ) {
        return oldDate;
      }

      return historyReports[0].date;
    });
  }, [historyReports]);


  /* =======================================================
     SELECTED HISTORY REPORT
======================================================= */

  const selectedReport = useMemo(() => {
    if (!selectedHistoryDate) {
      return null;
    }

    return (
      historyReports.find(
        (report) =>
          report.date ===
          selectedHistoryDate
      ) || null
    );
  }, [
    historyReports,
    selectedHistoryDate,
  ]);


  /* =======================================================
     HISTORY HELPERS

     Today's values come from current live data.
     Previous dates come from stored report + raw data.
======================================================= */

  const selectedHistoryValues = useMemo(() => {
    if (!selectedReport) {
      return {
        topics: 0,
        tasks: 0,
        goal: 0,
        study: 0,
        screen: 0,
        water: 0,
        activity: 0,
        productivity: 0,
      };
    }

    const date = selectedReport.date;
    const isToday = date === today;

    if (isToday) {
      return {
        topics:
          daily.learningCompleted,
        tasks:
          daily.tasksCompleted,
        goal:
          daily.avgGoal,
        study:
          daily.studyMinutes,
        screen:
          daily.screenMinutes,
        water:
          daily.waterToday,
        activity:
          daily.activityMinutes,
        productivity:
          daily.productivityScore,
      };
    }

    const storedTopics =
      safeNumber(
        selectedReport.summary
          ?.topicsCompleted ??
          selectedReport.topicsCompleted ??
          selectedReport.learning?.completed
      );

    const storedTasks =
      safeNumber(
        selectedReport.summary
          ?.tasksCompleted ??
          selectedReport.tasksCompleted ??
          selectedReport.quickTasks?.completed
      );

    const storedGoal =
      safeNumber(
        selectedReport.summary
          ?.avgGoalProgress ??
          selectedReport.avgGoalProgress ??
          selectedReport.goalProgress
      );

    const study =
      getStudyMinutesForDate(
        studySessions,
        date
      );

    const storedStudy =
      safeNumber(
        selectedReport.summary
          ?.studyMinutes ??
          selectedReport.studyMinutes
      );

    const screen =
      sumField(
        screenTime.filter(
          (item) => item?.date === date
        ),
        ["minutes", "duration", "time"]
      );

    const storedScreen =
      safeNumber(
        selectedReport.summary
          ?.screenMinutes ??
          selectedReport.screenMinutes
      );

    const waterValue =
      getWaterForDate(
        water,
        date
      );

    const storedWater =
      safeNumber(
        selectedReport.summary
          ?.waterConsumed ??
          selectedReport.waterConsumed ??
          selectedReport.water?.consumedMl
      );

    const activity =
      sumField(
        activities.filter(
          (item) => item?.date === date
        ),
        ["duration", "minutes", "time"]
      );

    const storedActivity =
      safeNumber(
        selectedReport.summary
          ?.activityMinutes ??
          selectedReport.activityMinutes
      );

    return {
      topics: storedTopics,
      tasks: storedTasks,
      goal: storedGoal,
      study: study > 0 ? study : storedStudy,
      screen: screen > 0 ? screen : storedScreen,
      water: waterValue > 0
        ? waterValue
        : storedWater,
      activity:
        activity > 0
          ? activity
          : storedActivity,
      productivity:
        safeNumber(
          selectedReport.summary
            ?.productivityScore ??
            selectedReport.productivityScore
        ),
    };
  }, [
    selectedReport,
    today,
    daily,
    water,
    screenTime,
    studySessions,
    activities,
  ]);


  /* =======================================================
     GOALS + CENTRAL TO-DO INSIGHTS

     Uses the same task sources as the central To-Do page.
     Today's tasks are counted separately from overdue tasks.
  ======================================================= */

  const goalsAndTodoInsights = useMemo(() => {
    const goalTotal = goals.length;
    const goalCompleted = goals.filter(
      (goal) => goal?.status === "completed"
    ).length;

    const goalProgress = goalTotal > 0
      ? Math.round((goalCompleted / goalTotal) * 100)
      : 0;

    const centralTasks = [];
    const seenIds = new Set();

    const addTask = (task) => {
      if (!task) return;
      const id = String(task.id ?? "");
      if (id && seenIds.has(id)) return;
      if (id) seenIds.add(id);
      centralTasks.push(task);
    };

    todoList.forEach((task) => addTask({
      id: task?.id,
      title: task?.title ?? task?.text ?? "Task",
      date: task?.date ?? task?.dueDate,
      completed: isCompleted(task),
    }));

    topics.forEach((topic) => {
      if (topic?.plannedDate) {
        addTask({
          id: `learning-${topic?.id}`,
          title: topic?.title ?? topic?.name ?? "Learning task",
          date: topic.plannedDate,
          completed: topic?.status === "completed",
        });
      }
    });

    goals.forEach((goal) => {
      if (goal?.targetDate) {
        addTask({
          id: `goal-${goal?.id}`,
          title: goal?.title ?? goal?.name ?? "Goal",
          date: goal.targetDate,
          completed: goal?.status === "completed",
        });
      }
    });

    assessments.forEach((assessment) => {
      if (assessment?.date) {
        addTask({
          id: `assessment-${assessment?.id}`,
          title: assessment?.title ?? assessment?.name ?? "Assessment",
          date: assessment.date,
          completed: isCompleted(assessment),
        });
      }
    });

    const todayLong = new Date(`${today}T00:00:00`)
      .toLocaleDateString("en-IN", { weekday: "long" })
      .toLowerCase();
    const todayShort = weekday(today).toLowerCase();

    timetable.forEach((item) => {
      const itemDay = String(
        item?.day ?? item?.weekday ?? item?.weekDay ?? ""
      ).toLowerCase();

      if (itemDay === todayLong || itemDay === todayShort) {
        addTask({
          id: `timetable-${item?.id}`,
          title: item?.title ?? item?.subject ?? item?.name ?? "Timetable task",
          date: today,
          completed: false,
        });
      }
    });

    quickTasks.forEach((task) => {
      const date = task?.dueDate ?? task?.date;
      if (date) {
        addTask({
          id: `quick-task-${task?.id}`,
          title: task?.title ?? task?.text ?? task?.name ?? "Quick task",
          date,
          completed: isCompleted(task),
        });
      }
    });

    const preparationTasks = Array.isArray(jobPreparationData?.tasks)
      ? jobPreparationData.tasks
      : [];

    preparationTasks.forEach((task) => {
      if (task?.dueDate) {
        addTask({
          id: `job-prep-${task?.id}`,
          title: task?.title ?? task?.name ?? "Job preparation task",
          date: task.dueDate,
          completed: task?.completed === true,
        });
      }
    });

    applicationsList.forEach((application) => {
      if (application?.followUpDate) {
        addTask({
          id: `application-follow-up-${application?.id}`,
          title: `Follow up: ${application?.role ?? "Application"} – ${application?.company ?? ""}`,
          date: application.followUpDate,
          completed:
            ["Selected", "Rejected", "Withdrawn"].includes(application?.status) ||
            application?.followUpCompleted === true,
        });
      }
    });

    savedJobsList.forEach((job) => {
      if (job?.actionDate === today) {
        addTask({
          id: `saved-job-action-${job?.id}`,
          title: `Apply: ${job?.role ?? "Job"} – ${job?.company ?? ""}`,
          date: job.actionDate,
          completed: job?.actionCompleted === true,
        });
      }
    });

    interviewsList.forEach((interview) => {
      if (interview?.date) {
        addTask({
          id: `interview-${interview?.id}`,
          title: `Interview: ${interview?.role ?? "Interview"} – ${interview?.company ?? ""}`,
          date: interview.date,
          completed: ["Completed", "Passed", "Failed", "Cancelled"].includes(
            interview?.status
          ),
        });
      }
    });

    const datedTasks = centralTasks.filter((task) => task.date);
    const todayTasks = datedTasks.filter((task) => task.date === today);
    const overdueTasks = datedTasks.filter(
      (task) => task.date < today && !task.completed
    );

    const completedToday = todayTasks.filter((task) => task.completed).length;
    const pendingToday = todayTasks.filter((task) => !task.completed).length;

    const completionRate = todayTasks.length > 0
      ? Math.round((completedToday / todayTasks.length) * 100)
      : 0;

    return {
      goalTotal,
      goalCompleted,
      goalProgress,
      todayTotal: todayTasks.length,
      completedToday,
      pendingToday,
      overdueCount: overdueTasks.length,
      completionRate,
    };
  }, [
    goals,
    todoList,
    topics,
    assessments,
    timetable,
    quickTasks,
    jobPreparationData,
    applicationsList,
    savedJobsList,
    interviewsList,
    today,
  ]);


  /* =======================================================
     PRODUCTIVITY
======================================================= */

  const financeInsights = useMemo(() => {
    const monthKey = today.slice(0, 7);

    const monthIncome = incomeList
      .filter((item) =>
        String(item?.date || "").startsWith(monthKey)
      )
      .reduce(
        (total, item) =>
          total + safeNumber(item?.amount),
        0
      );

    const monthExpenses = expenseList
      .filter((item) =>
        String(item?.date || "").startsWith(monthKey)
      )
      .reduce(
        (total, item) =>
          total + safeNumber(item?.amount),
        0
      );

    const balance =
      monthIncome - monthExpenses;

    const savingsRate =
      monthIncome > 0
        ? Math.round(
            (balance / monthIncome) * 1000
          ) / 10
        : 0;

    const expenseRate =
      monthIncome > 0
        ? Math.round(
            (monthExpenses / monthIncome) * 1000
          ) / 10
        : 0;

    return {
      monthIncome,
      monthExpenses,
      balance,
      savingsRate,
      expenseRate,
    };
  }, [incomeList, expenseList, today]);


  /* =======================================================
     WELLNESS INSIGHTS

     Uses the same stored Taskbar wellness data:
     Water, Screen Time, Activities and Diet.
======================================================= */

  const wellnessInsights = useMemo(() => {
    const dietToday = diet.filter(
      (item) => item?.date === today
    );

    const sugarToday = dietToday.reduce(
      (total, item) =>
        total +
        safeNumber(
          item?.sugar ??
            item?.sugarGrams ??
            item?.sugarIntake
        ),
      0
    );

    const proteinToday = dietToday.reduce(
      (total, item) =>
        total +
        safeNumber(
          item?.protein ??
            item?.proteinGrams ??
            item?.proteinIntake
        ),
      0
    );

    const proteinTargetCandidates = dietToday
      .map((item) =>
        safeNumber(
          item?.proteinTarget ??
            item?.targetProtein ??
            item?.dailyProteinTarget
        )
      )
      .filter((value) => value > 0);

    const proteinTarget =
      proteinTargetCandidates.length > 0
        ? proteinTargetCandidates[proteinTargetCandidates.length - 1]
        : 0;

    const sugarPercentage = Math.min(
      100,
      Math.round((sugarToday / 10) * 100)
    );

    const proteinPercentage =
      proteinTarget > 0
        ? Math.min(100, Math.round((proteinToday / proteinTarget) * 100))
        : 0;

    const waterPercentage =
      daily.waterTarget > 0
        ? Math.min(100, Math.round((daily.waterToday / daily.waterTarget) * 100))
        : 0;

    return {
      sugarToday,
      sugarLimit: 10,
      sugarPercentage,
      sugarWithinLimit: sugarToday < 10,
      proteinToday,
      proteinTarget,
      proteinPercentage,
      waterToday: daily.waterToday,
      waterTarget: daily.waterTarget,
      waterPercentage,
      screenMinutes: daily.screenMinutes,
      activityMinutes: daily.activityMinutes,
      activityCount: daily.activityToday.length,
    };
  }, [diet, today, daily]);


  const careerInsights = useMemo(() => {
    const preparationTasks = Array.isArray(jobPreparationData?.tasks)
      ? jobPreparationData.tasks
      : [];

    const preparationCompleted = preparationTasks.filter(
      (task) => task?.completed === true
    ).length;

    const preparationProgress =
      preparationTasks.length > 0
        ? Math.round((preparationCompleted / preparationTasks.length) * 100)
        : 0;

    const applicationStatusCounts = applicationsList.reduce(
      (counts, application) => {
        const status = String(application?.status || "").trim();
        if (status) {
          counts[status] = (counts[status] || 0) + 1;
        }
        return counts;
      },
      {}
    );

    const interviewActiveCount = interviewsList.filter(
      (interview) =>
        !["Completed", "Passed", "Failed", "Cancelled"].includes(
          interview?.status
        )
    ).length;

    return {
      preparationTotal: preparationTasks.length,
      preparationCompleted,
      preparationProgress,
      applicationsTotal: applicationsList.length,
      underReview: applicationStatusCounts["Under Review"] || 0,
      interviewApplications: applicationStatusCounts.Interview || 0,
      selected: applicationStatusCounts.Selected || 0,
      rejected: applicationStatusCounts.Rejected || 0,
      savedJobs: savedJobsList.length,
      interviewsTotal: interviewsList.length,
      activeInterviews: interviewActiveCount,
    };
  }, [
    jobPreparationData,
    applicationsList,
    savedJobsList,
    interviewsList,
  ]);


  const productivityScore =
    daily.productivityScore;


  const productivityMessage =
    useMemo(() => {
      if (productivityScore >= 90) {
        return "Excellent day! 🔥";
      }

      if (productivityScore >= 75) {
        return "Great work today! 💪";
      }

      if (productivityScore >= 50) {
        return "Good progress. Keep going! 👍";
      }

      if (productivityScore >= 25) {
        return "You can do better tomorrow. 🌱";
      }

      return "Let's make today productive! 🚀";
    }, [productivityScore]);


  /* =======================================================
     WEEKLY
======================================================= */

  const weekDates = useMemo(
    () => getLastDays(7),
    [today]
  );


  const weeklyChart = useMemo(() => {
    return weekDates.map((date) => {
      const screen = sumField(
        screenTime.filter(
          (item) => item?.date === date
        ),
        ["minutes", "duration", "time"]
      );

      const study =
        getStudyMinutesForDate(
          studySessions,
          date
        );

      const activity = sumField(
        activities.filter(
          (item) => item?.date === date
        ),
        ["duration", "minutes", "time"]
      );

      const waterMl =
        getWaterForDate(
          water,
          date
        );

      return {
        day: weekday(date),
        screenTime:
          Math.round((screen / 60) * 10) / 10,
        studyTime:
          Math.round((study / 60) * 10) / 10,
        activity:
          Math.round((activity / 60) * 10) / 10,
        water:
          Math.round((waterMl / 1000) * 10) / 10,
      };
    });
  }, [
    weekDates,
    screenTime,
    studySessions,
    activities,
    water,
  ]);


  const weeklyWater = useMemo(
    () =>
      weekDates.reduce(
        (total, date) =>
          total +
          getWaterForDate(
            water,
            date
          ),
        0
      ),
    [weekDates, water]
  );


  const weeklyScreen = useMemo(
    () =>
      sumField(
        screenTime.filter(
          (item) =>
            weekDates.includes(
              item?.date
            )
        ),
        ["minutes", "duration", "time"]
      ),
    [screenTime, weekDates]
  );


  const weeklyStudy = useMemo(
    () =>
      weekDates.reduce(
        (total, date) =>
          total +
          getStudyMinutesForDate(
            studySessions,
            date
          ),
        0
      ),
    [studySessions, weekDates]
  );


  const weeklyActivities = useMemo(
    () =>
      sumField(
        activities.filter(
          (item) =>
            weekDates.includes(
              item?.date
            )
        ),
        ["duration", "minutes", "time"]
      ),
    [activities, weekDates]
  );


  const weeklyTopics =
    topics.filter(
      (topic) =>
        weekDates.includes(
          topic?.completedAt
        ) &&
        isCompleted(topic)
    ).length;


  const weeklyTasks =
    quickTasks.filter(
      (task) =>
        weekDates.includes(
          task?.completedAt
        ) &&
        isCompleted(task)
    ).length;


  /* =======================================================
     MONTHLY
======================================================= */

  const monthDates = useMemo(() => {
    const dates = [];
    const now = new Date();

    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {
      dates.push(
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`
      );
    }

    return dates;
  }, [today]);


  const monthlyChart = useMemo(() => {
    return monthDates.map((date) => {
      const screen = sumField(
        screenTime.filter(
          (item) => item?.date === date
        ),
        ["minutes", "duration", "time"]
      );

      const study =
        getStudyMinutesForDate(
          studySessions,
          date
        );

      const activity = sumField(
        activities.filter(
          (item) => item?.date === date
        ),
        ["duration", "minutes", "time"]
      );

      const waterMl =
        getWaterForDate(
          water,
          date
        );

      return {
        day: shortDate(date),
        screenTime: Math.round(screen),
        studyTime: Math.round(study),
        activity: Math.round(activity),
        water:
          Math.round(
            waterMl / 100
          ) / 10,
      };
    });
  }, [
    monthDates,
    screenTime,
    studySessions,
    activities,
    water,
  ]);


  /* =======================================================
     REFRESH
======================================================= */

  async function handleRefresh() {
    await loadReports(true);
  }


  /* =======================================================
     LOADING
======================================================= */

  if (loading) {
    return (
      <div className="reports-page">
        <div className="page-header">
          <div>
            <h1>📊 Reports</h1>
            <p>Loading your reports...</p>
          </div>

          <BarChart3 size={42} />
        </div>
      </div>
    );
  }


  /* =======================================================
     UI
======================================================= */

  return (
    <div className="reports-page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>📊 Reports</h1>

          <p>
            Analyze your learning, habits
            and daily productivity.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: refreshing
              ? "default"
              : "pointer",
          }}
        >
          <RefreshCw size={18} />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>


      {/* TABS */}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        {[
          "Daily",
          "Weekly",
          "Monthly",
          "History",
        ].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border:
                tab === item
                  ? "1px solid #2563eb"
                  : "1px solid #e2e8f0",
              background:
                tab === item
                  ? "#2563eb"
                  : "#ffffff",
              color:
                tab === item
                  ? "#ffffff"
                  : "#334155",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {item}
          </button>
        ))}
      </div>


      {/* ===================================================
          DAILY
      =================================================== */}

      {tab === "Daily" && (
        <>
          <section className="report-overview">

            <div className="report-card">
              <BarChart3 size={25} />

              <span>
                Productivity Score
              </span>

              <strong>
                {productivityScore}%
              </strong>

              <small>
                {productivityMessage}
              </small>
            </div>


            <div className="report-card">
              <span>Learning</span>

              <strong>
                {daily.learningCompleted}
              </strong>

              <small>
                completed topics
              </small>
            </div>


            <div className="report-card">
              <span>Study Time</span>

              <strong>
                {formatMinutes(
                  daily.studyMinutes
                )}
              </strong>

              <small>
                from Study Sessions
              </small>
            </div>


            <div className="report-card">
              <span>Water</span>

              <strong>
                {formatLitres(
                  daily.waterToday
                )}
              </strong>
            </div>


            <div className="report-card">
              <span>Screen Time</span>

              <strong>
                {formatMinutes(
                  daily.screenMinutes
                )}
              </strong>

              <small>
                all screen activity
              </small>
            </div>


            <div className="report-card">
              <span>Activities</span>

              <strong>
                {formatMinutes(
                  daily.activityMinutes
                )}
              </strong>
            </div>


            <div className="report-card">
              <span>Tasks</span>

              <strong>
                {daily.tasksCompleted}
              </strong>

              <small>
                completed today
              </small>
            </div>


            <div className="report-card">
              <Flame size={25} />

              <span>
                Learning Streak
              </span>

              <strong>
                {safeNumber(
                  streak.current ??
                    streak.currentStreak
                )}{" "}
                days
              </strong>

              <small>
                Best:{" "}
                {safeNumber(
                  streak.best ??
                    streak.bestStreak
                )}{" "}
                days
              </small>
            </div>

          </section>


          {/* GOAL + WATER */}

          <section
            className="reports-grid"
            style={{
              marginTop: "24px",
            }}
          >

            <div className="report-panel">

              <div className="section-heading">

                <div>
                  <h2>
                    🎯 Goal Progress
                  </h2>

                  <p>
                    Current progress across
                    your goals.
                  </p>
                </div>

              </div>

              <div className="report-large-number">
                {daily.avgGoal}%
              </div>

              <p className="report-description">
                Average goal progress.
              </p>

              <div className="report-progress">

                <div
                  className="report-progress-bar"
                  style={{
                    width:
                      `${daily.avgGoal}%`,
                  }}
                />

              </div>

            </div>


            <div className="report-panel">

              <div className="section-heading">

                <div>
                  <h2>💧 Water</h2>

                  <p>
                    Today's water intake.
                  </p>
                </div>

              </div>

              <div className="report-large-number">
                {daily.waterTarget > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (
                          daily.waterToday /
                          daily.waterTarget
                        ) *
                          100
                      )
                    )
                  : 0}%
              </div>

              <p className="report-description">
                Stay hydrated throughout
                the day.
              </p>

            </div>

          </section>


          {/* SCREEN + STUDY */}

          <section
            className="reports-grid"
            style={{
              marginTop: "24px",
            }}
          >

            <div className="report-panel">

              <div className="section-heading">

                <div>
                  <h2>
                    💻 Screen Time
                  </h2>

                  <p>
                    Your screen usage
                    for today.
                  </p>
                </div>

              </div>

              <div className="report-large-number">
                {formatMinutes(
                  daily.screenMinutes
                )}
              </div>

              <p className="report-description">
                Includes all categories
                recorded in Screen Time.
              </p>

            </div>


            <div className="report-panel">

              <div className="section-heading">

                <div>
                  <h2>
                    📚 Study Time
                  </h2>

                  <p>
                    Your intentional study
                    sessions for today.
                  </p>
                </div>

              </div>

              <div className="report-large-number">
                {formatMinutes(
                  daily.studyMinutes
                )}
              </div>

              <p className="report-description">
                Study time is calculated
                only from Study Sessions.
              </p>

            </div>

          </section>


          {/* FINANCE INSIGHTS */}

          <section
            className="report-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="section-heading">
              <div>
                <h2>💰 Finance Overview</h2>
                <p>
                  Current month's income, expenses and balance.
                </p>
              </div>
            </div>

            <div className="report-mini-stats">
              <div>
                <span>Income</span>
                <strong>
                  ₹
                  {financeInsights.monthIncome.toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 2 }
                  )}
                </strong>
              </div>

              <div>
                <span>Expenses</span>
                <strong>
                  ₹
                  {financeInsights.monthExpenses.toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 2 }
                  )}
                </strong>
              </div>

              <div>
                <span>Balance</span>
                <strong>
                  ₹
                  {financeInsights.balance.toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 2 }
                  )}
                </strong>
              </div>

              <div>
                <span>Savings Rate</span>
                <strong>
                  {financeInsights.savingsRate}%
                </strong>
              </div>

              <div>
                <span>Expenses / Income</span>
                <strong>
                  {financeInsights.expenseRate}%
                </strong>
              </div>
            </div>
          </section>


          {/* CAREER INSIGHTS */}

          <section
            className="report-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="section-heading">
              <div>
                <h2>💼 Career Overview</h2>
                <p>
                  Your current job preparation and job-search activity.
                </p>
              </div>
            </div>

            <div className="report-mini-stats">
              <div>
                <span>Preparation Tasks</span>
                <strong>
                  {careerInsights.preparationCompleted}/
                  {careerInsights.preparationTotal}
                </strong>
              </div>

              <div>
                <span>Preparation Progress</span>
                <strong>{careerInsights.preparationProgress}%</strong>
              </div>

              <div>
                <span>Applications</span>
                <strong>{careerInsights.applicationsTotal}</strong>
              </div>

              <div>
                <span>Under Review</span>
                <strong>{careerInsights.underReview}</strong>
              </div>

              <div>
                <span>Interview Stage</span>
                <strong>{careerInsights.interviewApplications}</strong>
              </div>

              <div>
                <span>Selected</span>
                <strong>{careerInsights.selected}</strong>
              </div>

              <div>
                <span>Saved Jobs</span>
                <strong>{careerInsights.savedJobs}</strong>
              </div>

              <div>
                <span>Interviews</span>
                <strong>{careerInsights.activeInterviews}</strong>
              </div>
            </div>
          </section>


          {/* WELLNESS INSIGHTS */}

          <section
            className="report-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="section-heading">
              <div>
                <h2>❤️ Wellness Overview</h2>
                <p>
                  Today's water, diet, activity and screen-time data.
                </p>
              </div>
            </div>

            <div className="report-mini-stats">
              <div>
                <span>Water</span>
                <strong>
                  {formatLitres(wellnessInsights.waterToday)} / {formatLitres(wellnessInsights.waterTarget)}
                </strong>
              </div>

              <div>
                <span>Water Progress</span>
                <strong>{wellnessInsights.waterPercentage}%</strong>
              </div>

              <div>
                <span>Sugar</span>
                <strong>
                  {wellnessInsights.sugarToday.toFixed(1)}g / &lt;10g
                </strong>
              </div>

              <div>
                <span>Sugar Status</span>
                <strong>
                  {wellnessInsights.sugarWithinLimit ? "Within Limit" : "Over Limit"}
                </strong>
              </div>

              <div>
                <span>Protein</span>
                <strong>
                  {wellnessInsights.proteinToday.toFixed(1)}g
                  {wellnessInsights.proteinTarget > 0
                    ? ` / ${wellnessInsights.proteinTarget}g`
                    : ""}
                </strong>
              </div>

              <div>
                <span>Protein Progress</span>
                <strong>
                  {wellnessInsights.proteinTarget > 0
                    ? `${wellnessInsights.proteinPercentage}%`
                    : "Target not set"}
                </strong>
              </div>

              <div>
                <span>Activity</span>
                <strong>{formatMinutes(wellnessInsights.activityMinutes)}</strong>
              </div>

              <div>
                <span>Activity Entries</span>
                <strong>{wellnessInsights.activityCount}</strong>
              </div>

              <div>
                <span>Screen Time</span>
                <strong>{formatMinutes(wellnessInsights.screenMinutes)}</strong>
              </div>
            </div>
          </section>


          {/* GOALS + CENTRAL TO-DO PRODUCTIVITY */}

          <section
            className="reports-grid"
            style={{ marginTop: "24px" }}
          >

            <div className="report-panel">
              <div className="section-heading">
                <div>
                  <h2>🎯 Goals Progress</h2>
                  <p>Progress based on your current goals.</p>
                </div>
              </div>

              <div className="report-mini-stats">
                <div>
                  <span>Completed</span>
                  <strong>
                    {goalsAndTodoInsights.goalCompleted}/
                    {goalsAndTodoInsights.goalTotal}
                  </strong>
                </div>

                <div>
                  <span>Completion</span>
                  <strong>{goalsAndTodoInsights.goalProgress}%</strong>
                </div>
              </div>

              <div className="report-progress" style={{ marginTop: "18px" }}>
                <div
                  className="report-progress-bar"
                  style={{ width: `${goalsAndTodoInsights.goalProgress}%` }}
                />
              </div>
            </div>


            <div className="report-panel">
              <div className="section-heading">
                <div>
                  <h2>✅ Central To-Do</h2>
                  <p>Today's tasks plus missed scheduled tasks.</p>
                </div>
              </div>

              <div className="report-mini-stats">
                <div>
                  <span>Completed Today</span>
                  <strong>{goalsAndTodoInsights.completedToday}</strong>
                </div>

                <div>
                  <span>Pending Today</span>
                  <strong>{goalsAndTodoInsights.pendingToday}</strong>
                </div>

                <div>
                  <span>Overdue / Missed</span>
                  <strong>{goalsAndTodoInsights.overdueCount}</strong>
                </div>

                <div>
                  <span>Today's Completion</span>
                  <strong>{goalsAndTodoInsights.completionRate}%</strong>
                </div>
              </div>
            </div>

          </section>


          <section
            className="report-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="section-heading">
              <div>
                <h2>📈 Overall Productivity Summary</h2>
                <p>
                  A live summary of today's central tasks and your current goal progress.
                </p>
              </div>
            </div>

            <div className="report-mini-stats">
              <div>
                <span>Tasks Today</span>
                <strong>{goalsAndTodoInsights.todayTotal}</strong>
              </div>

              <div>
                <span>Completed</span>
                <strong>{goalsAndTodoInsights.completedToday}</strong>
              </div>

              <div>
                <span>Pending</span>
                <strong>{goalsAndTodoInsights.pendingToday}</strong>
              </div>

              <div>
                <span>Missed</span>
                <strong>{goalsAndTodoInsights.overdueCount}</strong>
              </div>

              <div>
                <span>Goal Progress</span>
                <strong>{goalsAndTodoInsights.goalProgress}%</strong>
              </div>

              <div>
                <span>Productivity Score</span>
                <strong>{productivityScore}%</strong>
              </div>
            </div>
          </section>


          {/* 7 DAY SUMMARY */}

          <section
            className="report-panel"
            style={{
              marginTop: "24px",
            }}
          >

            <div className="section-heading">

              <div>
                <h2>
                  📅 7-Day Summary
                </h2>

                <p>
                  Compare your recent
                  screen time, study time,
                  activity and water intake.
                </p>
              </div>

            </div>


            <div className="report-chart">

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <BarChart data={weeklyChart}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis dataKey="day" />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="screenTime"
                    name="Screen Time (h)"
                    fill="#2563eb"
                  />

                  <Bar
                    dataKey="studyTime"
                    name="Study Time (h)"
                    fill="#9333ea"
                  />

                  <Bar
                    dataKey="activity"
                    name="Activity (h)"
                    fill="#22c55e"
                  />

                  <Bar
                    dataKey="water"
                    name="Water (L)"
                    fill="#06b6d4"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>


            <div className="report-mini-stats">

              <div>
                <span>Study Time</span>

                <strong>
                  {formatMinutes(
                    weeklyStudy
                  )}
                </strong>
              </div>

              <div>
                <span>Screen Time</span>

                <strong>
                  {formatMinutes(
                    weeklyScreen
                  )}
                </strong>
              </div>

              <div>
                <span>Activities</span>

                <strong>
                  {formatMinutes(
                    weeklyActivities
                  )}
                </strong>
              </div>

              <div>
                <span>Water</span>

                <strong>
                  {formatLitres(
                    weeklyWater
                  )}
                </strong>
              </div>

              <div>
                <span>Topics</span>

                <strong>
                  {weeklyTopics}
                </strong>
              </div>

              <div>
                <span>Tasks</span>

                <strong>
                  {weeklyTasks}
                </strong>
              </div>

            </div>

          </section>
        </>
      )}


      {/* ===================================================
          WEEKLY
      =================================================== */}

      {tab === "Weekly" && (
        <section className="report-panel">

          <div className="section-heading">

            <div>
              <h2>📈 Weekly Report</h2>

              <p>
                Your activity over the
                last 7 days.
              </p>
            </div>

          </div>


          <div className="report-mini-stats">

            <div>
              <span>Screen Time</span>

              <strong>
                {formatMinutes(
                  weeklyScreen
                )}
              </strong>
            </div>

            <div>
              <span>Study Time</span>

              <strong>
                {formatMinutes(
                  weeklyStudy
                )}
              </strong>
            </div>

            <div>
              <span>Activities</span>

              <strong>
                {formatMinutes(
                  weeklyActivities
                )}
              </strong>
            </div>

            <div>
              <span>Water</span>

              <strong>
                {formatLitres(
                  weeklyWater
                )}
              </strong>
            </div>

            <div>
              <span>Topics</span>

              <strong>
                {weeklyTopics}
              </strong>
            </div>

            <div>
              <span>Tasks</span>

              <strong>
                {weeklyTasks}
              </strong>
            </div>

          </div>


          <div
            className="report-chart"
            style={{
              marginTop: "24px",
            }}
          >

            <ResponsiveContainer
              width="100%"
              height={360}
            >

              <LineChart data={weeklyChart}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="day" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="screenTime"
                  name="Screen Time (h)"
                  stroke="#2563eb"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="studyTime"
                  name="Study Time (h)"
                  stroke="#9333ea"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="activity"
                  name="Activity (h)"
                  stroke="#22c55e"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="water"
                  name="Water (L)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </section>
      )}


      {/* ===================================================
          MONTHLY
      =================================================== */}

      {tab === "Monthly" && (
        <section className="report-panel">

          <div className="section-heading">

            <div>
              <h2>📊 Monthly Report</h2>

              <p>
                Overview of this month's
                activity.
              </p>
            </div>

          </div>


          <div className="report-mini-stats">

            <div>
              <span>Screen Time</span>

              <strong>
                {formatMinutes(
                  monthlyChart.reduce(
                    (total, item) =>
                      total +
                      safeNumber(
                        item.screenTime
                      ),
                    0
                  )
                )}
              </strong>
            </div>

            <div>
              <span>Study Time</span>

              <strong>
                {formatMinutes(
                  monthlyChart.reduce(
                    (total, item) =>
                      total +
                      safeNumber(
                        item.studyTime
                      ),
                    0
                  )
                )}
              </strong>
            </div>

            <div>
              <span>Activities</span>

              <strong>
                {formatMinutes(
                  monthlyChart.reduce(
                    (total, item) =>
                      total +
                      safeNumber(
                        item.activity
                      ),
                    0
                  )
                )}
              </strong>
            </div>

          </div>


          <div className="report-chart">

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <BarChart
                data={monthlyChart}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                  interval="preserveStartEnd"
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="screenTime"
                  name="Screen Time (min)"
                  fill="#2563eb"
                />

                <Bar
                  dataKey="studyTime"
                  name="Study Time (min)"
                  fill="#9333ea"
                />

                <Bar
                  dataKey="activity"
                  name="Activity (min)"
                  fill="#22c55e"
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>
      )}


      {/* ===================================================
          HISTORY
      =================================================== */}

      {tab === "History" && (
        <section className="reports-history">

          <div className="report-panel">

            <div className="section-heading">

              <div>
                <h2>
                  🗂️ Report History
                </h2>

                <p>
                  View your previous daily
                  reports.
                </p>
              </div>

              <History size={28} />

            </div>


            {historyReports.length === 0 ? (

              <div className="empty-state">

                <History size={42} />

                <h3>
                  No reports yet
                </h3>

                <p>
                  Your daily reports will
                  appear here automatically.
                </p>

              </div>

            ) : (

              <div className="history-layout">

                {/* HISTORY LIST */}

                <div className="history-list">

                  {historyReports.map(
                    (report) => {

                      const reportIsToday =
                        report.date === today;

                      const reportScore =
                        reportIsToday
                          ? daily.productivityScore
                          : safeNumber(
                              report.summary
                                ?.productivityScore ??
                                report.productivityScore
                            );

                      const reportTopics =
                        reportIsToday
                          ? daily.learningCompleted
                          : safeNumber(
                              report.summary
                                ?.topicsCompleted ??
                                report.topicsCompleted ??
                                report.learning
                                  ?.completed
                            );

                      return (
                        <button
                          key={
                            report.id ??
                            report.date
                          }
                          type="button"
                          onClick={() =>
                            setSelectedHistoryDate(
                              report.date
                            )
                          }
                          className={
                            selectedHistoryDate ===
                            report.date
                              ? "history-item active"
                              : "history-item"
                          }
                        >

                          <div>

                            <strong>
                              {formatDate(
                                report.date
                              )}
                            </strong>

                            <span>
                              {reportTopics}{" "}
                              topics completed
                            </span>

                          </div>


                          <div>

                            <strong>
                              {reportScore}%
                            </strong>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>


                {/* HISTORY DETAIL */}

                <div className="history-detail">

                  {!selectedReport ? (

                    <div className="empty-state">

                      <History size={38} />

                      <h3>
                        Select a report
                      </h3>

                      <p>
                        Choose a date from
                        the history list.
                      </p>

                    </div>

                  ) : (

                    <>

                      <div className="section-heading">

                        <div>

                          <h2>
                            {formatDate(
                              selectedReport.date
                            )}
                          </h2>

                          <p>
                            {selectedReport.date ===
                            today
                              ? "Live report for today"
                              : "Saved daily report"}
                          </p>

                        </div>

                      </div>


                      <div className="report-mini-stats">

                        <div>
                          <span>
                            Topics Completed
                          </span>

                          <strong>
                            {
                              selectedHistoryValues
                                .topics
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Tasks Completed
                          </span>

                          <strong>
                            {
                              selectedHistoryValues
                                .tasks
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Goal Progress
                          </span>

                          <strong>
                            {
                              selectedHistoryValues
                                .goal
                            }%
                          </strong>
                        </div>


                        <div>
                          <span>
                            Study Time
                          </span>

                          <strong>
                            {formatMinutes(
                              selectedHistoryValues
                                .study
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Screen Time
                          </span>

                          <strong>
                            {formatMinutes(
                              selectedHistoryValues
                                .screen
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Water
                          </span>

                          <strong>
                            {formatLitres(
                              selectedHistoryValues
                                .water
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Activity
                          </span>

                          <strong>
                            {formatMinutes(
                              selectedHistoryValues
                                .activity
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Productivity
                          </span>

                          <strong>
                            {
                              selectedHistoryValues
                                .productivity
                            }%
                          </strong>
                        </div>

                      </div>


                      <div
                        className="report-history-summary"
                        style={{
                          marginTop: "24px",
                        }}
                      >

                        <h3>
                          Daily Summary
                        </h3>

                        <p>
                          {selectedReport.date ===
                          today
                            ? "Today's report uses your latest dashboard data, so changes such as adding water are reflected automatically."
                            : "This report contains the saved activity recorded for this day."}
                        </p>

                      </div>

                    </>

                  )}

                </div>

              </div>

            )}

          </div>

        </section>
      )}


      {/* FOOTER */}

      <div
        className="reports-footer"
        style={{
          marginTop: "24px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >

        <p>
          Reports update automatically when
          your dashboard data changes.
        </p>

      </div>

    </div>
  );
}


export default Reports;
