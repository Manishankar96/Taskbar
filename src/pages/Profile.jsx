import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  UserCircle,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Globe,
  CalendarDays,
  ExternalLink,
  Link2,
  BriefcaseBusiness,
  Code2,
  FolderOpen,
  Rocket,
  GraduationCap,
  Terminal,
} from "lucide-react";

import {
  getProfile,
  saveProfile,
  exportAllData,
  validateBackup,
  importAllData,
} from "../utils/db";

import {
  getTodayLocalDateKey,
} from "../utils/calculations";

const shortcutIcons = {
  ExternalLink,
  Link2,
  Globe,
  BriefcaseBusiness,
  Code2,
  FolderOpen,
  Rocket,
  GraduationCap,
  Terminal,
};

const emptyProfile = {
  name: "",
  role: "",
  photo: "",
  email: "",
  portfolio: "",
  linkedin: "",
  github: "",

  // Up to 4 custom professional shortcuts
  customShortcuts: [],
  // Legacy fields kept for backward compatibility
  shortcutName: "",
  shortcutUrl: "",
  shortcutIcon: "ExternalLink",
};

function Profile() {
  const [profile, setProfile] =
    useState(emptyProfile);

  const [loading, setLoading] =
    useState(true);

  const [saved, setSaved] =
    useState(false);

  const [importMessage, setImportMessage] =
    useState(null);

  const [shortcutDraft, setShortcutDraft] = useState({
    name: "",
    url: "",
    icon: "ExternalLink",
  });

  const [editingShortcutId, setEditingShortcutId] =
    useState(null);

  const fileInputRef =
    useRef(null);

  // Load saved profile
  useEffect(() => {
    async function load() {
      try {
        const savedProfile =
          await getProfile();

        if (savedProfile) {
          const legacyShortcut =
            savedProfile.shortcutName?.trim() &&
            savedProfile.shortcutUrl?.trim()
              ? [{
                  id: `legacy-${Date.now()}`,
                  name: savedProfile.shortcutName.trim(),
                  url: savedProfile.shortcutUrl.trim(),
                  icon: savedProfile.shortcutIcon || "ExternalLink",
                }]
              : [];

          const savedShortcuts = Array.isArray(
            savedProfile.customShortcuts
          )
            ? savedProfile.customShortcuts
                .filter(
                  (shortcut) =>
                    shortcut?.name?.trim() &&
                    shortcut?.url?.trim()
                )
                .slice(0, 4)
            : legacyShortcut;

          setProfile({
            ...emptyProfile,
            ...savedProfile,
            customShortcuts: savedShortcuts,
            shortcutName:
              savedProfile.shortcutName || "",
            shortcutUrl:
              savedProfile.shortcutUrl || "",
            shortcutIcon:
              savedProfile.shortcutIcon ||
              "ExternalLink",
          });
        }
      } catch (error) {
        console.error(
          "Failed to load profile:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Change profile photo
  function handlePhotoChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      file.size >
      1.5 * 1024 * 1024
    ) {
      alert(
        "Please choose an image under 1.5 MB so it stores cleanly in the browser."
      );
      return;
    }

    const reader =
      new FileReader();

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
      const normalizedProfile = {
        ...profile,
        customShortcuts: Array.isArray(profile.customShortcuts)
          ? profile.customShortcuts
              .filter(
                (shortcut) =>
                  shortcut?.name?.trim() &&
                  shortcut?.url?.trim()
              )
              .slice(0, 4)
              .map((shortcut) => ({
                id:
                  shortcut.id ||
                  `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                name: shortcut.name.trim(),
                url: shortcut.url.trim(),
                icon: shortcut.icon || "ExternalLink",
              }))
          : [],
      };

      await saveProfile(normalizedProfile);

      const savedProfile = await getProfile();

      if (savedProfile) {
        setProfile({
          ...emptyProfile,
          ...savedProfile,
          customShortcuts: Array.isArray(
            savedProfile.customShortcuts
          )
            ? savedProfile.customShortcuts
                .filter(
                  (shortcut) =>
                    shortcut?.name?.trim() &&
                    shortcut?.url?.trim()
                )
                .slice(0, 4)
            : [],
        });
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Failed to save profile:",
        error
      );

      alert(
        "Could not save your profile. Please try again."
      );
    }
  }

  // Export all dashboard data
  async function handleExport() {
    try {
      const backup =
        await exportAllData();

      const blob = new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          ),
        ],
        {
          type: "application/json",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        "personal-dashboard-backup.json";

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Export failed:",
        error
      );

      alert(
        "Export failed. Please try again."
      );
    }
  }

  // Open import file selector
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  // Import backup
  async function handleImportFile(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setImportMessage(null);

    let parsed;

    try {
      const text =
        await file.text();

      parsed =
        JSON.parse(text);
    } catch {
      setImportMessage({
        type: "error",
        text:
          "That file isn't valid JSON. Import cancelled.",
      });

      return;
    }

    const result =
      validateBackup(parsed);

    if (!result.valid) {
      setImportMessage({
        type: "error",
        text:
          `Invalid backup file: ${result.reason}`,
      });

      return;
    }

    const confirmed =
      window.confirm(
        "Importing this backup will REPLACE your current data for every section included in the file. This cannot be undone. Continue?"
      );

    if (!confirmed) return;

    try {
      await importAllData(parsed);

      setImportMessage({
        type: "success",
        text:
          "Backup imported successfully. Reloading your dashboard...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error(
        "Import failed:",
        error
      );

      setImportMessage({
        type: "error",
        text:
          "Something went wrong while importing. No changes were saved.",
      });
    }
  }

  // Open website links
  function openExternalLink(url) {
    if (!url) return;

    let finalUrl =
      url.trim();

    if (
      !/^https?:\/\//i.test(
        finalUrl
      )
    ) {
      finalUrl =
        `https://${finalUrl}`;
    }

    window.open(
      finalUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // Open Gmail directly
  function openGmail() {
    window.open(
      "https://mail.google.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  // Open Google Calendar directly
  function openCalendar() {
    window.open(
      "https://calendar.google.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  // Get a Lucide icon for a custom shortcut
  function getShortcutIcon(iconName) {
    return shortcutIcons[iconName] || ExternalLink;
  }

  function resetShortcutDraft() {
    setShortcutDraft({
      name: "",
      url: "",
      icon: "ExternalLink",
    });
    setEditingShortcutId(null);
  }

  async function persistProfile(nextProfile) {
    try {
      await saveProfile(nextProfile);
      return true;
    } catch (error) {
      console.error("Failed to persist profile:", error);
      alert("Could not save the shortcut. Please try again.");
      return false;
    }
  }

  async function handleAddOrUpdateShortcut() {
    const name = shortcutDraft.name.trim();
    const url = shortcutDraft.url.trim();

    if (!name || !url) {
      alert("Please enter both a shortcut name and URL.");
      return;
    }

    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    if (editingShortcutId) {
      const nextProfile = {
        ...profile,
        customShortcuts: profile.customShortcuts.map((shortcut) =>
          shortcut.id === editingShortcutId
            ? {
                ...shortcut,
                name,
                url: finalUrl,
                icon: shortcutDraft.icon,
              }
            : shortcut
        ),
      };

      const savedSuccessfully = await persistProfile(nextProfile);

      if (!savedSuccessfully) return;

      setProfile(nextProfile);
      resetShortcutDraft();
      return;
    }

    if (profile.customShortcuts.length >= 4) {
      alert("You can add a maximum of 4 custom shortcuts.");
      return;
    }

    const newShortcut = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      url: finalUrl,
      icon: shortcutDraft.icon,
    };

    const nextProfile = {
      ...profile,
      customShortcuts: [
        ...profile.customShortcuts,
        newShortcut,
      ],
    };

    const savedSuccessfully = await persistProfile(nextProfile);

    if (!savedSuccessfully) return;

    setProfile(nextProfile);
    resetShortcutDraft();
  }

  function handleEditShortcut(shortcut) {
    setShortcutDraft({
      name: shortcut.name || "",
      url: shortcut.url || "",
      icon: shortcut.icon || "ExternalLink",
    });
    setEditingShortcutId(shortcut.id);
  }

  async function handleDeleteShortcut(id) {
    const nextProfile = {
      ...profile,
      customShortcuts: profile.customShortcuts.filter(
        (shortcut) => shortcut.id !== id
      ),
    };

    const savedSuccessfully = await persistProfile(nextProfile);

    if (!savedSuccessfully) return;

    setProfile(nextProfile);

    if (editingShortcutId === id) {
      resetShortcutDraft();
    }
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>👤 Profile</h1>

        <p>
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <>
      {createPortal(
        <div className="profile-video-portal" aria-hidden="true">
          <video
            className="profile-background-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/profile-video.mp4" type="video/mp4" />
          </video>
          <div className="profile-video-overlay" />
        </div>,
        document.body
      )}

      <div className="module-page profile-video-page">
        <div className="profile-video-content">

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>

          <h1>
            👤 Profile & Data
          </h1>

          <p>
            Manage your profile and professional links.
          </p>

        </div>

      </div>


      {/* PROFILE SECTION */}

      <section className="section-card profile-form-card">

        <div className="section-title">

          <UserCircle size={22} />

          <h2>
            Profile
          </h2>

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
                <UserCircle
                  size={56}
                />
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
                onChange={
                  handlePhotoChange
                }
              />

            </div>

          </div>


          {/* NAME */}

          <div className="form-group">

            <label>
              Name
            </label>

            <input
              type="text"
              placeholder="Your name"
              value={
                profile.name
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  name:
                    event.target.value,
                })
              }
            />

          </div>


          {/* ROLE */}

          <div className="form-group">

            <label>
              Role
            </label>

            <input
              type="text"
              placeholder="Example: Student, Developer"
              value={
                profile.role
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  role:
                    event.target.value,
                })
              }
            />

          </div>


          {/* GMAIL */}

          <div className="form-group">

            <label>
              Gmail
            </label>

            <input
              type="email"
              placeholder="yourname@gmail.com"
              value={
                profile.email
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  email:
                    event.target.value,
                })
              }
            />

          </div>


          {/* PORTFOLIO */}

          <div className="form-group">

            <label>
              Portfolio Website
            </label>

            <input
              type="url"
              placeholder="https://yourportfolio.com"
              value={
                profile.portfolio
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  portfolio:
                    event.target.value,
                })
              }
            />

          </div>


          {/* LINKEDIN */}

          <div className="form-group">

            <label>
              LinkedIn
            </label>

            <input
              type="url"
              placeholder="https://www.linkedin.com/in/yourname"
              value={
                profile.linkedin
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  linkedin:
                    event.target.value,
                })
              }
            />

          </div>


          {/* GITHUB */}

          <div className="form-group">

            <label>
              GitHub
            </label>

            <input
              type="url"
              placeholder="https://github.com/yourusername"
              value={
                profile.github
              }
              onChange={(event) =>
                setProfile({
                  ...profile,
                  github:
                    event.target.value,
                })
              }
            />

          </div>


          {/* CUSTOM SHORTCUTS — MAXIMUM 4 */}

          <div className="custom-shortcuts-editor">
            <div className="custom-shortcuts-heading">
              <div>
                <h3>🔗 Custom Shortcuts</h3>
                <p>
                  Add up to 4 websites or professional profiles for quick access.
                </p>
              </div>

              <span className="shortcut-count">
                {profile.customShortcuts.length}/4
              </span>
            </div>

            <div className="custom-shortcut-form">
              <div className="form-group">
                <label>Shortcut Name</label>
                <input
                  type="text"
                  placeholder="Example: LeetCode"
                  value={shortcutDraft.name}
                  onChange={(event) =>
                    setShortcutDraft((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Shortcut URL</label>
                <input
                  type="text"
                  placeholder="https://leetcode.com"
                  value={shortcutDraft.url}
                  onChange={(event) =>
                    setShortcutDraft((previous) => ({
                      ...previous,
                      url: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Shortcut Icon</label>
                <select
                  value={shortcutDraft.icon}
                  onChange={(event) =>
                    setShortcutDraft((previous) => ({
                      ...previous,
                      icon: event.target.value,
                    }))
                  }
                >
                  <option value="ExternalLink">External Link</option>
                  <option value="Link2">Link</option>
                  <option value="Globe">Globe</option>
                  <option value="BriefcaseBusiness">Briefcase</option>
                  <option value="Code2">Code</option>
                  <option value="FolderOpen">Folder</option>
                  <option value="Rocket">Rocket</option>
                  <option value="GraduationCap">Education</option>
                  <option value="Terminal">Terminal</option>
                </select>
              </div>

              <div className="custom-shortcut-form-actions">
                <button
                  type="button"
                  className="add-topic-button"
                  onClick={handleAddOrUpdateShortcut}
                  disabled={!editingShortcutId && profile.customShortcuts.length >= 4}
                >
                  {editingShortcutId ? "Update Shortcut" : "+ Add Shortcut"}
                </button>

                {editingShortcutId && (
                  <button
                    type="button"
                    className="import-button"
                    onClick={resetShortcutDraft}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {profile.customShortcuts.length > 0 && (
              <div className="custom-shortcuts-list">
                {profile.customShortcuts.map((shortcut, index) => {
                  const Icon = getShortcutIcon(shortcut.icon);

                  return (
                    <div className="custom-shortcut-item" key={shortcut.id || index}>
                      <div className="custom-shortcut-info">
                        <div className="custom-shortcut-icon">
                          <Icon size={20} />
                        </div>
                        <div>
                          <strong>{shortcut.name}</strong>
                          <span>{shortcut.url}</span>
                        </div>
                      </div>

                      <div className="custom-shortcut-actions">
                        <button
                          type="button"
                          className="shortcut-open-button"
                          onClick={() => openExternalLink(shortcut.url)}
                        >
                          <ExternalLink size={15} />
                          Open
                        </button>

                        <button
                          type="button"
                          className="shortcut-edit-button"
                          onClick={() => handleEditShortcut(shortcut)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="shortcut-delete-button"
                          onClick={() => handleDeleteShortcut(shortcut.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

              <CheckCircle2
                size={16}
              />

              Saved

            </span>
          )}

        </form>

      </section>


      {/* PROFESSIONAL LINKS */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Globe size={22} />

          <h2>
            Professional Links
          </h2>

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

          <button
            type="button"
            className="add-topic-button"
            onClick={openGmail}
          >

            <Mail size={18} />

            Gmail

          </button>


          {/* GOOGLE CALENDAR */}

          <button
            type="button"
            className="add-topic-button"
            onClick={openCalendar}
          >

            <CalendarDays
              size={18}
            />

            Google Calendar

          </button>


          {/* PORTFOLIO */}

          {profile.portfolio && (
            <button
              type="button"
              className="add-topic-button"
              onClick={() =>
                openExternalLink(
                  profile.portfolio
                )
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
                openExternalLink(
                  profile.linkedin
                )
              }
            >

              <BriefcaseBusiness
                size={18}
              />

              LinkedIn

            </button>
          )}


          {/* GITHUB */}

          {profile.github && (
            <button
              type="button"
              className="add-topic-button"
              onClick={() =>
                openExternalLink(
                  profile.github
                )
              }
            >

              <Code2
                size={18}
              />

              GitHub

            </button>
          )}


        </div>


        {!profile.email &&
          !profile.portfolio &&
          !profile.linkedin &&
          !profile.github &&
          !profile.customShortcuts?.length && (
            <p
              style={{
                marginTop:
                  "15px",
              }}
            >
              Add your professional links above and click Save Profile.
            </p>
          )}

      </section>


      {/* BACKUP & RESTORE */}

      <section
        className="section-card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="section-title">

          <Download size={22} />

          <h2>
            Backup & Restore
          </h2>

        </div>


        <p className="backup-description">
          Export everything in your dashboard to a JSON file you keep, or restore a previous backup. Importing overwrites the sections included in the file - it never happens automatically or silently.
        </p>


        <div className="backup-actions">

          {/* EXPORT */}

          <button
            className="add-topic-button"
            onClick={handleExport}
          >

            <Download
              size={18}
            />

            Export Backup (JSON)

          </button>


          {/* IMPORT */}

          <button
            className="import-button"
            onClick={
              handleImportClick
            }
          >

            <Upload size={18} />

            Import Backup

          </button>


          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{
              display: "none",
            }}
            onChange={
              handleImportFile
            }
          />

        </div>


        {/* IMPORT MESSAGE */}

        {importMessage && (
          <div
            className={`import-message import-message-${importMessage.type}`}
          >

            {importMessage.type ===
            "error" ? (
              <AlertTriangle
                size={16}
              />
            ) : (
              <CheckCircle2
                size={16}
              />
            )}

            <span>
              {importMessage.text}
            </span>

          </div>
        )}

      </section>

        </div>
      </div>
    </>
  );
}

export default Profile;
