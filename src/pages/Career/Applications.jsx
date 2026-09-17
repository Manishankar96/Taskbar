import React, { useEffect, useMemo, useState } from "react";
import { getApplications, saveApplications } from "../../utils/db";
import {
  Briefcase,
  CalendarDays,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const APPLICATIONS_UPDATED_EVENT = "taskbarApplicationsUpdated";

const STATUS_OPTIONS = [
  "Applied",
  "Under Review",
  "Interview",
  "Selected",
  "Rejected",
  "Withdrawn",
];

const EMPTY_FORM = {
  company: "",
  role: "",
  appliedDate: "",
  followUpDate: "",
  status: "Applied",
  jobLink: "",
  notes: "",
};

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const data = await getApplications();

        if (!cancelled) {
          setApplications(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load applications:", error);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event(APPLICATIONS_UPDATED_EVENT));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return applications
      .filter((application) => {
        if (statusFilter === "All") {
          return true;
        }

        return application.status === statusFilter;
      })
      .filter((application) => {
        if (!searchText) {
          return true;
        }

        return (
          application.company
            ?.toLowerCase()
            .includes(searchText) ||
          application.role
            ?.toLowerCase()
            .includes(searchText)
        );
      })
      .sort((a, b) => {
        const dateA = a.appliedDate || "";
        const dateB = b.appliedDate || "";

        return dateB.localeCompare(dateA);
      });
  }, [applications, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: applications.length,

      applied: applications.filter(
        (item) => item.status === "Applied"
      ).length,

      interview: applications.filter(
        (item) => item.status === "Interview"
      ).length,

      selected: applications.filter(
        (item) => item.status === "Selected"
      ).length,

      rejected: applications.filter(
        (item) => item.status === "Rejected"
      ).length,
    };
  }, [applications]);

  function openAddForm() {
    setForm({
      ...EMPTY_FORM,
      appliedDate: getTodayDate(),
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveApplication() {
    if (!form.company.trim() || !form.role.trim()) {
      alert("Please enter Company and Job Role.");
      return;
    }

    const newApplication = {
      id: createId(),
      company: form.company.trim(),
      role: form.role.trim(),
      appliedDate: form.appliedDate || "",
      followUpDate: form.followUpDate || "",
      status: form.status || "Applied",
      jobLink: form.jobLink.trim(),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedApplications = [
      newApplication,
      ...applications,
    ];

    try {
      await saveApplications(updatedApplications);

      setApplications(updatedApplications);
      closeForm();
    } catch (error) {
      console.error("Failed to save application:", error);

      alert(
        "Application could not be saved. Please try again."
      );
    }
  }

  async function deleteApplication(id) {
    const confirmed = window.confirm(
      "Delete this job application?"
    );

    if (!confirmed) {
      return;
    }

    const updatedApplications = applications.filter(
      (application) => application.id !== id
    );

    try {
      await saveApplications(updatedApplications);

      setApplications(updatedApplications);
    } catch (error) {
      console.error("Failed to delete application:", error);

      alert(
        "Application could not be deleted. Please try again."
      );
    }
  }

  async function updateStatus(id, status) {
    const currentApplication = applications.find(
      (application) => application.id === id
    );

    if (!currentApplication) {
      return;
    }

    const updatedApplication = {
      ...currentApplication,
      status,
      updatedAt: new Date().toISOString(),
    };

    const updatedApplications = applications.map(
      (application) =>
        application.id === id
          ? updatedApplication
          : application
    );

    try {
      await saveApplications(updatedApplications);

      setApplications(updatedApplications);
    } catch (error) {
      console.error(
        "Failed to update application status:",
        error
      );

      alert(
        "Application status could not be updated."
      );
    }
  }

  return (
    <div className="applications-page">
      {/* Header */}
      <div className="applications-header">
        <div>
          <div className="applications-title-row">
            <Briefcase size={28} />

            <h1>
              Applications
            </h1>
          </div>

          <p className="applications-subtitle">
            Track the jobs you apply for and their progress.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="applications-button applications-button-primary"
        >
          <Plus size={18} />
          Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="applications-stats-grid">
        <StatCard
          label="Total"
          value={stats.total}
        />

        <StatCard
          label="Applied"
          value={stats.applied}
        />

        <StatCard
          label="Interviews"
          value={stats.interview}
        />

        <StatCard
          label="Selected"
          value={stats.selected}
        />

        <StatCard
          label="Rejected"
          value={stats.rejected}
        />
      </div>

      {/* Filters */}
      <div className="applications-filters">
        <div className="applications-search-wrap">
          <Search
            size={18}
            className="applications-search-icon"
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search company or role..."
            className="applications-input applications-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="applications-input applications-select"
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

      {/* Add Form */}
      {showForm && (
        <section className="applications-card applications-form-card">
          <div className="applications-form-header">
            <h2>
              Add Job Application
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="applications-icon-button"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="applications-form-grid">
            <FormField label="Company *">
              <input
                type="text"
                value={form.company}
                onChange={(e) =>
                  updateForm(
                    "company",
                    e.target.value
                  )
                }
                placeholder="Example: TCS"
                className="applications-input"
              />
            </FormField>

            <FormField label="Job Role *">
              <input
                type="text"
                value={form.role}
                onChange={(e) =>
                  updateForm(
                    "role",
                    e.target.value
                  )
                }
                placeholder="Example: Java Developer"
                className="applications-input"
              />
            </FormField>

            <FormField label="Applied Date">
              <input
                type="date"
                value={form.appliedDate}
                onChange={(e) =>
                  updateForm(
                    "appliedDate",
                    e.target.value
                  )
                }
                className="applications-input"
              />
            </FormField>

            <FormField label="Follow-up Date">
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) =>
                  updateForm(
                    "followUpDate",
                    e.target.value
                  )
                }
                className="applications-input"
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
                className="applications-input applications-select"
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

            <FormField label="Job Link">
              <input
                type="url"
                value={form.jobLink}
                onChange={(e) =>
                  updateForm(
                    "jobLink",
                    e.target.value
                  )
                }
                placeholder="https://..."
                className="applications-input"
              />
            </FormField>
          </div>

          <div className="applications-notes-field">
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateForm(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Add notes about this application..."
                className="applications-input applications-textarea"
              />
            </FormField>
          </div>

          <div className="applications-form-actions">
            <button
              type="button"
              onClick={saveApplication}
              className="applications-button applications-button-primary"
            >
              <Plus size={17} />
              Save Application
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="applications-button applications-button-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Applications */}
      <section className="applications-card">
        <div className="applications-list-header">
          <h2>
            Job Applications
          </h2>

          <p className="applications-list-count">
            {filteredApplications.length} application
            {filteredApplications.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="applications-empty-state">
            <Briefcase
              size={42}
              className="applications-empty-icon"
            />

            <h3>
              No applications found
            </h3>

            <p>
              Add your first job application.
            </p>
          </div>
        ) : (
          <div className="applications-list">
            {filteredApplications.map(
              (application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onDelete={deleteApplication}
                  onStatusChange={updateStatus}
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ApplicationCard({
  application,
  onDelete,
  onStatusChange,
}) {
  return (
    <div className="applications-item">
      <div className="applications-item-header">
        <div className="applications-item-main">
          <h3>
            {application.role}
          </h3>

          <p className="applications-company">
            {application.company}
          </p>

          <div className="applications-date">
            <CalendarDays size={15} />

            <span>
              Applied:{" "}
              {application.appliedDate
                ? formatDate(
                    application.appliedDate
                  )
                : "Date not set"}
            </span>
          </div>

          {application.followUpDate && (
            <div className="applications-date">
              <CalendarDays size={15} />

              <span>
                Follow-up:{" "}
                {formatDate(
                  application.followUpDate
                )}
              </span>
            </div>
          )}
        </div>

        <select
          value={application.status}
          onChange={(e) =>
            onStatusChange(
              application.id,
              e.target.value
            )
          }
          className="applications-input applications-select applications-status-select"
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
      </div>

      {application.notes && (
        <div className="applications-notes-preview">
          {application.notes}
        </div>
      )}

      <div className="applications-item-actions">
        {application.jobLink && (
          <a
            href={application.jobLink}
            target="_blank"
            rel="noopener noreferrer"
            className="applications-action-button applications-link-button"
          >
            <ExternalLink size={15} />
            Open Job
          </a>
        )}

        <button
          type="button"
          onClick={() =>
            onDelete(application.id)
          }
          className="applications-action-button applications-delete-button"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="applications-stat-card">
      <div className="applications-stat-label">
        {label}
      </div>

      <div className="applications-stat-value">
        {value}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="applications-form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function getTodayDate() {
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

function formatDate(dateString) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}