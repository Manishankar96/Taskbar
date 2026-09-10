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

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getDateDaysAgo(days) {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(
    date.getDate() - days
  );

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getLastDays(count) {
  const dates = [];

  for (
    let i = count - 1;
    i >= 0;
    i--
  ) {
    dates.push(
      getDateDaysAgo(i)
    );
  }

  return dates;
}


function formatDate(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}


function shortDate(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}


function weekday(dateString) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
    }
  );
}


function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function formatMinutes(minutes) {
  const value =
    safeNumber(minutes);

  if (value <= 0) {
    return "0m";
  }

  const hours =
    Math.floor(value / 60);

  const mins =
    Math.round(value % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}


function formatLitres(ml) {
  const value =
    safeNumber(ml);

  return `${(
    value / 1000
  ).toFixed(1)} L`;
}


function sumField(
  items,
  fields
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce(
    (total, item) => {

      for (
        const field of fields
      ) {
        if (
          item?.[field] !==
          undefined
        ) {
          return (
            total +
            safeNumber(
              item[field]
            )
          );
        }
      }

      return total;
    },
    0
  );
}


/* =========================================================
   WATER CALCULATION

   Supports both old and new
   water data formats.
========================================================= */

function getWaterForDate(
  waterRows,
  date
) {
  if (
    !Array.isArray(
      waterRows
    )
  ) {
    return 0;
  }


  const rows =
    waterRows.filter(
      (row) =>
        row &&
        row.date === date
    );


  /*
    New format:

    {
      id: "2026-09-09",
      date: "2026-09-09",
      target: 2500,
      consumed: 3250
    }
  */

  const dailyRecord =
    rows.find(
      (row) =>
        row.consumed !==
          undefined ||
        row.consumedMl !==
          undefined
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


  /*
    Old format:

    {
      id: 123,
      date: "2026-09-09",
      amountMl: 250
    }
  */

  return rows.reduce(
    (
      total,
      row
    ) => {

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

    },
    0
  );
}


/* =========================================================
   HISTORY CARD
========================================================= */

function HistoryCard({
  report,
  selected,
  onClick,
}) {

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: selected
          ? "2px solid #2563eb"
          : "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "16px",
        background:
          selected
            ? "#f8fbff"
            : "#ffffff",
        cursor: "pointer",
        marginBottom: "10px",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "10px",
        }}
      >

        <strong>
          {formatDate(
            report.date
          )}
        </strong>

        <span>
          {
            report.learning
              ?.completed || 0
          } topics
        </span>

      </div>


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, 1fr)",
          gap: "10px",
          marginTop: "10px",
          fontSize: "13px",
          color: "#64748b",
        }}
      >

        <span>
          Study:{" "}
          {formatMinutes(
            report.summary
              ?.studyMinutes || 0
          )}
        </span>

        <span>
          Water:{" "}
          {formatLitres(
            report.water
              ?.consumedMl || 0
          )}
        </span>

        <span>
          Tasks:{" "}
          {
            report.quickTasks
              ?.completed || 0
          }
        </span>

      </div>

    </button>
  );
}


/* =========================================================
   REPORTS
========================================================= */

