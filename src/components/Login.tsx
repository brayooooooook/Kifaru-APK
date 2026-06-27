/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, GraduationCap, ChevronRight, AlertCircle } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (token: string, config: any, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !username) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");

    try {
  const response = await fetch("https://muchorwe-assessment-system.onrender.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await response.text();

console.log("RAW SERVER RESPONSE:", text);

let data: any;

try {
  const response = await fetch("https://muchorwe-assessment-system.onrender.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await response.text();

  let data: any = {};

  try {
    const response = await fetch(
      "https://muchorwe-assessment-system.onrender.com/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!username || !password) {
    setError("Please enter username and password");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const response = await fetch(
      "https://muchorwe-assessment-system.onrender.com/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      }
    );

    const text = await response.text();

    console.log("SERVER SENT THIS:", text);

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Invalid server response: " + text.slice(0, 200)
      );
    }

    console.log("LOGIN RESPONSE:", data);

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Login failed"
      );
    }

    onLoginSuccess(
      data.token,
      data.config,
      data.user
    );

  } catch (err: any) {
    setError(
      err.message || "Something went wrong. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative clean minimalist grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex justify-center"
        >
          <div className="bg-[#1b365d] p-3.5 rounded-2xl shadow-md border border-navy-700/10">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-center mt-6"
        >
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
            MUCHORWE JUNIOR SCHOOL
          </h1>
          <p className="mt-1 text-xs font-semibold text-[#1b365d] tracking-widest uppercase">
            Motto: Knowledge to Excel
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Grade 8 Blue Marks Management & Report System
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4"
      >
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-200">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative rounded-lg">
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200 focus:border-[#1b365d] focus:ring-1 focus:ring-[#1b365d] rounded-lg text-slate-900 placeholder-slate-400 transition-colors duration-200 outline-none"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Teacher Authorization Password
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  required
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200 focus:border-[#1b365d] focus:ring-1 focus:ring-[#1b365d] rounded-lg text-slate-900 placeholder-slate-400 transition-colors duration-200 outline-none"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-150 rounded-lg p-3 text-sm text-rose-600 flex items-start gap-2.5"
              >
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <div>
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#1b365d] hover:bg-[#152a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1b365d] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {loading ? "Verifying..." : "Access System"}
                {!loading && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Authorized class teacher access only. Mr. Brian Ayiecha, Class Teacher.
        </p>
      </motion.div>
    </div>
  );
}
