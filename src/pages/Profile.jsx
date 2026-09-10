import { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Globe,
} from "lucide-react";

import {
  getProfile,
  saveProfile,
  exportAllData,
  validateBackup,
  importAllData,
} from "../utils/db";

function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    role: "",
    photo: "",
    email: "",
    portfolio: "",
    linkedin: "",
    github: "",
  });

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  const fileInputRef = useRef(null);

  // Load saved profile
  useEffect(() => {
    async function load() {
      try {
        const savedProfile = await getProfile();

        if (savedProfile) {
          setProfile({
            name: savedProfile.name || "",
            role: savedProfile.role || "",
            photo: savedProfile.photo || "",
            email: savedProfile.email || "",
            portfolio: savedProfile.portfolio || "",
            linkedin: savedProfile.linkedin || "",
            github: savedProfile.github || "",
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Change profile photo
  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert(
        "Please choose an image under 1.5 MB so it stores cleanly in the browser."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        photo: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  }

  // Save profile
  async function handleSave(event) {
    event.preventDefault();

    try {
      await saveProfile(profile);

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Could not save your profile. Please try again.");
    }
  }

  // Export all dashboard data
  async function handleExport() {
    try {
      const backup = await exportAllData();

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        {
          type: "application/json",
        }
      );

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "personal-dashboard-backup.json";

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  }

  // Open import file selector
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  // Import backup
  async function handleImportFile(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setImportMessage(null);

    let parsed;

    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setImportMessage({
        type: "error",
        text: "That file isn't valid JSON. Import cancelled.",
      });

      return;
    }

    const result = validateBackup(parsed);

    if (!result.valid) {
      setImportMessage({
        type: "error",
        text: `Invalid backup file: ${result.reason}`,
      });

      return;
    }

    const confirmed = window.confirm(
      "Importing this backup will REPLACE your current data for every section included in the file. This cannot be undone. Continue?"
    );

    if (!confirmed) return;

    try {
      await importAllData(parsed);

      setImportMessage({
        type: "success",
        text: "Backup imported successfully. Reloading your dashboard...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error("Import failed:", error);

      setImportMessage({
        type: "error",
        text: "Something went wrong while importing. No changes were saved.",
      });
    }
  }

  // Open website links
  function openExternalLink(url) {
    if (!url) return;

    let finalUrl = url.trim();

    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }

  // Open Gmail
  function openEmail() {
    if (!profile.email) return;

    window.location.href = `mailto:${profile.email}`;
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>👤 Profile</h1>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="module-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>👤 Profile & Data</h1>
          <p>
            Manage your profile and professional links.
          </p>
        </div>
      </div>

      {/* PROFILE SECTION */}
      <section className="section-card profile-form-card">

        <div className="section-title">
          <UserCircle size={22} />
          <h2>Profile</h2>
        </div>

        <form
          onSubmit={handleSave}
          className="profile-form"
        >

          {/* PROFILE PHOTO */}
          <div className="profile-photo-row">

            <div className="profile-photo-preview">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Profile"
                />
              ) : (
                <UserCircle size={56} />
              )}
            </div>

            <div>
              <label
                className="upload-label"
                htmlFor="profile-photo-input"
              >
                Change photo
              </label>

              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>

          </div>

          {/* NAME */}
          <div className="form-group">
            <label>Name</label>

            <input
              type="text"
              placeholder="Your name"
              value={profile.name}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  name: event.target.value,
                })
              }
            />
          </div>

          {/* ROLE */}
          <div className="form-group">
            <label>Role</label>

            <input
              type="text"
              placeholder="Example: Student, Developer"
              value={profile.role}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  role: event.target.value,
                })
              }
            />
          </div>

          {/* GMAIL */}
          <div className="form-group">
            <label>Gmail</label>

            <input
              type="email"
              placeholder="yourname@gmail.com"
              value={profile.email}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  email: event.target.value,
                })
              }
            />
          </div>

          {/* PORTFOLIO */}
          <div className="form-group">
            <label>Portfolio Website</label>

            <input
              type="url"
              placeholder="https://yourportfolio.com"
              value={profile.portfolio}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  portfolio: event.target.value,
                })
              }
            />
          </div>

          {/* LINKEDIN */}
          <div className="form-group">
            <label>LinkedIn</label>

            <input
              type="url"
              placeholder="https://www.linkedin.com/in/yourname"
              value={profile.linkedin}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  linkedin: event.target.value,
                })
              }
            />
          </div>

          {/* GITHUB */}
          <div className="form-group">
            <label>GitHub</label>

            <input
              type="url"
              placeholder="https://github.com/yourusername"
              value={profile.github}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  github: event.target.value,
                })
              }
            />
          </div>

          {/* SAVE BUTTON */}
          <button
            type="submit"
            className="save-topic-button"
          >
            <Save size={16} />
            Save Profile
          </button>

          {saved && (
            <span className="save-confirmation">
              <CheckCircle2 size={16} />
              Saved
            </span>
          )}

        </form>
      </section>

      {/* PROFESSIONAL LINKS */}
      <section
        className="section-card"
        style={{ marginTop: 20 }}
      >

        <div className="section-title">
          <Globe size={22} />
          <h2>Professional Links</h2>
        </div>

        <p className="backup-description">
          Click a button to open the corresponding profile or website.
        </p>

        <div
          className="backup-actions"
          style={{
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >

          {/* GMAIL */}
          {profile.email && (
            <button
              type="button"
              className="add-topic-button"
              onClick={openEmail}
            >
              <Mail size={18} />
              Gmail
            </button>
          )}

          {/* PORTFOLIO */}
          {profile.portfolio && (
            <button
              type="button"
              className="add-topic-button"
              onClick={() =>
                openExternalLink(profile.portfolio)
              }
            >
              <Globe size={18} />
              Portfolio
            </button>
          )}

          {/* LINKEDIN */}
          {profile.linkedin && (
            <button
              type="button"
              className="add-topic-button"
              onClick={() =>
                openExternalLink(profile.linkedin)
              }
            >
              💼 LinkedIn
            </button>
          )}

          {/* GITHUB */}
          {profile.github && (
            <button
              type="button"
              className="add-topic-button"
              onClick={() =>
                openExternalLink(profile.github)
              }
            >
              🐙 GitHub
            </button>
          )}

        </div>

        {!profile.email &&
          !profile.portfolio &&
          !profile.linkedin &&
          !profile.github && (
            <p style={{ marginTop: "15px" }}>
              Add your professional links above and click Save Profile.
            </p>
          )}

      </section>

      {/* BACKUP & RESTORE */}
      <section
        className="section-card"
        style={{ marginTop: 20 }}
      >

        <div className="section-title">
          <Download size={22} />
          <h2>Backup & Restore</h2>
        </div>

        <p className="backup-description">
          Export everything in your dashboard to a JSON file you
          keep, or restore a previous backup. Importing overwrites
          the sections included in the file - it never happens
          automatically or silently.
        </p>

        <div className="backup-actions">

          {/* EXPORT */}
          <button
            className="add-topic-button"
            onClick={handleExport}
          >
            <Download size={18} />
            Export Backup (JSON)
          </button>

          {/* IMPORT */}
          <button
            className="import-button"
            onClick={handleImportClick}
          >
            <Upload size={18} />
            Import Backup
          </button>

          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImportFile}
          />

        </div>

        {/* IMPORT MESSAGE */}
        {importMessage && (
          <div
            className={`import-message import-message-${importMessage.type}`}
          >

            {importMessage.type === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}

            <span>
              {importMessage.text}
            </span>

          </div>
        )}

      </section>

    </div>
  );
}

export default Profile;