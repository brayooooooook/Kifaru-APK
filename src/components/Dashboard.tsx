/**
@license
SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo } from "react";
import type { Learner, AppTab, AssessmentMarks, AssessmentConfig } from "../types";
import { useDashboardStatistics } from "../hooks/useDashboardStatistics";
import { SUBJECTS } from "../types";
import {
  Users, Trophy, Award, FileSpreadsheet,
  Plus, ClipboardList, FileText, Download, Clock
} from "lucide-react";

interface DashboardProps {
  learners: Learner[];
  marks: AssessmentMarks;
  remarks: Record<string, string>;
  setActiveTab: (tab: AppTab) => void;
  config: AssessmentConfig;
}

const LOG_STYLE = "bg-[#F8FAFC] text-[#1B365D] border-[#1B365D]";

export default function Dashboard({
  learners,
  marks,
  remarks,
  setActiveTab,
  config
}: DashboardProps) {

  const {
    topLearner,
    classMean,
    highestScore,
    lowestScore,
    reportsGeneratedCount
  } = useDashboardStatistics(learners, marks, remarks, config);

  const logs = useMemo(() => {
    return [
      { id: "marks", label: "Last marks entry completed", time: "Just now" },
      { id: "merit", label: "Last merit list compiled", time: "1h ago" }
    ];
  }, [remarks, marks]);

  const quickActions = [
    { label: "Enter Marks", tab: "marks", icon: Plus },
    { label: "Merit List", tab: "merit", icon: ClipboardList },
    { label: "Reports", tab: "reports", icon: FileText },
    { label: "PDF Export", tab: "exports", icon: Download },
    { label: "Sheets", tab: "exports", icon: FileSpreadsheet },
    { label: "Learners", tab: "learners", icon: Users }
  ] as const;

  return (
    <div className="space-y-8 bg-[#F8FAFC] text-black min-h-screen p-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-6 gap-4">
        <div>
          <h2 className="text-4xl font-display font-bold tracking-tight text-[#1B365D]">Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Welcome, <strong>{config?.classTeacher?.split(" ")[0] ?? "Teacher"}</strong><br />
            {config?.className ?? "Grade 8 Blue"} • {config?.schoolName ?? "Muchorwe Junior School"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#1B365D] shadow-sm">
          <Clock className="h-4 w-4 text-[#1B365D]" />
          <span>System Online</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Learners</span>
          <span className="block text-3xl font-display font-bold text-gray-950 mt-1.5">{learners?.length ?? 0}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Mean</span>
          <span className="block text-3xl font-display font-bold text-gray-950 mt-1.5">{classMean?.toFixed(1) ?? "0.0"}</span>
        </div>
      </div>

      {/* Champion Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Learner Details</span>
          <span className="block text-base font-semibold text-gray-950">{topLearner?.name ?? "No Data"}</span>
          <span className="block text-xs text-gray-500 -mt-2">Adm No: {topLearner?.admissionNumber ?? "N/A"}</span>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total</span><span className="text-lg font-bold text-[#1B365D] font-mono">{topLearner?.total ?? 0}</span></div>
            <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rank</span><span className="text-lg font-bold text-gray-950">#{topLearner?.position ?? "-"}</span></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-[#1B365D]">
          Quick Actions Shortcut Hub
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {quickActions.map((action, i) => (
            <button
              key={i}
              aria-label={action.label}
              onClick={() => setActiveTab(action.tab as AppTab)}
              className={`p-4 border border-gray-200 hover:border-[#1B365D] hover:shadow transition-all rounded-2xl flex flex-col items-center gap-2 ${
                action.label === "Enter Marks"
                  ? "bg-[#1B365D] text-white"
                  : "bg-white text-gray-800"
              }`}
            >
              <div
                className={`p-3 rounded-2xl ${
                  action.label === "Enter Marks"
                    ? "bg-white/10"
                    : "bg-[#F0F4F8] text-[#1B365D]"
                }`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Trail */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-[#1B365D]">Recent Operations Activity Trail</h3>
        <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
          {logs.map((log, i) => (
            <div key={i} className="p-4 bg-white flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">{log.label}</p>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${LOG_STYLE}`}>
                {log.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
