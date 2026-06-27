/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { getSystemData } from "./services/learnerService";
import { Learner } from "./types";
import Login from "./components/Login";
import LearnersManagement from "./components/LearnersManagement";
import MarksEntry from "./components/MarksEntry";
import MeritList from "./components/MeritList";
import ReportForms from "./components/ReportForms";
import SchoolSettings from "./components/SchoolSettings";
import { UserManagement } from "./components/UserManagement";
import Dashboard from "./components/Dashboard";
import Analytics from "./components/Analytics";
import Exports from "./components/Exports";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Edit3, ClipboardList, FileText, Settings, 
  LogOut, GraduationCap, AlertCircle, CheckCircle2, RefreshCw,
  Menu, X, LayoutDashboard, BarChart2, Download, Sun, Moon
} from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("teacher_token"));
  const [config, setConfig] = useState<{
    schoolName: string;
    schoolMotto: string;
    classTeacher: string;
    className: string;
    term: string;
    assessments?: Array<{ id: string; name: string; weight: number }>;
  }>({
    schoolName: "MUCHORWE JUNIOR SCHOOL",
    schoolMotto: "KNOWLEDGE TO EXCEL",
    classTeacher: "MR BRIAN AYIECHA",
    className: "GRADE 8 BLUE",
    term: "MID-TERM (TERM 2)",
    assessments: [
      { id: "opener", name: "Opener Examination", weight: 20 },
      { id: "midterm", name: "Mid-Term Examination", weight: 30 },
      { id: "endterm", name: "End-Term Examination", weight: 50 }
    ]
  });

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "learners" | "marks" | "merit" | "reports" | "analytics" | "exports" | "settings" | "users"
  >("dashboard");
  const [user, setUser] = useState<{ id: string, username: string, role: string } | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [marks, setMarks] = useState<any>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Theme dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Custom Alert state
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showAlert = (msg: string, type: "success" | "error" = "success") => {
    setAlert({ msg, type });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };

      const [learnersRes, marksRes, remarksRes] = await Promise.all([
        fetch("/api/learners", { headers }),
        fetch("/api/marks", { headers }),
        fetch("/api/remarks", { headers })
      ]);

      if (learnersRes.status === 401 || marksRes.status === 401) {
        handleLogout();
        showAlert("Active session expired. Please sign in again.", "error");
        return;
      }

      const learnersData = await learnersRes.json();
      const marksData = await marksRes.json();
      const remarksData = await remarksRes.json();

      setLearners(learnersData);
      setMarks(marksData);
      setRemarks(remarksData);
    } catch (err) {
      console.error("Failed to fetch classroom data:", err);
      showAlert("Network synchronization failure. Retrying...", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (token) {
    getSystemData().then((data) => {
      console.log(data);
    });
      // Recover credentials config from local storage if available
      const savedConfig = localStorage.getItem("teacher_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setConfig({
            schoolName: parsed.schoolName || "MUCHORWE JUNIOR SCHOOL",
            schoolMotto: parsed.schoolMotto || "KNOWLEDGE TO EXCEL",
            classTeacher: parsed.classTeacher || "MR BRIAN AYIECHA",
            className: parsed.className || "GRADE 8 BLUE",
            term: parsed.term || "MID-TERM (TERM 2)",
            assessments: parsed.assessments || [
              { id: "opener", name: "Opener Examination", weight: 20 },
              { id: "midterm", name: "Mid-Term Examination", weight: 30 },
              { id: "endterm", name: "End-Term Examination", weight: 50 }
            ]
          });
        } catch (_) {}
      }
      
      const cachedUser = localStorage.getItem("teacher_user");
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch (_) {}
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, userConfig: any, loggedInUser: any) => {
    localStorage.setItem("teacher_token", newToken);
    localStorage.setItem("teacher_config", JSON.stringify(userConfig));
    localStorage.setItem("teacher_user", JSON.stringify(loggedInUser));
    setToken(newToken);
    setConfig(userConfig);
    setUser(loggedInUser);
    showAlert(`Authorized successfully! Welcome ${loggedInUser.username}.`, "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("teacher_token");
    localStorage.removeItem("teacher_config");
    localStorage.removeItem("teacher_user");
    setToken(null);
    setUser(null);
    setLearners([]);
    setMarks({});
    setRemarks({});
  };

  const handleUpdateConfig = (newConfig: any) => {
    setConfig(newConfig);
    localStorage.setItem("teacher_config", JSON.stringify(newConfig));
  };

  // If unauthorized, show login screen immediately
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const navOptions = [
    { id: "dashboard", label: "Dashboard", emoji: "🏠", icon: LayoutDashboard },
    { id: "learners", label: "Learners", emoji: "👨‍🎓", icon: Users },
    { id: "marks", label: "Marks Entry", emoji: "📝", icon: Edit3 },
    { id: "merit", label: "Merit List", emoji: "🏆", icon: ClipboardList },
    { id: "reports", label: "Report Forms", emoji: "📄", icon: FileText },
    { id: "analytics", label: "Analytics", emoji: "📊", icon: BarChart2 },
    { id: "exports", label: "Exports", emoji: "📤", icon: Download },
    { id: "settings", label: "Settings", emoji: "⚙️", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white text-black dark:bg-slate-950 dark:text-slate-100 flex antialiased transition-colors duration-200">
      {/* Alert Notification Display */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 no-print"
          >
            <div className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 ${
              alert.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400" 
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400"
            }`}>
              {alert.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium">{alert.msg}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY for mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black z-40 md:hidden no-print"
          />
        )}
      </AnimatePresence>

      {/* OVERHAULED SIDEBAR PANEL */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static ${
          sidebarOpen ? "md:flex" : "md:hidden"
        } flex-col w-64 bg-slate-50 dark:bg-slate-900 border-r border-gray-250 dark:border-slate-800 h-screen z-50 transition-transform duration-300 ease-in-out shrink-0 no-print`}
      >
        {/* Sidebar Header Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#1b365d] p-1.5 rounded-lg text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight text-gray-950 dark:text-slate-100 uppercase line-clamp-1">
                {config.schoolName}
              </h1>
              <p className="text-[9px] font-bold text-[#1b365d] tracking-wider uppercase">
                {config.className}
              </p>
            </div>
          </div>
          {/* Mobile close menu */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
          {navOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveTab(opt.id as any);
                  // Only close on mobile sizes
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1b365d] text-white font-bold shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm shrink-0">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </div>
                <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
              </button>
            );
          })}

          {/* Explicit Logout Option as requested */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50/20 dark:text-rose-450 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm shrink-0">🚪</span>
              <span>Logout</span>
            </div>
            <LogOut className="h-4 w-4 text-rose-400" />
          </button>

          {/* User Management if Admin */}
          {user?.role === "admin" && (
            <button
              onClick={() => {
                setActiveTab("users");
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                  : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm shrink-0">👥</span>
                <span>User Management</span>
              </div>
              <Users className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </nav>

        {/* Sync Controls in Sidebar Footer */}
        <div className="p-3.5 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-gray-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>{loading ? "Syncing..." : "Database Sync"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Unified Top Header Row with Hamburger (visible on both mobile and desktop) */}
        <header className="h-16 border-b border-gray-200 dark:border-slate-800 px-5 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-gray-700 dark:text-slate-300 hover:bg-gray-105 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-[#1b365d] p-1.5 rounded-lg text-white">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <h1 className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {config.schoolName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-700" />
              )}
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Sync Database"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </header>

        {/* Content View Grid Stage */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  learners={learners}
                  marks={marks}
                  remarks={remarks}
                  setActiveTab={setActiveTab}
                  config={config}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "learners" && (
                <LearnersManagement
                  learners={learners}
                  token={token}
                  onRefresh={fetchAllData}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "marks" && (
                <MarksEntry
                  learners={learners}
                  marks={marks}
                  token={token}
                  config={config}
                  onRefresh={fetchAllData}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "merit" && (
                <MeritList
                  learners={learners}
                  marks={marks}
                  config={config}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "reports" && (
                <ReportForms
                  learners={learners}
                  marks={marks}
                  remarks={remarks}
                  token={token}
                  config={config}
                  onRefresh={fetchAllData}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "analytics" && (
                <Analytics
                  learners={learners}
                  marks={marks}
                  config={config}
                />
              )}
              {activeTab === "exports" && (
                <Exports
                  learners={learners}
                  marks={marks}
                  remarks={remarks}
                  token={token}
                  config={config}
                  onRefresh={fetchAllData}
                  onAlert={showAlert}
                />
              )}
              {activeTab === "settings" && (
                <SchoolSettings
                  token={token}
                  config={config}
                  onUpdateConfig={handleUpdateConfig}
                  onAlert={showAlert}
                  onLogout={handleLogout}
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode(!darkMode)}
                />
              )}
              {activeTab === "users" && user?.role === "admin" && (
                <UserManagement
                  token={token}
                  onAlert={showAlert}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
