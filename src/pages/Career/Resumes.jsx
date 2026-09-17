import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Link as LinkIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  getItemsFromFirestore,
  saveItemsToFirestore,
  deleteItemFromFirestore,
} from "../../firebase/firestore";

const RESUMES_COLLECTION = "resumes";

const RESUMES_UPDATED_EVENT = "taskbarResumesUpdated";

const EMPTY_FORM = {
  name: "",
  targetRole: "",
  link: "",
  notes: "",
};

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function getTodayDate() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );

  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Date not set";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadResumes() {
      try {
        const data = await getItemsFromFirestore(
          RESUMES_COLLECTION
        );

        if (!cancelled) {
          setResumes(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        console.error(
          "Failed to load resumes from Firebase:",
          error
        );

        if (!cancelled) {
          setResumes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResumes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new Event(RESUMES_UPDATED_EVENT)
    );
  }, [resumes]);

  const primaryResume = useMemo(
    () =>
      resumes.find(
        (resume) => resume.isPrimary
      ),
    [resumes]
  );

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(resume) {
    setForm({
      name: resume.name || "",
      targetRole: resume.targetRole || "",
      link: resume.link || "",
      notes: resume.notes || "",
    });

    setEditingId(resume.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveResume() {
    if (
      !form.name.trim() ||
      !form.targetRole.trim()
    ) {
      alert(
        "Please enter Resume Name and Target Role."
      );
      return;
    }

    try {
      if (editingId !== null) {
        const updatedResumes = resumes.map(
          (resume) =>
            resume.id === editingId
              ? {
                  ...resume,
                  name: form.name.trim(),
                  targetRole:
                    form.targetRole.trim(),
                  link: form.link.trim(),
                  notes: form.notes.trim(),
                  updatedDate: getTodayDate(),
                }
              : resume
        );

        await saveItemsToFirestore(
          RESUMES_COLLECTION,
          updatedResumes
        );

        setResumes(updatedResumes);
        closeForm();

        return;
      }

      const today = getTodayDate();

      const newResume = {
        id: createId(),
        name: form.name.trim(),
        targetRole: form.targetRole.trim(),
        link: form.link.trim(),
        notes: form.notes.trim(),
        createdDate: today,
        updatedDate: today,
        isPrimary: resumes.length === 0,
      };

      const updatedResumes = [
        newResume,
        ...resumes,
      ];

      await saveItemsToFirestore(
        RESUMES_COLLECTION,
        updatedResumes
      );

      setResumes(updatedResumes);
      closeForm();
    } catch (error) {
      console.error(
        "Failed to save resume to Firebase:",
        error
      );

      alert(
        "Resume could not be saved. Please try again."
      );
    }
  }

  async function setPrimary(id) {
    const updatedResumes = resumes.map(
      (resume) => ({
        ...resume,
        isPrimary: resume.id === id,
      })
    );

    try {
      await saveItemsToFirestore(
        RESUMES_COLLECTION,
        updatedResumes
      );

      setResumes(updatedResumes);
    } catch (error) {
      console.error(
        "Failed to set primary resume:",
        error
      );

      alert(
        "Primary resume could not be updated."
      );
    }
  }

  async function deleteResume(id) {
    const resume = resumes.find(
      (item) => item.id === id
    );

    if (!resume) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${resume.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const remaining = resumes.filter(
        (item) => item.id !== id
      );

      if (
        resume.isPrimary &&
        remaining.length > 0
      ) {
        remaining[0] = {
          ...remaining[0],
          isPrimary: true,
        };
      }

      await deleteItemFromFirestore(
        RESUMES_COLLECTION,
        id
      );

      if (remaining.length > 0) {
        await saveItemsToFirestore(
          RESUMES_COLLECTION,
          remaining
        );
      }

      setResumes(remaining);
    } catch (error) {
      console.error(
        "Failed to delete resume from Firebase:",
        error
      );

      alert(
        "Resume could not be deleted. Please try again."
      );
    }
  }

  if (loading) {
    return (
      <div className="resumes-page">
        <div className="resumes-header">
          <div>
            <div className="resumes-title-row">
              <FileText size={28} />

              <h1>
                Resumes
              </h1>
            </div>

            <p className="resumes-subtitle">
              Loading resumes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resumes-page">
      {/* Header */}
      <div className="resumes-header">
        <div>
          <div className="resumes-title-row">
            <FileText size={28} />

            <h1>
              Resumes
            </h1>
          </div>

          <p className="resumes-subtitle">
            Manage different resume versions for your job search.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="resumes-button resumes-button-primary"
        >
          <Plus size={18} />
          Add Resume
        </button>
      </div>

      {/* Summary */}
      <div className="resumes-summary-grid">
        <SummaryCard
          label="Total Resumes"
          value={resumes.length}
          icon={<FileText size={20} />}
        />

        <SummaryCard
          label="Primary Resume"
          value={
            primaryResume
              ? primaryResume.name
              : "Not set"
          }
          icon={<Star size={20} />}
        />
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <section className="resumes-card resumes-form-card">
          <div className="resumes-form-header">
            <div>
              <h2 className="resumes-form-title">
                {editingId !== null
                  ? "Edit Resume"
                  : "Add Resume"}
              </h2>

              <p className="resumes-form-subtitle">
                {editingId !== null
                  ? "Update your resume version."
                  : "Add a resume version to your career profile."}
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="resumes-icon-button"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="resumes-form-grid">
            <FormField label="Resume Name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  updateForm(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Example: Java Full Stack Resume"
                className="resumes-input"
              />
            </FormField>

            <FormField label="Target Role *">
              <input
                type="text"
                value={form.targetRole}
                onChange={(e) =>
                  updateForm(
                    "targetRole",
                    e.target.value
                  )
                }
                placeholder="Example: Java Developer"
                className="resumes-input"
              />
            </FormField>

            <FormField label="Resume Link">
              <input
                type="url"
                value={form.link}
                onChange={(e) =>
                  updateForm(
                    "link",
                    e.target.value
                  )
                }
                placeholder="https://drive.google.com/..."
                className="resumes-input"
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
                placeholder="Example: Used for Java Full Stack applications."
                className="resumes-input resumes-textarea"
              />
            </FormField>
          </div>

          <div className="resumes-form-actions">
            <button
              type="button"
              onClick={saveResume}
              className="resumes-button resumes-button-primary"
            >
              {editingId !== null ? (
                <Pencil size={17} />
              ) : (
                <Plus size={17} />
              )}

              {editingId !== null
                ? "Update Resume"
                : "Save Resume"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="resumes-button resumes-button-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Resume List */}
      <section className="resumes-card">
        <div className="resumes-list-header">
          <h2>
            My Resumes
          </h2>

          <p className="resumes-list-subtitle">
            Keep different versions for different job roles.
          </p>
        </div>

        {resumes.length === 0 ? (
          <div className="resumes-empty-state">
            <FileText
              size={44}
              className="resumes-empty-icon"
            />

            <h3>
              No resumes yet
            </h3>

            <p>
              Add your first resume version.
            </p>
          </div>
        ) : (
          <div className="resumes-list">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onSetPrimary={setPrimary}
                onDelete={deleteResume}
                onEdit={openEditForm}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResumeCard({
  resume,
  onSetPrimary,
  onDelete,
  onEdit,
}) {
  return (
    <article className="resumes-item">
      <div className="resumes-item-header">
        <div>
          <div className="resumes-title-row">
            <h3 className="resumes-item-title">
              {resume.name}
            </h3>

            {resume.isPrimary && (
              <span className="resumes-primary-badge">
                PRIMARY
              </span>
            )}
          </div>

          <p className="resumes-target-role">
            {resume.targetRole}
          </p>
        </div>

        <FileText
          size={21}
          className="resumes-item-icon"
        />
      </div>

      <div className="resumes-item-meta">
        <div>
          <CalendarDays size={15} />

          <span>
            Created:{" "}
            {formatDate(resume.createdDate)}
          </span>
        </div>

        <div>
          <CalendarDays size={15} />

          <span>
            Updated:{" "}
            {formatDate(resume.updatedDate)}
          </span>
        </div>
      </div>

      {resume.notes && (
        <div className="resumes-notes">
          {resume.notes}
        </div>
      )}

      <div className="resumes-item-actions">
        {resume.link && (
          <a
            href={resume.link}
            target="_blank"
            rel="noopener noreferrer"
            className="resumes-action-button"
          >
            <LinkIcon size={15} />
            Open Resume
          </a>
        )}

        {!resume.isPrimary && (
          <button
            type="button"
            onClick={() =>
              onSetPrimary(resume.id)
            }
            className="resumes-action-button resumes-primary-button"
          >
            <Star size={15} />
            Set Primary
          </button>
        )}

        <button
          type="button"
          onClick={() => onEdit(resume)}
          className="resumes-action-button"
        >
          <Pencil size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(resume.id)
          }
          className="resumes-action-button resumes-delete-button"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="resumes-summary-card">
      <div className="resumes-summary-label">
        {icon}

        <span>
          {label}
        </span>
      </div>

      <strong className="resumes-summary-value">
        {value}
      </strong>
    </div>
  );
}

function FormField({
  label,
  children,
}) {
  return (
    <label className="resumes-form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}