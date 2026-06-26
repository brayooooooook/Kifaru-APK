/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Settings, Lock, GraduationCap, RefreshCw, CheckCircle, ShieldAlert, Sun, Moon, Plus, Trash2, Scale, Info } from "lucide-react";

interface SchoolSettingsProps {
  token: string;
  config: {
    schoolName: string;
    schoolMotto: string;
    classTeacher: string;
    className: string;
    term: string;
    assessments?: Array<{ id: string; name: string; weight: number }>;
  };
  onUpdateConfig: (newConfig: any) => void;
  onAlert: (msg: string, type: "success" | "error") => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SchoolSettings({
  token,
  config,
  onUpdateConfig,
  onAlert,
  onLogout,
  darkMode,
  onToggleDarkMode
}: SchoolSettingsProps) {
  // Config state
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [schoolMotto, setSchoolMotto] = useState(config.schoolMotto);
  const [classTeacher, setClassTeacher] = useState(config.classTeacher);
  const [className, setClassName] = useState(config.className);
  const [term, setTerm] = useState(config.term || "MID-TERM (TERM 2)");
  const [savingConfig, setSavingConfig] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const updatedData = {
        schoolName,
        schoolMotto,
        classTeacher,
        className,
        term
      };

      const response = await fetch("/api/config/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile settings");
      }
      onAlert("School profile updated successfully!", "success");
      onUpdateConfig(updatedData);
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onAlert("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 4) {
      onAlert("Password must be at least 4 characters long", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      onAlert("Authorization password changed successfully! Your session is updated.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (data.token) {
        localStorage.setItem("teacher_token", data.token);
      }
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile & Assessments settings card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 md:p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-display font-bold text-gray-950 dark:text-slate-50 flex items-center gap-2">
            <GraduationCap className="h-5.5 w-5.5 text-[#1b365d]" />
            School & Class Profile
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Configure school identifiers, class names, and active terms. These details are dynamically updated across the entire application.
          </p>
        </div>

        <form onSubmit={handleUpdateConfig} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="set-school-name" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                School Name
              </label>
              <input
                id="set-school-name"
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
              />
            </div>

            <div>
              <label htmlFor="set-school-motto" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                School Motto
              </label>
              <input
                id="set-school-motto"
                type="text"
                required
                value={schoolMotto}
                onChange={(e) => setSchoolMotto(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="set-teacher" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Class Teacher
                </label>
                <input
                  id="set-teacher"
                  type="text"
                  required
                  value={classTeacher}
                  onChange={(e) => setClassTeacher(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
                />
              </div>

              <div>
                <label htmlFor="set-class-name" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Class / Form Name
                </label>
                <input
                  id="set-class-name"
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
                />
              </div>

              <div>
                <label htmlFor="set-term" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Active Term (e.g. Term 2)
                </label>
                <input
                  id="set-term"
                  type="text"
                  required
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
                />
              </div>
            </div>
          </div>



          <button
            id="btn-save-profile"
            type="submit"
            disabled={savingConfig}
            className="w-full py-2.5 px-4 bg-[#1b365d] hover:bg-[#152a4a] disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {savingConfig ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : null}
            {savingConfig ? "Saving configuration..." : "Save Class Profile"}
          </button>
        </form>
      </div>

      {/* Right column with Theme & Security Settings */}
      <div className="space-y-6">
        {/* Customization & Theme switcher card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 md:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-display font-bold text-gray-950 dark:text-slate-50 flex items-center gap-2">
              {darkMode ? <Moon className="h-5.5 w-5.5 text-indigo-400" /> : <Sun className="h-5.5 w-5.5 text-[#1b365d]" />}
              Portal Visual Theme
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Select your preferred visual environment for managing classroom grades and reports.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              id="btn-theme-light"
              onClick={() => { if (darkMode) onToggleDarkMode(); }}
              className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                !darkMode
                  ? "bg-slate-50 border-[#1b365d] text-[#1b365d] shadow-xs"
                  : "bg-transparent border-gray-200 text-gray-400 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>Light Mode (Default)</span>
            </button>

            <button
              id="btn-theme-dark"
              onClick={() => { if (!darkMode) onToggleDarkMode(); }}
              className={`flex items-center justify-center gap-2 p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                darkMode
                  ? "bg-slate-800 border-indigo-500 text-indigo-400 shadow-xs"
                  : "bg-transparent border-gray-200 text-gray-500 hover:bg-slate-50"
              }`}
            >
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Security Settings card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-display font-bold text-gray-950 dark:text-slate-50 flex items-center gap-2">
            <Lock className="h-5.5 w-5.5 text-[#1b365d]" />
            Teacher Security Authorization
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Rotate the secure access password for grade editing authorizations. Make sure to keep it memorized.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div>
              <label htmlFor="current-pass" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Current Password
              </label>
              <input
                id="current-pass"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-pass" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  id="new-pass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
                />
              </div>

              <div>
                <label htmlFor="confirm-pass" className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-pass"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-[#1b365d] dark:focus:border-[#1b365d] dark:text-slate-100 rounded-lg transition-all"
                />
              </div>
            </div>

            <button
              id="btn-update-password"
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 px-4 bg-[#1b365d] hover:bg-[#152a4a] disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {changingPassword ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {changingPassword ? "Updating password..." : "Update Password"}
            </button>
          </form>
        </div>

          <div className="border border-red-100 dark:border-rose-950/40 bg-rose-50/50 dark:bg-rose-950/10 rounded-xl p-4 flex items-start gap-3 mt-4">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">Teacher Logout</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                If you are working on a shared staffroom computer, make sure to terminate your active session before leaving.
              </p>
              <button
                id="btn-logout"
                onClick={onLogout}
                className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-500 hover:underline cursor-pointer"
              >
                Sign out of School System
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
