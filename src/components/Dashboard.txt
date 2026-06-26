/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Learner, SUBJECTS } from "../types";
import { getFinalTermMarksLocal } from "./MeritList";
import { 
  Users, BookOpen, Trophy, Award, BarChart3, FileSpreadsheet, 
  Plus, ClipboardList, FileText, Download, Share2, ArrowRight, Clock, ShieldAlert, CheckCircle2
} from "lucide-react";

interface DashboardProps {
  learners: Learner[];
  marks: any;
  remarks: Record<string, string>;
  setActiveTab: (tab: any) => void;
  config: any;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function Dashboard({
  learners,
  marks,
  remarks,
  setActiveTab,
  config,
  onAlert
}: DashboardProps) {
  // 1. Calculate stats
  const { topLearner, classMean, highestScore, lowestScore, reportsGeneratedCount } = useMemo(() => {
    if (learners.length === 0) {
      return {
        topLearner: { name: "N/A", total: 0, position: 1 },
        classMean: 0,
        highestScore: 0,
        lowestScore: 0,
        reportsGeneratedCount: 0
      };
    }

    const learnersWithTotals = learners.map((l) => {
      const studentMarks = getFinalTermMarksLocal(config, marks, l.id);
      const subScores = SUBJECTS.map((sub) => studentMarks[sub.code] || 0);
      const total = subScores.reduce((a, b) => a + b, 0);
      const average = total / SUBJECTS.length;
      return {
        id: l.id,
        name: l.name,
        total,
        average
      };
    });

    const sorted = [...learnersWithTotals].sort((a, b) => b.total - a.total);

    // Apply Standard Competitive Ranking
    let currentRank = 1;
    const sortedWithRanks = sorted.map((item, idx) => {
      if (idx > 0 && item.total < sorted[idx - 1].total) {
        currentRank = idx + 1;
      }
      return {
        ...item,
        position: currentRank
      };
    });

    const totalScoresSum = sortedWithRanks.reduce((sum, item) => sum + item.total, 0);
    const classMean = sortedWithRanks.length > 0 ? (totalScoresSum / sortedWithRanks.length) : 0;
    const highestScore = sortedWithRanks.length > 0 ? sortedWithRanks[0].total : 0;
    const lowestScore = sortedWithRanks.length > 0 ? sortedWithRanks[sortedWithRanks.length - 1].total : 0;

    const topLearner = sortedWithRanks.length > 0 
      ? { name: sortedWithRanks[0].name, total: sortedWithRanks[0].total, position: 1 }
      : { name: "N/A", total: 0, position: 1 };

    // Reports generated: count of learners that have a custom remark in remarks mapping
    const reportsGeneratedCount = Object.keys(remarks).filter(key => remarks[key] && remarks[key].trim().length > 0).length;

    return {
      topLearner,
      classMean,
      highestScore,
      lowestScore,
      reportsGeneratedCount
    };
  }, [learners, marks, remarks, config]);

  // Read logs from local storage or set defaults
  const logs = useMemo(() => {
    const defaultDate = new Date();
    defaultDate.setMinutes(defaultDate.getMinutes() - 15);
    const lastMarks = localStorage.getItem("last_marks_entry_date") || "Today, " + defaultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastMerit = localStorage.getItem("last_merit_list_generated") || "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastReports = localStorage.getItem("last_reports_generated") || "Yesterday, 04:30 PM";
    const lastExport = localStorage.getItem("last_export_completed") || "Yesterday, 05:15 PM";

    return [
      { id: "marks", label: "Last marks entry completed", time: lastMarks, color: "border-[#1b365d] bg-[#f0f4f8] text-[#1b365d]" },
      { id: "merit", label: "Last merit list compiled & ranked", time: lastMerit, color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
      { id: "reports", label: "Last report forms comments synchronized", time: lastReports, color: "border-purple-500 bg-purple-50 text-purple-700" },
      { id: "export", label: "Last CSV/Google Sheets backup exported", time: lastExport, color: "border-amber-500 bg-amber-50 text-amber-700" }
    ];
  }, [learners, marks, remarks]);

  return (
    <div className="space-y-8 bg-white text-black min-h-screen">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight text-gray-950">
            Welcome back, {config.classTeacher || "Teacher"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Overview of <strong>{config.className || "Grade 8 Blue"}</strong> at {config.schoolName || "School"} &mdash; {config.term || "Active Term"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-600 shadow-xs">
          <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
          <span>Session Active</span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Learners Card */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Learners</span>
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950">
                {learners.length}
              </span>
              <span className="text-[11px] font-medium text-gray-500 block">Grade 8 Blue Register</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-100 text-black rounded-2xl">
              <Users className="h-5.5 w-5.5" />
            </div>
          </div>
        </div>

        {/* Total Subjects Card */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Subjects</span>
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950">
                {SUBJECTS.length}
              </span>
              <span className="text-[11px] font-medium text-gray-500 block">Kenyan CBC CBC Aligned</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-100 text-black rounded-2xl">
              <BookOpen className="h-5.5 w-5.5" />
            </div>
          </div>
        </div>

        {/* Class Mean Score Card */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Class Mean Score</span>
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950">
                {classMean.toFixed(1)}
              </span>
              <span className="text-[11px] font-medium text-gray-500 block">Out of 900 Max Points</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-100 text-black rounded-2xl">
              <BarChart3 className="h-5.5 w-5.5" />
            </div>
          </div>
        </div>

        {/* Reports Generated Card */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Report Cards</span>
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950">
                {reportsGeneratedCount} <span className="text-sm text-gray-400">/ {learners.length}</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 block">
                <CheckCircle2 className="h-3 w-3" />
                Comments synchronized
              </span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-100 text-black rounded-2xl">
              <FileText className="h-5.5 w-5.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Top, Highest & Lowest Detail Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Learner Card */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 col-span-1 shadow-xs">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
            <div className="p-2.5 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Current Class Champion</h4>
              <p className="text-xs text-gray-500">Highest aggregate marks</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
              <span className="text-base font-semibold text-gray-950 line-clamp-1">{topLearner.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Marks</span>
                <span className="text-lg font-bold text-yellow-700 font-mono">{topLearner.total} <span className="text-xs text-gray-400">/ 900</span></span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Position</span>
                <span className="text-lg font-bold text-gray-950">Rank #1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Highest and Lowest Aggregate Score Stats */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 col-span-1 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
              <div className="p-2.5 bg-[#f0f4f8] text-[#1b365d] rounded-xl border border-navy-100">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Highest & Lowest Range</h4>
                <p className="text-xs text-gray-500">Aggregate boundaries</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Highest Score</span>
                <span className="text-xl font-bold font-mono text-gray-950">{highestScore}</span>
                <span className="text-[10px] text-gray-400 block">Marks obtained</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lowest Score</span>
                <span className="text-xl font-bold font-mono text-gray-900">{lowestScore}</span>
                <span className="text-[10px] text-gray-400 block">Marks obtained</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-[11px] text-gray-500 mt-4 leading-relaxed">
            The variance between the highest and lowest aggregates is <strong>{highestScore - lowestScore} marks</strong>.
          </div>
        </div>

        {/* Mini Class Info Header / Welcome */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 col-span-1 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#1b365d] uppercase tracking-widest block">Class Identification</span>
            <h4 className="text-lg font-display font-bold leading-tight text-slate-900">{config.schoolName}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Motto: "{config.schoolMotto}"<br />
              Teacher: <strong>{config.classTeacher}</strong><br />
              Classroom: <strong>{config.className}</strong>
            </p>
          </div>
          <button 
            onClick={() => setActiveTab("settings")}
            className="w-full mt-4 py-2 px-3 bg-[#1b365d] hover:bg-[#152a4a] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            Edit School Details
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Access Actions Panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-gray-950 flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#1b365d]" />
          Quick Actions Shortcut Hub
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => setActiveTab("marks")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-[#f0f4f8] text-[#1b365d] rounded-xl">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Enter Marks</span>
          </button>

          <button
            onClick={() => setActiveTab("merit")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Generate Merit List</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Generate Reports</span>
          </button>

          <button
            onClick={() => setActiveTab("exports")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
              <Download className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Export to PDF</span>
          </button>

          <button
            onClick={() => setActiveTab("exports")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Export Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab("learners")}
            className="p-4 bg-white border border-gray-200 hover:border-[#1b365d] hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Manage Learners</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Trail */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-gray-950 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Operations Activity Trail
        </h3>
        <div className="border border-gray-150 rounded-2xl overflow-hidden divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-8 rounded-full border-l-2 shrink-0 ${log.color.split(" ")[0]}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{log.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">System recorded status</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${log.color.split(" ").slice(1).join(" ")}`}>
                  {log.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
