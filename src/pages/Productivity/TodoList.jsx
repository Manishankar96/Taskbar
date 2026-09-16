import { useEffect, useMemo, useState } from "react";
import {
  ListTodo,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Circle,
  CalendarDays,
  BookOpen,
  Target,
  ClipboardCheck,
  Clock3,
} from "lucide-react";

import {
  getTodoList,
  saveTodoList,
  getTopics,
  saveTopics,
  getGoals,
  saveGoals,
  getTimetable,
  saveTimetable,
  getAssessments,
  saveAssessments,
  getQuickTasks,
  saveQuickTasks,
} from "../../utils/db";

import {
  getItemsFromFirestore,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToFirestoreCollection,
} from "../../firebase/firestore";

import { getTodayLocalDateKey } from "../../utils/calculations";

const emptyForm = {
  title: "",
  date: getTodayLocalDateKey(),
};

const INTERVIEWS_STORAGE_KEY = "taskbar-interviews";
const INTERVIEWS_UPDATED_EVENT = "taskbarInterviewsUpdated";

const JOB_PREPARATION_STORAGE_KEY = "taskbar-job-preparation";
const JOB_PREPARATION_UPDATED_EVENT = "taskbarJobPreparationUpdated";

const APPLICATIONS_STORAGE_KEY = "taskbar-job-applications";
const APPLICATIONS_UPDATED_EVENT = "taskbarApplicationsUpdated";

const SAVED_JOBS_STORAGE_KEY = "taskbar-saved-jobs";
const SAVED_JOBS_UPDATED_EVENT = "taskbarSavedJobsUpdated";

