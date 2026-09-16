import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_KEY = "taskbar-interviews";
const INTERVIEWS_UPDATED_EVENT = "taskbarInterviewsUpdated";

function notifyInterviewsUpdated() {
  window.dispatchEvent(new Event(INTERVIEWS_UPDATED_EVENT));
}

const STATUS_OPTIONS = [
  "Scheduled",
  "Completed",
  "Passed",
  "Failed",
  "Cancelled",
];

const ROUND_OPTIONS = [
  "HR",
  "Technical",
  "Coding",
  "Managerial",
  "Final",
  "Other",
];

const EMPTY_FORM = {
  company: "",
  role: "",
  date: "",
  time: "",
  round: "Technical",
  status: "Scheduled",
  interviewer: "",
  meetingLink: "",
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

function loadInterviews() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load interviews:", error);
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

function formatTime(timeString) {
  if (!timeString) {
    return "Time not set";
  }

  const [hourString, minuteString] = timeString.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return timeString;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${period}`;
}

export default function Interviews() {
  const [interviews, setInterviews] = useState(
    loadInterviews
  );

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [statusFilter, setStatusFilter] = useState("All");

  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(interviews)
    );

    // Keep the central To-Do list in sync immediately.
    notifyInterviewsUpdated();
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return [...interviews]
      .filter((interview) => {
        if (statusFilter === "All") {
          return true;
        }

        return interview.status === statusFilter;
      })
      .filter((interview) => {
        if (!searchText) {
          return true;
        }

        return (
          interview.company
            ?.toLowerCase()
            .includes(searchText) ||
          interview.role
            ?.toLowerCase()
            .includes(searchText) ||
          interview.round
            ?.toLowerCase()
            .includes(searchText)
        );
      })
      .sort((a, b) => {
        const first = `${a.date || ""} ${
          a.time || ""
        }`;

        const second = `${b.date || ""} ${
          b.time || ""
        }`;

        return first.localeCompare(second);
      });
  }, [interviews, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: interviews.length,

      scheduled: interviews.filter(
        (item) => item.status === "Scheduled"
      ).length,

      completed: interviews.filter(
        (item) => item.status === "Completed"
      ).length,

      passed: interviews.filter(
        (item) => item.status === "Passed"
      ).length,

      failed: interviews.filter(
        (item) => item.status === "Failed"
      ).length,
    };
  }, [interviews]);

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      date: getTodayDate(),
    });

    setShowForm(true);
  }

  function openEditForm(interview) {
    setEditingId(interview.id);

    setForm({
      company: interview.company || "",
      role: interview.role || "",
      date: interview.date || "",
      time: interview.time || "",
      round: interview.round || "Technical",
      status: interview.status || "Scheduled",
      interviewer: interview.interviewer || "",
      meetingLink: interview.meetingLink || "",
      notes: interview.notes || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveInterview() {
    if (
      !form.company.trim() ||
      !form.role.trim() ||
      !form.date
    ) {
      alert(
        "Please enter Company, Job Role and Interview Date."
      );

      return;
    }

    if (editingId) {
      setInterviews((current) =>
        current.map((interview) =>
          interview.id === editingId
            ? {
                ...interview,
                company: form.company.trim(),
                role: form.role.trim(),
                date: form.date,
                time: form.time,
                round: form.round,
                status: form.status,
                interviewer:
                  form.interviewer.trim(),
                meetingLink:
                  form.meetingLink.trim(),
                notes: form.notes.trim(),
                updatedAt:
                  new Date().toISOString(),
              }
            : interview
        )
      );
    } else {
      const newInterview = {
        id: createId(),
        company: form.company.trim(),
        role: form.role.trim(),
        date: form.date,
        time: form.time,
        round: form.round,
        status: form.status,
        interviewer: form.interviewer.trim(),
        meetingLink: form.meetingLink.trim(),
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setInterviews((current) => [
        ...current,
        newInterview,
      ]);
    }

    closeForm();
  }

  function deleteInterview(id) {
    const confirmed = window.confirm(
      "Delete this interview?"
    );

    if (!confirmed) {
      return;
    }

    setInterviews((current) =>
      current.filter(
        (interview) => interview.id !== id
      )
    );
  }

  function updateStatus(id, status) {
    setInterviews((current) =>
      current.map((interview) =>
        interview.id === id
          ? {
              ...interview,
              status,
              updatedAt: new Date().toISOString(),
            }
          : interview
      )
    );
  }

  return (
    <div className="interviews-page">
      {/* Header */}
      <div className="interviews-header">
        <div>
          <div className="interviews-title-row">
            <CalendarDays size={28} />

            <h1 className="interviews-title">
              Interviews
            </h1>
          </div>

          <p className="interviews-subtitle">
            Track your interviews, rounds and results.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="interviews-button interviews-button-primary"
        >
          <Plus size={18} />
          Add Interview
        </button>
      </div>

      {/* Stats */}
      <div className="interviews-stats-grid">
        <StatCard
          label="Total"
          value={stats.total}
        />

        <StatCard
          label="Scheduled"
          value={stats.scheduled}
        />

        <StatCard
          label="Completed"
          value={stats.completed}
        />

        <StatCard
          label="Passed"
          value={stats.passed}
        />

        <StatCard
          label="Failed"
          value={stats.failed}
        />
      </div>

      {/* Filters */}
      <div className="interviews-filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, role or round..."
          className="interviews-input interviews-search-input"
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="interviews-input interviews-select"
        >
          <option value="All">All Statuses</option>

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

      {/* Form */}
      {showForm && (
        <section
          className="interviews-card interviews-form-card"
        >
          <div className="interviews-form-header">
            <div>
              <h2>
                {editingId
                  ? "Edit Interview"
                  : "Add Interview"}
              </h2>

              <p className="interviews-form-subtitle">
                Add the details of your interview.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="interviews-icon-button"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="interviews-form-grid">
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
                className="interviews-input"
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
                className="interviews-input"
              />
            </FormField>

            <FormField label="Interview Date *">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  updateForm(
                    "date",
                    e.target.value
                  )
                }
                className="interviews-input"
              />
            </FormField>

            <FormField label="Interview Time">
              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  updateForm(
                    "time",
                    e.target.value
                  )
                }
                className="interviews-input"
              />
            </FormField>

            <FormField label="Round">
              <select
                value={form.round}
                onChange={(e) =>
                  updateForm(
                    "round",
                    e.target.value
                  )
                }
                className="interviews-input interviews-select"
              >
                {ROUND_OPTIONS.map((round) => (
                  <option
                    key={round}
                    value={round}
                  >
                    {round}
                  </option>
                ))}
              </select>
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
                className="interviews-input interviews-select"
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

            <FormField label="Interviewer">
              <input
                type="text"
                value={form.interviewer}
                onChange={(e) =>
                  updateForm(
                    "interviewer",
                    e.target.value
                  )
                }
                placeholder="Example: HR Manager"
                className="interviews-input"
              />
            </FormField>

            <FormField label="Meeting Link">
              <input
                type="url"
                value={form.meetingLink}
                onChange={(e) =>
                  updateForm(
                    "meetingLink",
                    e.target.value
                  )
                }
                placeholder="https://meet.google.com/..."
                className="interviews-input"
              />
            </FormField>
          </div>

          <div className="interviews-notes-field">
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateForm(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Topics to prepare, interview feedback, questions..."
                className="interviews-input interviews-textarea"
              />
            </FormField>
          </div>

          <div className="interviews-form-actions">
            <button
              type="button"
              onClick={saveInterview}
              className="interviews-button interviews-button-primary"
            >
              <CheckCircle2 size={17} />

              {editingId
                ? "Update Interview"
                : "Save Interview"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="interviews-button interviews-button-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Interview List */}
      <section className="interviews-card">
        <div className="interviews-list-header">
          <h2 className="interviews-list-title">
            Interview Schedule
          </h2>

          <p className="interviews-list-count">
            {filteredInterviews.length} interview
            {filteredInterviews.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        {filteredInterviews.length === 0 ? (
          <div className="interviews-empty-state">
            <CalendarDays
              size={44}
              className="interviews-empty-icon"
            />

            <h3 className="interviews-empty-title">
              No interviews found
            </h3>

            <p className="interviews-empty-text">
              Add an interview when you receive an opportunity.
            </p>
          </div>
        ) : (
          <div className="interviews-list">
            {filteredInterviews.map(
              (interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  onEdit={openEditForm}
                  onDelete={deleteInterview}
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

function InterviewCard({
  interview,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  return (
    <article className="interviews-item">
      <div className="interviews-item-header">
        <div className="interviews-item-main">
          <h3 className="interviews-item-title">
            {interview.role}
          </h3>

          <p className="interviews-company">
            {interview.company}
          </p>

          <div className="interviews-meta">
            <span
              className="interviews-meta-item"
            >
              <CalendarDays size={15} />
              {formatDate(interview.date)}
            </span>

            {interview.time && (
              <span
                className="interviews-meta-item"
              >
                <Clock3 size={15} />
                {formatTime(interview.time)}
              </span>
            )}

            <span>{interview.round}</span>
          </div>
        </div>

        <select
          value={interview.status}
          onChange={(e) =>
            onStatusChange(
              interview.id,
              e.target.value
            )
          }
          className="interviews-input interviews-select interviews-status-select"
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

      {interview.interviewer && (
        <div className="interviews-extra-field">
          Interviewer:{" "}
          <strong>
            {interview.interviewer}
          </strong>
        </div>
      )}

      {interview.notes && (
        <div className="interviews-notes-preview">
          {interview.notes}
        </div>
      )}

      <div className="interviews-item-actions">
        {interview.meetingLink && (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="interviews-action-button interviews-link-button"
          >
            Open Meeting
          </a>
        )}

        <button
          type="button"
          onClick={() => onEdit(interview)}
          className="interviews-action-button interviews-edit-button"
        >
          <Edit3 size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(interview.id)
          }
          className="interviews-action-button interviews-delete-button"
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
    <div className="interviews-stat-card">
      <div className="interviews-stat-label">
        {label}
      </div>

      <strong className="interviews-stat-value">
        {value}
      </strong>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="interviews-form-field">
      <span>
        {label}
      </span>

      {children}
    </label>
  );
}
