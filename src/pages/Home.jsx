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
  Lightbulb,
  AlertCircle,
  CheckCircle2,
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
  getAssessments,
  getTimetable,
  getProfile,
  getStudySessions,
  saveStreak,
} from "../utils/db";

import {
  calculatePercentage,
  calculateWaterPercentage,
  calculateDaysRemaining,
  formatDaysRemaining,
  formatMinutes,
  formatLitres,
  getTodayLocalDateKey,
  getLastNLocalDateKeys,
  getWeekdayLabel,
  sumBy,
} from "../utils/calculations";


function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [loading, setLoading] = useState(true);

  const [topics, setTopics] = useState([]);
  const [goals, setGoals] = useState([]);
  const [water, setWater] = useState([]);
  const [screenTime, setScreenTime] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [profile, setProfile] = useState(null);


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
          studySessionsData,
          activitiesData,
          assessmentsData,
          timetableData,
          profileData,
        ] = await Promise.all([
          getTopics(),
          getGoals(),
          getWater(),
          getScreenTime(),
          getStudySessions(),
          getActivities(),
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

        setStudySessions(
          Array.isArray(studySessionsData)
            ? studySessionsData
            : []
        );

        setActivities(
          Array.isArray(activitiesData)
            ? activitiesData
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

  const today = getTodayLocalDateKey();


  /* =====================================================
     DATE
  ===================================================== */

  const date = currentTime.toLocaleDateString(
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

  const time = currentTime.toLocaleTimeString(
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
    const hour = currentTime.getHours();

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

  const learningStats = useMemo(() => {
    const activeTopics = topics.filter(
      (topic) =>
        topic.status !== "future"
    );

    const completed = activeTopics.filter(
      (topic) =>
        topic.status === "completed"
    ).length;

    const inProgress = activeTopics.filter(
      (topic) =>
        topic.status === "in-progress"
    ).length;

    const remaining = activeTopics.filter(
      (topic) =>
        topic.status === "remaining"
    ).length;

    const future = topics.filter(
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
  ===================================================== */

  const streak = useMemo(() => {
    const dateSet = new Set();

    const addDate = (value) => {
      if (!value) return;

      const raw = String(value);

      const match = raw.match(
        /^(\d{4}-\d{2}-\d{2})/
      );

      if (match) {
        dateSet.add(match[1]);
        return;
      }

      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(
          parsed.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
          parsed.getDate()
        ).padStart(2, "0");

        dateSet.add(
          `${year}-${month}-${day}`
        );
      }
    };


    // Learning
    topics.forEach((topic) => {
      if (topic.status === "completed") {
        addDate(
          topic.completedAt ||
          topic.date
        );
      }
    });


    // Water
    water.forEach((record) => {
      if (
        record &&
        (
          record.consumed !== undefined ||
          record.consumedMl !== undefined ||
          record.amountMl !== undefined ||
          record.amount !== undefined ||
          record.water !== undefined ||
          record.quantity !== undefined ||
          record.ml !== undefined
        )
      ) {
        addDate(
          record.date ||
          record.id
        );
      }
    });


    // Activities
    activities.forEach((activity) => {
      addDate(
        activity.date ||
        activity.createdAt ||
        activity.completedAt
      );
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


    // Study sessions
    studySessions.forEach((session) => {
      const minutes =
        Number(
          session.duration ??
          session.minutes ??
          session.time ??
          0
        );

      if (minutes > 0) {
        addDate(
          session.date ||
          session.createdAt
        );
      }
    });


    const dates =
      Array.from(dateSet).sort();


    if (dates.length === 0) {
      return {
        current: 0,
        best: 0,
      };
    }


    const toDate = (key) => {
      const [
        year,
        month,
        day,
      ] = key
        .split("-")
        .map(Number);

      return new Date(
        year,
        month - 1,
        day
      );
    };


    const dayDiff = (a, b) => {
      const ms =
        toDate(b).getTime() -
        toDate(a).getTime();

      return Math.round(
        ms / 86400000
      );
    };


    let best = 1;
    let run = 1;


    for (
      let i = 1;
      i < dates.length;
      i += 1
    ) {
      if (
        dayDiff(
          dates[i - 1],
          dates[i]
        ) === 1
      ) {
        run += 1;
        best = Math.max(
          best,
          run
        );
      } else {
        run = 1;
      }
    }


    // Current streak is calendar-aware and fully automatic.
    // A day counts only when there is real dashboard activity.
    // There is no maximum streak length.
    //
    // Example:
    // Day 1 -> activity = streak 1
    // Day 2 -> activity = streak 2
    // Day 3 -> no activity yet = still shows 2
    // Day 3 -> activity = streak 3
    // Day 4 -> no activity while Day 3 was active = still 3
    // If an entire day is missed, the next active day starts at 1.
    let current = 0;

    const todayDate = toDate(today);
    const yesterdayDate = new Date(todayDate);

    yesterdayDate.setDate(
      yesterdayDate.getDate() - 1
    );

    const getDateKey = (dateValue) =>
      `${dateValue.getFullYear()}-${String(
        dateValue.getMonth() + 1
      ).padStart(2, "0")}-${String(
        dateValue.getDate()
      ).padStart(2, "0")}`;

    const yesterdayKey = getDateKey(
      yesterdayDate
    );

    // When today already has activity, count completed
    // consecutive days including today.
    if (dateSet.has(today)) {
      let cursorDate = toDate(today);

      while (
        dateSet.has(
          getDateKey(cursorDate)
        )
      ) {
        current += 1;

        cursorDate.setDate(
          cursorDate.getDate() - 1
        );
      }
    }

    // Today is NOT counted until there is actual activity.
    // If today has no activity yet, keep yesterday's consecutive
    // streak alive temporarily. If yesterday was already missed,
    // the streak is broken and current becomes 0.
    else if (
      dateSet.has(yesterdayKey)
    ) {
      let cursorDate =
        toDate(yesterdayKey);

      while (
        dateSet.has(
          getDateKey(cursorDate)
        )
      ) {
        current += 1;

        cursorDate.setDate(
          cursorDate.getDate() - 1
        );
      }
    }

    best = Math.max(
      best,
      current
    );

    return {
      current,
      best,
    };
  }, [
    topics,
    water,
    activities,
    assessments,
    screenTime,
    studySessions,
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

     IMPORTANT:
     Study Time comes ONLY from Study Sessions.

     Screen Time is completely separate.

     Learning/Coding screen-time records
     are NOT counted here.
  ===================================================== */

  const studyMinutesToday = useMemo(() => {
    const todaySessions =
      studySessions.filter(
        (session) =>
          session?.date === today
      );

    return todaySessions.reduce(
      (total, session) => {
        const minutes =
          Number(
            session?.duration ??
            session?.minutes ??
            session?.time ??
            0
          );

        return (
          total +
          (
            Number.isFinite(minutes)
              ? Math.max(
                  0,
                  minutes
                )
              : 0
          )
        );
      },
      0
    );
  }, [
    studySessions,
    today,
  ]);


  /* =====================================================
     SCREEN TIME TODAY

     Screen Time includes ALL screen-time categories.
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

      if (todayWaterRecord) {
        const consumed =
          Number(
            todayWaterRecord.consumed ??
            todayWaterRecord.consumedMl
          );

        return Number.isFinite(
          consumed
        )
          ? Math.max(
              0,
              consumed
            )
          : 0;
      }


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
    useMemo(() => {
      const dayIndex =
        currentTime.getDay();

      const todayDayName =
        [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][dayIndex];

      return timetable
        .filter(
          (entry) =>
            entry.day ===
            todayDayName
        )
        .sort(
          (a, b) =>
            (
              a.startTime || ""
            ).localeCompare(
              b.startTime || ""
            )
        );
    }, [
      timetable,
      currentTime,
    ]);


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
        getLastNLocalDateKeys(7);

      return keys.map(
        (key) => {

          const dayStudySessions =
            studySessions.filter(
              (session) =>
                session?.date === key
            );

          const studyMinutes =
            dayStudySessions.reduce(
              (total, session) => {

                const minutes =
                  Number(
                    session?.duration ??
                    session?.minutes ??
                    session?.time ??
                    0
                  );

                return (
                  total +
                  (
                    Number.isFinite(
                      minutes
                    )
                      ? Math.max(
                          0,
                          minutes
                        )
                      : 0
                  )
                );
              },
              0
            );


          return {
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

            studyTimeHrs:
              Math.round(
                (
                  studyMinutes / 60
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
          };
        }
      );

    }, [
      screenTime,
      studySessions,
      activities,
    ]);


  /* =====================================================
     SMART SUGGESTIONS
  ===================================================== */

  const [centralTasks, setCentralTasks] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadCentralTasksForHome() {
      try {
        const [
          topicsData,
          goalsData,
          assessmentsData,
          timetableData,
        ] = await Promise.all([
          getTopics(),
          getGoals(),
          getAssessments(),
          getTimetable(),
        ]);

        const todayKey = getTodayLocalDateKey();

        const readLocalList = (key) => {
          try {
            const value = JSON.parse(
              localStorage.getItem(key) || "[]"
            );
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        };

        const tasks = [];

        /*
         * Learning
         * Same rule as Central To-Do:
         * only topics with plannedDate become tasks.
         */
        (Array.isArray(topicsData) ? topicsData : []).forEach(
          (topic) => {
            if (!topic?.plannedDate) return;

            tasks.push({
              id: `learning-${topic.id}`,
              title: topic.name || "Learning Topic",
              date: topic.plannedDate,
              completed: topic.status === "completed",
              source: "Learning",
            });
          }
        );

        /*
         * Goals
         * Same rule as Central To-Do:
         * only goals with targetDate become tasks.
         */
        (Array.isArray(goalsData) ? goalsData : []).forEach(
          (goal) => {
            if (!goal?.targetDate) return;

            tasks.push({
              id: `goal-${goal.id}`,
              title: goal.title || goal.name || "Goal",
              date: goal.targetDate,
              completed: goal.status === "completed",
              source: "Goals",
            });
          }
        );

        /*
         * Assessments
         * Same date/status model as Central To-Do.
         */
        (Array.isArray(assessmentsData)
          ? assessmentsData
          : []
        ).forEach((assessment) => {
          if (!assessment?.date) return;

          tasks.push({
            id: `assessment-${assessment.id}`,
            title: `Assessment: ${
              assessment.title || "Assessment"
            }`,
            date: assessment.date,
            completed:
              assessment.status === "completed" ||
              assessment.status === "complete",
            source: "Assessments",
          });
        });

        /*
         * Timetable
         * Only today's timetable entries are shown as today's
         * scheduled tasks.
         */
        const weekdayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        const todayWeekday =
          weekdayNames[new Date().getDay()];

        (Array.isArray(timetableData)
          ? timetableData
          : []
        )
          .filter(
            (entry) => entry?.day === todayWeekday
          )
          .forEach((entry) => {
            tasks.push({
              id: `timetable-${entry.id}`,
              title:
                entry.activity ||
                entry.title ||
                "Scheduled activity",
              date: todayKey,
              completed: false,
              source: "Timetable",
            });
          });

        /*
         * Personal To-Do
         */
        readLocalList("taskbar-todo-list").forEach(
          (task) => {
            const date =
              task.date ||
              task.dueDate ||
              "";

            tasks.push({
              id: `todo-${task.id}`,
              title:
                task.title ||
                task.task ||
                "Task",
              date,
              completed:
                task.completed === true ||
                task.status === "completed" ||
                task.status === "complete",
              source: "To-Do",
            });
          }
        );

        /*
         * Job Preparation
         */
        readLocalList(
          "taskbar-job-preparation"
        ).forEach((task) => {
          if (!task?.dueDate) return;

          tasks.push({
            id: `job-preparation-${task.id}`,
            title:
              task.title ||
              "Job Preparation Task",
            date: task.dueDate,
            completed:
              task.completed === true,
            source: "Job Preparation",
          });
        });

        /*
         * Applications
         */
        readLocalList(
          "taskbar-job-applications"
        ).forEach((application) => {
          if (!application?.followUpDate) return;

          const closed =
            application.status === "Rejected" ||
            application.status === "Withdrawn" ||
            application.status === "Selected";

          tasks.push({
            id: `application-follow-up-${application.id}`,
            title: `Follow up: ${
              application.role ||
              "Job Application"
            } – ${
              application.company ||
              "Company"
            }`,
            date: application.followUpDate,
            completed:
              closed ||
              application.followUpCompleted === true,
            source: "Applications",
          });
        });

        /*
         * Saved Jobs
         * Same special Central To-Do rule:
         * only Action Date = TODAY becomes a task.
         */
        readLocalList(
          "taskbar-saved-jobs"
        ).forEach((job) => {
          if (job?.actionDate !== todayKey) return;

          tasks.push({
            id: `saved-job-action-${job.id}`,
            title: `Apply: ${
              job.role || "Job"
            } – ${
              job.company || "Company"
            }`,
            date: job.actionDate,
            completed:
              job.actionCompleted === true,
            source: "Saved Jobs",
          });
        });

        /*
         * Interviews
         */
        readLocalList(
          "taskbar-interviews"
        ).forEach((interview) => {
          if (!interview?.date) return;

          const completedStatuses = [
            "Completed",
            "Passed",
            "Failed",
            "Cancelled",
          ];

          tasks.push({
            id: `interview-${interview.id}`,
            title: `Interview – ${
              interview.company ||
              "Company"
            } – ${
              interview.role ||
              "Job Role"
            }`,
            date: interview.date,
            completed:
              completedStatuses.includes(
                interview.status
              ),
            source: "Interviews",
          });
        });

        /*
         * Remove duplicate IDs.
         */
        const uniqueTasks = Array.from(
          new Map(
            tasks.map((task) => [
              task.id,
              task,
            ])
          ).values()
        );

        if (active) {
          setCentralTasks(uniqueTasks);
        }
      } catch (error) {
        console.error(
          "Failed to load Smart Suggestions:",
          error
        );

        if (active) {
          setCentralTasks([]);
        }
      }
    }

    loadCentralTasksForHome();

    const refresh = () =>
      loadCentralTasksForHome();

    const events = [
      "taskbarTodoUpdated",
      "taskbarJobPreparationUpdated",
      "taskbarApplicationsUpdated",
      "taskbarSavedJobsUpdated",
      "taskbarInterviewsUpdated",
      "taskbarTopicsUpdated",
      "taskbarGoalsUpdated",
      "taskbarAssessmentsUpdated",
      "taskbarTimetableUpdated",
      "storage",
    ];

    events.forEach((eventName) =>
      window.addEventListener(
        eventName,
        refresh
      )
    );

    return () => {
      active = false;

      events.forEach((eventName) =>
        window.removeEventListener(
          eventName,
          refresh
        )
      );
    };
  }, []);

  const smartSuggestions = useMemo(() => {
    const overdue = centralTasks
      .filter(
        (task) =>
          task.date &&
          task.date < today &&
          !task.completed
      )
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );

    const todayPending = centralTasks.filter(
      (task) =>
        task.date === today &&
        !task.completed
    );

    const todayCompleted =
      centralTasks.filter(
        (task) =>
          task.date === today &&
          task.completed
      );

    const suggestions = [];

    if (overdue.length > 0) {
      suggestions.push({
        type: "overdue",
        icon: <AlertCircle size={19} />,
        title: `${overdue.length} overdue task${
          overdue.length === 1
            ? ""
            : "s"
        } need attention`,
        detail:
          overdue.length === 1
            ? overdue[0].title
            : overdue
                .slice(0, 3)
                .map(
                  (task) =>
                    task.title
                )
                .join(" • "),
      });
    }

    if (todayPending.length > 0) {
      suggestions.push({
        type: "today",
        icon: <CheckSquare size={19} />,
        title: `${todayPending.length} task${
          todayPending.length === 1
            ? ""
            : "s"
        } pending today`,
        detail: todayPending
          .slice(0, 5)
          .map(
            (task) =>
              task.title
          )
          .join(" • "),
      });
    }

    if (todayCompleted.length > 0) {
      suggestions.push({
        type: "completed",
        icon: <CheckCircle2 size={19} />,
        title: `${todayCompleted.length} task${
          todayCompleted.length === 1
            ? ""
            : "s"
        } completed today`,
        detail:
          "Completed tasks are counted automatically.",
      });
    }

    if (
      todayPending.length === 0 &&
      overdue.length === 0
    ) {
      suggestions.push({
        type: "clear",
        icon: <Lightbulb size={19} />,
        title:
          "No pending Central To-Do tasks right now",
        detail:
          "Your scheduled tasks are clear.",
      });
    }

    return {
      overdue,
      todayPending,
      todayCompleted,
      suggestions:
        suggestions.slice(0, 4),
    };
  }, [centralTasks, today]);

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
          SMART SUGGESTIONS
      ================================================= */}

      <section
        className="section-card smart-suggestions-card"
        style={{
          padding: "24px",
          marginBottom: "24px",
          overflow: "hidden",
        }}
      >
        <div
          className="section-title"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <Lightbulb size={22} />
          <h2 style={{ margin: 0 }}>Smart Suggestions</h2>
        </div>

        <p
          className="home-subtitle"
          style={{
            margin: "0 0 18px",
            lineHeight: 1.5,
          }}
        >
          Based on your Central To-Do list for today.
        </p>

        <div
          className="smart-suggestions-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {smartSuggestions.suggestions.map((suggestion, index) => (
            <div
              className={`smart-suggestion-item smart-suggestion-${suggestion.type}`}
              key={`${suggestion.type}-${index}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                minWidth: 0,
              }}
            >
              <div
                className="smart-suggestion-icon"
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "rgba(255, 0, 0, 0.12)",
                }}
              >
                {suggestion.icon}
              </div>

              <div
                className="smart-suggestion-content"
                style={{
                  minWidth: 0,
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  lineHeight: 1.45,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    margin: 0,
                    lineHeight: 1.35,
                  }}
                >
                  {suggestion.title}
                </strong>

                <span
                  style={{
                    display: "block",
                    margin: 0,
                    lineHeight: 1.45,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {suggestion.detail}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="smart-todo-summary"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px 20px",
            marginTop: "18px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            Today: <strong>{smartSuggestions.todayPending.length}</strong>{" "}
            pending
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <strong>{smartSuggestions.todayCompleted.length}</strong>{" "}
            completed
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <strong>{smartSuggestions.overdue.length}</strong> overdue
          </span>

          <Link
            to="/todo-list"
            className="view-button"
            style={{
              marginLeft: "auto",
              whiteSpace: "nowrap",
            }}
          >
            Open Central To-Do →
          </Link>
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
            From Study Sessions
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
            All screen activity today
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
                dataKey="studyTimeHrs"
                name="Study time (h)"
                stroke="#9333ea"
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