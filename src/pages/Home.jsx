import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  Flame,
  Target,
  Droplets,
  Smartphone,
  CheckSquare,
  ClipboardCheck,
  UserCircle,
  Activity as ActivityIcon,
  BarChart3,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  getTopics,
  getGoals,
  getWater,
  getScreenTime,
  getActivities,
  getQuickTasks,
  getAssessments,
  getTimetable,
  getProfile,
  saveStreak,
} from "../utils/db";

import {
  calculatePercentage,
  calculateWaterPercentage,
  calculateDaysRemaining,
  formatDaysRemaining,
  calculateStreak,
  formatMinutes,
  formatLitres,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../utils/calculations";


function Home() {
  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [loading, setLoading] =
    useState(true);

  const [topics, setTopics] =
    useState([]);

  const [goals, setGoals] =
    useState([]);

  const [water, setWater] =
    useState([]);

  const [screenTime, setScreenTime] =
    useState([]);

  const [activities, setActivities] =
    useState([]);

  const [quickTasks, setQuickTasks] =
    useState([]);

  const [assessments, setAssessments] =
    useState([]);

  const [timetable, setTimetable] =
    useState([]);

  const [profile, setProfile] =
    useState(null);


  /* =====================================================
     CLOCK
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  /* =====================================================
     LOAD ALL DASHBOARD DATA
  ===================================================== */

  useEffect(() => {
    async function loadAll() {
      try {
        const [
          topicsData,
          goalsData,
          waterData,
          screenTimeData,
          activitiesData,
          quickTasksData,
          assessmentsData,
          timetableData,
          profileData,
        ] = await Promise.all([
          getTopics(),
          getGoals(),
          getWater(),
          getScreenTime(),
          getActivities(),
          getQuickTasks(),
          getAssessments(),
          getTimetable(),
          getProfile(),
        ]);

        setTopics(
          Array.isArray(topicsData)
            ? topicsData
            : []
        );

        setGoals(
          Array.isArray(goalsData)
            ? goalsData
            : []
        );

        setWater(
          Array.isArray(waterData)
            ? waterData
            : []
        );

        setScreenTime(
          Array.isArray(screenTimeData)
            ? screenTimeData
            : []
        );

        setActivities(
          Array.isArray(activitiesData)
            ? activitiesData
            : []
        );

        setQuickTasks(
          Array.isArray(quickTasksData)
            ? quickTasksData
            : []
        );

        setAssessments(
          Array.isArray(assessmentsData)
            ? assessmentsData
            : []
        );

        setTimetable(
          Array.isArray(timetableData)
            ? timetableData
            : []
        );

        setProfile(profileData);
      } catch (error) {
        console.error(
          "Failed to load dashboard data:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);


  /* =====================================================
     TODAY
  ===================================================== */

  const today =
    getTodayLocalDateKey();


  /* =====================================================
     DATE
  ===================================================== */

  const date =
    currentTime.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );


  /* =====================================================
     TIME
  ===================================================== */

  const time =
    currentTime.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );


  /* =====================================================
     GREETING
  ===================================================== */

  const greeting = useMemo(() => {
    const hour =
      currentTime.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  }, [currentTime]);


  /* =====================================================
     LEARNING SUMMARY
  ===================================================== */

  const learningStats =
    useMemo(() => {
      const activeTopics =
        topics.filter(
          (topic) =>
            topic.status !== "future"
        );

      const completed =
        activeTopics.filter(
          (topic) =>
            topic.status === "completed"
        ).length;

      const inProgress =
        activeTopics.filter(
          (topic) =>
            topic.status === "in-progress"
        ).length;

      const remaining =
        activeTopics.filter(
          (topic) =>
            topic.status === "remaining"
        ).length;

      const future =
        topics.filter(
          (topic) =>
            topic.status === "future"
        ).length;

      return {
        total: activeTopics.length,
        completed,
        inProgress,
        remaining,
        future,
        progress:
          calculatePercentage(
            completed,
            activeTopics.length
          ),
      };
    }, [topics]);


  /* =====================================================
     STREAK

     A day is maintained when there is any real dashboard
     activity on that date:
       - Learning topic completed
       - Water logged
       - Activity logged
       - Quick task completed
       - Assessment completed
       - Screen time logged

     Current streak = consecutive maintained days ending
     today (only if today is maintained).

     Best streak = highest consecutive run ever.
     ===================================================== */

  const streak = useMemo(() => {
    const dateSet = new Set();

    const addDate = (value) => {
      if (!value) return;

      const raw = String(value);

      // Date/time values such as 2026-09-10T08:30:00
      const match = raw.match(/^(\\d{4}-\\d{2}-\\d{2})/);

      if (match) {
        dateSet.add(match[1]);
        return;
      }

      // Support other valid date values if present.
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        dateSet.add(`${year}-${month}-${day}`);
      }
    };

    // Learning
    topics.forEach((topic) => {
      if (topic.status === "completed") {
        addDate(topic.completedAt || topic.date);
      }
    });

    // Water
    water.forEach((record) => {
      if (record && (
        record.consumed !== undefined ||
        record.consumedMl !== undefined ||
        record.amountMl !== undefined ||
        record.amount !== undefined ||
        record.water !== undefined ||
        record.quantity !== undefined ||
        record.ml !== undefined
      )) {
        addDate(record.date || record.id);
      }
    });

    // Activities
    activities.forEach((activity) => {
      addDate(activity.date || activity.createdAt || activity.completedAt);
    });

    // Quick tasks
    quickTasks.forEach((task) => {
      if (task.status === "completed") {
        addDate(
          task.completedAt ||
          task.completedDate ||
          task.date
        );
      }
    });

    // Assessments
    assessments.forEach((assessment) => {
      if (
        assessment.status === "completed" ||
        assessment.status === "complete"
      ) {
        addDate(
          assessment.completedAt ||
          assessment.completedDate ||
          assessment.date
        );
      }
    });

    // Screen time
    screenTime.forEach((record) => {
      if (Number(record.minutes) > 0) {
        addDate(record.date);
      }
    });

    const dates = Array.from(dateSet).sort();

    if (dates.length === 0) {
      return { current: 0, best: 0 };
    }

    const toDate = (key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const dayDiff = (a, b) => {
      const ms = toDate(b).getTime() - toDate(a).getTime();
      return Math.round(ms / 86400000);
    };

    let best = 1;
    let run = 1;

    for (let i = 1; i < dates.length; i += 1) {
      if (dayDiff(dates[i - 1], dates[i]) === 1) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }

    // Current streak must be connected to TODAY.
    // If today has no activity, the current streak is 0.
    let current = 0;

    if (dateSet.has(today)) {
      current = 1;

      for (let i = dates.length - 1; i > 0; i -= 1) {
        if (dayDiff(dates[i - 1], dates[i]) === 1) {
          current += 1;
        } else {
          break;
        }
      }
    }

    return { current, best };
  }, [
    topics,
    water,
    activities,
    quickTasks,
    assessments,
    screenTime,
    today,
  ]);


  /* =====================================================
     SAVE STREAK
  ===================================================== */

  useEffect(() => {
    if (!loading) {
      saveStreak([
        {
          id: "streak",
          current: streak.current,
          best: streak.best,
        },
      ]).catch((error) => {
        console.error(
          "Failed to persist streak:",
          error
        );
      });
    }
  }, [
    streak,
    loading,
  ]);


  /* =====================================================
     STUDY TIME TODAY
  ===================================================== */

  const studyMinutesToday =
    useMemo(
      () =>
        sumBy(
          screenTime.filter(
            (record) =>
              record.date === today &&
              (
                record.category ===
                  "Learning" ||
                record.category ===
                  "Coding"
              )
          ),
          "minutes"
        ),
      [
        screenTime,
        today,
      ]
    );


  /* =====================================================
     SCREEN TIME TODAY
  ===================================================== */

  const screenTimeMinutesToday =
    useMemo(
      () =>
        sumBy(
          screenTime.filter(
            (record) =>
              record.date === today
          ),
          "minutes"
        ),
      [
        screenTime,
        today,
      ]
    );


  /* =====================================================
     WATER TODAY
     
     IMPORTANT:
     Water page now stores today's data as:

     {
       id: "YYYY-MM-DD",
       date: "YYYY-MM-DD",
       target: 2500,
       consumed: 3250
     }

     Older records may use amountMl.

     If today's aggregate record exists,
     ALWAYS use consumed from that record.

     This prevents:
       Water = 3250 ml
       Home  = 3000 ml

     ===================================================== */

  const todayWaterRecord =
    useMemo(() => {
      return water.find(
        (record) =>
          record &&
          (
            record.id === today ||
            record.date === today
          ) &&
          (
            record.consumed !== undefined ||
            record.consumedMl !== undefined
          )
      );
    }, [
      water,
      today,
    ]);


  /* =====================================================
     WATER TARGET
  ===================================================== */

  const waterTarget =
    useMemo(() => {
      if (
        todayWaterRecord &&
        Number(
          todayWaterRecord.target
        ) > 0
      ) {
        return Number(
          todayWaterRecord.target
        );
      }

      return 2500;
    }, [
      todayWaterRecord,
    ]);


  /* =====================================================
     WATER CONSUMED
  ===================================================== */

  const consumedToday =
    useMemo(() => {

      /*
        New format
      */

      if (todayWaterRecord) {
        const consumed =
          Number(
            todayWaterRecord.consumed ??
            todayWaterRecord.consumedMl
          );

        return Number.isFinite(
          consumed
        )
          ? Math.max(0, consumed)
          : 0;
      }


      /*
        Old format compatibility.

        Older Water page records may look like:

        {
          date: "2026-09-09",
          amountMl: 250
        }
      */

      const todayRecords =
        water.filter(
          (record) =>
            record?.date === today
        );

      return todayRecords.reduce(
        (total, record) => {

          const amount =
            Number(
              record?.amountMl ??
              record?.amount ??
              record?.water ??
              record?.quantity ??
              record?.ml ??
              0
            );

          return (
            total +
            (
              Number.isFinite(
                amount
              )
                ? amount
                : 0
            )
          );
        },
        0
      );

    }, [
      water,
      today,
      todayWaterRecord,
    ]);


  /* =====================================================
     WATER PERCENTAGE
  ===================================================== */

  const waterPercent =
    calculateWaterPercentage(
      Math.max(
        0,
        consumedToday
      ),
      waterTarget
    );


  /* =====================================================
     CURRENT GOAL
  ===================================================== */

  const currentGoal =
    useMemo(() => {

      const active =
        goals.filter(
          (goal) =>
            goal.status !==
            "completed"
        );

      return [
        ...active,
      ].sort(
        (a, b) =>
          calculateDaysRemaining(
            a.targetDate
          ) -
          calculateDaysRemaining(
            b.targetDate
          )
      )[0];

    }, [goals]);


  /* =====================================================
     TODAY'S SCHEDULE
  ===================================================== */

  const todaysSchedule =
    useMemo(
      () =>
        timetable
          .filter(
            (entry) =>
              entry.day === today
          )
          .sort(
            (a, b) =>
              (
                a.startTime || ""
              ).localeCompare(
                b.startTime || ""
              )
          ),
      [
        timetable,
        today,
      ]
    );


  /* =====================================================
     QUICK TASKS
  ===================================================== */

  const pendingTasks =
    useMemo(() => {

      const priorityOrder = {
        High: 0,
        Medium: 1,
        Low: 2,
      };

      return quickTasks
        .filter(
          (task) =>
            task.status !==
            "completed"
        )
        .sort(
          (a, b) =>
            (
              priorityOrder[
                a.priority
              ] ?? 3
            ) -
            (
              priorityOrder[
                b.priority
              ] ?? 3
            )
        )
        .slice(0, 4);

    }, [quickTasks]);


  /* =====================================================
     UPCOMING ASSESSMENTS
  ===================================================== */

  const upcomingAssessments =
    useMemo(
      () =>
        assessments
          .filter(
            (assessment) =>
              assessment.status ===
              "upcoming"
          )
          .sort(
            (a, b) =>
              (
                a.date || ""
              ).localeCompare(
                b.date || ""
              )
          )
          .slice(0, 3),
      [assessments]
    );


  /* =====================================================
     TODAY'S ACTIVITIES
  ===================================================== */

  const todaysActivities =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            activity.date === today
        ),
      [
        activities,
        today,
      ]
    );


  const activityMinutesToday =
    sumBy(
      todaysActivities,
      "duration"
    );


  /* =====================================================
     WEEKLY ANALYTICS
  ===================================================== */

  const weeklyChart =
    useMemo(() => {

      const keys =
        getLastNLocalDateKeys(
          7
        );

      return keys.map(
        (key) => ({
          day:
            getWeekdayLabel(
              key
            ),

          screenTimeHrs:
            Math.round(
              (
                sumBy(
                  screenTime.filter(
                    (record) =>
                      record.date ===
                      key
                  ),
                  "minutes"
                ) / 60
              ) * 10
            ) / 10,

          activityHrs:
            Math.round(
              (
                sumBy(
                  activities.filter(
                    (activity) =>
                      activity.date ===
                      key
                  ),
                  "duration"
                ) / 60
              ) * 10
            ) / 10,
        })
      );

    }, [
      screenTime,
      activities,
    ]);


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="home-page">
        <p className="loading-text">
          Loading dashboard...
        </p>
      </div>
    );
  }


  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="home-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="home-header">

        <div>

          <p className="home-greeting">
            {greeting} 👋
          </p>

          <h1>
            Welcome back
            {profile?.name
              ? `, ${profile.name}`
              : ""}
            !
          </h1>

          <p className="home-subtitle">
            Here's your personal
            progress overview.
          </p>

        </div>


        <Link
          to="/profile"
          className="profile-box"
        >

          <div className="profile-icon">

            {profile?.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                className="profile-photo-thumb"
              />
            ) : (
              <UserCircle
                size={42}
              />
            )}

          </div>

          <div>

            <strong>
              {profile?.name ||
                "My Profile"}
            </strong>

            <span>
              {profile?.role ||
                "Add your details"}
            </span>

          </div>

        </Link>

      </header>


      {/* =================================================
          DATE & TIME
      ================================================= */}

      <section className="datetime-card">

        <div>
          <CalendarDays
            size={22}
          />

          <span>
            {date}
          </span>
        </div>


        <div>
          <Clock3
            size={22}
          />

          <span>
            {time}
          </span>
        </div>

      </section>


      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <section className="home-grid">

        {/* Learning */}

        <div className="home-card">

          <div className="card-icon">
            <BookOpen
              size={22}
            />
          </div>

          <p>
            Learning Progress
          </p>

          <h2>
            {learningStats.progress}%
          </h2>

          <span>
            {learningStats.completed} of{" "}
            {learningStats.total} active topics
          </span>

        </div>


        {/* Study Time */}

        <div className="home-card">

          <div className="card-icon">
            <Clock3
              size={22}
            />
          </div>

          <p>
            Study Time
          </p>

          <h2>
            {formatMinutes(
              studyMinutesToday
            )}
          </h2>

          <span>
            Today
          </span>

        </div>


        {/* Screen Time */}

        <div className="home-card">

          <div className="card-icon">
            <Smartphone
              size={22}
            />
          </div>

          <p>
            Screen Time
          </p>

          <h2>
            {formatMinutes(
              screenTimeMinutesToday
            )}
          </h2>

          <span>
            Today
          </span>

        </div>


        {/* Streak */}

        <div className="home-card">

          <div className="card-icon">
            <Flame
              size={22}
            />
          </div>

          <p>
            Learning Streak
          </p>

          <h2>
            {streak.current} days
          </h2>

          <span>
            Best: {streak.best} days
          </span>

        </div>

      </section>


      {/* =================================================
          WATER + GOAL
      ================================================= */}

      <section className="two-column">

        {/* WATER */}

        <div className="section-card">

          <div className="section-title">

            <Droplets
              size={22}
            />

            <h2>
              Water
            </h2>

          </div>


          <h3>
            {formatLitres(
              Math.max(
                0,
                consumedToday
              )
            )}{" "}
            /{" "}
            {formatLitres(
              waterTarget
            )}
          </h3>


          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width:
                  `${waterPercent}%`,
              }}
            />

          </div>


          <p>
            {waterPercent}% of today's target
          </p>


          <Link
            to="/water"
            className="view-button"
          >
            Open water tracker →
          </Link>

        </div>


        {/* CURRENT GOAL */}

        <div className="section-card">

          <div className="section-title">

            <Target
              size={22}
            />

            <h2>
              Current Goal
            </h2>

          </div>


          {currentGoal ? (
            <>
              <h3>
                {currentGoal.title}
              </h3>

              <p>
                {formatDaysRemaining(
                  calculateDaysRemaining(
                    currentGoal.targetDate
                  )
                )}
              </p>

              <div className="progress-bar">

                <div
                  className="progress-fill"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            currentGoal.progress
                          ) || 0
                        )
                      )}%`,
                  }}
                />

              </div>

              <p>
                {Number(
                  currentGoal.progress
                ) || 0}% completed
              </p>
            </>
          ) : (
            <p className="empty-topics">
              No active goals yet.
            </p>
          )}


          <Link
            to="/goals"
            className="view-button"
          >
            View all goals →
          </Link>

        </div>

      </section>


      {/* =================================================
          QUICK TASKS + ASSESSMENTS
      ================================================= */}

      <section className="two-column">

        {/* QUICK TASKS */}

        <div className="section-card">

          <div className="section-title">

            <CheckSquare
              size={22}
            />

            <h2>
              Quick Tasks
            </h2>

          </div>


          {pendingTasks.length === 0 && (
            <p className="empty-topics">
              Nothing pending. Nice work!
            </p>
          )}


          {pendingTasks.map(
            (task) => (
              <div
                className="task-item"
                key={task.id}
              >

                <span>
                  ☐ {task.task}
                </span>

              </div>
            )
          )}


          <Link
            to="/quick-tasks"
            className="view-button"
          >
            View all tasks →
          </Link>

        </div>


        {/* ASSESSMENTS */}

        <div className="section-card">

          <div className="section-title">

            <ClipboardCheck
              size={22}
            />

            <h2>
              Upcoming Assessments
            </h2>

          </div>


          {upcomingAssessments.length ===
            0 && (
            <p className="empty-topics">
              Nothing scheduled right now.
            </p>
          )}


          {upcomingAssessments.map(
            (assessment) => (
              <div
                className="assessment-item"
                key={assessment.id}
              >

                <strong>
                  {assessment.title}
                </strong>

                <span>

                  {new Date(
                    `${assessment.date}T00:00:00`
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )}

                  {" • "}

                  {formatDaysRemaining(
                    calculateDaysRemaining(
                      assessment.date
                    )
                  )}

                </span>

              </div>
            )
          )}


          <Link
            to="/assessments"
            className="view-button"
          >
            View all assessments →
          </Link>

        </div>

      </section>


      {/* =================================================
          TODAY'S SCHEDULE + ACTIVITIES
      ================================================= */}

      <section className="two-column">

        {/* SCHEDULE */}

        <div className="section-card">

          <div className="section-title">

            <CalendarDays
              size={22}
            />

            <h2>
              Today's Schedule
            </h2>

          </div>


          {todaysSchedule.length ===
            0 && (
            <p className="empty-topics">
              No timetable entries for today.
            </p>
          )}


          {todaysSchedule
            .slice(0, 4)
            .map(
              (entry) => (
                <div
                  className="task-item"
                  key={entry.id}
                >

                  <span>
                    {entry.startTime}–
                    {entry.endTime}
                    {" • "}
                    {entry.activity}
                  </span>

                </div>
              )
            )}


          <Link
            to="/timetable"
            className="view-button"
          >
            Open timetable →
          </Link>

        </div>


        {/* ACTIVITY */}

        <div className="section-card">

          <div className="section-title">

            <ActivityIcon
              size={22}
            />

            <h2>
              Activity Summary
            </h2>

          </div>


          <h3>
            {formatMinutes(
              activityMinutesToday
            )}
          </h3>


          <p>
            {todaysActivities.length}{" "}
            activit
            {todaysActivities.length === 1
              ? "y"
              : "ies"}{" "}
            logged today
          </p>


          <Link
            to="/activities"
            className="view-button"
          >
            Open activities →
          </Link>

        </div>

      </section>


      {/* =================================================
          WEEKLY ANALYTICS
      ================================================= */}

      <section className="section-card">

        <div className="section-title">

          <BarChart3
            size={22}
          />

          <h2>
            Weekly Analytics
          </h2>

        </div>


        <div
          style={{
            width: "100%",
            height: 240,
          }}
        >

          <ResponsiveContainer>

            <LineChart
              data={weeklyChart}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="day"
              />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="screenTimeHrs"
                name="Screen time (h)"
                stroke="#2563eb"
              />

              <Line
                type="monotone"
                dataKey="activityHrs"
                name="Activity (h)"
                stroke="#16a34a"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </section>

    </div>
  );
}

export default Home;