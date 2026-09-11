import { useEffect, useMemo, useState } from "react";
import { getTopics, saveTopics } from "../utils/db";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Circle,
  ListTodo,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  calculatePercentage,
  getTodayLocalDateKey,
  formatMinutes,
} from "../utils/calculations";

const INITIAL_TOPICS = [
  {
    id: 1,
    skill: "Java",
    name: "Collections",
    status: "completed",
    timeSpent: 90,
    plannedDate: "",
    completedAt: getTodayLocalDateKey(),
  },
  {
    id: 2,
    skill: "Java",
    name: "Exception Handling",
    status: "completed",
    timeSpent: 60,
    plannedDate: "",
    completedAt: getTodayLocalDateKey(),
  },
  {
    id: 3,
    skill: "Java",
    name: "Java 8 Features",
    status: "in-progress",
    timeSpent: 30,
    plannedDate: "",
  },
  {
    id: 4,
    skill: "Java",
    name: "Multithreading",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  },

  {
    id: 5,
    skill: "SQL",
    name: "Joins",
    status: "completed",
    timeSpent: 45,
    plannedDate: "",
    completedAt: getTodayLocalDateKey(),
  },
  {
    id: 6,
    skill: "SQL",
    name: "Subqueries",
    status: "completed",
    timeSpent: 40,
    plannedDate: "",
    completedAt: getTodayLocalDateKey(),
  },
  {
    id: 7,
    skill: "SQL",
    name: "Normalization",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  },

  {
    id: 8,
    skill: "Spring",
    name: "IoC",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  },
  {
    id: 9,
    skill: "Spring",
    name: "Dependency Injection",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  },
  {
    id: 10,
    skill: "Spring",
    name: "Spring Beans",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  },

  {
    id: 11,
    skill: "React",
    name: "Components",
    status: "future",
    timeSpent: 0,
    plannedDate: "",
  },
  {
    id: 12,
    skill: "React",
    name: "Props and State",
    status: "future",
    timeSpent: 0,
    plannedDate: "",
  },
];

const LEARNING_INITIALIZED_KEY =
  "taskbar-learning-initialized";