function getInterviewsFromLocalStorage() {
  try {
    const saved = localStorage.getItem(INTERVIEWS_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load interviews for To-Do:", error);
    return [];
  }
}

function getJobPreparationFromLocalStorage() {
  try {
    const saved = localStorage.getItem(
      JOB_PREPARATION_STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  } catch (error) {
    console.error(
      "Failed to load Job Preparation tasks for To-Do:",
      error
    );
    return [];
  }
}

function formatDate(date) {
  if (!date) return "No date";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateStatus(date, today) {
  if (!date) return "no-date";
  if (date === today) return "today";
  if (date > today) return "upcoming";
  return "overdue";
}

function getCurrentWeekday() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[new Date().getDay()];
}


function getSavedJobsFromLocalStorage() {
  try {
    const saved = localStorage.getItem(
      SAVED_JOBS_STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      "Failed to load Saved Jobs for To-Do:",
      error
    );
    return [];
  }
}

function getApplicationsFromLocalStorage() {
  try {
    const saved = localStorage.getItem(
      APPLICATIONS_STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      "Failed to load applications for To-Do:",
      error
    );
    return [];
  }
}


function TodoList() {
  const [todos, setTodos] = useState([]);
  const [linkedTasks, setLinkedTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const today = getTodayLocalDateKey();

  /*
   * ============================================================
   * LOAD PERSONAL TO-DOS + LINKED SYSTEM TASKS
   * ============================================================
   */

  async function loadLinkedTasks() {
    try {
      const [
        topics,
        goals,
        timetable,
        assessments,
        quickTasks,
      ] = await Promise.all([
        getTopics(),
        getGoals(),
        getTimetable(),
        getAssessments(),
        getQuickTasks(),
      ]);

      const interviews = getInterviewsFromLocalStorage();
      const jobPreparationTasks =
        getJobPreparationFromLocalStorage();
      const applications =
        getApplicationsFromLocalStorage();

      const savedJobs =
        getSavedJobsFromLocalStorage();

      const unified = [];

      /*
       * --------------------------------------------------------
       * LEARNING
       * --------------------------------------------------------
       */

      (Array.isArray(topics) ? topics : []).forEach(
        (topic) => {
          if (!topic?.plannedDate) return;

          unified.push({
            id: `learning-${topic.id}`,
            source: "learning",
            sourceId: topic.id,
            title: topic.name || "Learning Topic",
            date: topic.plannedDate,
            completed: topic.status === "completed",
            type: "Learning",
            icon: "learning",
            skill: topic.skill || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * GOALS
       * --------------------------------------------------------
       */

      (Array.isArray(goals) ? goals : []).forEach(
        (goal) => {
          if (!goal?.targetDate) return;

          unified.push({
            id: `goal-${goal.id}`,
            source: "goals",
            sourceId: goal.id,
            title: goal.title || "Goal",
            date: goal.targetDate,
            completed: goal.status === "completed",
            type: "Goal",
            icon: "goal",
            skill: goal.skill || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * ASSESSMENTS
       * --------------------------------------------------------
       */

      (Array.isArray(assessments) ? assessments : []).forEach(
        (assessment) => {
          if (!assessment?.date) return;

          unified.push({
            id: `assessment-${assessment.id}`,
            source: "assessments",
            sourceId: assessment.id,
            title:
              assessment.title || "Assessment",
            date: assessment.date,
            completed:
              assessment.status === "completed",
            type: "Assessment",
            icon: "assessment",
            skill: assessment.type || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * QUICK TASKS
       * --------------------------------------------------------
       */

      (Array.isArray(quickTasks) ? quickTasks : []).forEach(
        (task) => {
          unified.push({
            id: `quick-${task.id}`,
            source: "quickTasks",
            sourceId: task.id,
            title: task.task || "Task",
            date: task.dueDate || "",
            completed:
              task.status === "completed",
            type: "Task",
            icon: "task",
            skill: task.priority
              ? `${task.priority} Priority`
              : "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * INTERVIEWS
       * --------------------------------------------------------
       * Interviews are scheduled career events.
       * Scheduled/active interviews become To-Do items.
       * Completed, Passed, Failed and Cancelled interviews are
       * shown as completed items so the record is not lost.
       * --------------------------------------------------------
       */

      (Array.isArray(interviews) ? interviews : []).forEach(
        (interview) => {
          if (!interview?.date) return;

          const completedStatuses = [
            "Completed",
            "Passed",
            "Failed",
            "Cancelled",
          ];

          unified.push({
            id: `interview-${interview.id}`,
            source: "interviews",
            sourceId: interview.id,
            title: `Interview – ${
              interview.company || "Company"
            } – ${
              interview.role || "Job Role"
            }`,
            date: interview.date,
            completed: completedStatuses.includes(
              interview.status
            ),
            type: "Interview",
            icon: "interview",
            skill: interview.round || "",
            startTime: interview.time || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * JOB PREPARATION
       * --------------------------------------------------------
       * Only preparation tasks with a due date are added to
       * the central To-Do list.
       * --------------------------------------------------------
       */

      (Array.isArray(jobPreparationTasks)
        ? jobPreparationTasks
        : []
      ).forEach((task) => {
        if (!task?.dueDate) return;

        unified.push({
          id: `job-preparation-${task.id}`,
          source: "jobPreparation",
          sourceId: task.id,
          title: task.title || "Job Preparation Task",
          date: task.dueDate,
          completed: task.completed === true,
          type: "Job Preparation",
          icon: "task",
          skill: "Career",
        });
      });

      /*
       * --------------------------------------------------------
       * JOB APPLICATION FOLLOW-UPS
       * --------------------------------------------------------
       * Applications remain records. Only an explicit
       * follow-up date becomes a To-Do task.
       * --------------------------------------------------------
       */

      (Array.isArray(applications) ? applications : []).forEach(
        (application) => {
          if (!application?.followUpDate) return;

          const closedStatus =
            application.status === "Rejected" ||
            application.status === "Withdrawn";

          unified.push({
            id: `application-follow-up-${application.id}`,
            source: "applications",
            sourceId: application.id,
            title: `Follow up: ${application.role || "Job Application"} – ${application.company || "Company"}`,
            date: application.followUpDate,
            completed:
              closedStatus ||
              application.status === "Selected" ||
              application.followUpCompleted === true,
            type: "Application Follow-up",
            icon: "task",
            skill: application.company || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * SAVED JOB ACTIONS
       * --------------------------------------------------------
       * Saved jobs remain bookmark/reference records.
       * Only a job with an explicit Action Date becomes a
       * central To-Do task.
       * --------------------------------------------------------
       */

      (Array.isArray(savedJobs) ? savedJobs : []).forEach(
        (job) => {
          if (!job?.actionDate || job.actionDate !== today) {
            return;
          }

          unified.push({
            id: `saved-job-action-${job.id}`,
            source: "savedJobs",
            sourceId: job.id,
            title: `Apply: ${job.role || "Job"} – ${job.company || "Company"}`,
            date: job.actionDate,
            completed: job.actionCompleted === true,
            type: "Saved Job Action",
            icon: "task",
            skill: job.company || "",
          });
        }
      );

      /*
       * --------------------------------------------------------
       * TODAY'S TIMETABLE
       *
       * Timetable is recurring by weekday.
       * Therefore only today's entries become today's tasks.
       * --------------------------------------------------------
       */

      const currentWeekday =
        getCurrentWeekday();

      (Array.isArray(timetable)
        ? timetable
        : []
      ).forEach((entry) => {
        if (
          entry?.day !== currentWeekday ||
          !entry?.activity
        ) {
          return;
        }

        if (
          entry.status === "completed" ||
          entry.status === "missed"
        ) {
          return;
        }

        unified.push({
          id: `timetable-${entry.id}-${today}`,
          source: "timetable",
          sourceId: entry.id,
          title: entry.activity,
          date: today,
          completed:
            entry.status === "completed",
          type: "Timetable",
          icon: "timetable",
          skill: entry.category || "",
          startTime: entry.startTime || "",
          endTime: entry.endTime || "",
        });
      });

      setLinkedTasks(unified);
    } catch (error) {
      console.error(
        "Failed to load linked tasks:",
        error
      );

      setLinkedTasks([]);
    }
  }

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function load() {
      try {
        /*
         * ======================================================
         * PERSONAL TO-DO LOAD
         * ======================================================
         */

        const localData =
          await getTodoList();

        const localTodos =
          Array.isArray(localData)
            ? localData
            : [];

        if (isMounted) {
          setTodos(
            localTodos.map((item) => ({
              ...item,
              id: String(item.id),
              date: item.date || "",
              completed:
                item.completed === true,
            }))
          );
        }

        /*
         * ======================================================
         * FIRESTORE
         * ======================================================
         */

        let cloudTodos = [];

        try {
          cloudTodos =
            await getItemsFromFirestore(
              "todoList"
            );

          if (!Array.isArray(cloudTodos)) {
            cloudTodos = [];
          }
        } catch (error) {
          console.error(
            "Failed to load todo list from Firestore:",
            error
          );
        }

        cloudTodos = cloudTodos.map(
          (item) => ({
            ...item,
            id: String(item.id),
            date: item.date || "",
            completed:
              item.completed === true,
          })
        );

        /*
         * ======================================================
         * MERGE
         * ======================================================
         */

        const mergedMap = new Map();

        localTodos.forEach((item) => {
          if (
            item?.id !== undefined &&
            item?.id !== null
          ) {
            mergedMap.set(
              String(item.id),
              {
                ...item,
                id: String(item.id),
                date: item.date || "",
                completed:
                  item.completed === true,
              }
            );
          }
        });

        cloudTodos.forEach((item) => {
          if (
            item?.id !== undefined &&
            item?.id !== null
          ) {
            mergedMap.set(
              String(item.id),
              item
            );
          }
        });

        const mergedTodos =
          Array.from(mergedMap.values());

        if (isMounted) {
          setTodos(mergedTodos);
        }

        await saveTodoList(
          mergedTodos
        );

        /*
         * ======================================================
         * UPLOAD LOCAL-ONLY TASKS
         * ======================================================
         */

        const cloudIds = new Set(
          cloudTodos.map((item) =>
            String(item.id)
          )
        );

        for (const item of localTodos) {
          if (
            item?.id === undefined ||
            item?.id === null
          ) {
            continue;
          }

          const itemId =
            String(item.id);

          if (!cloudIds.has(itemId)) {
            try {
              await saveItemToFirestore(
                "todoList",
                itemId,
                {
                  ...item,
                  id: itemId,
                }
              );
            } catch (error) {
              console.error(
                "Failed to upload todo task:",
                error
              );
            }
          }
        }

        /*
         * ======================================================
         * FIRESTORE REAL-TIME LISTENER
         * ======================================================
         */

        unsubscribe =
          subscribeToFirestoreCollection(
            "todoList",
            async (firestoreItems) => {
              if (!isMounted) {
                return;
              }

              const normalized =
                Array.isArray(
                  firestoreItems
                )
                  ? firestoreItems.map(
                      (item) => ({
                        ...item,
                        id: String(
                          item.id
                        ),
                        date:
                          item.date ||
                          "",
                        completed:
                          item.completed ===
                          true,
                      })
                    )
                  : [];

              setTodos(normalized);

              try {
                await saveTodoList(
                  normalized
                );
              } catch (error) {
                console.error(
                  "Failed to update IndexedDB:",
                  error
                );
              }
            }
          );

        /*
         * ======================================================
         * LOAD LINKED SYSTEMS
         * ======================================================
         */

        await loadLinkedTasks();
      } catch (error) {
        console.error(
          "Failed to load todo list:",
          error
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    /*
     * Refresh when returning to the page/app.
     */

    function refreshLinkedTasks() {
      loadLinkedTasks();
    }

    window.addEventListener(
      "focus",
      refreshLinkedTasks
    );

    document.addEventListener(
      "visibilitychange",
      refreshLinkedTasks
    );

    window.addEventListener(
      INTERVIEWS_UPDATED_EVENT,
      refreshLinkedTasks
    );

    window.addEventListener(
      JOB_PREPARATION_UPDATED_EVENT,
      refreshLinkedTasks
    );

    window.addEventListener(
      APPLICATIONS_UPDATED_EVENT,
      refreshLinkedTasks
    );

    window.addEventListener(
      SAVED_JOBS_UPDATED_EVENT,
      refreshLinkedTasks
    );

    return () => {
      isMounted = false;

      if (unsubscribe) {
        unsubscribe();
      }

      window.removeEventListener(
        "focus",
        refreshLinkedTasks
      );

      document.removeEventListener(
        "visibilitychange",
        refreshLinkedTasks
      );

      window.removeEventListener(
        INTERVIEWS_UPDATED_EVENT,
        refreshLinkedTasks
      );

      window.removeEventListener(
        JOB_PREPARATION_UPDATED_EVENT,
        refreshLinkedTasks
      );

      window.removeEventListener(
        APPLICATIONS_UPDATED_EVENT,
        refreshLinkedTasks
      );

      window.removeEventListener(
        SAVED_JOBS_UPDATED_EVENT,
        refreshLinkedTasks
      );
    };
  }, []);

  /*
   * ============================================================
   * PERSONAL TODO PERSIST
   * ============================================================
   */

  async function persist(
    updated,
    changedTodo = null
  ) {
    const normalized =
      updated.map((item) => ({
        ...item,
        id: String(item.id),
        date: item.date || "",
        completed:
          item.completed === true,
      }));

    setTodos(normalized);

    try {
      await saveTodoList(
        normalized
      );
    } catch (error) {
      console.error(
        "Failed to save todo list locally:",
        error
      );
    }

    if (changedTodo) {
      try {
        await saveItemToFirestore(
          "todoList",
          String(changedTodo.id),
          {
            ...changedTodo,
            id: String(
              changedTodo.id
            ),
          }
        );
      } catch (error) {
        console.error(
          "Failed to save todo task to Firestore:",
          error
        );
      }
    }
  }

  /*
   * ============================================================
   * ADD FORM
   * ============================================================
   */

  function openAddForm() {
    setEditingTodo(null);

    setForm({
      title: "",
      date: today,
    });

    setShowForm(true);
  }

  /*
   * ============================================================
   * EDIT PERSONAL TODO
   * ============================================================
   */

  function openEditForm(todo) {
    if (todo.source) {
      return;
    }

    setEditingTodo(todo);

    setForm({
      title: todo.title || "",
      date: todo.date || today,
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTodo(null);

    setForm({
      ...emptyForm,
      date: today,
    });
  }

  /*
   * ============================================================
   * ADD / EDIT PERSONAL TASK
   * ============================================================
   */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (editingTodo) {
      const updatedTodo = {
        ...editingTodo,
        id: String(
          editingTodo.id
        ),
        title:
          form.title.trim(),
        date: form.date || "",
        completed:
          editingTodo.completed ===
          true,
        completedAt:
          editingTodo.completedAt ||
          null,
      };

      const updated =
        todos.map((item) =>
          String(item.id) ===
          String(editingTodo.id)
            ? updatedTodo
            : item
        );

      await persist(
        updated,
        updatedTodo
      );
    } else {
      const newTodo = {
        id: String(Date.now()),
        title:
          form.title.trim(),
        date: form.date || "",
        completed: false,
        completedAt: null,
      };

      await persist(
        [...todos, newTodo],
        newTodo
      );
    }

    closeForm();
  }

  /*
   * ============================================================
   * TOGGLE PERSONAL TODO
   * ============================================================
   */

  async function togglePersonalTodo(todo) {
    const completed =
      todo.completed !== true;

    const updatedTodo = {
      ...todo,
      id: String(todo.id),
      completed,
      completedAt: completed
        ? new Date().toISOString()
        : null,
    };

    const updated =
      todos.map((item) =>
        String(item.id) ===
        String(todo.id)
          ? updatedTodo
          : item
      );

    await persist(
      updated,
      updatedTodo
    );
  }

  /*
   * ============================================================
   * TOGGLE LINKED TASK
   * ============================================================
   */

  async function toggleLinkedTask(task) {
    const completed =
      task.completed !== true;

    try {
      /*
       * LEARNING
       */

      if (
        task.source ===
        "learning"
      ) {
        const topics =
          await getTopics();

        const updated =
          topics.map((topic) =>
            String(topic.id) ===
            String(task.sourceId)
              ? {
                  ...topic,
                  status:
                    completed
                      ? "completed"
                      : "remaining",
                  completedAt:
                    completed
                      ? topic.completedAt ||
                        today
                      : topic.completedAt,
                }
              : topic
          );

        await saveTopics(
          updated
        );
      }

      /*
       * GOALS
       */

      else if (
        task.source ===
        "goals"
      ) {
        const goals =
          await getGoals();

        const updated =
          goals.map((goal) =>
            String(goal.id) ===
            String(task.sourceId)
              ? {
                  ...goal,
                  status:
                    completed
                      ? "completed"
                      : "pending",
                }
              : goal
          );

        await saveGoals(
          updated
        );
      }

      /*
       * ASSESSMENTS
       */

      else if (
        task.source ===
        "assessments"
      ) {
        const assessments =
          await getAssessments();

        const updated =
          assessments.map(
            (assessment) =>
              String(
                assessment.id
              ) ===
              String(
                task.sourceId
              )
                ? {
                    ...assessment,
                    status:
                      completed
                        ? "completed"
                        : "upcoming",
                  }
                : assessment
          );

        await saveAssessments(
          updated
        );
      }

      /*
       * QUICK TASKS
       */

      else if (
        task.source ===
        "quickTasks"
      ) {
        const quickTasks =
          await getQuickTasks();

        const updated =
          quickTasks.map(
            (item) =>
              String(item.id) ===
              String(
                task.sourceId
              )
                ? {
                    ...item,
                    status:
                      completed
                        ? "completed"
                        : "pending",
                  }
                : item
          );

        await saveQuickTasks(
          updated
        );
      }

      /*
       * INTERVIEWS
       */

      else if (
        task.source ===
        "interviews"
      ) {
        const interviews =
          getInterviewsFromLocalStorage();

        const updated =
          interviews.map(
            (interview) =>
              String(interview.id) ===
              String(task.sourceId)
                ? {
                    ...interview,
                    status:
                      completed
                        ? "Completed"
                        : "Scheduled",
                    updatedAt:
                      new Date().toISOString(),
                  }
                : interview
          );

        localStorage.setItem(
          INTERVIEWS_STORAGE_KEY,
          JSON.stringify(updated)
        );

        window.dispatchEvent(
          new Event(INTERVIEWS_UPDATED_EVENT)
        );
      }

      /*
       * JOB PREPARATION
       */

      else if (
        task.source ===
        "jobPreparation"
      ) {
        const saved =
          localStorage.getItem(
            JOB_PREPARATION_STORAGE_KEY
          );

        let jobPreparationData = null;

        try {
          jobPreparationData = saved
            ? JSON.parse(saved)
            : null;
        } catch (error) {
          console.error(
            "Failed to parse Job Preparation data:",
            error
          );
        }

        if (
          jobPreparationData &&
          Array.isArray(
            jobPreparationData.tasks
          )
        ) {
          const updatedTasks =
            jobPreparationData.tasks.map(
              (item) =>
                String(item.id) ===
                String(task.sourceId)
                  ? {
                      ...item,
                      completed,
                      updatedAt:
                        new Date().toISOString(),
                    }
                  : item
            );

          const updatedData = {
            ...jobPreparationData,
            tasks: updatedTasks,
          };

          localStorage.setItem(
            JOB_PREPARATION_STORAGE_KEY,
            JSON.stringify(updatedData)
          );

          window.dispatchEvent(
            new Event(
              JOB_PREPARATION_UPDATED_EVENT
            )
          );
        }
      }

      /*
       * APPLICATION FOLLOW-UP
       */

      else if (
        task.source ===
        "applications"
      ) {
        const applications =
          getApplicationsFromLocalStorage();

        const updated =
          applications.map(
            (application) =>
              String(application.id) ===
              String(task.sourceId)
                ? {
                    ...application,
                    followUpCompleted:
                      completed,
                    updatedAt:
                      new Date().toISOString(),
                  }
                : application
          );

        localStorage.setItem(
          APPLICATIONS_STORAGE_KEY,
          JSON.stringify(updated)
        );

        window.dispatchEvent(
          new Event(
            APPLICATIONS_UPDATED_EVENT
          )
        );
      }

      /*
       * SAVED JOB ACTION
       */

      else if (
        task.source ===
        "savedJobs"
      ) {
        const savedJobs =
          getSavedJobsFromLocalStorage();

        const updated =
          savedJobs.map(
            (job) =>
              String(job.id) ===
              String(task.sourceId)
                ? {
                    ...job,
                    actionCompleted:
                      completed,
                    updatedAt:
                      new Date().toISOString(),
                  }
                : job
          );

        localStorage.setItem(
          SAVED_JOBS_STORAGE_KEY,
          JSON.stringify(updated)
        );

        window.dispatchEvent(
          new Event(
            SAVED_JOBS_UPDATED_EVENT
          )
        );
      }

      /*
       * TIMETABLE
       */

      else if (
        task.source ===
        "timetable"
      ) {
        const timetable =
          await getTimetable();

        const updated =
          timetable.map(
            (entry) =>
              String(entry.id) ===
              String(
                task.sourceId
              )
                ? {
                    ...entry,
                    status:
                      completed
                        ? "completed"
                        : "planned",
                  }
                : entry
          );

        await saveTimetable(
          updated
        );
      }

      await loadLinkedTasks();
    } catch (error) {
      console.error(
        "Failed to update linked task:",
        error
      );
    }
  }

  /*
   * ============================================================
   * DELETE PERSONAL TODO
   * ============================================================
   */

  async function deleteTodo(todo) {
    if (todo.source) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${todo.title}"?`
      );

    if (!confirmed) {
      return;
    }

    const updated =
      todos.filter(
        (item) =>
          String(item.id) !==
          String(todo.id)
      );

    setTodos(updated);

    try {
      await saveTodoList(
        updated
      );
    } catch (error) {
      console.error(
        "Failed to delete todo locally:",
        error
      );
    }

    try {
      await deleteItemFromFirestore(
        "todoList",
        String(todo.id)
      );
    } catch (error) {
      console.error(
        "Failed to delete todo from Firestore:",
        error
      );
    }
  }

  /*
   * ============================================================
   * ALL UNIFIED TASKS
   * ============================================================
   */

  const allTasks = useMemo(() => {
    const personal =
      todos.map((todo) => ({
        ...todo,
        id: `personal-${todo.id}`,
        originalId: todo.id,
        source: null,
        type: "Task",
        icon: "task",
        date: todo.date || "",
      }));

    return [
      ...personal,
      ...linkedTasks,
    ];
  }, [todos, linkedTasks]);

  /*
   * ============================================================
   * GROUPS
   * ============================================================
   */

  const todayTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          !task.completed &&
          getDateStatus(
            task.date,
            today
          ) === "today"
      ),
    [allTasks, today]
  );

  const upcomingTasks = useMemo(
    () =>
      allTasks
        .filter(
          (task) =>
            !task.completed &&
            getDateStatus(
              task.date,
              today
            ) === "upcoming"
        )
        .sort((a, b) =>
          String(a.date || "").localeCompare(
            String(b.date || "")
          )
        ),
    [allTasks, today]
  );

  const overdueTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          !task.completed &&
          getDateStatus(
            task.date,
            today
          ) === "overdue"
      ),
    [allTasks, today]
  );

  const noDateTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          !task.completed &&
          getDateStatus(
            task.date,
            today
          ) === "no-date"
      ),
    [allTasks, today]
  );

  const completedTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          task.completed === true
      ),
    [allTasks]
  );

  /*
   * ============================================================
   * ICON
   * ============================================================
   */

  function TaskIcon({ task }) {
    if (task.icon === "learning") {
      return <BookOpen size={18} />;
    }

    if (task.icon === "goal") {
      return <Target size={18} />;
    }

    if (task.icon === "assessment") {
      return (
        <ClipboardCheck
          size={18}
        />
      );
    }

    if (task.icon === "timetable") {
      return (
        <Clock3 size={18} />
      );
    }

    if (task.icon === "interview") {
      return (
        <CalendarDays size={18} />
      );
    }

    return (
      <ListTodo size={18} />
    );
  }

  /*
   * ============================================================
   * TASK ROW
   * ============================================================
   */

  function TaskRow({ task }) {
    const isLinked =
      Boolean(task.source);

    return (
      <div
        className="topic-row"
        key={task.id}
      >
        <div className="topic-information">
          <strong
            style={
              task.completed
                ? {
                    textDecoration:
                      "line-through",
                  }
                : undefined
            }
          >
            {task.title}
          </strong>

          <span
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <TaskIcon
              task={task}
            />

            {task.type}

            {task.date &&
              ` • ${formatDate(
                task.date
              )}`}

            {task.startTime &&
              ` • ${task.startTime}`}

            {task.endTime &&
              ` - ${task.endTime}`}

            {task.skill &&
              ` • ${task.skill}`}
          </span>
        </div>

        <div className="topic-actions">
          <button
            type="button"
            className="edit-button"
            title={
              task.completed
                ? "Mark incomplete"
                : "Mark complete"
            }
            onClick={() =>
              isLinked
                ? toggleLinkedTask(
                    task
                  )
                : togglePersonalTodo(
                    {
                      ...task,
                      id:
                        task.originalId,
                    }
                  )
            }
          >
            {task.completed ? (
              <Circle size={18} />
            ) : (
              <CheckCircle2
                size={18}
              />
            )}
          </button>

          {!isLinked && (
            <>
              <button
                type="button"
                className="edit-button"
                title="Edit task"
                onClick={() =>
                  openEditForm({
                    ...task,
                    id:
                      task.originalId,
                  })
                }
              >
                <Pencil
                  size={17}
                />
              </button>

              <button
                type="button"
                className="delete-button"
                title="Delete task"
                onClick={() =>
                  deleteTodo({
                    ...task,
                    id:
                      task.originalId,
                  })
                }
              >
                <Trash2
                  size={17}
                />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="module-page">
        <h1>✅ To-Do</h1>

        <p>
          Loading to-do list...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="module-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>✅ To-Do</h1>

          <p>
            One place for your tasks,
            study plans, goals and
            scheduled work.
          </p>

          <p
            style={{
              fontSize: "13px",
              opacity: 0.7,
              marginTop: "4px",
            }}
          >
            Tasks are shown by their
            actual date.
          </p>
        </div>

        <button
          className="add-topic-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* STATS */}

      <section className="stat-grid">
        <div className="stat-card">
          <ListTodo size={25} />

          <span>
            Total
          </span>

          <strong>
            {allTasks.length}
          </strong>
        </div>

        <div className="stat-card">
          <CalendarDays
            size={25}
          />

          <span>
            Today
          </span>

          <strong>
            {todayTasks.length}
          </strong>
        </div>

        <div className="stat-card">
          <Clock3 size={25} />

          <span>
            Upcoming
          </span>

          <strong>
            {upcomingTasks.length}
          </strong>
        </div>

        <div className="stat-card">
          <CheckCircle2
            size={25}
          />

          <span>
            Completed
          </span>

          <strong>
            {completedTasks.length}
          </strong>
        </div>
      </section>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <section
          className="module-form-card"
          style={{
            marginTop: 20,
          }}
        >
          <div className="add-topic-header">
            <h2>
              {editingTodo
                ? "Edit Task"
                : "Add Task"}
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
                Task *
              </label>

              <input
                type="text"
                placeholder="Example: Clean study table"
                value={
                  form.title
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    title:
                      event.target
                        .value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Date
              </label>

              <input
                type="date"
                value={
                  form.date
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    date:
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
              {editingTodo
                ? "Save Changes"
                : "Add Task"}
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
              📅 Today
            </h2>

            <p>
              Tasks scheduled for
              today.
            </p>
          </div>
        </div>

        <div className="topic-list">
          {todayTasks.map(
            (task) => (
              <TaskRow
                key={task.id}
                task={task}
              />
            )
          )}

          {todayTasks.length ===
            0 && (
            <p className="empty-topics">
              Nothing scheduled
              for today.
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
              🔜 Upcoming
            </h2>

            <p>
              Future tasks stay here
              until their actual date.
            </p>
          </div>
        </div>

        <div className="topic-list">
          {upcomingTasks.map(
            (task) => (
              <TaskRow
                key={task.id}
                task={task}
              />
            )
          )}

          {upcomingTasks.length ===
            0 && (
            <p className="empty-topics">
              No upcoming tasks.
            </p>
          )}
        </div>
      </section>

      {/* OVERDUE */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="topic-header">
          <div>
            <h2>
              ⚠️ Overdue
            </h2>

            <p>
              Tasks whose date has
              already passed.
            </p>
          </div>
        </div>

        <div className="topic-list">
          {overdueTasks.map(
            (task) => (
              <TaskRow
                key={task.id}
                task={task}
              />
            )
          )}

          {overdueTasks.length ===
            0 && (
            <p className="empty-topics">
              No overdue tasks.
            </p>
          )}
        </div>
      </section>

      {/* NO DATE */}

      {noDateTasks.length >
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
                📝 No Date
              </h2>

              <p>
                Tasks without a
                scheduled date.
              </p>
            </div>
          </div>

          <div className="topic-list">
            {noDateTasks.map(
              (task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* COMPLETED */}

      <section
        className="learning-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="topic-header">
          <div>
            <h2>
              ✅ Completed
            </h2>

            <p>
              Finished tasks from all
              Taskbar systems.
            </p>
          </div>
        </div>

        <div className="topic-list">
          {completedTasks.map(
            (task) => (
              <TaskRow
                key={task.id}
                task={task}
              />
            )
          )}

          {completedTasks.length ===
            0 && (
            <p className="empty-topics">
              No completed tasks.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default TodoList;