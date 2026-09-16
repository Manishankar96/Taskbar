import { useEffect, useState } from "react";

import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  Home as HomeIcon,
  BookOpen,
  CalendarDays,
  Target,
  Apple,
  Droplets,
  Smartphone,
  Activity,
  ClipboardCheck,
  Zap,
  BarChart3,
  UserCircle,
  StickyNote,
  ListTodo,
  Bell,
  Clock3,
  BriefcaseBusiness,
  HeartPulse,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Settings as SettingsIcon,
} from "lucide-react";

import "./styles/Career.css";
import "./styles/Finance.css";

import Home from "./pages/Home";
import Learning from "./pages/Study/Learning";
import Timetable from "./pages/Study/Timetable";
import Goals from "./pages/Study/Goals";

import Diet from "./pages/Wellness/Diet";
import Water from "./pages/Wellness/Water";
import ScreenTime from "./pages/Wellness/ScreenTime";
import Activities from "./pages/Wellness/Activities";

import Assessments from "./pages/Study/Assessments";
import QuickTasks from "./pages/Productivity/QuickTasks";
import Reports from "./pages/Productivity/Reports";
import Profile from "./pages/Profile";

import QuickNotes from "./pages/Productivity/QuickNotes";
import DailyTargets from "./pages/Productivity/DailyTargets";
import Reminders from "./pages/Productivity/Reminders";
import TodoList from "./pages/Productivity/TodoList";

import StudySessions from "./pages/Study/StudySessions";

import JobPreparation from "./pages/Career/JobPreparation";
import Applications from "./pages/Career/Applications";
import SavedJobs from "./pages/Career/SavedJobs";
import Resumes from "./pages/Career/Resumes";
import Interviews from "./pages/Career/Interviews";
import Projects from "./pages/Career/Projects";

import Income from "./pages/Finance/Income";
import Expenses from "./pages/Finance/Expenses";
import Budget from "./pages/Finance/Budget";

import Settings from "./pages/Settings";

import {
  ensureDailyReportHistory,
  createDailyReportForDate,
} from "./utils/db";

import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";

import { testFirestore } from "./firebase/firestoreTest";

import {
  SYNC_STORES,
  initialSync,
  startRealtimeSync,
} from "./firebase/sync";

import {
  initializeSmartNotifications,
  cancelSmartNotifications,
} from "./utils/notificationService";

/* =========================================================
   FIRESTORE TEST
   ========================================================= */

function FirestoreTest() {
  useEffect(() => {
    testFirestore();
  }, []);

  return null;
}

/* =========================================================
   FIREBASE DATA SYNC
   ========================================================= */

