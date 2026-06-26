/**  
 * @license  
 * SPDX-License-Identifier: Apache-2.0  
 */  
  
import React, { useMemo } from "react";  
import type { Learner, AppTab, AssessmentMarks, AssessmentConfig, ActivityLog } from "../types";  
import { useDashboardStatistics } from "../hooks/useDashboardStatistics";  
import { SUBJECTS } from "../types";  
import {   
  Users, BookOpen, Trophy, Award, BarChart3, FileSpreadsheet,   
  Plus, ClipboardList, FileText, Download, Clock, CheckCircle2, ArrowRight  
} from "lucide-react";  
  
interface DashboardProps {  
  learners: Learner[];  
  marks: AssessmentMarks;  
  remarks: Record<string, string>;  
  setActiveTab: (tab: AppTab) => void;  
  config: AssessmentConfig;  
}  
  
// Strongly typed token literals ensuring compile-time safety  
type LogVariant = "blue" | "emerald" | "purple" | "amber";  
  
const LOG_VARIANTS: Record<LogVariant, { bar: string; badge: string }> = {  
  blue: {  
    bar: "border-[#1b365d] dark:border-blue-500",  
    badge: "bg-[#f0f4f8] dark:bg-slate-800 text-[#1b365d] dark:text-blue-400"  
  },  
  emerald: {  
    bar: "border-emerald-500",  
    badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"  
  },  
  purple: {  
    bar: "border-purple-500",  
    badge: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"  
  },  
  amber: {  
    bar: "border-amber-500",  
    badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"  
  }  
};  
  
