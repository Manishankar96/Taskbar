import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";

const STORAGE_KEY = "taskbar-saved-jobs";
const SAVED_JOBS_UPDATED_EVENT = "taskbarSavedJobsUpdated";

const EMPTY_FORM = {
  company: "",
  role: "",
  location: "",
  salary: "",
  jobLink: "",
  actionDate: "",
  notes: "",
};

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function getTodayDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadSavedJobs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load saved jobs:", error);
    return [];
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return "Date not set";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SavedJobs() {
  const [jobs, setJobs] = useState(loadSavedJobs);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

    window.dispatchEvent(
      new Event(SAVED_JOBS_UPDATED_EVENT)
    );
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return jobs;
    }

    return jobs.filter((job) => {
      return (
        job.company?.toLowerCase().includes(searchText) ||
        job.role?.toLowerCase().includes(searchText) ||
        job.location?.toLowerCase().includes(searchText)
      );
    });
  }, [jobs, search]);

  function openAddForm() {
    setForm({
      ...EMPTY_FORM,
      savedDate: getTodayDate(),
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

  function saveJob() {
    if (!form.company.trim() || !form.role.trim()) {
      alert("Please enter Company and Job Role.");
      return;
    }

    const newJob = {
      id: createId(),
      company: form.company.trim(),
      role: form.role.trim(),
      location: form.location.trim(),
      salary: form.salary.trim(),
      jobLink: form.jobLink.trim(),
      actionDate: form.actionDate || "",
      actionCompleted: false,
      notes: form.notes.trim(),
      savedDate: getTodayDate(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setJobs((current) => [newJob, ...current]);

    closeForm();
  }

  function deleteJob(id) {
    const confirmed = window.confirm(
      "Remove this saved job?"
    );

    if (!confirmed) {
      return;
    }

    setJobs((current) =>
      current.filter((job) => job.id !== id)
    );
  }

  return (
    <div className="saved-jobs-page">
      {/* Header */}
      <div className="saved-jobs-header">
        <div>
          <div className="saved-jobs-title-row">
            <Bookmark size={28} />

            <h1>Saved Jobs</h1>
          </div>

          <p className="saved-jobs-subtitle">
            Save interesting jobs and apply when you are ready.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="saved-jobs-button saved-jobs-button-primary"
        >
          <Plus size={18} />
          Save Job
        </button>
      </div>

      {/* Summary */}
      <div className="saved-jobs-summary-grid">
        <SummaryCard
          icon={<Bookmark size={20} />}
          label="Saved Jobs"
          value={jobs.length}
        />

        <SummaryCard
          icon={<CalendarDays size={20} />}
          label="Saved Today"
          value={
            jobs.filter(
              (job) => job.savedDate === getTodayDate()
            ).length
          }
        />

        <SummaryCard
          icon={<CalendarDays size={20} />}
          label="Action Dates"
          value={
            jobs.filter(
              (job) => Boolean(job.actionDate)
            ).length
          }
        />
      </div>

      {/* Search */}
      <div className="saved-jobs-search">
        <Search
          size={18}
          className="saved-jobs-search-icon"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, role or location..."
          className="saved-jobs-input saved-jobs-search-input"
        />
      </div>

      {/* Add Form */}
      {showForm && (
        <section className="saved-jobs-card saved-jobs-form-card">
          <div className="saved-jobs-form-header">
            <div>
              <h2 className="saved-jobs-form-title">
                Save a Job
              </h2>

              <p className="saved-jobs-form-subtitle">
                Add the job details you want to remember.
                Optionally set an Action Date to create a
                task in the central To-Do.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="saved-jobs-icon-button"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="saved-jobs-form-grid">
            <FormField label="Company *">
              <input
                type="text"
                value={form.company}
                onChange={(e) =>
                  updateForm("company", e.target.value)
                }
                placeholder="Example: Infosys"
                className="saved-jobs-input"
              />
            </FormField>

            <FormField label="Job Role *">
              <input
                type="text"
                value={form.role}
                onChange={(e) =>
                  updateForm("role", e.target.value)
                }
                placeholder="Example: Java Developer"
                className="saved-jobs-input"
              />
            </FormField>

            <FormField label="Location">
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  updateForm("location", e.target.value)
                }
                placeholder="Example: Hyderabad"
                className="saved-jobs-input"
              />
            </FormField>

            <FormField label="Salary">
              <input
                type="text"
                value={form.salary}
                onChange={(e) =>
                  updateForm("salary", e.target.value)
                }
                placeholder="Example: ₹4 - 6 LPA"
                className="saved-jobs-input"
              />
            </FormField>

            <FormField label="Job Link">
              <input
                type="url"
                value={form.jobLink}
                onChange={(e) =>
                  updateForm("jobLink", e.target.value)
                }
                placeholder="https://..."
                className="saved-jobs-input"
              />
            </FormField>

            <FormField label="Action Date">
              <input
                type="date"
                value={form.actionDate}
                onChange={(e) =>
                  updateForm("actionDate", e.target.value)
                }
                className="saved-jobs-input"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateForm("notes", e.target.value)
                }
                placeholder="Add notes about this job..."
                className="saved-jobs-input saved-jobs-textarea"
              />
            </FormField>
          </div>

          <div className="saved-jobs-form-actions">
            <button
              type="button"
              onClick={saveJob}
              className="saved-jobs-button saved-jobs-button-primary"
            >
              <Bookmark size={17} />
              Save Job
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="saved-jobs-button saved-jobs-button-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Saved Jobs */}
      <section className="saved-jobs-card">
        <div className="saved-jobs-list-header">
          <h2>Saved Jobs</h2>

          <p className="saved-jobs-list-count">
            {filteredJobs.length} job
            {filteredJobs.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="saved-jobs-empty-state">
            <Bookmark
              size={44}
              className="saved-jobs-empty-icon"
            />

            <h3>No saved jobs</h3>

            <p>
              Save interesting jobs here before applying.
            </p>
          </div>
        ) : (
          <div className="saved-jobs-list">
            {filteredJobs.map((job) => (
              <SavedJobCard
                key={job.id}
                job={job}
                onDelete={deleteJob}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SavedJobCard({ job, onDelete }) {
  return (
    <article className="saved-jobs-item">
      <div className="saved-jobs-item-header">
        <div>
          <h3 className="saved-jobs-item-title">
            {job.role}
          </h3>

          <p className="saved-jobs-company">
            {job.company}
          </p>
        </div>

        <Bookmark
          size={20}
          className="saved-jobs-item-icon"
        />
      </div>

      <div className="saved-jobs-item-meta">
        {job.location && (
          <div className="saved-jobs-meta-item">
            <MapPin size={15} />
            <span>{job.location}</span>
          </div>
        )}

        {job.salary && (
          <div className="saved-jobs-meta-item">
            <IndianRupee size={15} />
            <span>{job.salary}</span>
          </div>
        )}

        <div className="saved-jobs-meta-item">
          <CalendarDays size={15} />
          <span>
            Saved: {formatDate(job.savedDate)}
          </span>
        </div>

        {job.actionDate && (
          <div className="saved-jobs-meta-item">
            {job.actionCompleted ? (
              <CheckCircle2 size={15} />
            ) : (
              <CalendarDays size={15} />
            )}

            <span>
              Action: {formatDate(job.actionDate)}
              {job.actionCompleted ? " • Completed" : ""}
            </span>
          </div>
        )}
      </div>

      {job.notes && (
        <div className="saved-jobs-notes">
          {job.notes}
        </div>
      )}

      <div className="saved-jobs-item-actions">
        {job.jobLink && (
          <a
            href={job.jobLink}
            target="_blank"
            rel="noopener noreferrer"
            className="saved-jobs-action-button"
          >
            <ExternalLink size={15} />
            Open Job
          </a>
        )}

        <button
          type="button"
          onClick={() => onDelete(job.id)}
          className="saved-jobs-action-button saved-jobs-delete-button"
        >
          <Trash2 size={15} />
          Remove
        </button>
      </div>
    </article>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="saved-jobs-summary-card">
      <div className="saved-jobs-summary-label">
        {icon}
        <span>{label}</span>
      </div>

      <strong className="saved-jobs-summary-value">
        {value}
      </strong>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="saved-jobs-form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