function Reports() {

  const [
    topics,
    setTopics,
  ] = useState([]);

  const [
    goals,
    setGoals,
  ] = useState([]);

  const [
    water,
    setWater,
  ] = useState([]);

  const [
    screenTime,
    setScreenTime,
  ] = useState([]);

  const [
    activities,
    setActivities,
  ] = useState([]);

  const [
    quickTasks,
    setQuickTasks,
  ] = useState([]);

  const [
    streak,
    setStreak,
  ] = useState({
    current: 0,
    best: 0,
  });

  const [
    dailyReports,
    setDailyReports,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    tab,
    setTab,
  ] = useState("Daily");

  const [
    selectedHistoryDate,
    setSelectedHistoryDate,
  ] = useState(null);


  const [
    today,
    setToday,
  ] = useState(
    getToday()
  );


  /* =======================================================
     DETECT NEW DAY
  ======================================================= */

  useEffect(() => {

    const timer =
      setInterval(() => {

        const newToday =
          getToday();

        setToday(
          (oldToday) =>
            oldToday ===
            newToday
              ? oldToday
              : newToday
        );

      }, 30000);


    return () =>
      clearInterval(timer);

  }, []);


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  async function loadReports(
    showRefresh = false
  ) {

    try {

      if (showRefresh) {
        setRefreshing(true);
      }


      /*
        Build missing historical
        reports.
      */

      await ensureDailyReportHistory();


      const [
        topicData,
        goalData,
        waterData,
        screenData,
        activityData,
        taskData,
        streakData,
        reportData,
      ] = await Promise.all([
        getTopics(),
        getGoals(),
        getWater(),
        getScreenTime(),
        getActivities(),
        getQuickTasks(),
        getStreak(),
        getDailyReports(),
      ]);


      setTopics(
        Array.isArray(
          topicData
        )
          ? topicData
          : []
      );


      setGoals(
        Array.isArray(
          goalData
        )
          ? goalData
          : []
      );


      setWater(
        Array.isArray(
          waterData
        )
          ? waterData
          : []
      );


      setScreenTime(
        Array.isArray(
          screenData
        )
          ? screenData
          : []
      );


      setActivities(
        Array.isArray(
          activityData
        )
          ? activityData
          : []
      );


      setQuickTasks(
        Array.isArray(
          taskData
        )
          ? taskData
          : []
      );


      if (
        Array.isArray(
          streakData
        ) &&
        streakData.length
      ) {

        setStreak(
          streakData[0]
        );

      } else {

        setStreak({
          current: 0,
          best: 0,
        });

      }


      setDailyReports(
        Array.isArray(
          reportData
        )
          ? reportData
          : []
      );


      if (
        Array.isArray(
          reportData
        ) &&
        reportData.length
      ) {

        setSelectedHistoryDate(
          (oldDate) =>
            oldDate ||
            reportData[0].date
        );

      }

    } catch (error) {

      console.error(
        "Reports loading error:",
        error
      );

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

     This makes Reports update when
     Water/Home changes.
  ======================================================= */

  useEffect(() => {

    const timer =
      setInterval(() => {

        loadReports();

      }, 5000);


    return () =>
      clearInterval(timer);

  }, []);


  /* =======================================================
     DAILY DATA
  ======================================================= */

  const daily =
    useMemo(() => {

      const waterToday =
        getWaterForDate(
          water,
          today
        );


      
      const waterRowsToday =
        water.filter(
          (item) =>
            item?.date === today
        );
const screenToday =
        screenTime.filter(
          (item) =>
            item?.date ===
            today
        );


      const activityToday =
        activities.filter(
          (item) =>
            item?.date ===
            today
        );


      const studyMinutes =
        sumField(
          screenToday,
          [
            "minutes",
            "duration",
            "time",
          ]
        );


      const screenMinutes =
        studyMinutes;


      const learningCompleted =
        topics.filter(
          (topic) =>
            (
              topic?.date ===
              today ||
              topic?.completedAt ===
              today
            ) &&
            (
              topic.completed ===
                true ||
              topic.status ===
                "completed" ||
              topic.isCompleted ===
                true
            )
        ).length;


      const tasksCompleted =
        quickTasks.filter(
          (task) =>
            (
              task?.date ===
              today ||
              task?.completedAt ===
              today
            ) &&
            (
              task.completed ===
                true ||
              task.status ===
                "completed" ||
              task.isCompleted ===
                true
            )
        ).length;


      const goalValues =
        goals.map(
          (goal) => {

            if (
              goal.status ===
              "completed"
            ) {
              return 100;
            }

            const value =
              safeNumber(
                goal.progress
              );

            return Math.min(
              100,
              Math.max(
                0,
                value
              )
            );
          }
        );


      const avgGoal =
        goalValues.length
          ? Math.round(
              goalValues.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,
                0
              ) /
                goalValues.length
            )
          : 0;


      const waterTarget =
        Math.max(
          ...waterRowsToday.map((item) =>
            safeNumber(
              item?.target ??
                item?.targetMl ??
                item?.dailyTargetMl
            )
          ),
          0
        );

      const waterConsumed =
        waterRowsToday.length > 0
          ? waterRowsToday.reduce(
              (sum, item) =>
                sum +
                safeNumber(
                  item?.consumed ??
                    item?.consumedMl ??
                    item?.amountMl ??
                    item?.amount
                ),
              0
            )
          : safeNumber(waterToday);



      const waterPercentage =
        waterTarget > 0
          ? Math.min(
              100,
              Math.round(
                (waterConsumed / waterTarget) *
                  100
              )
            )
          : 0;


      const activityMinutes =
        sumField(
          activityToday,
          [
            "duration",
            "minutes",
            "time",
          ]
        );


      const todayTasks =
        quickTasks.filter(
          (task) =>
            task?.date === today ||
            task?.completedAt === today
        );


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


      const productivityScore =
        Math.min(
          100,
          Math.max(
            0,
            Math.round(
              learningCompleted > 0
                ? 25
                : 0
            ) +
              Math.round(
                avgGoal * 0.20
              ) +
              Math.round(
                taskCompletionRate *
                  0.20
              ) +
              Math.round(
                waterPercentage *
                  0.15
              ) +
              (
                activityMinutes > 0
                  ? 10
                  : 0
              ) +
              (
                studyMinutes > 0
                  ? 10
                  : 0
              )
          )
        );


      return {
        waterToday,
        screenMinutes,
        studyMinutes,
        activityToday,
        learningCompleted,
        tasksCompleted,
        avgGoal,
        productivityScore,
      };

    }, [
      water,
      today,
      screenTime,
      activities,
      topics,
      quickTasks,
      goals,
    ]);


  /* =======================================================
     WEEKLY
  ======================================================= */

  const weekDates =
    useMemo(
      () =>
        getLastDays(7),
      [today]
    );


  const weeklyChart =
    useMemo(() => {

      return weekDates.map(
        (date) => {

          const screen =
            sumField(
              screenTime.filter(
                (item) =>
                  item?.date ===
                  date
              ),
              [
                "minutes",
                "duration",
                "time",
              ]
            );


          const activity =
            sumField(
              activities.filter(
                (item) =>
                  item?.date ===
                  date
              ),
              [
                "duration",
                "minutes",
                "time",
              ]
            );


          const waterMl =
            getWaterForDate(
              water,
              date
            );


          return {

            day:
              weekday(
                date
              ),

            screenTime:
              Math.round(
                (screen / 60) *
                  10
              ) / 10,

            activity:
              Math.round(
                (activity / 60) *
                  10
              ) / 10,

            water:
              Math.round(
                (waterMl / 1000) *
                  10
              ) / 10,

          };

        }
      );

    }, [
      weekDates,
      screenTime,
      activities,
      water,
    ]);


  const weeklyWater =
    useMemo(
      () =>
        weekDates.reduce(
          (
            total,
            date
          ) =>
            total +
            getWaterForDate(
              water,
              date
            ),
          0
        ),
      [
        weekDates,
        water,
      ]
    );


  const weeklyScreen =
    useMemo(
      () =>
        sumField(
          screenTime.filter(
            (item) =>
              weekDates.includes(
                item?.date
              )
          ),
          [
            "minutes",
            "duration",
            "time",
          ]
        ),
      [
        screenTime,
        weekDates,
      ]
    );


  const weeklyActivities =
    useMemo(
      () =>
        sumField(
          activities.filter(
            (item) =>
              weekDates.includes(
                item?.date
              )
          ),
          [
            "duration",
            "minutes",
            "time",
          ]
        ),
      [
        activities,
        weekDates,
      ]
    );


  const weeklyTopics =
    topics.filter(
      (topic) =>
        weekDates.includes(
          topic?.completedAt
        ) &&
        (
          topic.completed ===
            true ||
          topic.status ===
            "completed" ||
          topic.isCompleted ===
            true
        )
    ).length;


  const weeklyTasks =
    quickTasks.filter(
      (task) =>
        weekDates.includes(
          task?.completedAt
        ) &&
        (
          task.completed ===
            true ||
          task.status ===
            "completed" ||
          task.isCompleted ===
            true
        )
    ).length;
      /* =======================================================
     MONTHLY
  ======================================================= */

  const monthDates =
    useMemo(() => {

      const dates = [];

      const now =
        new Date();

      const year =
        now.getFullYear();

      const month =
        now.getMonth();

      const daysInMonth =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      for (
        let day = 1;
        day <= daysInMonth;
        day++
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


  const monthlyChart =
    useMemo(() => {

      return monthDates.map(
        (date) => {

          const screen =
            sumField(
              screenTime.filter(
                (item) =>
                  item?.date ===
                  date
              ),
              [
                "minutes",
                "duration",
                "time",
              ]
            );


          const activity =
            sumField(
              activities.filter(
                (item) =>
                  item?.date ===
                  date
              ),
              [
                "duration",
                "minutes",
                "time",
              ]
            );


          const waterMl =
            getWaterForDate(
              water,
              date
            );


          return {

            day:
              shortDate(
                date
              ),

            screenTime:
              Math.round(
                screen / 60
              ),

            activity:
              Math.round(
                activity / 60
              ),

            water:
              Math.round(
                waterMl / 100
              ) / 10,

          };

        }
      );

    }, [
      monthDates,
      screenTime,
      activities,
      water,
    ]);


  /* =======================================================
     SELECTED HISTORY REPORT
  ======================================================= */

  const selectedReport =
    useMemo(() => {

      if (
        !selectedHistoryDate
      ) {
        return null;
      }

      return (
        dailyReports.find(
          (report) =>
            report.date ===
            selectedHistoryDate
        ) || null
      );

    }, [
      dailyReports,
      selectedHistoryDate,
    ]);


  /* =======================================================
     PRODUCTIVITY SCORE
  ======================================================= */

  const productivityScore =
    daily.productivityScore;


  /* =======================================================
     PRODUCTIVITY MESSAGE
  ======================================================= */

  const productivityMessage =
    useMemo(() => {

      if (
        productivityScore >= 90
      ) {
        return "Excellent day! 🔥";
      }

      if (
        productivityScore >= 75
      ) {
        return "Great work today! 💪";
      }

      if (
        productivityScore >= 50
      ) {
        return "Good progress. Keep going! 👍";
      }

      if (
        productivityScore >= 25
      ) {
        return "You can do better tomorrow. 🌱";
      }

      return "Let's make today productive! 🚀";

    }, [
      productivityScore,
    ]);


  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {

    await loadReports(
      true
    );

  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (
      <div className="reports-page">

        <div className="page-header">

          <div>

            <h1>
              📊 Reports
            </h1>

            <p>
              Loading your reports...
            </p>

          </div>

          <BarChart3
            size={42}
          />

        </div>

      </div>
    );

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <div className="reports-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="page-header">

        <div>

          <h1>
            📊 Reports
          </h1>

          <p>
            Analyze your learning, habits
            and daily productivity.
          </p>

        </div>


        <button
          type="button"
          onClick={
            handleRefresh
          }
          disabled={
            refreshing
          }
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "8px",
            padding:
              "10px 16px",
            borderRadius:
              "10px",
            border:
              "1px solid #e2e8f0",
            background:
              "#ffffff",
            cursor:
              refreshing
                ? "default"
                : "pointer",
          }}
        >

          <RefreshCw
            size={18}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </div>


      {/* ===================================================
          TABS
      =================================================== */}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom:
            "20px",
        }}
      >

        {[
          "Daily",
          "Weekly",
          "Monthly",
          "History",
        ].map(
          (item) => (

            <button
              key={item}
              type="button"
              onClick={() =>
                setTab(item)
              }
              style={{
                padding:
                  "10px 18px",
                borderRadius:
                  "10px",
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
                fontWeight:
                  600,
                cursor:
                  "pointer",
              }}
            >
              {item}
            </button>

          )
        )}

      </div>


      {/* ===================================================
          DAILY
      =================================================== */}

      {tab === "Daily" && (

        <>

          {/* OVERVIEW */}

          <section className="report-overview">

            <div className="report-card">

              <BarChart3
                size={25}
              />

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

              <span>
                Learning
              </span>

              <strong>
                {daily.learningCompleted}
              </strong>

              <small>
                completed topics
              </small>

            </div>


            <div className="report-card">

              <span>
                Study Time
              </span>

              <strong>
                {formatMinutes(
                  daily.studyMinutes
                )}
              </strong>

              <small>
                from Screen Time
              </small>

            </div>


            <div className="report-card">

              <span>
                Water
              </span>                <strong>
                  {formatLitres(
                    daily.waterToday
                  )}
                </strong>

            </div>


            <div className="report-card">

              <span>
                Screen Time
              </span>

              <strong>
                {formatMinutes(
                  daily.screenMinutes
                )}
              </strong>

            </div>


            <div className="report-card">

              <span>
                Activities
              </span>

              <strong>
                {formatMinutes(
                  sumField(
                    daily.activityToday,
                    [
                      "duration",
                      "minutes",
                      "time",
                    ]
                  )
                )}
              </strong>

            </div>


            <div className="report-card">

              <span>
                Tasks
              </span>

              <strong>
                {
                  daily.tasksCompleted
                }
              </strong>

              <small>
                completed today
              </small>

            </div>


            <div className="report-card">

              <Flame
                size={25}
              />

              <span>
                Learning Streak
              </span>

              <strong>
                {
                  safeNumber(
                    streak.current ??
                      streak.currentStreak
                  )
                }{" "}
                days
              </strong>

              <small>
                Best:{" "}
                {
                  safeNumber(
                    streak.best ??
                      streak.bestStreak
                  )
                }{" "}
                days
              </small>

            </div>

          </section>


          {/* GOAL PROGRESS */}

          <section
            className="reports-grid"
            style={{
              marginTop:
                "24px",
            }}
          >

            <div className="report-panel">

              <div className="section-heading">

                <div>

                  <h2>
                    🎯 Goal Progress
                  </h2>

                  <p>
                    Current progress
                    across your goals.
                  </p>

                </div>

              </div>


              <div
                className="report-large-number"
              >
                {daily.avgGoal}%
              </div>


              <p
                className="report-description"
              >
                Average goal progress.
              </p>


              <div
                className="report-progress"
              >

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

                  <h2>
                    💧 Water
                  </h2>

                  <p>
                    Today's water intake.
                  </p>

                </div>

              </div>


              <div
                className="report-large-number"
              >
                {
                  Math.min(
                    100,
                    Math.round(
                      (
                        safeNumber(
                          daily.waterToday
                        ) /
                        2500
                      ) *
                        100
                    )
                  )
                }%
              </div>


              <p
                className="report-description"
              >
                Stay hydrated throughout
                the day.
              </p>

            </div>

          </section>


          {/* SCREEN TIME */}

          <section
            className="reports-grid"
            style={{
              marginTop:
                "24px",
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


              <div
                className="report-mini-stats"
              >

                <div>

                  <span>
                    Learning
                  </span>

                  <strong>
                    {
                      formatMinutes(
                        sumField(
                          screenTime.filter(
                            (item) =>
                              item?.date ===
                              today
                          ),
                          ["learning"]
                        )
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Coding
                  </span>

                  <strong>
                    {
                      formatMinutes(
                        sumField(
                          screenTime.filter(
                            (item) =>
                              item?.date ===
                              today
                          ),
                          ["coding"]
                        )
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Entertainment
                  </span>

                  <strong>
                    {
                      formatMinutes(
                        sumField(
                          screenTime.filter(
                            (item) =>
                              item?.date ===
                              today
                          ),
                          [
                            "entertainment",
                          ]
                        )
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Other
                  </span>

                  <strong>
                    {
                      formatMinutes(
                        sumField(
                          screenTime.filter(
                            (item) =>
                              item?.date ===
                              today
                          ),
                          ["other"]
                        )
                      )
                    }
                  </strong>

                </div>

              </div>

            </div>


            <div className="report-panel">

              <div className="section-heading">

                <div>

                  <h2>
                    📚 Study Time
                  </h2>

                  <p>
                    Learning and coding
                    screen time.
                  </p>

                </div>

              </div>


              <div
                className="report-large-number"
              >
                {
                  formatMinutes(
                    daily.studyMinutes
                  )
                }
              </div>


              <p
                className="report-description"
              >
                Study time is calculated
                from your Screen Time
                records.
              </p>

            </div>

          </section>


          {/* 7 DAY SUMMARY */}

          <section
            className="report-panel"
            style={{
              marginTop:
                "24px",
            }}
          >

            <div className="section-heading">

              <div>

                <h2>
                  📅 7-Day Summary
                </h2>

                <p>
                  Compare your recent
                  screen time, activity
                  and water intake.
                </p>

              </div>

            </div>


            <div
              className="report-chart"
            >

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <BarChart
                  data={
                    weeklyChart
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="screenTime"
                    name="Screen Time (h)"
                    fill="#2563eb"
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


            <div
              className="report-mini-stats"
            >

              <div>

                <span>
                  Study / Screen
                </span>

                <strong>
                  {
                    formatMinutes(
                      weeklyScreen
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Activities
                </span>

                <strong>
                  {
                    formatMinutes(
                      weeklyActivities
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Water
                </span>

                <strong>
                  {
                    formatLitres(
                      weeklyWater
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Topics
                </span>

                <strong>
                  {
                    weeklyTopics
                  }
                </strong>

              </div>


              <div>

                <span>
                  Tasks
                </span>

                <strong>
                  {
                    weeklyTasks
                  }
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

              <h2>
                📈 Weekly Report
              </h2>

              <p>
                Your activity over
                the last 7 days.
              </p>

            </div>

          </div>


          <div
            className="report-mini-stats"
          >

            <div>

              <span>
                Screen Time
              </span>

              <strong>
                {
                  formatMinutes(
                    weeklyScreen
                  )
                }
              </strong>

            </div>


            <div>

              <span>
                Activities
              </span>

              <strong>
                {
                  formatMinutes(
                    weeklyActivities
                  )
                }
              </strong>

            </div>


            <div>

              <span>
                Water
              </span>

              <strong>
                {
                  formatLitres(
                    weeklyWater
                  )
                }
              </strong>

            </div>


            <div>

              <span>
                Topics
              </span>

              <strong>
                {
                  weeklyTopics
                }
              </strong>

            </div>


            <div>

              <span>
                Tasks
              </span>

              <strong>
                {
                  weeklyTasks
                }
              </strong>

            </div>

          </div>


          <div
            className="report-chart"
            style={{
              marginTop:
                "24px",
            }}
          >

            <ResponsiveContainer
              width="100%"
              height={360}
            >

              <LineChart
                data={
                  weeklyChart
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                />

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

              <h2>
                📊 Monthly Report
              </h2>

              <p>
                Overview of this month's
                activity.
              </p>

            </div>

          </div>


          <div
            className="report-chart"
          >

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <BarChart
                data={
                  monthlyChart
                }
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

              <History
                size={28}
              />

            </div>


            {dailyReports.length === 0 ? (

              <div
                className="empty-state"
              >

                <History
                  size={42}
                />

                <h3>
                  No reports yet
                </h3>

                <p>
                  Your daily reports will
                  appear here automatically.
                </p>

              </div>

            ) : (

              <div
                className="history-layout"
              >

                <div
                  className="history-list"
                >

                  {dailyReports.map(
                    (report) => (

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
                            {
                              formatDate(
                                report.date
                              )
                            }
                          </strong>

                          <span>
                            {
                              report.summary
                                ?.topicsCompleted ??
                              report.topicsCompleted ??
                              0
                            }{" "}
                            topics completed
                          </span>

                        </div>


                        <div>

                          <strong>
                            {
                              report.summary
                                ?.productivityScore ??
                              report.productivityScore ??
                              0
                            }%
                          </strong>

                        </div>

                      </button>

                    )
                  )}

                </div>


                <div
                  className="history-detail"
                >

                  {!selectedReport ? (

                    <div
                      className="empty-state"
                    >

                      <History
                        size={38}
                      />

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

                      <div
                        className="section-heading"
                      >

                        <div>

                          <h2>
                            {
                              formatDate(
                                selectedReport.date
                              )
                            }
                          </h2>

                          <p>
                            Daily report
                          </p>

                        </div>

                      </div>


                      <div
                        className="report-mini-stats"
                      >

                        <div>

                          <span>
                            Topics Completed
                          </span>

                          <strong>
                            {
                              selectedReport
                                .summary
                                ?.topicsCompleted ??
                              selectedReport
                                .topicsCompleted ??
                              0
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Tasks Completed
                          </span>

                          <strong>
                            {
                              selectedReport
                                .summary
                                ?.tasksCompleted ??
                              selectedReport
                                .tasksCompleted ??
                              0
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Goal Progress
                          </span>

                          <strong>
                            {
                              selectedReport
                                .summary
                                ?.avgGoalProgress ??
                              selectedReport
                                .avgGoalProgress ??
                              0
                            }%
                          </strong>

                        </div>


                        <div>

                          <span>
                            Study Time
                          </span>

                          <strong>
                            {
                              formatMinutes(
                                sumField(
                                  screenTime.filter(
                                    (item) =>
                                      item?.date ===
                                      selectedReport.date
                                  ),
                                  [
                                    "minutes",
                                    "duration",
                                    "time"
                                  ]
                                ) ||
                                safeNumber(
                                  selectedReport
                                    .summary
                                    ?.studyMinutes ??
                                  selectedReport
                                    .studyMinutes ??
                                  0
                                )
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Screen Time
                          </span>

                          <strong>
                            {
                              formatMinutes(
                                sumField(
                                  screenTime.filter(
                                    (item) =>
                                      item?.date ===
                                      selectedReport.date
                                  ),
                                  [
                                    "minutes",
                                    "duration",
                                    "time"
                                  ]
                                )
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Water
                          </span>

                          <strong>
                            {
                              formatLitres(
                                getWaterForDate(
                                  water,
                                  selectedReport.date
                                ) ||
                                safeNumber(
                                  selectedReport
                                    .summary
                                    ?.waterConsumed ??
                                  selectedReport
                                    .waterConsumed ??
                                  0
                                )
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Activity
                          </span>

                          <strong>
                            {
                              formatMinutes(
                                sumField(
                                  activities.filter(
                                    (item) =>
                                      item?.date ===
                                      selectedReport.date
                                  ),
                                  [
                                    "duration",
                                    "minutes",
                                    "time"
                                  ]
                                ) ||
                                safeNumber(
                                  selectedReport
                                    .summary
                                    ?.activityMinutes ??
                                  selectedReport
                                    .activityMinutes ??
                                  0
                                )
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Productivity
                          </span>

                          <strong>
                            {
                              selectedReport
                                .summary
                                ?.productivityScore ??
                              selectedReport
                                .productivityScore ??
                              0
                            }%
                          </strong>

                        </div>

                      </div>


                      <div
                        className="report-history-summary"
                        style={{
                          marginTop:
                            "24px",
                        }}
                      >

                        <h3>
                          Daily Summary
                        </h3>

                        <p>
                          This report contains
                          the activity recorded
                          for this day.
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


      {/* ===================================================
          FOOTER INFORMATION
      =================================================== */}

      <div
        className="reports-footer"
        style={{
          marginTop:
            "24px",
          marginBottom:
            "20px",
          textAlign:
            "center",
        }}
      >

        <p>
          Reports update automatically
          when your dashboard data changes.
        </p>

      </div>

    </div>

  );

}

export default Reports;