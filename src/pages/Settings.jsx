import React, { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  RefreshCw,
  Info,
  Database,
  CheckCircle2,
  Smartphone,
  Image as ImageIcon,
  Video,
  RotateCcw,
  Upload,
  ShieldCheck,
} from "lucide-react";
import "./../styles/Settings.css";

const SETTINGS_KEY = "taskbar-settings";
const PAGE_BACKGROUND_KEY = "taskbar-custom-page-background";
const PROFILE_VIDEO_DB = "taskbar-background-assets";
const PROFILE_VIDEO_STORE = "videos";
const PROFILE_VIDEO_KEY = "profile-background-video";

const defaultSettings = {
  remindersEnabled: true,
  darkMode: false,
  autoSync: true,
};

function openVideoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROFILE_VIDEO_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROFILE_VIDEO_STORE)) {
        db.createObjectStore(PROFILE_VIDEO_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveProfileVideo(file) {
  const db = await openVideoDatabase();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(PROFILE_VIDEO_STORE, "readwrite");
    transaction
      .objectStore(PROFILE_VIDEO_STORE)
      .put(file, PROFILE_VIDEO_KEY);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

async function removeProfileVideo() {
  try {
    const db = await openVideoDatabase();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PROFILE_VIDEO_STORE, "readwrite");

      transaction
        .objectStore(PROFILE_VIDEO_STORE)
        .delete(PROFILE_VIDEO_KEY);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch (error) {
    console.error("Failed to remove custom profile video:", error);
  }
}

async function hasProfileVideo() {
  try {
    const db = await openVideoDatabase();

    const exists = await new Promise((resolve, reject) => {
      const transaction = db.transaction(PROFILE_VIDEO_STORE, "readonly");

      const request = transaction
        .objectStore(PROFILE_VIDEO_STORE)
        .getKey(PROFILE_VIDEO_KEY);

      request.onsuccess = () => resolve(Boolean(request.result));
      request.onerror = () => reject(request.error);
    });

    db.close();
    return exists;
  } catch {
    return false;
  }
}

function compressImage(file, maxSize = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(
        1,
        maxSize / Math.max(image.width, image.height)
      );

      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not process the image."));
        return;
      }

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not process the image."));
            return;
          }

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(
              reader.error ||
                new Error("Could not read the image.")
            );

          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load the image."));
    };

    image.src = objectUrl;
  });
}

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [customPageBackground, setCustomPageBackground] =
    useState("");
  const [customProfileVideo, setCustomProfileVideo] =
    useState(false);
  const [backgroundError, setBackgroundError] = useState("");

  const pageImageInputRef = useRef(null);
  const profileVideoInputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);

      if (stored) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(stored),
        });
      }

      setCustomPageBackground(
        localStorage.getItem(PAGE_BACKGROUND_KEY) || ""
      );
    } catch (error) {
      console.error("Failed to load settings:", error);
    }

    hasProfileVideo().then(setCustomProfileVideo);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  function showSaved() {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1500);
  }

  function updateSetting(name, value) {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Notify the running app immediately. The browser "storage" event
    // does not fire in the same tab that changed localStorage.
    if (
      name === "remindersEnabled" ||
      name === "autoSync"
    ) {
      window.dispatchEvent(
        new CustomEvent("taskbar-settings-changed", {
          detail: {
            name,
            value,
          },
        })
      );
    }

    showSaved();
  }

  async function handlePageBackgroundChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBackgroundError("Please choose an image file.");
      return;
    }

    try {
      setBackgroundError("");

      const dataUrl = await compressImage(file);

      localStorage.setItem(
        PAGE_BACKGROUND_KEY,
        dataUrl
      );

      setCustomPageBackground(dataUrl);

      window.dispatchEvent(
        new Event("taskbar-background-changed")
      );

      showSaved();
    } catch (error) {
      console.error(
        "Failed to save custom page background:",
        error
      );

      setBackgroundError(
        "The image could not be saved. Please try another image."
      );
    }
  }

  async function handleProfileVideoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setBackgroundError("Please choose a video file.");
      return;
    }

    try {
      setBackgroundError("");

      await saveProfileVideo(file);

      setCustomProfileVideo(true);

      window.dispatchEvent(
        new Event("taskbar-profile-video-changed")
      );

      showSaved();
    } catch (error) {
      console.error(
        "Failed to save custom profile video:",
        error
      );

      setBackgroundError(
        "The video could not be saved. Please try a smaller video file."
      );
    }
  }

  function removePageBackground() {
    localStorage.removeItem(PAGE_BACKGROUND_KEY);
    setCustomPageBackground("");

    window.dispatchEvent(
      new Event("taskbar-background-changed")
    );

    showSaved();
  }

  async function removeCustomProfileVideo() {
    await removeProfileVideo();

    setCustomProfileVideo(false);

    window.dispatchEvent(
      new Event("taskbar-profile-video-changed")
    );

    showSaved();
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all TASKBAR settings to default?"
    );

    if (!confirmed) return;

    setSettings(defaultSettings);

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(defaultSettings)
    );

    showSaved();
  }

  return (
    <div className="page-container settings-page">
      {/* Header */}
      <div className="page-header settings-page-header">
        <div>
          <div className="settings-title-row">
            <div className="settings-title-icon">
              <SettingsIcon size={25} />
            </div>

            <div>
              <h1>Settings</h1>
              <p>Make TASKBAR feel like your own.</p>
            </div>
          </div>
        </div>

        {saved && (
          <div className="settings-saved settings-saved-modern">
            <CheckCircle2 size={17} />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="content-card settings-card">
        <div className="settings-section-header">
          <div className="settings-section-icon settings-icon-red">
            <Bell size={21} />
          </div>

          <div>
            <h2>Notifications</h2>
            <p>
              Stay informed without making TASKBAR feel noisy.
            </p>
          </div>
        </div>

        <div className="settings-option settings-option-modern">
          <div className="settings-option-info">
            <strong>Reminders & Smart Notifications</strong>
            <span>
              Allow TASKBAR to send reminders and useful daily
              notifications.
            </span>
          </div>

          <label
            className="settings-toggle settings-toggle-modern"
            aria-label="Enable reminders and notifications"
          >
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(event) =>
                updateSetting(
                  "remindersEnabled",
                  event.target.checked
                )
              }
            />

            <span className="settings-toggle-track">
              <span className="settings-toggle-knob" />
            </span>

            <span className="settings-toggle-state">
              {settings.remindersEnabled ? "ON" : "OFF"}
            </span>
          </label>
        </div>

        <div className="settings-mini-note">
          <ShieldCheck size={16} />
          <span>
            You can turn notifications off anytime. Your saved
            reminders and tasks are not deleted.
          </span>
        </div>
      </div>

      {/* Appearance */}
      <div className="content-card settings-card">
        <div className="settings-section-header">
          <div className="settings-section-icon settings-icon-red">
            {settings.darkMode ? (
              <Moon size={21} />
            ) : (
              <Sun size={21} />
            )}
          </div>

          <div>
            <h2>Appearance</h2>
            <p>
              Choose the look and backgrounds of your TASKBAR.
            </p>
          </div>
        </div>

        <div className="settings-option settings-option-modern">
          <div className="settings-option-info">
            <strong>Dark Mode</strong>
            <span>
              Use a darker appearance for TASKBAR.
            </span>
          </div>

          <label
            className="settings-toggle settings-toggle-modern"
            aria-label="Enable dark mode"
          >
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(event) =>
                updateSetting(
                  "darkMode",
                  event.target.checked
                )
              }
            />

            <span className="settings-toggle-track">
              <span className="settings-toggle-knob" />
            </span>

            <span className="settings-toggle-state">
              {settings.darkMode ? "ON" : "OFF"}
            </span>
          </label>
        </div>

        {/* Background Customization */}
        <div className="settings-customizer">
          <div className="settings-customizer-heading">
            <div>
              <span className="settings-eyebrow">
                PERSONALIZE
              </span>

              <h3>Backgrounds</h3>

              <p>
                Customize your normal pages and Profile separately.
                These controls are available only here in Settings.
              </p>
            </div>
          </div>

          <div className="settings-background-grid">
            {/* Normal page image */}
            <div className="settings-background-panel">
              <div className="settings-background-panel-header">
                <div className="settings-background-panel-icon">
                  <ImageIcon size={20} />
                </div>

                <div>
                  <h4>Other Pages</h4>
                  <span>
                    Home, Study, Career, Finance, etc.
                  </span>
                </div>
              </div>

              <div className="settings-background-preview">
                <div
                  className="settings-background-image-preview"
                  style={{
                    backgroundImage: `url("${customPageBackground || "/spiderman-bg.jpg"}")`,
                  }}
                />

                <div className="settings-background-preview-shade" />

                <span className="settings-background-preview-label">
                  {customPageBackground
                    ? "CUSTOM IMAGE"
                    : "SPIDER-MAN DEFAULT"}
                </span>
              </div>

              <div className="settings-background-actions">
                <button
                  type="button"
                  className="settings-primary-button"
                  onClick={() =>
                    pageImageInputRef.current?.click()
                  }
                >
                  <Upload size={17} />
                  <span>Choose Image</span>
                </button>

                {customPageBackground && (
                  <button
                    type="button"
                    className="settings-outline-button"
                    onClick={removePageBackground}
                  >
                    <RotateCcw size={17} />
                    <span>Use Default</span>
                  </button>
                )}
              </div>

              <input
                ref={pageImageInputRef}
                type="file"
                accept="image/*"
                onChange={handlePageBackgroundChange}
                hidden
              />
            </div>

            {/* Profile video */}
            <div className="settings-background-panel">
              <div className="settings-background-panel-header">
                <div className="settings-background-panel-icon">
                  <Video size={20} />
                </div>

                <div>
                  <h4>Profile Video</h4>
                  <span>
                    Used only on your Profile page.
                  </span>
                </div>
              </div>

              <div className="settings-video-preview">
                <div className="settings-video-preview-glow">
                  <Video size={34} />
                </div>

                <div>
                  <strong>
                    {customProfileVideo
                      ? "Custom video active"
                      : "Default video active"}
                  </strong>

                  <span>
                    {customProfileVideo
                      ? "Your selected Profile video is saved."
                      : "TASKBAR is using /profile-video.mp4."}
                  </span>
                </div>

                <span className="settings-video-badge">
                  {customProfileVideo ? "CUSTOM" : "DEFAULT"}
                </span>
              </div>

              <div className="settings-background-actions">
                <button
                  type="button"
                  className="settings-primary-button"
                  onClick={() =>
                    profileVideoInputRef.current?.click()
                  }
                >
                  <Upload size={17} />
                  <span>Choose Video</span>
                </button>

                {customProfileVideo && (
                  <button
                    type="button"
                    className="settings-outline-button"
                    onClick={removeCustomProfileVideo}
                  >
                    <RotateCcw size={17} />
                    <span>Use Default</span>
                  </button>
                )}
              </div>

              <input
                ref={profileVideoInputRef}
                type="file"
                accept="video/*"
                onChange={handleProfileVideoChange}
                hidden
              />
            </div>
          </div>

          {backgroundError && (
            <div className="settings-background-error">
              <Info size={18} />

              <div>
                <strong>Could not update background</strong>
                <span>{backgroundError}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data & Sync */}
      <div className="content-card settings-card">
        <div className="settings-section-header">
          <div className="settings-section-icon settings-icon-red">
            <RefreshCw size={21} />
          </div>

          <div>
            <h2>Data & Sync</h2>
            <p>
              Manage how your TASKBAR data is synchronized.
            </p>
          </div>
        </div>

        <div className="settings-option settings-option-modern">
          <div className="settings-option-info">
            <strong>Automatic Sync</strong>
            <span>
              Keep your supported data synchronized automatically.
            </span>
          </div>

          <label
            className="settings-toggle settings-toggle-modern"
            aria-label="Enable automatic sync"
          >
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={(event) =>
                updateSetting(
                  "autoSync",
                  event.target.checked
                )
              }
            />

            <span className="settings-toggle-track">
              <span className="settings-toggle-knob" />
            </span>

            <span className="settings-toggle-state">
              {settings.autoSync ? "ON" : "OFF"}
            </span>
          </label>
        </div>

        <div className="settings-info-box settings-info-box-modern">
          <Database size={19} />

          <div>
            <strong>Data Storage</strong>
            <p>
              TASKBAR currently uses local storage and its existing
              application data systems. Full Finance and Career
              synchronization will be connected later.
            </p>
          </div>
        </div>
      </div>

      {/* App */}
      <div className="content-card settings-card">
        <div className="settings-section-header">
          <div className="settings-section-icon settings-icon-red">
            <Smartphone size={21} />
          </div>

          <div>
            <h2>App</h2>
            <p>TASKBAR application information.</p>
          </div>
        </div>

        <div className="settings-info-list settings-info-list-modern">
          <div className="settings-info-row">
            <span>Application</span>
            <strong>TASKBAR</strong>
          </div>

          <div className="settings-info-row">
            <span>Platform</span>
            <strong>Web / Android</strong>
          </div>

          <div className="settings-info-row">
            <span>Version</span>
            <strong>1.0.0</strong>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="content-card settings-card">
        <div className="settings-section-header">
          <div className="settings-section-icon settings-icon-red">
            <Info size={21} />
          </div>

          <div>
            <h2>About TASKBAR</h2>
            <p>
              Your personal productivity and life-management app.
            </p>
          </div>
        </div>

        <p className="settings-about-text settings-about-modern">
          TASKBAR brings your study, career, productivity, wellness,
          finance, and personal activities together in one place.
        </p>
      </div>

      {/* Reset */}
      <div className="content-card settings-danger-card settings-reset-modern">
        <div>
          <span className="settings-eyebrow">CONTROL</span>
          <h2>Reset Settings</h2>

          <p>
            Restore notification, appearance, and sync preferences
            to their default values.
          </p>
        </div>

        <button
          type="button"
          className="settings-reset-button"
          onClick={resetSettings}
        >
          <RotateCcw size={17} />
          Reset Settings
        </button>
      </div>
    </div>
  );
}
