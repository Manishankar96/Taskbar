import { useEffect } from "react";

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
} from "lucide-react";

import Home from "./pages/Home";
import Learning from "./pages/Learning";
import Timetable from "./pages/Timetable";
import Goals from "./pages/Goals";
import Diet from "./pages/Diet";
import Water from "./pages/Water";
import ScreenTime from "./pages/ScreenTime";
import Activities from "./pages/Activities";
import Assessments from "./pages/Assessments";
import QuickTasks from "./pages/QuickTasks";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";

import QuickNotes from "./pages/QuickNotes";
import DailyTargets from "./pages/DailyTargets";
import Reminders from "./pages/Reminders";
import TodoList from "./pages/TodoList";
import StudySessions from "./pages/StudySessions";

import {
  ensureDailyReportHistory,
  createDailyReportForDate,
} from "./utils/db";

import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";

import { testFirestore } from "./firebase/firestoreTest";

import {
  initialSync,
  listenToStore,
} from "./firebase/sync";


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
   QUICK NOTES SYNC
========================================================= */

function QuickNotesSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    let unsubscribe = null;
    let cancelled = false;

    async function startSync() {
      try {
        console.log(
          "🔄 Starting Taskbar Quick Notes sync..."
        );

        /*
         * IMPORTANT:
         * At this stage we are testing ONLY quickNotes.
         */
        await initialSync("quickNotes");

        if (cancelled) {
          return;
        }

        /*
         * Start real-time listener.
         *
         * Changes made on another device will
         * arrive from Firestore.
         */
        unsubscribe =
          listenToStore("quickNotes");

        console.log(
          "✅ Quick Notes sync is active."
        );

      } catch (error) {
        console.error(
          "❌ Quick Notes sync failed:",
          error
        );
      }
    }

    startSync();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();

        console.log(
          "🛑 Quick Notes sync stopped."
        );
      }
    };
  }, [user]);

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

        if (cancelled) return;

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
   SIDEBAR NAVIGATION
========================================================= */

const navigation = [
  {
    label: "Home",
    path: "/",
    icon: HomeIcon,
  },
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
    label: "Goals",
    path: "/goals",
    icon: Target,
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
    label: "Screen Time",
    path: "/screen-time",
    icon: Smartphone,
  },
  {
    label: "Activities",
    path: "/activities",
    icon: Activity,
  },
  {
    label: "Assessments",
    path: "/assessments",
    icon: ClipboardCheck,
  },
  {
    label: "Quick Tasks",
    path: "/quick-tasks",
    icon: Zap,
  },
  {
    label: "Quick Notes",
    path: "/quick-notes",
    icon: StickyNote,
  },
  {
    label: "Daily Targets",
    path: "/daily-targets",
    icon: Target,
  },
  {
    label: "Reminders",
    path: "/reminders",
    icon: Bell,
  },
  {
    label: "To-Do List",
    path: "/todo-list",
    icon: ListTodo,
  },
  {
    label: "Study Sessions",
    path: "/study-sessions",
    icon: Clock3,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
  },
];


/* =========================================================
   BACKGROUND LAYER
========================================================= */

function PageBackground() {
  const location =
    useLocation();

  const isProfilePage =
    location.pathname === "/profile";

  if (isProfilePage) {
    return null;
  }

  return (
    <div
      className="taskbar-spiderman-background"
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

  const isProfilePage =
    location.pathname === "/profile";

  return (
    <>
      <PageBackground />

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

        <aside className="sidebar">

          <div className="sidebar-brand">
            <h1>
              Taskbar
            </h1>

            <span>
              Personal Dashboard
            </span>
          </div>


          <nav className="sidebar-nav">

            {navigation.map(
              ({
                label,
                path,
                icon: Icon,
              }) => (

                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({
                    isActive,
                  }) =>
                    `sidebar-link ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >

                  <Icon
                    size={19}
                  />

                  <span>
                    {label}
                  </span>

                </NavLink>

              )
            )}

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


            {/* LEARNING */}

            <Route
              path="/learning"
              element={
                <Learning />
              }
            />


            {/* TIMETABLE */}

            <Route
              path="/timetable"
              element={
                <Timetable />
              }
            />


            {/* GOALS */}

            <Route
              path="/goals"
              element={
                <Goals />
              }
            />


            {/* DIET */}

            <Route
              path="/diet"
              element={
                <Diet />
              }
            />


            {/* WATER */}

            <Route
              path="/water"
              element={
                <Water />
              }
            />


            {/* SCREEN TIME */}

            <Route
              path="/screen-time"
              element={
                <ScreenTime />
              }
            />


            {/* ACTIVITIES */}

            <Route
              path="/activities"
              element={
                <Activities />
              }
            />


            {/* ASSESSMENTS */}

            <Route
              path="/assessments"
              element={
                <Assessments />
              }
            />


            {/* QUICK TASKS */}

            <Route
              path="/quick-tasks"
              element={
                <QuickTasks />
              }
            />


            {/* QUICK NOTES */}

            <Route
              path="/quick-notes"
              element={
                <QuickNotes />
              }
            />


            {/* DAILY TARGETS */}

            <Route
              path="/daily-targets"
              element={
                <DailyTargets />
              }
            />


            {/* REMINDERS */}

            <Route
              path="/reminders"
              element={
                <Reminders />
              }
            />


            {/* TO-DO LIST */}

            <Route
              path="/todo-list"
              element={
                <TodoList />
              }
            />


            {/* STUDY SESSIONS */}

            <Route
              path="/study-sessions"
              element={
                <StudySessions />
              }
            />


            {/* REPORTS */}

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

          </Routes>

        </main>

      </div>
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


  /* -----------------------------------------
     Firebase is checking login status
  ----------------------------------------- */

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


  /* -----------------------------------------
     User is NOT logged in
  ----------------------------------------- */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  /* -----------------------------------------
     User is logged in
  ----------------------------------------- */

  return (
    <>
      <FirestoreTest />

      <QuickNotesSync />

      <DailyReportManager />

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

        {/* LOGIN */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />


        {/* PROTECTED TASKBAR */}

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