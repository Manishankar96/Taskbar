import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Edit3,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from "lucide-react";

import {
  getJobPreparation,
  saveJobPreparation,
} from "../../utils/db";

const DEFAULT_DATA = {
  careerGoal: "Get a Java Full Stack Developer job",
  targetRole: "Java Full Stack Developer",
  targetDate: "",
  skills: [
    { id: 1, name: "Core Java", completed: true },
    { id: 2, name: "SQL / MySQL", completed: true },
    { id: 3, name: "HTML & CSS", completed: true },
    { id: 4, name: "JavaScript", completed: true },
    { id: 5, name: "Spring Framework", completed: false },
    { id: 6, name: "Spring Boot", completed: false },
    { id: 7, name: "REST API", completed: false },
    { id: 8, name: "Hibernate / JPA", completed: false },
    { id: 9, name: "Spring Security / JWT", completed: false },
    { id: 10, name: "React", completed: false },
    { id: 11, name: "DSA", completed: false },
    { id: 12, name: "Git & GitHub", completed: true },
  ],
  tasks: [],
  notes: "",
};

const JOB_PREPARATION_UPDATED_EVENT =
  "taskbarJobPreparationUpdated";

function normalizeData(saved) {
  if (!saved) {
    return DEFAULT_DATA;
  }

  /*
   * Job Preparation is stored as one Firestore item.
   *
   * getJobPreparation() may return:
   * 1. The complete object directly, or
   * 2. An array containing the complete object.
   *
   * Support both forms so existing Firebase data is not lost.
   */
  let parsed = saved;

  if (Array.isArray(saved)) {
    if (saved.length === 0) {
      return DEFAULT_DATA;
    }

    parsed = saved[0];
  }

  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_DATA;
  }

  return {
    ...DEFAULT_DATA,
    ...parsed,
    skills: Array.isArray(parsed.skills)
      ? parsed.skills
      : DEFAULT_DATA.skills,
    tasks: Array.isArray(parsed.tasks)
      ? parsed.tasks
      : DEFAULT_DATA.tasks,
    notes:
      typeof parsed.notes === "string"
        ? parsed.notes
        : DEFAULT_DATA.notes,
  };
}

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export default function JobPreparation() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingGoal, setEditingGoal] = useState(false);

  const [goalForm, setGoalForm] = useState({
    careerGoal: "",
    targetRole: "",
    targetDate: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  /*
   * ============================================================
   * LOAD FROM FIREBASE
   * ============================================================
   */
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const saved = await getJobPreparation();

        if (!mounted) {
          return;
        }

        setData(normalizeData(saved));
      } catch (error) {
        console.error(
          "Failed to load Job Preparation data:",
          error
        );

        if (mounted) {
          setData(DEFAULT_DATA);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * SAVE TO FIREBASE
   * ============================================================
   */
  async function persist(updatedData) {
    const normalized = normalizeData(updatedData);

    setData(normalized);
    setSaving(true);

    try {
      /*
       * saveJobPreparation expects an array in the existing
       * data layer.
       *
       * Keep one Job Preparation document/item.
       */
      await saveJobPreparation([
        {
          id: "job-preparation",
          ...normalized,
        },
      ]);

      window.dispatchEvent(
        new CustomEvent(JOB_PREPARATION_UPDATED_EVENT)
      );
    } catch (error) {
      console.error(
        "Failed to save Job Preparation data:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * PROGRESS
   * ============================================================
   */
  const completedSkills = useMemo(
    () =>
      data.skills.filter(
        (skill) => skill.completed
      ).length,
    [data.skills]
  );

  const skillProgress =
    data.skills.length > 0
      ? Math.round(
          (completedSkills / data.skills.length) * 100
        )
      : 0;

  const completedTasks = useMemo(
    () =>
      data.tasks.filter(
        (task) => task.completed
      ).length,
    [data.tasks]
  );

  const taskProgress =
    data.tasks.length > 0
      ? Math.round(
          (completedTasks / data.tasks.length) * 100
        )
      : 0;

  const overallProgress = Math.round(
    (skillProgress + taskProgress) / 2
  );

  /*
   * ============================================================
   * CAREER GOAL
   * ============================================================
   */
  function startEditingGoal() {
    setGoalForm({
      careerGoal: data.careerGoal || "",
      targetRole: data.targetRole || "",
      targetDate: data.targetDate || "",
    });

    setEditingGoal(true);
  }

  async function saveGoal() {
    const updated = {
      ...data,
      careerGoal: goalForm.careerGoal.trim(),
      targetRole: goalForm.targetRole.trim(),
      targetDate: goalForm.targetDate,
    };

    await persist(updated);
    setEditingGoal(false);
  }

  /*
   * ============================================================
   * SKILLS
   * ============================================================
   */
  async function toggleSkill(id) {
    const updated = {
      ...data,
      skills: data.skills.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              completed: !skill.completed,
            }
          : skill
      ),
    };

    await persist(updated);
  }

  async function addSkill() {
    const name = newSkill.trim();

    if (!name) {
      return;
    }

    const updated = {
      ...data,
      skills: [
        ...data.skills,
        {
          id: createId(),
          name,
          completed: false,
        },
      ],
    };

    await persist(updated);

    setNewSkill("");
    setShowSkillForm(false);
  }

  async function deleteSkill(id) {
    const updated = {
      ...data,
      skills: data.skills.filter(
        (skill) => skill.id !== id
      ),
    };

    await persist(updated);
  }

  /*
   * ============================================================
   * PREPARATION TASKS
   * ============================================================
   */
  async function addTask() {
    const title = newTask.trim();

    if (!title) {
      return;
    }

    const now = new Date().toISOString();

    const updated = {
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: createId(),
          title,
          dueDate: newTaskDueDate,
          completed: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    await persist(updated);

    setNewTask("");
    setNewTaskDueDate("");
    setShowTaskForm(false);
  }

  async function toggleTask(id) {
    const now = new Date().toISOString();

    const updated = {
      ...data,
      tasks: data.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              updatedAt: now,
            }
          : task
      ),
    };

    await persist(updated);
  }

  async function deleteTask(id) {
    const updated = {
      ...data,
      tasks: data.tasks.filter(
        (task) => task.id !== id
      ),
    };

    await persist(updated);
  }

  /*
   * ============================================================
   * NOTES
   * ============================================================
   */
  async function updateNotes(value) {
    const updated = {
      ...data,
      notes: value,
    };

    /*
     * Notes previously saved on every change because the
     * original implementation persisted whenever state changed.
     *
     * Keep the same behavior with Firebase.
     */
    await persist(updated);
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (loading) {
    return (
      <div className="job-preparation-page">
        <div className="job-preparation-header">
          <div className="job-preparation-title-area">
            <div className="job-preparation-title-row">
              <Briefcase size={28} />
              <h1>Job Preparation</h1>
            </div>

            <p>Loading your career preparation...</p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */
  return (
    <div className="job-preparation-page">
      <div className="job-preparation-header">
        <div className="job-preparation-title-area">
          <div className="job-preparation-title-row">
            <Briefcase size={28} />
            <h1>Job Preparation</h1>
          </div>

          <p>
            Track your career preparation and
            job-readiness progress.
          </p>

          {saving && (
            <small
              style={{
                display: "block",
                marginTop: 6,
                opacity: 0.7,
              }}
            >
              Saving...
            </small>
          )}
        </div>

        <div className="job-preparation-overall">
          <div className="job-preparation-progress-label">
            <span>Overall Progress</span>
            <strong>{overallProgress}%</strong>
          </div>

          <ProgressBar
            progress={overallProgress}
          />
        </div>
      </div>

      {/* CAREER GOAL */}

      <section className="job-preparation-card job-preparation-goal">
        {!editingGoal ? (
          <div className="job-preparation-goal-content">
            <div>
              <div className="job-preparation-section-heading">
                <Target size={20} />
                <h2>Career Goal</h2>
              </div>

              <h3>
                {data.careerGoal ||
                  "Set your career goal"}
              </h3>

              <p>
                Target Role:{" "}
                <strong>
                  {data.targetRole || "Not set"}
                </strong>

                {data.targetDate && (
                  <>
                    {" "}
                    • Target Date:{" "}
                    <strong>
                      {data.targetDate}
                    </strong>
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={startEditingGoal}
              className="job-preparation-button"
            >
              <Edit3 size={16} />
              Edit
            </button>
          </div>
        ) : (
          <div>
            <h2 className="job-preparation-form-title">
              Edit Career Goal
            </h2>

            <div className="job-preparation-form-grid">
              <label className="job-preparation-label">
                Career Goal

                <input
                  value={goalForm.careerGoal}
                  onChange={(e) =>
                    setGoalForm((current) => ({
                      ...current,
                      careerGoal:
                        e.target.value,
                    }))
                  }
                  placeholder="Example: Get a Java Full Stack Developer job"
                  className="job-preparation-input"
                />
              </label>

              <label className="job-preparation-label">
                Target Role

                <input
                  value={goalForm.targetRole}
                  onChange={(e) =>
                    setGoalForm((current) => ({
                      ...current,
                      targetRole:
                        e.target.value,
                    }))
                  }
                  placeholder="Example: Java Full Stack Developer"
                  className="job-preparation-input"
                />
              </label>

              <label className="job-preparation-label">
                Target Date

                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) =>
                    setGoalForm((current) => ({
                      ...current,
                      targetDate:
                        e.target.value,
                    }))
                  }
                  className="job-preparation-input"
                />
              </label>
            </div>

            <div className="job-preparation-form-actions">
              <button
                type="button"
                onClick={saveGoal}
                className="job-preparation-button job-preparation-button-primary"
              >
                <Save size={16} />
                Save
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingGoal(false)
                }
                className="job-preparation-button"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PROGRESS CARDS */}

      <div className="job-preparation-progress-grid">
        <ProgressCard
          title="Skills"
          completed={completedSkills}
          total={data.skills.length}
          progress={skillProgress}
        />

        <ProgressCard
          title="Preparation Tasks"
          completed={completedTasks}
          total={data.tasks.length}
          progress={taskProgress}
        />

        <ProgressCard
          title="Overall Readiness"
          completed={overallProgress}
          total={100}
          progress={overallProgress}
          percentage
        />
      </div>

      {/* SKILLS + TASKS */}

      <div className="job-preparation-content-grid">
        <section className="job-preparation-card">
          <div className="job-preparation-section-header">
            <div>
              <h2>Skills</h2>

              <p>
                Track the technologies you need
                for your target role.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowSkillForm(
                  (current) => !current
                )
              }
              className="job-preparation-button job-preparation-button-small"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {showSkillForm && (
            <div className="job-preparation-add-row">
              <input
                value={newSkill}
                onChange={(e) =>
                  setNewSkill(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addSkill();
                  }
                }}
                placeholder="Enter skill"
                className="job-preparation-input"
                autoFocus
              />

              <button
                type="button"
                onClick={addSkill}
                className="job-preparation-icon-button job-preparation-button-primary"
                title="Add skill"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <div className="job-preparation-list">
            {data.skills.length === 0 ? (
              <EmptyState text="No skills added yet." />
            ) : (
              data.skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`job-preparation-list-item ${
                    skill.completed
                      ? "job-preparation-list-item-completed"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleSkill(skill.id)
                    }
                    className="job-preparation-check-button"
                    title="Toggle skill"
                  >
                    {skill.completed ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  <span>{skill.name}</span>

                  <button
                    type="button"
                    onClick={() =>
                      deleteSkill(skill.id)
                    }
                    className="job-preparation-delete-button"
                    title="Delete skill"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PREPARATION TASKS */}

        <section className="job-preparation-card">
          <div className="job-preparation-section-header">
            <div>
              <h2>Preparation Tasks</h2>

              <p>
                Small actions that move you closer
                to a job.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowTaskForm(
                  (current) => !current
                )
              }
              className="job-preparation-button job-preparation-button-small"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {showTaskForm && (
            <div className="job-preparation-add-row">
              <input
                value={newTask}
                onChange={(e) =>
                  setNewTask(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTask();
                  }
                }}
                placeholder="Example: Practice Java interview questions"
                className="job-preparation-input"
                autoFocus
              />

              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) =>
                  setNewTaskDueDate(
                    e.target.value
                  )
                }
                className="job-preparation-input job-preparation-task-date-input"
                title="Task due date"
              />

              <button
                type="button"
                onClick={addTask}
                className="job-preparation-icon-button job-preparation-button-primary"
                title="Add task"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <div className="job-preparation-list">
            {data.tasks.length === 0 ? (
              <EmptyState text="No preparation tasks yet." />
            ) : (
              data.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`job-preparation-list-item ${
                    task.completed
                      ? "job-preparation-list-item-completed"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleTask(task.id)
                    }
                    className="job-preparation-check-button"
                    title="Toggle task"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  <div className="job-preparation-task-content">
                    <span>{task.title}</span>

                    {task.dueDate && (
                      <small className="job-preparation-task-date">
                        Due: {task.dueDate}
                      </small>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      deleteTask(task.id)
                    }
                    className="job-preparation-delete-button"
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* NOTES */}

      <section className="job-preparation-card job-preparation-notes">
        <div className="job-preparation-section-header">
          <div>
            <h2>Preparation Notes</h2>

            <p>
              Keep important career preparation
              notes here.
            </p>
          </div>

          <Save
            size={18}
            className="job-preparation-muted-icon"
          />
        </div>

        <textarea
          value={data.notes}
          onChange={(e) =>
            updateNotes(e.target.value)
          }
          placeholder="Write your interview notes, weak areas, companies to target, preparation strategy..."
          className="job-preparation-input job-preparation-textarea"
        />
      </section>
    </div>
  );
}

function ProgressCard({
  title,
  completed,
  total,
  progress,
  percentage = false,
}) {
  return (
    <div className="job-preparation-progress-card">
      <div className="job-preparation-progress-card-label">
        <span>{title}</span>

        <strong>
          {percentage
            ? `${progress}%`
            : `${completed}/${total}`}
        </strong>
      </div>

      <ProgressBar progress={progress} />

      <p>{progress}% completed</p>
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="job-preparation-progress-track">
      <div
        className="job-preparation-progress-fill"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="job-preparation-empty-state">
      {text}
    </div>
  );
}