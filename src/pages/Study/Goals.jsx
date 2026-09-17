import { useEffect, useMemo, useState } from "react";

import {
  Target,
  Plus,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";

import {
  getGoals,
  saveGoals,
  getTopics,
} from "../../utils/db";

import {
  calculateDaysRemaining,
  calculatePercentage,
} from "../../utils/calculations";

// ========================================
// LEARNING SKILLS
// ========================================

const LEARNING_SKILLS = [
  "Java",
  "SQL",
  "Spring",
  "Spring Boot",
  "Hibernate",
  "JavaScript",
  "React",
  "HTML",
  "CSS",
  "Python",
  "Data Analysis",
  "Machine Learning",
  "Git & GitHub",
];

// ========================================
// PERSONAL SKILLS
// ========================================

const PERSONAL_SKILLS = [
  "Communication",
  "English",
  "Time Management",
  "Problem Solving",
  "Discipline",
  "Fitness",
  "Reading",
  "Writing",
];

// ========================================
// GOALS COMPONENT
// ========================================

function Goals() {
  const [goals, setGoals] = useState([]);
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    skill: "",
    targetDate: "",
    status: "pending",
  });

  // ========================================
  // LOAD DATA
  // ========================================

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const savedGoals = await getGoals();
        const savedTopics = await getTopics();

        if (!mounted) {
          return;
        }

        setGoals(
          Array.isArray(savedGoals)
            ? savedGoals
            : []
        );

        setTopics(
          Array.isArray(savedTopics)
            ? savedTopics
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load Goals:",
          error
        );

        if (mounted) {
          setGoals([]);
          setTopics([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    // ========================================
    // REFRESH TOPICS WHEN LEARNING CHANGES
    // ========================================

    async function refreshTopics() {
      try {
        const savedTopics = await getTopics();

        if (mounted) {
          setTopics(
            Array.isArray(savedTopics)
              ? savedTopics
              : []
          );
        }
      } catch (error) {
        console.error(
          "Failed to refresh topics:",
          error
        );
      }
    }

    window.addEventListener(
      "learningTopicsUpdated",
      refreshTopics
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "learningTopicsUpdated",
        refreshTopics
      );
    };
  }, []);

  // ========================================
  // AVAILABLE TOPIC SKILLS
  // ========================================

  const topicSkills = useMemo(() => {
    return topics
      .map((topic) => topic.skill)
      .filter(
        (skill) =>
          typeof skill === "string" &&
          skill.trim() !== ""
      );
  }, [topics]);

  // ========================================
  // ALL LEARNING SKILLS
  // ========================================

  const allLearningSkills = useMemo(() => {
    return [
      ...new Set([
        ...LEARNING_SKILLS,
        ...topicSkills,
      ]),
    ];
  }, [topicSkills]);

  // ========================================
  // CALCULATE GOAL PROGRESS
  // ========================================

  function calculateGoalProgress(goal) {
    if (goal.status === "completed") {
      return 100;
    }

    if (!goal.skill) {
      return 0;
    }

    const skillTopics = topics.filter(
      (topic) =>
        typeof topic.skill === "string" &&
        topic.skill.toLowerCase() ===
          goal.skill.toLowerCase()
    );

    if (skillTopics.length === 0) {
      return 0;
    }

    const completedTopics =
      skillTopics.filter(
        (topic) =>
          topic.status === "completed"
      ).length;

    const percentage = calculatePercentage(
      completedTopics,
      skillTopics.length
    );

    if (!Number.isFinite(percentage)) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, percentage)
    );
  }

  // ========================================
  // GET TOPIC STATISTICS
  // ========================================

  function getGoalTopicStats(goal) {
    if (!goal.skill) {
      return {
        total: 0,
        completed: 0,
      };
    }

    const skillTopics = topics.filter(
      (topic) =>
        typeof topic.skill === "string" &&
        topic.skill.toLowerCase() ===
          goal.skill.toLowerCase()
    );

    const completed =
      skillTopics.filter(
        (topic) =>
          topic.status === "completed"
      ).length;

    return {
      total: skillTopics.length,
      completed,
    };
  }

  // ========================================
  // OPEN ADD FORM
  // ========================================

  function openAddForm() {
    setEditingGoal(null);

    setGoalForm({
      title: "",
      description: "",
      skill: "",
      targetDate: "",
      status: "pending",
    });

    setShowForm(true);
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  function openEditForm(goal) {
    setEditingGoal(goal);

    setGoalForm({
      title: goal.title || "",
      description: goal.description || "",
      skill: goal.skill || "",
      targetDate: goal.targetDate || "",
      status: goal.status || "pending",
    });

    setShowForm(true);
  }

  // ========================================
  // CLOSE FORM
  // ========================================

  function closeForm() {
    setShowForm(false);
    setEditingGoal(null);

    setGoalForm({
      title: "",
      description: "",
      skill: "",
      targetDate: "",
      status: "pending",
    });
  }

  // ========================================
  // INPUT CHANGE
  // ========================================

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setGoalForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ========================================
  // SAVE GOAL
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (!goalForm.title.trim()) {
      alert("Please enter a Goal Title.");
      return;
    }

    if (!goalForm.skill) {
      alert("Please select a Skill.");
      return;
    }

    if (!goalForm.targetDate) {
      alert("Please select a Target Date.");
      return;
    }

    try {
      let updatedGoals = [];

      // ======================================
      // EDIT GOAL
      // ======================================

      if (editingGoal) {
        updatedGoals = goals.map((goal) => {
          if (
            goal.id === editingGoal.id
          ) {
            return {
              ...goal,

              title:
                goalForm.title.trim(),

              description:
                goalForm.description.trim(),

              skill:
                goalForm.skill,

              targetDate:
                goalForm.targetDate,

              status:
                goalForm.status,
            };
          }

          return goal;
        });
      }

      // ======================================
      // ADD GOAL
      // ======================================

      else {
        const newGoal = {
          id: Date.now(),

          title:
            goalForm.title.trim(),

          description:
            goalForm.description.trim(),

          skill:
            goalForm.skill,

          targetDate:
            goalForm.targetDate,

          status:
            goalForm.status,
        };

        updatedGoals = [
          ...goals,
          newGoal,
        ];
      }

      // ======================================
      // SAVE TO FIREBASE
      // ======================================

      await saveGoals(updatedGoals);

      // ======================================
      // UPDATE UI
      // ======================================

      setGoals(updatedGoals);

      closeForm();
    } catch (error) {
      console.error(
        "Goal save error:",
        error
      );

      alert(
        `Could not save goal.\n\n${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  // ========================================
  // DELETE GOAL
  // ========================================

  async function deleteGoal(goal) {
    const confirmed =
      window.confirm(
        `Delete "${goal.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const updatedGoals =
        goals.filter(
          (item) =>
            item.id !== goal.id
        );

      // ======================================
      // SAVE UPDATED LIST TO FIREBASE
      // ======================================

      await saveGoals(updatedGoals);

      // ======================================
      // UPDATE UI
      // ======================================

      setGoals(updatedGoals);
    } catch (error) {
      console.error(
        "Delete goal error:",
        error
      );

      alert(
        `Could not delete goal.\n\n${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  // ========================================
  // UPDATE STATUS
  // ========================================

  async function updateGoalStatus(
    id,
    status
  ) {
    try {
      const updatedGoals =
        goals.map((goal) =>
          goal.id === id
            ? {
                ...goal,
                status,
              }
            : goal
        );

      // ======================================
      // SAVE TO FIREBASE
      // ======================================

      await saveGoals(updatedGoals);

      // ======================================
      // UPDATE UI
      // ======================================

      setGoals(updatedGoals);
    } catch (error) {
      console.error(
        "Update status error:",
        error
      );

      alert(
        `Could not update goal status.\n\n${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  // ========================================
  // STATISTICS
  // ========================================

  const stats = useMemo(() => {
    const total = goals.length;

    const completed =
      goals.filter(
        (goal) =>
          goal.status === "completed"
      ).length;

    const pending =
      goals.filter(
        (goal) =>
          goal.status === "pending"
      ).length;

    const inProgress =
      goals.filter(
        (goal) =>
          goal.status === "in-progress"
      ).length;

    let averageProgress = 0;

    if (total > 0) {
      const totalProgress =
        goals.reduce(
          (sum, goal) => {
            const progress =
              calculateGoalProgress(
                goal
              );

            return (
              sum +
              (
                Number.isFinite(
                  progress
                )
                  ? progress
                  : 0
              )
            );
          },
          0
        );

      averageProgress =
        Math.round(
          totalProgress / total
        );
    }

    if (
      !Number.isFinite(
        averageProgress
      )
    ) {
      averageProgress = 0;
    }

    return {
      total,
      completed,
      pending,
      inProgress,
      averageProgress,
    };
  }, [goals, topics]);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="goals-page">

        <h1>
          🎯 Goals
        </h1>

        <p>
          Loading goals...
        </p>

      </div>
    );
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="goals-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="page-header">

        <div>

          <h1>
            🎯 Goals
          </h1>

          <p>
            Track your goals and
            automatically measure
            your progress.
          </p>

        </div>

        <Target size={42} />

      </div>

      {/* ==================================
          STATISTICS
      ================================== */}

      <section className="goal-stats">

        <div className="goal-stat-card">

          <Target size={25} />

          <span>
            Total Goals
          </span>

          <strong>
            {stats.total}
          </strong>

        </div>

        <div className="goal-stat-card">

          <CheckCircle size={25} />

          <span>
            Completed
          </span>

          <strong>
            {stats.completed}
          </strong>

        </div>

        <div className="goal-stat-card">

          <Clock size={25} />

          <span>
            Pending
          </span>

          <strong>
            {stats.pending}
          </strong>

        </div>

        <div className="goal-stat-card">

          <Target size={25} />

          <span>
            Average Progress
          </span>

          <strong>
            {stats.averageProgress}%
          </strong>

        </div>

      </section>

      {/* ==================================
          ADD BUTTON
      ================================== */}

      <div
        className="goal-add-area"
        style={{
          position: "relative",
          zIndex: 1000,
        }}
      >

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
          style={{
            position: "relative",
            zIndex: 1001,
            cursor: "pointer",
          }}
        >

          <Plus size={18} />

          Add Goal

        </button>

      </div>

      {/* ==================================
          FORM
      ================================== */}

      {showForm && (
        <section className="goal-form-card">

          <div className="goal-form-header">

            <div>

              <h2>
                {editingGoal
                  ? "Edit Goal"
                  : "Add Goal"}
              </h2>

              <p>
                Connect the goal to
                a learning or personal
                skill.
              </p>

            </div>

            <button
              type="button"
              className="close-button"
              onClick={closeForm}
            >

              <X size={20} />

            </button>

          </div>

          <form
            className="goal-form"
            onSubmit={handleSubmit}
          >

            {/* TITLE */}

            <div className="form-group">

              <label>
                Goal Title
              </label>

              <input
                type="text"
                name="title"
                value={
                  goalForm.title
                }
                onChange={
                  handleChange
                }
                placeholder="Example: Complete Spring Boot"
                required
              />

            </div>

            {/* DESCRIPTION */}

            <div className="form-group">

              <label>
                Description
              </label>

              <input
                type="text"
                name="description"
                value={
                  goalForm.description
                }
                onChange={
                  handleChange
                }
                placeholder="Describe your goal"
              />

            </div>

            {/* SKILL */}

            <div className="form-group">

              <label>

                <LinkIcon size={15} />

                Skill

              </label>

              <select
                name="skill"
                value={
                  goalForm.skill
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select a skill
                </option>

                <optgroup label="📚 Learning Skills">

                  {allLearningSkills.map(
                    (skill) => (
                      <option
                        key={`learning-${skill}`}
                        value={skill}
                      >
                        {skill}
                      </option>
                    )
                  )}

                </optgroup>

                <optgroup label="🌱 Personal Skills">

                  {PERSONAL_SKILLS.map(
                    (skill) => (
                      <option
                        key={`personal-${skill}`}
                        value={skill}
                      >
                        {skill}
                      </option>
                    )
                  )}

                </optgroup>

                <optgroup label="✨ Other">

                  <option value="Other">
                    Other Skill
                  </option>

                </optgroup>

              </select>

              <small>
                Learning skills automatically
                calculate progress from
                completed Learning topics.
              </small>

            </div>

            {/* TARGET DATE */}

            <div className="form-group">

              <label>
                Target Date
              </label>

              <input
                type="date"
                name="targetDate"
                value={
                  goalForm.targetDate
                }
                onChange={
                  handleChange
                }
                required
              />

            </div>

            {/* STATUS */}

            <div className="form-group">

              <label>
                Status
              </label>

              <select
                name="status"
                value={
                  goalForm.status
                }
                onChange={
                  handleChange
                }
              >

                <option value="pending">
                  Pending
                </option>

                <option value="in-progress">
                  In Progress
                </option>

                <option value="completed">
                  Completed
                </option>

              </select>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="primary-button"
            >

              {editingGoal
                ? "Save Changes"
                : "Add Goal"}

            </button>

          </form>

        </section>
      )}

      {/* ==================================
          MY GOALS
      ================================== */}

      <section className="goals-section">

        <div className="section-heading">

          <div>

            <h2>
              My Goals
            </h2>

            <p>
              Track your targets and
              deadlines.
            </p>

          </div>

        </div>

        {/* ==================================
            EMPTY STATE
        ================================== */}

        {goals.length === 0 ? (

          <div className="empty-state">

            <Target size={40} />

            <h3>
              No goals yet
            </h3>

            <p>
              Add your first goal
              to start tracking
              your progress.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={openAddForm}
            >

              <Plus size={18} />

              Add Goal

            </button>

          </div>

        ) : (

          <div className="goals-list">

            {goals.map((goal) => {

              const progress =
                calculateGoalProgress(
                  goal
                );

              const topicStats =
                getGoalTopicStats(
                  goal
                );

              const daysRemaining =
                goal.targetDate
                  ? calculateDaysRemaining(
                      goal.targetDate
                    )
                  : 0;

              return (

                <div
                  className="goal-card"
                  key={goal.id}
                >

                  {/* CARD HEADER */}

                  <div className="goal-card-header">

                    <div>

                      <h3>
                        {goal.title}
                      </h3>

                      <p>
                        {goal.description ||
                          "No description"}
                      </p>

                    </div>

                    <div className="goal-actions">

                      <button
                        type="button"
                        className="edit-button"
                        onClick={() =>
                          openEditForm(
                            goal
                          )
                        }
                        title="Edit goal"
                      >

                        <Pencil
                          size={17}
                        />

                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() =>
                          deleteGoal(
                            goal
                          )
                        }
                        title="Delete goal"
                      >

                        <Trash2
                          size={17}
                        />

                      </button>

                    </div>

                  </div>

                  {/* SKILL */}

                  <div className="goal-skill">

                    <LinkIcon
                      size={16}
                    />

                    <span>

                      {goal.skill
                        ? `Linked to ${goal.skill}`
                        : "No skill linked"}

                    </span>

                  </div>

                  {/* PROGRESS HEADER */}

                  <div className="goal-progress-header">

                    <span>
                      Progress
                    </span>

                    <strong>
                      {progress}%
                    </strong>

                  </div>

                  {/* PROGRESS BAR */}

                  <div className="goal-progress">

                    <div
                      className="goal-progress-fill"
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />

                  </div>

                  {/* TOPIC COUNT */}

                  {topicStats.total > 0 ? (

                    <p className="goal-topic-count">

                      {topicStats.completed}

                      {" "}of{" "}

                      {topicStats.total}

                      {" "}

                      {goal.skill}

                      {" "}

                      topics completed

                    </p>

                  ) : (

                    <p className="goal-topic-count">

                      {goal.status === "completed"
                        ? "Goal completed."
                        : "No Learning topics connected yet."}

                    </p>

                  )}

                  {/* DETAILS */}

                  <div className="goal-details">

                    <div>

                      <CalendarDays
                        size={17}
                      />

                      <span>

                        Target:{" "}

                        {goal.targetDate}

                      </span>

                    </div>

                    <div>

                      <Clock
                        size={17}
                      />

                      <span>

                        {daysRemaining}{" "}
                        days remaining

                      </span>

                    </div>

                    <select
                      value={
                        goal.status ||
                        "pending"
                      }
                      onChange={(event) =>
                        updateGoalStatus(
                          goal.id,
                          event.target.value
                        )
                      }
                    >

                      <option value="pending">
                        Pending
                      </option>

                      <option value="in-progress">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                    </select>

                  </div>

                </div>

              );
            })}

          </div>

        )}

      </section>

    </div>
  );
}

export default Goals;