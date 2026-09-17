import React, { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Pencil,
  Plus,
  Trash2,
  X,
  FolderGit2,
} from "lucide-react";

import {
  getItemsFromFirestore,
  saveItemsToFirestore,
  deleteItemFromFirestore,
} from "../../firebase/firestore";

const PROJECTS_COLLECTION = "careerProjects";

const STATUS_OPTIONS = [
  "Planned",
  "In Progress",
  "Completed",
  "On Hold",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  technologies: "",
  githubLink: "",
  liveLink: "",
  status: "In Progress",
  notes: "",
};

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export default function Projects() {
  const [projects, setProjects] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);

  // Load projects from Firebase
  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setLoading(true);

        const data = await getItemsFromFirestore(
          PROJECTS_COLLECTION
        );

        if (mounted) {
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(
          "Failed to load projects from Firebase:",
          error
        );

        if (mounted) {
          setProjects([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  async function persistProjects(updatedProjects) {
    await saveItemsToFirestore(
      PROJECTS_COLLECTION,
      updatedProjects
    );
  }

  const filteredProjects = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return projects
      .filter((project) => {
        if (statusFilter === "All") {
          return true;
        }

        return project.status === statusFilter;
      })
      .filter((project) => {
        if (!searchText) {
          return true;
        }

        return (
          project.name
            ?.toLowerCase()
            .includes(searchText) ||
          project.description
            ?.toLowerCase()
            .includes(searchText) ||
          project.technologies
            ?.toLowerCase()
            .includes(searchText)
        );
      });
  }, [projects, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: projects.length,

      planned: projects.filter(
        (project) => project.status === "Planned"
      ).length,

      inProgress: projects.filter(
        (project) => project.status === "In Progress"
      ).length,

      completed: projects.filter(
        (project) => project.status === "Completed"
      ).length,
    };
  }, [projects]);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEditForm(project) {
    setEditingId(project.id);

    setForm({
      name: project.name || "",
      description: project.description || "",
      technologies: project.technologies || "",
      githubLink: project.githubLink || "",
      liveLink: project.liveLink || "",
      status: project.status || "In Progress",
      notes: project.notes || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProject() {
    if (!form.name.trim()) {
      alert("Please enter a Project Name.");
      return;
    }

    let updatedProjects;

    if (editingId) {
      updatedProjects = projects.map((project) =>
        project.id === editingId
          ? {
              ...project,
              name: form.name.trim(),
              description: form.description.trim(),
              technologies: form.technologies.trim(),
              githubLink: form.githubLink.trim(),
              liveLink: form.liveLink.trim(),
              status: form.status,
              notes: form.notes.trim(),
              updatedAt: new Date().toISOString(),
            }
          : project
      );
    } else {
      const newProject = {
        id: createId(),
        name: form.name.trim(),
        description: form.description.trim(),
        technologies: form.technologies.trim(),
        githubLink: form.githubLink.trim(),
        liveLink: form.liveLink.trim(),
        status: form.status,
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updatedProjects = [
        newProject,
        ...projects,
      ];
    }

    try {
      await persistProjects(updatedProjects);

      setProjects(updatedProjects);
      closeForm();
    } catch (error) {
      console.error(
        "Failed to save project:",
        error
      );

      alert(
        "Failed to save project. Please check your Firebase connection and try again."
      );
    }
  }

  async function deleteProject(id) {
    const project = projects.find(
      (item) => item.id === id
    );

    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteItemFromFirestore(
        PROJECTS_COLLECTION,
        id
      );

      const updatedProjects = projects.filter(
        (project) => project.id !== id
      );

      setProjects(updatedProjects);
    } catch (error) {
      console.error(
        "Failed to delete project:",
        error
      );

      alert(
        "Failed to delete project. Please try again."
      );
    }
  }

  async function updateStatus(id, status) {
    const updatedProjects = projects.map(
      (project) =>
        project.id === id
          ? {
              ...project,
              status,
              updatedAt: new Date().toISOString(),
            }
          : project
    );

    try {
      await persistProjects(updatedProjects);

      setProjects(updatedProjects);
    } catch (error) {
      console.error(
        "Failed to update project status:",
        error
      );

      alert(
        "Failed to update project status. Please try again."
      );
    }
  }

  return (
    <div className="projects-page">
      {/* HEADER */}
      <div className="projects-header">
        <div>
          <div className="projects-title-row">
            <FolderGit2 size={28} />

            <h1 className="projects-title">
              Projects
            </h1>
          </div>

          <p className="projects-subtitle">
            Manage the projects you want to showcase
            in your career.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="projects-button projects-button-primary"
        >
          <Plus size={18} />
          Add Project
        </button>
      </div>

      {/* STATS */}
      <div className="projects-stats-grid">
        <StatCard
          label="Total Projects"
          value={stats.total}
        />

        <StatCard
          label="Planned"
          value={stats.planned}
        />

        <StatCard
          label="In Progress"
          value={stats.inProgress}
        />

        <StatCard
          label="Completed"
          value={stats.completed}
        />
      </div>

      {/* SEARCH + FILTER */}
      <div className="projects-filters">
        <input
          className="projects-input projects-search-input"
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search projects or technologies..."
        />

        <select
          className="projects-input projects-select"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="All">
            All Statuses
          </option>

          {STATUS_OPTIONS.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="projects-card projects-form-card">
          <div className="projects-form-header">
            <div>
              <h2 className="projects-form-title">
                {editingId
                  ? "Edit Project"
                  : "Add Project"}
              </h2>

              <p className="projects-form-subtitle">
                Add your project and portfolio details.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="projects-icon-button"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="projects-form-grid">
            <FormField label="Project Name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  updateForm(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Example: Taskbar"
                className="projects-input"
              />
            </FormField>

            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  updateForm(
                    "status",
                    e.target.value
                  )
                }
                className="projects-input projects-select"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Technologies">
              <input
                type="text"
                value={form.technologies}
                onChange={(e) =>
                  updateForm(
                    "technologies",
                    e.target.value
                  )
                }
                placeholder="Java, Spring Boot, React, MySQL"
                className="projects-input"
              />
            </FormField>

            <FormField label="GitHub Link">
              <input
                type="url"
                value={form.githubLink}
                onChange={(e) =>
                  updateForm(
                    "githubLink",
                    e.target.value
                  )
                }
                placeholder="https://github.com/..."
                className="projects-input"
              />
            </FormField>

            <FormField label="Live Demo Link">
              <input
                type="url"
                value={form.liveLink}
                onChange={(e) =>
                  updateForm(
                    "liveLink",
                    e.target.value
                  )
                }
                placeholder="https://..."
                className="projects-input"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) =>
                  updateForm(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Briefly describe what the project does..."
                className="projects-input projects-textarea"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateForm(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Add interview points, achievements, improvements, etc."
                className="projects-input projects-textarea"
              />
            </FormField>
          </div>

          <div className="projects-form-actions">
            <button
              type="button"
              onClick={saveProject}
              className="projects-button projects-button-primary"
            >
              <Plus size={17} />

              {editingId
                ? "Update Project"
                : "Save Project"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="projects-button projects-button-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* PROJECT LIST */}
      <section className="projects-card">
        <div className="projects-list-header">
          <h2 className="projects-list-title">
            My Projects
          </h2>

          <p className="projects-list-count">
            {filteredProjects.length} project
            {filteredProjects.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        {loading ? (
          <div className="projects-empty-state">
            <FolderGit2
              size={44}
              className="projects-empty-icon"
            />

            <h3 className="projects-empty-title">
              Loading projects...
            </h3>

            <p className="projects-empty-text">
              Loading your projects from Firebase.
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="projects-empty-state">
            <FolderGit2
              size={44}
              className="projects-empty-icon"
            />

            <h3 className="projects-empty-title">
              No projects found
            </h3>

            <p className="projects-empty-text">
              Add your projects to build your portfolio.
            </p>
          </div>
        ) : (
          <div className="projects-list">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={openEditForm}
                onDelete={deleteProject}
                onStatusChange={updateStatus}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  return (
    <article className="projects-item">
      <div className="projects-item-header">
        <div>
          <h3 className="projects-item-title">
            {project.name}
          </h3>

          <p className="projects-status">
            {project.status}
          </p>
        </div>

        <FolderGit2
          size={21}
          className="projects-item-icon"
        />
      </div>

      {project.description && (
        <p className="projects-description">
          {project.description}
        </p>
      )}

      {project.technologies && (
        <div className="projects-tech-tags">
          {project.technologies
            .split(",")
            .map((technology, index) => {
              const name = technology.trim();

              if (!name) {
                return null;
              }

              return (
                <span
                  key={`${name}-${index}`}
                  className="projects-tech-tag"
                >
                  {name}
                </span>
              );
            })}
        </div>
      )}

      {project.notes && (
        <div className="projects-notes">
          {project.notes}
        </div>
      )}

      <div className="projects-item-actions">
        {project.githubLink && (
          <a
            href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="projects-action-button"
          >
            <GitBranch size={15} />
            GitHub
          </a>
        )}

        {project.liveLink && (
          <a
            href={project.liveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="projects-action-button"
          >
            <ExternalLink size={15} />
            Live Demo
          </a>
        )}

        <select
          className="projects-input projects-select projects-status-select"
          value={project.status}
          onChange={(e) =>
            onStatusChange(
              project.id,
              e.target.value
            )
          }
        >
          {STATUS_OPTIONS.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onEdit(project)}
          className="projects-action-button projects-edit-button"
        >
          <Pencil size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(project.id)
          }
          className="projects-action-button projects-delete-button"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="projects-stat-card">
      <div className="projects-stat-label">
        {label}
      </div>

      <strong className="projects-stat-value">
        {value}
      </strong>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="projects-form-field">
      <span>{label}</span>

      {children}
    </label>
  );
}