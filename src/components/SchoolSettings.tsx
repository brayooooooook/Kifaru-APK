/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Lock,
  GraduationCap,
  RefreshCw,
  ShieldAlert,
  Sun,
  Moon
} from "lucide-react";

interface Assessment {
  id: string;
  name: string;
  weight: number;
}

interface SchoolConfig {
  schoolName: string;
  schoolMotto: string;
  classTeacher: string;
  className: string;
  term: string;
  assessments?: Assessment[];
}

interface SchoolSettingsProps {
  token: string;
  config: SchoolConfig;
  onUpdateConfig: (newConfig: SchoolConfig) => void;
  onAlert: (msg: string, type: "success" | "error") => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

async function apiRequest(
  url: string,
  token: string,
  payload: unknown
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
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

  const [form, setForm] = useState<SchoolConfig>(config);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingConfig, setSavingConfig] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);


  useEffect(() => {
    setForm(config);
  }, [config]);


  const updateField = (
    field: keyof SchoolConfig,
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleUpdateConfig = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setSavingConfig(true);

    try {

      await apiRequest(
        "/api/config/update",
        token,
        form
      );

      onUpdateConfig(form);

      onAlert(
        "School profile updated successfully",
        "success"
      );

    } catch(error) {

      onAlert(
        error instanceof Error
          ? error.message
          : "Update failed",
        "error"
      );

    } finally {
      setSavingConfig(false);
    }
  };


  const handleChangePassword = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();


    if(newPassword.length < 8){
      onAlert(
        "Password must be at least 8 characters",
        "error"
      );
      return;
    }


    if(newPassword !== confirmPassword){
      onAlert(
        "Passwords do not match",
        "error"
      );
      return;
    }


    setChangingPassword(true);


    try {

      const data = await apiRequest(
        "/api/auth/change-password",
        token,
        {
          currentPassword,
          newPassword
        }
      );


      if(data.token){
        localStorage.setItem(
          "teacher_token",
          data.token
        );
      }


      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");


      onAlert(
        "Password updated successfully",
        "success"
      );


    } catch(error){

      onAlert(
        error instanceof Error
          ? error.message
          : "Password update failed",
        "error"
      );

    } finally {
      setChangingPassword(false);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


      {/* PROFILE SETTINGS */}

      <section className="bg-white dark:bg-slate-900 rounded-xl border p-6">

        <h2 className="font-bold text-lg flex gap-2 items-center">
          <GraduationCap />
          School Profile
        </h2>


        <form
          onSubmit={handleUpdateConfig}
          className="space-y-4 mt-6"
        >

          {[
            ["schoolName","School Name"],
            ["schoolMotto","School Motto"],
            ["classTeacher","Class Teacher"],
            ["className","Class Name"],
            ["term","Active Term"]

          ].map(([field,label]) => (

            <div key={field}>

              <label className="text-sm font-semibold">
                {label}
              </label>

              <input
                value={
                  form[field as keyof SchoolConfig] as string
                }
                onChange={
                  e =>
                  updateField(
                    field as keyof SchoolConfig,
                    e.target.value
                  )
                }
                className="
                w-full mt-1 p-2 rounded-lg
                bg-gray-50 dark:bg-slate-800
                border
                "
              />

            </div>

          ))}


          <button
            disabled={savingConfig}
            className="
            w-full bg-blue-900 text-white
            p-3 rounded-lg
            "
          >

            {savingConfig &&
              <RefreshCw className="inline animate-spin mr-2"/>
            }

            Save Profile

          </button>


        </form>

      </section>



      {/* SECURITY + THEME */}

      <section className="space-y-6">


        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">

          <h2 className="font-bold flex gap-2">
            {darkMode
              ? <Moon/>
              : <Sun/>
            }

            Theme
          </h2>


          <button
            onClick={onToggleDarkMode}
            className="mt-4 p-3 border rounded-lg"
          >
            Toggle {darkMode ? "Light" : "Dark"} Mode
          </button>

        </div>




        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">

          <h2 className="font-bold flex gap-2">
            <Lock/>
            Security
          </h2>


          <form
            onSubmit={handleChangePassword}
            className="space-y-3 mt-4"
          >

            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e=>setCurrentPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e=>setNewPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />


            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e=>setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />


            <button
              disabled={changingPassword}
              className="w-full bg-blue-900 text-white p-2 rounded"
            >

              {changingPassword
              ? "Updating..."
              : "Update Password"}

            </button>

          </form>

        </div>



        <div className="border border-red-300 rounded-xl p-4">

          <ShieldAlert className="text-red-500"/>

          <p className="text-sm mt-2">
            Sign out when using shared computers.
          </p>


          <button
            onClick={onLogout}
            className="text-red-600 font-bold mt-2"
          >
            Logout

          </button>

        </div>


      </section>


    </div>
  );
}