export default function Dashboard({  
  learners,  
  marks,  
  remarks,  
  setActiveTab,  
  config  
}: DashboardProps) {  
    
  // 1. Offloaded Analytical Logic Block  
  const {   
    topLearner,   
    classMean,   
    highestScore,   
    lowestScore,   
    reportsGeneratedCount   
  } = useDashboardStatistics(learners, marks, remarks, config);  
  
  // 2. Operational Trail Logs (Reactively tracks state mutations)  
  const logs = useMemo<ReadonlyArray<Omit<ActivityLog, "color"> & { color: LogVariant }>>(() => {  
    const isBrowser = typeof window !== "undefined";  
    const defaultDate = new Date();  
    defaultDate.setMinutes(defaultDate.getMinutes() - 15);  
      
    const lastMarks = (isBrowser && localStorage.getItem("last_marks_entry_date")) ?? ("Today, " + defaultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));  
    const lastMerit = (isBrowser && localStorage.getItem("last_merit_list_generated")) ?? ("Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));  
    const lastReports = (isBrowser && localStorage.getItem("last_reports_generated")) ?? "Yesterday, 04:30 PM";  
    const lastExport = (isBrowser && localStorage.getItem("last_export_completed")) ?? "Yesterday, 05:15 PM";  
  
    return [  
      { id: "marks", label: "Last marks entry completed", time: lastMarks, color: "blue" },  
      { id: "merit", label: "Last merit list compiled & ranked", time: lastMerit, color: "emerald" },  
      { id: "reports", label: "Last report forms comments synchronized", time: lastReports, color: "purple" },  
      { id: "export", label: "Last CSV/Google Sheets backup exported", time: lastExport, color: "amber" }  
    ];  
  }, [remarks, marks]);  
  
  return (  
    <div className="space-y-8 bg-white dark:bg-slate-950 text-black dark:text-white min-h-screen">  
      {/* Welcome Banner */}  
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-6 gap-4">  
        <div>  
          <h2 className="text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">  
            Welcome back, {config.classTeacher ?? "Teacher"}  
          </h2>  
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">  
            Overview of <strong>{config.className ?? "Grade 8 Blue"}</strong> at {config.schoolName ?? "School"} &mdash; {config.term ?? "Active Term"}  
          </p>  
        </div>  
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-600 dark:text-gray-400 shadow-xs">  
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />  
          <span>Session Active</span>  
        </div>  
      </div>  
  
      {/* Summary Cards Grid */}  
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">  
        {/* Total Learners Card */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">  
          <div className="flex items-start justify-between">  
            <div className="space-y-1.5">  
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Total Learners</span>  
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">  
                {learners.length}  
              </span>  
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Class Register Count</span>  
            </div>  
            <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-black dark:text-white rounded-2xl">  
              <Users className="h-5.5 w-5.5 text-gray-700 dark:text-slate-400" />  
            </div>  
          </div>  
        </div>  
  
        {/* Total Subjects Card */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">  
          <div className="flex items-start justify-between">  
            <div className="space-y-1.5">  
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Total Subjects</span>  
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">  
                {SUBJECTS.length}  
              </span>  
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Junior School CBC Aligned</span>  
            </div>  
            <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-black dark:text-white rounded-2xl">  
              <BookOpen className="h-5.5 w-5.5 text-gray-700 dark:text-slate-400" />  
            </div>  
          </div>  
        </div>  
  
        {/* Class Mean Score Card */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">  
          <div className="flex items-start justify-between">  
            <div className="space-y-1.5">  
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Class Mean Score</span>  
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">  
                {classMean.toFixed(1)}  
              </span>  
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Out of Max Points Aggregate</span>  
            </div>  
            <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-black dark:text-white rounded-2xl">  
              <BarChart3 className="h-5.5 w-5.5 text-gray-700 dark:text-slate-400" />  
            </div>  
          </div>  
        </div>  
  
        {/* Reports Generated Card */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">  
          <div className="flex items-start justify-between">  
            <div className="space-y-1.5">  
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Report Cards</span>  
              <span className="text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">  
                {reportsGeneratedCount} <span className="text-sm text-gray-400 dark:text-slate-500">/ {learners.length}</span>  
              </span>  
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 block">  
                <CheckCircle2 className="h-3 w-3" />  
                Comments synchronized  
              </span>  
            </div>  
            <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-black dark:text-white rounded-2xl">  
              <FileText className="h-5.5 w-5.5 text-gray-700 dark:text-slate-400" />  
            </div>  
          </div>  
        </div>  
      </div>  
  
      {/* Top, Highest & Lowest Detail Row */}  
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">  
        {/* Top Learner Card */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 col-span-1 shadow-xs">  
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">  
            <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 rounded-xl border border-yellow-100 dark:border-yellow-900/50">  
              <Trophy className="h-5 w-5" />  
            </div>  
            <div>  
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Current Class Champion</h4>  
              <p className="text-xs text-gray-500 dark:text-gray-400">Highest aggregate marks</p>  
            </div>  
          </div>  
          <div className="space-y-2.5">  
            <div>  
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Full Name</span>  
              <span className="text-base font-semibold text-gray-950 dark:text-white line-clamp-1">{topLearner.name}</span>  
            </div>  
            <div className="grid grid-cols-2 gap-4">  
              <div>  
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Total Marks</span>  
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400 font-mono">{topLearner.total}</span>  
              </div>  
              <div>  
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Position</span>  
                <span className="text-lg font-bold text-gray-950 dark:text-white">Rank #{topLearner.position}</span>  
              </div>  
            </div>  
          </div>  
        </div>  
  
        {/* Highest and Lowest Aggregate Score Stats */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 col-span-1 shadow-xs flex flex-col justify-between">  
          <div>  
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">  
              <div className="p-2.5 bg-[#f0f4f8] dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-[#1b365d] dark:text-blue-400 rounded-xl">  
                <Award className="h-5 w-5" />  
              </div>  
              <div>  
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Highest & Lowest Range</h4>  
                <p className="text-xs text-gray-500 dark:text-gray-400">Aggregate boundaries</p>  
              </div>  
            </div>  
            <div className="grid grid-cols-2 gap-4">  
              <div>  
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-wider block uppercase">Highest Score</span>  
                <span className="text-xl font-bold font-mono text-gray-950 dark:text-white">{highestScore}</span>  
                <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Marks obtained</span>  
              </div>  
              <div>  
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-wider block uppercase">Lowest Score</span>  
                <span className="text-xl font-bold font-mono text-gray-900 dark:text-slate-300">{lowestScore}</span>  
                <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Marks obtained</span>  
              </div>  
            </div>  
          </div>  
          <div className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 p-2.5 rounded-xl text-[11px] text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">  
            The variance between the highest and lowest aggregates is <strong>{highestScore - lowestScore} marks</strong>.  
          </div>  
        </div>  
  
        {/* School Information Layout */}  
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 col-span-1 flex flex-col justify-between shadow-xs">  
          <div className="space-y-2">  
            <span className="text-[10px] font-bold text-[#1b365d] dark:text-blue-400 uppercase tracking-widest block">Class Identification</span>  
            <h4 className="text-lg font-display font-bold leading-tight text-slate-900 dark:text-white">{config.schoolName ?? "Not Set"}</h4>  
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">  
              Motto: "{config.schoolMotto ?? "No motto set"}"<br />  
              Teacher: <strong>{config.classTeacher ?? "Not assigned"}</strong><br />  
              Classroom: <strong>{config.className ?? "No classroom layout"}</strong>  
            </p>  
          </div>  
          <button   
            onClick={() => setActiveTab("settings")}  
            className="w-full mt-4 py-2 px-3 bg-[#1b365d] hover:bg-[#152a4a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer border-none"  
          >  
            Edit School Details  
            <ArrowRight className="h-3.5 w-3.5" />  
          </button>  
        </div>  
      </div>  
  
      {/* Quick Access Actions Panel */}  
      <div className="space-y-4">  
        <h3 className="text-lg font-display font-bold text-gray-950 dark:text-white flex items-center gap-2">  
          <Plus className="h-5 w-5 text-[#1b365d] dark:text-blue-400" />  
          Quick Actions Shortcut Hub  
        </h3>  
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">  
          <button  
            onClick={() => setActiveTab("marks")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-[#f0f4f8] dark:bg-slate-950 text-[#1b365d] dark:text-blue-400 rounded-xl">  
              <Plus className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Enter Marks</span>  
          </button>  
  
          <button  
            onClick={() => setActiveTab("merit")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl">  
              <ClipboardList className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Generate Merit List</span>  
          </button>  
  
          <button  
            onClick={() => setActiveTab("reports")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-xl">  
              <FileText className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Generate Reports</span>  
          </button>  
  
          <button  
            onClick={() => setActiveTab("exports")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl">  
              <Download className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Export to PDF</span>  
          </button>  
  
          <button  
            onClick={() => setActiveTab("exports")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">  
              <FileSpreadsheet className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Export Sheets</span>  
          </button>  
  
          <button  
            onClick={() => setActiveTab("learners")}  
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-[#1b365d] dark:hover:border-blue-500 hover:shadow-md text-center rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"  
          >  
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-xl">  
              <Users className="h-5 w-5" />  
            </div>  
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Manage Learners</span>  
          </button>  
        </div>  
      </div>  
  
      {/* Recent Activity Trail */}  
      <div className="space-y-4">  
        <h3 className="text-lg font-display font-bold text-gray-950 dark:text-white flex items-center gap-2">  
          <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />  
          Recent Operations Activity Trail  
        </h3>  
        <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">  
          {logs.map((log) => (  
            <div key={log.id} className="p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4">  
              <div className="flex items-center gap-3">  
                {/* Robust style resolution independent of utility token strings layout order */}  
                <span className={`w-1.5 h-8 rounded-full border-l-2 shrink-0 ${LOG_VARIANTS[log.color].bar}`} />  
                <div>  
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{log.label}</p>  
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">System recorded status</p>  
                </div>  
              </div>  
              <div className="text-right">  
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${LOG_VARIANTS[log.color].badge}`}>  
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
  