function Learning() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [skillQuery, setSkillQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingTopic, setEditingTopic] =
    useState(null);

  const [topicForm, setTopicForm] = useState({
    name: "",
    skill: "",
    status: "remaining",
    timeSpent: 0,
    plannedDate: "",
  });

  // ========================================
  // LOAD TOPICS FROM INDEXEDDB
  // ========================================

  useEffect(() => {
    async function loadTopics() {
      try {
        const savedTopics =
          await getTopics();

        /*
          IMPORTANT FIX:

          An empty IndexedDB store can mean
          the user intentionally deleted all
          topics.

          Therefore we MUST NOT use:

          savedTopics.length === 0

          as the signal for first-time setup.

          We use a separate initialization flag.
        */

        const initialized =
          localStorage.getItem(
            LEARNING_INITIALIZED_KEY
          ) === "true";

        if (
          savedTopics.length > 0
        ) {
          /*
            Existing data always wins.
          */

          setTopics(
            savedTopics
          );

          /*
            If data already exists, make sure
            the initialization flag is set.
          */

          if (!initialized) {
            localStorage.setItem(
              LEARNING_INITIALIZED_KEY,
              "true"
            );
          }
        } else if (
          !initialized
        ) {
          /*
            Genuine first-time setup.

            Insert the starter topics only once.
          */

          const starterTopics =
            INITIAL_TOPICS.map(
              (topic) => ({
                ...topic,
              })
            );

          await saveTopics(
            starterTopics
          );

          setTopics(
            starterTopics
          );

          localStorage.setItem(
            LEARNING_INITIALIZED_KEY,
            "true"
          );
        } else {
          /*
            IMPORTANT:

            Initialized + empty database
            means the user has intentionally
            removed all topics.

            Keep it empty.
          */

          setTopics([]);
        }
      } catch (error) {
        console.error(
          "Failed to load topics:",
          error
        );

        /*
          Do NOT reinsert hardcoded topics
          when an error occurs.

          Keeping the UI empty is safer than
          unexpectedly recreating user data.
        */

        setTopics([]);
      } finally {
        setLoading(false);
      }
    }

    loadTopics();
  }, []);

  // ========================================
  // STATISTICS
  // ========================================

  const stats = useMemo(() => {
    const activeTopics =
      topics.filter(
        (topic) =>
          topic.status !== "future"
      );

    const completed =
      activeTopics.filter(
        (topic) =>
          topic.status ===
          "completed"
      ).length;

    const inProgress =
      activeTopics.filter(
        (topic) =>
          topic.status ===
          "in-progress"
      ).length;

    const remaining =
      activeTopics.filter(
        (topic) =>
          topic.status ===
          "remaining"
      ).length;

    const future =
      topics.filter(
        (topic) =>
          topic.status ===
          "future"
      ).length;

    return {
      total:
        activeTopics.length,

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

  // ========================================
  // FILTER
  // ========================================

  const filteredTopics =
    topics
      .filter(
        (topic) =>
          filter === "all" ||
          topic.status === filter
      )
      .filter((topic) =>
        skillQuery.trim() === ""
          ? true
          : topic.skill
              .toLowerCase()
              .includes(
                skillQuery
                  .trim()
                  .toLowerCase()
              ) ||
            topic.name
              .toLowerCase()
              .includes(
                skillQuery
                  .trim()
                  .toLowerCase()
              )
      );

  // ========================================
  // SKILL PROGRESS
  // ========================================

  const skillProgress =
    useMemo(() => {
      const map = new Map();

      topics.forEach(
        (topic) => {
          if (
            !map.has(
              topic.skill
            )
          ) {
            map.set(
              topic.skill,
              {
                skill:
                  topic.skill,

                total: 0,

                completed: 0,

                timeSpent: 0,
              }
            );
          }

          const entry =
            map.get(
              topic.skill
            );

          entry.total += 1;

          if (
            topic.status ===
            "completed"
          ) {
            entry.completed +=
              1;
          }

          entry.timeSpent +=
            Number(
              topic.timeSpent
            ) || 0;
        }
      );

      return Array.from(
        map.values()
      )
        .map(
          (entry) => ({
            ...entry,

            progress:
              calculatePercentage(
                entry.completed,
                entry.total
              ),
          })
        )
        .sort(
          (a, b) =>
            b.total - a.total
        );
    }, [topics]);

  // ========================================
  // OPEN ADD FORM
  // ========================================

  function openAddForm() {
    setEditingTopic(null);

    setTopicForm({
      name: "",
      skill: "",
      status: "remaining",
      timeSpent: 0,
      plannedDate: "",
    });

    setShowForm(true);
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  function openEditForm(
    topic
  ) {
    setEditingTopic(topic);

    setTopicForm({
      name: topic.name,
      skill: topic.skill,
      status: topic.status,
      timeSpent:
        topic.timeSpent || 0,
      plannedDate:
        topic.plannedDate || "",
    });

    setShowForm(true);
  }

  // ========================================
  // CLOSE FORM
  // ========================================

  function closeForm() {
    setShowForm(false);
    setEditingTopic(null);
  }

  // ========================================
  // SAVE ADD / EDIT
  // ========================================

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !topicForm.name.trim() ||
      !topicForm.skill.trim()
    ) {
      return;
    }

    let updatedTopics;

    const timeSpent =
      Math.max(
        0,
        Number(
          topicForm.timeSpent
        ) || 0
      );

    // ========================================
    // EDIT
    // ========================================

    if (editingTopic) {
      const wasCompleted =
        editingTopic.status ===
        "completed";

      const nowCompleted =
        topicForm.status ===
        "completed";

      updatedTopics =
        topics.map(
          (topic) =>
            topic.id ===
            editingTopic.id
              ? {
                  ...topic,

                  name:
                    topicForm.name.trim(),

                  skill:
                    topicForm.skill.trim(),

                  status:
                    topicForm.status,

                  timeSpent,

                  plannedDate:
                    topicForm.plannedDate,

                  completedAt:
                    nowCompleted &&
                    !wasCompleted
                      ? getTodayLocalDateKey()
                      : nowCompleted
                      ? topic.completedAt ||
                        getTodayLocalDateKey()
                      : topic.completedAt,
                }
              : topic
        );
    }

    // ========================================
    // ADD
    // ========================================

    else {
      const newTopic = {
        id: Date.now(),

        name:
          topicForm.name.trim(),

        skill:
          topicForm.skill.trim(),

        status:
          topicForm.status,

        timeSpent,

        plannedDate:
          topicForm.plannedDate,

        completedAt:
          topicForm.status ===
          "completed"
            ? getTodayLocalDateKey()
            : undefined,
      };

      updatedTopics = [
        ...topics,
        newTopic,
      ];
    }

    try {
      /*
        Save to IndexedDB FIRST.
      */

      await saveTopics(
        updatedTopics
      );

      /*
        Update React state only after
        IndexedDB succeeds.
      */

      setTopics(
        updatedTopics
      );

      /*
        The user has now interacted with
        the learning data, so initialization
        is definitely complete.
      */

      localStorage.setItem(
        LEARNING_INITIALIZED_KEY,
        "true"
      );

      closeForm();
    } catch (error) {
      console.error(
        "Failed to save topic:",
        error
      );
    }
  }

  // ========================================
  // DELETE TOPIC
  // ========================================

  async function deleteTopic(
    topic
  ) {
    const confirmed =
      window.confirm(
        `Delete "${topic.name}"?\n\nThis topic will be permanently removed.`
      );

    if (!confirmed) {
      return;
    }

    const updatedTopics =
      topics.filter(
        (item) =>
          item.id !==
          topic.id
      );

    try {
      /*
        Save FIRST.

        If this was the final topic,
        IndexedDB becomes [].

        Because the initialization flag
        remains true, refresh will NOT
        recreate the starter topics.
      */

      await saveTopics(
        updatedTopics
      );

      setTopics(
        updatedTopics
      );

      localStorage.setItem(
        LEARNING_INITIALIZED_KEY,
        "true"
      );
    } catch (error) {
      console.error(
        "Failed to delete topic:",
        error
      );
    }
  }

  // ========================================
  // UPDATE STATUS
  // ========================================

  async function updateTopicStatus(
    id,
    newStatus
  ) {
    const updatedTopics =
      topics.map(
        (topic) =>
          topic.id === id
            ? {
                ...topic,

                status:
                  newStatus,

                completedAt:
                  newStatus ===
                  "completed"
                    ? topic.completedAt ||
                      getTodayLocalDateKey()
                    : topic.completedAt,
              }
            : topic
      );

    try {
      /*
        Save FIRST.
      */

      await saveTopics(
        updatedTopics
      );

      setTopics(
        updatedTopics
      );

      localStorage.setItem(
        LEARNING_INITIALIZED_KEY,
        "true"
      );
    } catch (error) {
      console.error(
        "Failed to update topic status:",
        error
      );
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="learning-page">
        <h1>
          📚 Learning
        </h1>

        <p>
          Loading topics...
        </p>
      </div>
    );
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="learning-page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>
            📚 Learning
          </h1>

          <p>
            Track your skills,
            topics and learning
            progress.
          </p>
        </div>

        <button
          className="add-topic-button"
          onClick={
            openAddForm
          }
        >
          <Plus size={18} />

          Add Topic
        </button>

      </div>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <section className="add-topic-card">

          <div className="add-topic-header">

            <h2>
              {editingTopic
                ? "Edit Topic"
                : "Add New Topic"}
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
            onSubmit={
              handleSubmit
            }
          >

            {/* TOPIC NAME */}

            <div className="form-group">

              <label>
                Topic Name
              </label>

              <input
                type="text"
                placeholder="Example: Spring MVC"
                value={
                  topicForm.name
                }
                onChange={(
                  event
                ) =>
                  setTopicForm({
                    ...topicForm,

                    name:
                      event.target
                        .value,
                  })
                }
              />

            </div>

            {/* SKILL */}

            <div className="form-group">

              <label>
                Skill
              </label>

              <input
                type="text"
                placeholder="Example: Spring"
                value={
                  topicForm.skill
                }
                onChange={(
                  event
                ) =>
                  setTopicForm({
                    ...topicForm,

                    skill:
                      event.target
                        .value,
                  })
                }
              />

            </div>

            {/* STATUS */}

            <div className="form-group">

              <label>
                Status
              </label>

              <select
                value={
                  topicForm.status
                }
                onChange={(
                  event
                ) =>
                  setTopicForm({
                    ...topicForm,

                    status:
                      event.target
                        .value,
                  })
                }
              >

                <option value="remaining">
                  Remaining
                </option>

                <option value="in-progress">
                  In Progress
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="future">
                  Future
                </option>

              </select>

            </div>

            {/* TIME SPENT */}

            <div className="form-group">

              <label>
                Time Spent
                (minutes)
              </label>

              <input
                type="number"
                min="0"
                placeholder="0"
                value={
                  topicForm.timeSpent
                }
                onChange={(
                  event
                ) =>
                  setTopicForm({
                    ...topicForm,

                    timeSpent:
                      event.target
                        .value,
                  })
                }
              />

            </div>

            {/* PLANNED DATE */}

            <div className="form-group">

              <label>
                Planned Date
              </label>

              <input
                type="date"
                value={
                  topicForm.plannedDate
                }
                onChange={(
                  event
                ) =>
                  setTopicForm({
                    ...topicForm,

                    plannedDate:
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
              {editingTopic
                ? "Save Changes"
                : "Add Topic"}
            </button>

          </form>

        </section>
      )}

      {/* OVERALL PROGRESS */}

      <section className="learning-overview">

        <div className="learning-progress-header">

          <div>

            <span>
              Overall Learning
              Progress
            </span>

            <h2>
              {stats.progress}%
            </h2>

          </div>

          <BookOpen size={40} />

        </div>

        <div className="progress-bar large">

          <div
            className="progress-fill"
            style={{
              width: `${stats.progress}%`,
            }}
          />

        </div>

        <p>
          {stats.completed} of{" "}
          {stats.total} active
          topics completed
        </p>

      </section>

      {/* STATISTICS */}

      <section className="learning-stats">

        <div className="learning-stat">

          <CheckCircle
            size={25}
          />

          <span>
            Completed
          </span>

          <strong>
            {stats.completed}
          </strong>

        </div>

        <div className="learning-stat">

          <Clock size={25} />

          <span>
            In Progress
          </span>

          <strong>
            {stats.inProgress}
          </strong>

        </div>

        <div className="learning-stat">

          <ListTodo
            size={25}
          />

          <span>
            Remaining
          </span>

          <strong>
            {stats.remaining}
          </strong>

        </div>

        <div className="learning-stat">

          <Circle size={25} />

          <span>
            Future
          </span>

          <strong>
            {stats.future}
          </strong>

        </div>

      </section>

      {/* SKILL PROGRESS */}

      {skillProgress.length >
        0 && (
        <section className="learning-section skill-progress-section">

          <div className="topic-header">

            <div>

              <h2>
                Skill Progress
              </h2>

              <p>
                How far along
                each skill is.
              </p>

            </div>

          </div>

          <div className="skill-progress-list">

            {skillProgress.map(
              (skill) => (
                <div
                  className="skill-progress-row"
                  key={
                    skill.skill
                  }
                >

                  <div className="skill-progress-info">

                    <strong>
                      {skill.skill}
                    </strong>

                    <span>
                      {
                        skill.completed
                      }
                      /
                      {
                        skill.total
                      }{" "}
                      topics

                      {skill.timeSpent >
                        0 &&
                        ` • ${formatMinutes(
                          skill.timeSpent
                        )} spent`}
                    </span>

                  </div>

                  <div className="skill-progress-bar-wrap">

                    <div className="progress-bar">

                      <div
                        className="progress-fill"
                        style={{
                          width: `${skill.progress}%`,
                        }}
                      />

                    </div>

                    <span className="skill-progress-percent">

                      {
                        skill.progress
                      }
                      %

                    </span>

                  </div>

                </div>
              )
            )}

          </div>

        </section>
      )}

      {/* TOPIC TRACKER */}

      <section className="learning-section">

        <div className="topic-header">

          <div>

            <h2>
              Topic Tracker
            </h2>

            <p>
              Manage your
              learning topics.
            </p>

          </div>

          <input
            type="text"
            className="skill-search-input"
            placeholder="Search by skill or topic..."
            value={
              skillQuery
            }
            onChange={(
              event
            ) =>
              setSkillQuery(
                event.target
                  .value
              )
            }
          />

          <select
            value={
              filter
            }
            onChange={(
              event
            ) =>
              setFilter(
                event.target
                  .value
              )
            }
          >

            <option value="all">
              All Topics
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="in-progress">
              In Progress
            </option>

            <option value="remaining">
              Remaining
            </option>

            <option value="future">
              Future
            </option>

          </select>

        </div>

        {/* TOPIC LIST */}

        <div className="topic-list">

          {filteredTopics.map(
            (topic) => (

              <div
                className="topic-row"
                key={topic.id}
              >

                <div className="topic-information">

                  <strong>
                    {topic.name}
                  </strong>

                  <span>

                    {topic.skill}

                    {topic.timeSpent >
                      0 &&
                      ` • ${formatMinutes(
                        topic.timeSpent
                      )}`}

                    {topic.plannedDate &&
                      ` • Planned: ${new Date(
                        `${topic.plannedDate}T00:00:00`
                      ).toLocaleDateString(
                        "en-IN"
                      )}`}

                  </span>

                </div>

                <div className="topic-actions">

                  {/* STATUS */}

                  <select
                    value={
                      topic.status
                    }
                    onChange={(
                      event
                    ) =>
                      updateTopicStatus(
                        topic.id,
                        event.target
                          .value
                      )
                    }
                  >

                    <option value="completed">
                      Completed
                    </option>

                    <option value="in-progress">
                      In Progress
                    </option>

                    <option value="remaining">
                      Remaining
                    </option>

                    <option value="future">
                      Future
                    </option>

                  </select>

                  {/* EDIT */}

                  <button
                    type="button"
                    className="edit-button"
                    onClick={() =>
                      openEditForm(
                        topic
                      )
                    }
                    title="Edit topic"
                  >

                    <Pencil
                      size={17}
                    />

                  </button>

                  {/* DELETE */}

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() =>
                      deleteTopic(
                        topic
                      )
                    }
                    title="Delete topic"
                  >

                    <Trash2
                      size={17}
                    />

                  </button>

                </div>

              </div>
            )
          )}

          {filteredTopics.length ===
            0 && (
            <p className="empty-topics">
              No topics found.
            </p>
          )}

        </div>

      </section>

    </div>
  );
}

export default Learning;