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
  getQuickTasks,
  getStreak,
  getDailyReports,
  ensureDailyReportHistory,
} from "../utils/db";


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
  const [quickTasks, setQuickTasks] = useState([]);

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
        taskData,
        streakData,
        reportData,
      ] = await Promise.all([
        getTopics(),
        getGoals(),
        getWater(),
        getScreenTime(),
        getStudySessions(),
        getActivities(),
        getQuickTasks(),
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

      setQuickTasks(
        Array.isArray(taskData) ? taskData : []
      );

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

    return () => clearInterval(timer);
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
     PRODUCTIVITY
======================================================= */

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