function FirebaseDataSync() {
  const { user } = useAuth();

  const [autoSync, setAutoSync] = useState(() => {
    try {
      const stored = localStorage.getItem("taskbar-settings");
      if (!stored) return true;

      const parsed = JSON.parse(stored);
      return parsed?.autoSync !== false;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    function handleSettingsChange(event) {
      if (event?.detail?.name === "autoSync") {
        setAutoSync(event.detail.value !== false);
        return;
      }

      try {
        const stored = localStorage.getItem("taskbar-settings");
        const parsed = stored ? JSON.parse(stored) : {};
        setAutoSync(parsed?.autoSync !== false);
      } catch {
        setAutoSync(true);
      }
    }

    window.addEventListener(
      "taskbar-settings-changed",
      handleSettingsChange
    );

    return () => {
      window.removeEventListener(
        "taskbar-settings-changed",
        handleSettingsChange
      );
    };
  }, []);

  useEffect(() => {
    if (!user || !autoSync) {
      if (!autoSync) {
        console.log("⏸️ Taskbar automatic Firebase sync is OFF.");
      }
      return;
    }

    let unsubscribe = null;
    let cancelled = false;

    async function startSync() {
      try {
        console.log("🔄 Starting Taskbar data sync...");

        // First synchronize every store safely.
        // If Firestore has data, it is downloaded.
        // If Firestore is empty, existing local data is uploaded.
        for (const storeName of SYNC_STORES) {
          if (cancelled) {
            return;
          }

          try {
            await initialSync(storeName);
          } catch (error) {
            console.error(
              `❌ Initial sync failed for ${storeName}:`,
              error
            );
          }
        }

        if (cancelled) {
          return;
        }

        // After initial sync, keep every store updated in real time.
        unsubscribe = startRealtimeSync();

        console.log("✅ Taskbar full Firebase sync is active.");
      } catch (error) {
        console.error(
          "❌ Taskbar Firebase sync failed:",
          error
        );
      }
    }

    startSync();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  }, [user, autoSync]);

  return null;
}

/* =========================================================
   DAILY REPORT MANAGER
   ========================================================= */

function DailyReportManager() {
  useEffect(() => {
    let cancelled = false;

    async function updateDailyReports() {
      try {
        await ensureDailyReportHistory();

        if (cancelled) {
          return;
        }

        const previousDate =
          getPreviousLocalDateKey();

        await createDailyReportForDate(
          previousDate
        );
      } catch (error) {
        console.error(
          "Failed to update daily reports:",
          error
        );
      }
    }

    updateDailyReports();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/* =========================================================
   SMART NOTIFICATION MANAGER
   ========================================================= */

function SmartNotificationManager() {
  const { user } = useAuth();

  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem("taskbar-settings");
      if (!stored) return true;

      const parsed = JSON.parse(stored);
      return parsed?.remindersEnabled !== false;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    function handleSettingsChange(event) {
      if (event?.detail?.name === "remindersEnabled") {
        setRemindersEnabled(event.detail.value !== false);
        return;
      }

      try {
        const stored = localStorage.getItem("taskbar-settings");
        const parsed = stored ? JSON.parse(stored) : {};
        setRemindersEnabled(parsed?.remindersEnabled !== false);
      } catch {
        setRemindersEnabled(true);
      }
    }

    window.addEventListener(
      "taskbar-settings-changed",
      handleSettingsChange
    );

    return () => {
      window.removeEventListener(
        "taskbar-settings-changed",
        handleSettingsChange
      );
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function updateNotifications() {
      try {
        if (!remindersEnabled) {
          await cancelSmartNotifications();

          if (!cancelled) {
            console.log(
              "⏸️ Taskbar reminders and smart notifications are OFF."
            );
          }
          return;
        }

        console.log(
          "🔔 Starting Taskbar smart notifications..."
        );

        const result =
          await initializeSmartNotifications();

        if (cancelled) {
          return;
        }

        if (result.enabled) {
          console.log(
            `✅ Taskbar smart notifications active. Scheduled: ${result.scheduled}`
          );

          if (Array.isArray(result.plan)) {
            console.log(
              "📋 Today's smart notification plan:",
              result.plan
            );
          }
        } else {
          console.log(
            "ℹ️ Taskbar smart notifications are not enabled."
          );
        }
      } catch (error) {
        console.error(
          "❌ Taskbar smart notification initialization failed:",
          error
        );
      }
    }

    updateNotifications();

    return () => {
      cancelled = true;
    };
  }, [user, remindersEnabled]);

  return null;
}

/* =========================================================
   GET PREVIOUS LOCAL DATE
   ========================================================= */

function getPreviousLocalDateKey() {
  const date = new Date();

  date.setDate(
    date.getDate() - 1
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const navigation = [
  {
    type: "single",
    label: "Home",
    path: "/",
    icon: HomeIcon,
  },

  {
    type: "group",
    id: "study",
    label: "Study",
    icon: BookOpen,

    items: [
      {
        label: "Learning",
        path: "/learning",
        icon: BookOpen,
      },
      {
        label: "Timetable",
        path: "/timetable",
        icon: CalendarDays,
      },
      {
        label: "Assessments",
        path: "/assessments",
        icon: ClipboardCheck,
      },
      {
        label: "Study Sessions",
        path: "/study-sessions",
        icon: Clock3,
      },
    ],
  },

  {
    type: "group",
    id: "career",
    label: "Career",
    icon: BriefcaseBusiness,

    items: [
      {
        label: "Job Preparation",
        path: "/job-preparation",
        icon: BriefcaseBusiness,
      },
      {
        label: "Applications",
        path: "/applications",
        icon: ClipboardCheck,
      },
      {
        label: "Saved Jobs",
        path: "/saved-jobs",
        icon: BriefcaseBusiness,
      },
      {
        label: "Resumes",
        path: "/resumes",
        icon: BookOpen,
      },
      {
        label: "Interviews",
        path: "/interviews",
        icon: CalendarDays,
      },
      {
        label: "Projects",
        path: "/projects",
        icon: Zap,
      },
    ],
  },

  {
    type: "group",
    id: "productivity",
    label: "Productivity",
    icon: Target,

    items: [
      {
        label: "To-Do List",
        path: "/todo-list",
        icon: ListTodo,
      },
      {
        label: "Goals",
        path: "/goals",
        icon: Target,
      },
      {
        label: "Quick Notes",
        path: "/quick-notes",
        icon: StickyNote,
      },
      {
        label: "Reminders",
        path: "/reminders",
        icon: Bell,
      },
    ],
  },

  {
    type: "group",
    id: "wellness",
    label: "Wellness",
    icon: HeartPulse,

    items: [
      {
        label: "Diet",
        path: "/diet",
        icon: Apple,
      },
      {
        label: "Water",
        path: "/water",
        icon: Droplets,
      },
      {
        label: "Activities",
        path: "/activities",
        icon: Activity,
      },
      {
        label: "Screen Time",
        path: "/screen-time",
        icon: Smartphone,
      },
    ],
  },

  {
    type: "group",
    id: "finance",
    label: "Finance",
    icon: Wallet,

    items: [
      {
        label: "Income",
        path: "/income",
        icon: TrendingUp,
      },
      {
        label: "Expenses",
        path: "/expenses",
        icon: TrendingDown,
      },
      {
        label: "Budget",
        path: "/budget",
        icon: Wallet,
      },
    ],
  },

  {
    type: "single",
    label: "Insights",
    path: "/insights",
    icon: BarChart3,
  },

  {
    type: "single",
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
  },

  {
    type: "single",
    label: "Settings",
    path: "/settings",
    icon: SettingsIcon,
  },
];

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

const mobilePrimaryNavigation = [
  {
    label: "Home",
    path: "/",
    icon: HomeIcon,
  },
  {
    label: "Study",
    path: "/learning",
    icon: BookOpen,
  },
  {
    label: "Career",
    path: "/career",
    icon: BriefcaseBusiness,
  },
  {
    label: "Finance",
    path: "/finance",
    icon: Wallet,
  },
];

const mobileMoreNavigation = [
  {
    label: "Job Preparation",
    path: "/job-preparation",
    icon: BriefcaseBusiness,
  },
  {
    label: "Applications",
    path: "/applications",
    icon: ClipboardCheck,
  },
  {
    label: "Saved Jobs",
    path: "/saved-jobs",
    icon: BriefcaseBusiness,
  },
  {
    label: "Resumes",
    path: "/resumes",
    icon: BookOpen,
  },
  {
    label: "Interviews",
    path: "/interviews",
    icon: CalendarDays,
  },
  {
    label: "Projects",
    path: "/projects",
    icon: Zap,
  },
  {
    label: "Timetable",
    path: "/timetable",
    icon: CalendarDays,
  },
  {
    label: "Assessments",
    path: "/assessments",
    icon: ClipboardCheck,
  },
  {
    label: "Study Sessions",
    path: "/study-sessions",
    icon: Clock3,
  },
  {
    label: "To-Do List",
    path: "/todo-list",
    icon: ListTodo,
  },
  {
    label: "Goals",
    path: "/goals",
    icon: Target,
  },
  {
    label: "Quick Notes",
    path: "/quick-notes",
    icon: StickyNote,
  },
  {
    label: "Reminders",
    path: "/reminders",
    icon: Bell,
  },
  {
    label: "Diet",
    path: "/diet",
    icon: Apple,
  },
  {
    label: "Water",
    path: "/water",
    icon: Droplets,
  },
  {
    label: "Activities",
    path: "/activities",
    icon: Activity,
  },
  {
    label: "Screen Time",
    path: "/screen-time",
    icon: Smartphone,
  },
  {
    label: "Income",
    path: "/income",
    icon: TrendingUp,
  },
  {
    label: "Expenses",
    path: "/expenses",
    icon: TrendingDown,
  },
  {
    label: "Budget",
    path: "/budget",
    icon: Wallet,
  },
  {
    label: "Insights",
    path: "/insights",
    icon: BarChart3,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: SettingsIcon,
  },
];

/* =========================================================
   SIDEBAR GROUP
   ========================================================= */

function SidebarGroup({
  group,
  isOpen,
  onToggle,
  onNavigate,
}) {
  const location = useLocation();

  const hasActiveItem = group.items.some(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(
        `${item.path}/`
      )
  );

  return (
    <div className="sidebar-group">
      <button
        type="button"
        className={`sidebar-group-header ${
          hasActiveItem
            ? "has-active-item"
            : ""
        }`}
        onClick={() =>
          onToggle(group.id)
        }
        aria-expanded={isOpen}
      >
        <span className="sidebar-group-title">
          <group.icon size={19} />

          <span>
            {group.label}
          </span>
        </span>

        {isOpen ? (
          <ChevronDown size={17} />
        ) : (
          <ChevronRight size={17} />
        )}
      </button>

      {isOpen && (
        <div className="sidebar-group-items">
          {group.items.length === 0 ? (
            <div className="sidebar-coming-soon">
              Coming soon
            </div>
          ) : (
            group.items.map(
              ({
                label,
                path,
                icon: Icon,
              }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `sidebar-link sidebar-sub-link ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                  onClick={onNavigate}
                >
                  <Icon size={17} />

                  <span>
                    {label}
                  </span>
                </NavLink>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MOBILE MORE MENU
   ========================================================= */

function MobileMoreMenu({
  isOpen,
  onClose,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="mobile-more-menu"
      role="dialog"
      aria-modal="true"
      aria-label="More navigation"
    >
      <div className="mobile-more-menu-header">
        <div>
          <h2>More</h2>
          <span>Taskbar</span>
        </div>

        <button
          type="button"
          className="mobile-more-close"
          onClick={onClose}
          aria-label="Close more menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="mobile-more-menu-list">
        {mobileMoreNavigation.map(
          ({
            label,
            path,
            icon: Icon,
          }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/profile"}
              className={({ isActive }) =>
                `mobile-more-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              onClick={onClose}
            >
              <span className="mobile-more-link-icon">
                <Icon size={20} />
              </span>

              <span>
                {label}
              </span>
            </NavLink>
          )
        )}
      </nav>
    </div>
  );
}

/* =========================================================
   MOBILE BOTTOM NAVIGATION
   ========================================================= */

function MobileBottomNavigation({
  onMore,
  moreOpen,
}) {
  const location = useLocation();

  return (
    <nav
      className="mobile-bottom-navigation"
      aria-label="Mobile navigation"
    >
      {mobilePrimaryNavigation.map(
        ({
          label,
          path,
          icon: Icon,
        }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname === path ||
                location.pathname.startsWith(
                  `${path}/`
                );

          return (
            <NavLink
              key={path}
              to={path}
              className={`mobile-bottom-nav-item ${
                isActive
                  ? "active"
                  : ""
              }`}
              end={path === "/"}
            >
              <Icon size={21} />

              <span>
                {label}
              </span>
            </NavLink>
          );
        }
      )}

      <button
        type="button"
        className={`mobile-bottom-nav-item ${
          moreOpen
            ? "active"
            : ""
        }`}
        onClick={onMore}
        aria-expanded={moreOpen}
        aria-label="Open more navigation"
      >
        {moreOpen ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}

        <span>
          More
        </span>
      </button>
    </nav>
  );
}

/* =========================================================
   BACKGROUND
   ========================================================= */

function PageBackground() {
  const location = useLocation();
  const isProfilePage = location.pathname === "/profile";
  const [backgroundImage, setBackgroundImage] = useState(() => {
    try {
      return (
        localStorage.getItem("taskbar-custom-page-background") ||
        "/spiderman-bg.jpg"
      );
    } catch {
      return "/spiderman-bg.jpg";
    }
  });

  useEffect(() => {
    function loadBackground() {
      try {
        setBackgroundImage(
          localStorage.getItem("taskbar-custom-page-background") ||
            "/spiderman-bg.jpg"
        );
      } catch {
        setBackgroundImage("/spiderman-bg.jpg");
      }
    }

    loadBackground();
    window.addEventListener("taskbar-background-changed", loadBackground);
    window.addEventListener("storage", loadBackground);

    return () => {
      window.removeEventListener(
        "taskbar-background-changed",
        loadBackground
      );
      window.removeEventListener("storage", loadBackground);
    };
  }, []);

  if (isProfilePage) {
    return null;
  }

  return (
    <div
      className="taskbar-spiderman-background"
      style={{
        "--taskbar-page-background": `url("${backgroundImage}")`,
      }}
      aria-hidden="true"
    />
  );
}

/* =========================================================
   APP LAYOUT
   ========================================================= */

function AppLayout() {
  const location =
    useLocation();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [mobileMoreOpen, setMobileMoreOpen] =
    useState(false);

  const [openGroups, setOpenGroups] =
    useState({
      study: true,
      career: true,
      productivity: true,
      wellness: false,
    });

  const isProfilePage =
    location.pathname === "/profile";

  useEffect(() => {
    setSidebarOpen(false);
    setMobileMoreOpen(false);
  }, [location.pathname]);

  function toggleGroup(groupId) {
    setOpenGroups((previous) => ({
      ...previous,
      [groupId]:
        !previous[groupId],
    }));
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleMobileMore() {
    setMobileMoreOpen(
      (previous) => !previous
    );
  }

  function closeMobileMore() {
    setMobileMoreOpen(false);
  }

  return (
    <>
      <PageBackground />

      {!isProfilePage && (
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setSidebarOpen(
              (previous) => !previous
            )
          }
          aria-label={
            sidebarOpen
              ? "Close menu"
              : "Open menu"
          }
        >
          {sidebarOpen ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>
      )}

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      <MobileMoreMenu
        isOpen={mobileMoreOpen}
        onClose={closeMobileMore}
      />

      <div
        className={`app-shell ${
          isProfilePage
            ? "profile-route-active"
            : "normal-route-active"
        }`}
      >
        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={`sidebar ${
            sidebarOpen
              ? "sidebar-mobile-open"
              : ""
          }`}
        >
          <div className="sidebar-brand">
            <h1>
              Taskbar
            </h1>

            <span>
              Personal Dashboard
            </span>
          </div>

          <nav className="sidebar-nav">
            {navigation.map((item) => {
              if (
                item.type === "single"
              ) {
                const Icon =
                  item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={
                      item.path === "/"
                    }
                    className={({ isActive }) =>
                      `sidebar-link ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                    onClick={
                      closeSidebar
                    }
                  >
                    <Icon size={19} />

                    <span>
                      {item.label}
                    </span>
                  </NavLink>
                );
              }

              return (
                <SidebarGroup
                  key={item.id}
                  group={item}
                  isOpen={
                    openGroups[item.id]
                  }
                  onToggle={
                    toggleGroup
                  }
                  onNavigate={
                    closeSidebar
                  }
                />
              );
            })}
          </nav>
        </aside>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main
          className={`main-content ${
            isProfilePage
              ? "profile-main-content"
              : "normal-main-content"
          }`}
        >
          <Routes>
            {/* HOME */}

            <Route
              path="/"
              element={
                <Home />
              }
            />

            {/* STUDY */}

            <Route
              path="/learning"
              element={
                <Learning />
              }
            />

            <Route
              path="/timetable"
              element={
                <Timetable />
              }
            />

            <Route
              path="/assessments"
              element={
                <Assessments />
              }
            />

            <Route
              path="/study-sessions"
              element={
                <StudySessions />
              }
            />

            {/* PRODUCTIVITY */}

            <Route
              path="/todo-list"
              element={
                <TodoList />
              }
            />

            <Route
              path="/goals"
              element={
                <Goals />
              }
            />

            <Route
              path="/quick-notes"
              element={
                <QuickNotes />
              }
            />

            <Route
              path="/reminders"
              element={
                <Reminders />
              }
            />

            {/* Existing Quick Tasks page
                remains available by URL for now */}

            <Route
              path="/quick-tasks"
              element={
                <QuickTasks />
              }
            />

            {/* Existing Daily Targets page
                remains available by URL for now */}

            <Route
              path="/daily-targets"
              element={
                <DailyTargets />
              }
            />

            {/* WELLNESS */}

            <Route
              path="/diet"
              element={
                <Diet />
              }
            />

            <Route
              path="/water"
              element={
                <Water />
              }
            />

            <Route
              path="/activities"
              element={
                <Activities />
              }
            />

            <Route
              path="/screen-time"
              element={
                <ScreenTime />
              }
            />

            {/* INSIGHTS */}

            <Route
              path="/insights"
              element={
                <Reports />
              }
            />

            {/* Keep existing Reports route available */}

            <Route
              path="/reports"
              element={
                <Reports />
              }
            />

            {/* PROFILE */}

            <Route
              path="/profile"
              element={
                <Profile />
              }
            />

            {/* SETTINGS */}

            <Route
              path="/settings"
              element={
                <Settings />
              }
            />

            {/* CAREER */}

            <Route
              path="/career"
              element={
                <Navigate
                  to="/job-preparation"
                  replace
                />
              }
            />

            <Route
              path="/job-preparation"
              element={
                <JobPreparation />
              }
            />

            <Route
              path="/applications"
              element={
                <Applications />
              }
            />

            <Route
              path="/saved-jobs"
              element={
                <SavedJobs />
              }
            />

            <Route
              path="/resumes"
              element={
                <Resumes />
              }
            />

            <Route
              path="/interviews"
              element={
                <Interviews />
              }
            />

            <Route
              path="/projects"
              element={
                <Projects />
              }
            />

            {/* FINANCE */}

            <Route
              path="/finance"
              element={
                <Navigate
                  to="/income"
                  replace
                />
              }
            />

            <Route
              path="/income"
              element={
                <Income />
              }
            />

            <Route
              path="/expenses"
              element={
                <Expenses />
              }
            />

            <Route
              path="/budget"
              element={
                <Budget />
              }
            />
          </Routes>
        </main>
      </div>

      {/* =================================================
          MOBILE BOTTOM NAVIGATION
      ================================================= */}

      {!isProfilePage && (
        <MobileBottomNavigation
          onMore={toggleMobileMore}
          moreOpen={mobileMoreOpen}
        />
      )}
    </>
  );
}

/* =========================================================
   PROTECTED APP
   ========================================================= */

function ProtectedApp() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f0f",
          color: "#fff",
          fontSize: "18px",
        }}
      >
        Loading Taskbar...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <>
      <FirestoreTest />

      <FirebaseDataSync />

      <DailyReportManager />

      <SmartNotificationManager />

      <AppLayout />
    </>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedApp />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;