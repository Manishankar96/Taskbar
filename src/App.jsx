import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

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

import {
  ensureDailyReportHistory,
  createDailyReportForDate,
} from "./utils/db";

// ============================================================
// DATE HELPER
// ============================================================

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ============================================================
// GET PREVIOUS LOCAL DATE
// ============================================================

function getPreviousDateKey(date = new Date()) {
  const previousDate = new Date(date);

  previousDate.setDate(previousDate.getDate() - 1);

  return getLocalDateKey(previousDate);
}

// ============================================================
// DAILY REPORT MANAGER
// ============================================================
//
// Responsibilities:
//
// 1. On application start:
//    - Check historical daily reports.
//    - Create missing reports for previous days.
//
// 2. If the user keeps the dashboard open across midnight:
//    - Detect the new day.
//    - Save yesterday as a daily report.
//
// 3. Keep the process running automatically.
//
// ============================================================

function DailyReportManager() {
  useEffect(() => {
    let lastCheckedDate = getLocalDateKey();

    const updateDailyReports = async () => {
      try {
        const today = getLocalDateKey();

        // ------------------------------------------------------
        // First load / new day
        // ------------------------------------------------------

        if (today !== lastCheckedDate) {
          const previousDay = getPreviousDateKey();

          // Save yesterday's final dashboard state.
          await createDailyReportForDate(previousDay);

          lastCheckedDate = today;
        }

        // ------------------------------------------------------
        // Catch up any older missing reports.
        // ------------------------------------------------------

        await ensureDailyReportHistory();
      } catch (error) {
        console.error(
          "Failed to update daily report history:",
          error
        );
      }
    };

    // Run immediately when the application starts.
    updateDailyReports();

    // ----------------------------------------------------------
    // Check once every minute.
    //
    // This allows the dashboard to detect midnight even when
    // the user keeps the browser tab open.
    // ----------------------------------------------------------

    const intervalId = setInterval(() => {
      updateDailyReports();
    }, 60 * 1000);

    // ----------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return null;
}

// ============================================================
// MAIN APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <DailyReportManager />

      <div className="app">

        {/* ================================================== */}
        {/* SIDEBAR                                            */}
        {/* ================================================== */}

        <aside className="sidebar">

          <h2>My Dashboard</h2>

          <nav>

            <NavLink to="/">
              🏠 Home
            </NavLink>

            <NavLink to="/learning">
              📚 Learning
            </NavLink>

            <NavLink to="/timetable">
              🗓️ Timetable
            </NavLink>

            <NavLink to="/goals">
              🎯 Goals
            </NavLink>

            <NavLink to="/diet">
              🥗 Diet
            </NavLink>

            <NavLink to="/water">
              💧 Water
            </NavLink>

            <NavLink to="/screen-time">
              📱 Screen Time
            </NavLink>

            <NavLink to="/activities">
              ✍️ Activities
            </NavLink>

            <NavLink to="/assessments">
              📝 Assessments
            </NavLink>

            <NavLink to="/quick-tasks">
              ⚡ Quick Tasks
            </NavLink>

            <NavLink to="/reports">
              📊 Reports
            </NavLink>

            <NavLink to="/profile">
              👤 Profile
            </NavLink>

          </nav>

        </aside>

        {/* ================================================== */}
        {/* MAIN CONTENT                                       */}
        {/* ================================================== */}

        <main className="main-content">

          <Routes>

            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/learning"
              element={<Learning />}
            />

            <Route
              path="/timetable"
              element={<Timetable />}
            />

            <Route
              path="/goals"
              element={<Goals />}
            />

            <Route
              path="/diet"
              element={<Diet />}
            />

            <Route
              path="/water"
              element={<Water />}
            />

            <Route
              path="/screen-time"
              element={<ScreenTime />}
            />

            <Route
              path="/activities"
              element={<Activities />}
            />

            <Route
              path="/assessments"
              element={<Assessments />}
            />

            <Route
              path="/quick-tasks"
              element={<QuickTasks />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

          </Routes>

        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;