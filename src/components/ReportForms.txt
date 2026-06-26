/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Learner, SUBJECTS, getCBEBand } from "../types";
import { Printer, Sparkles, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, Edit3, Save, TrendingUp, Layers, MessageSquare, Send, Smartphone, History, Trash2, Users, User, ShieldCheck, AlertCircle, Sparkle } from "lucide-react";
import { motion } from "motion/react";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

// Real-world history extraction querying the actual assessments data
function getHistoricalScoresReal(studentId: string, subjectCode: string, config: any, marks: any) {
  const assessments = config.assessments || [
    { id: "opener", name: "Opener Examination", weight: 20 },
    { id: "midterm", name: "Mid-Term Examination", weight: 30 },
    { id: "endterm", name: "End-Term Examination", weight: 50 }
  ];
  
  return assessments.map((a: any) => {
    const assessmentMarks = marks[a.id] || {};
    const studentMarks = assessmentMarks[studentId] || {};
    const score = studentMarks[subjectCode] !== undefined ? studentMarks[subjectCode] : 0;
    return {
      name: a.name,
      shortName: a.id === "opener" ? "Opener" : a.id === "midterm" ? "Mid-Term" : a.id === "endterm" ? "End-Term" : a.name.substring(0, 8),
      score
    };
  });
}

// Helper to compute final weighted terminal marks exactly as the server does
import { getFinalTermMarksLocal } from "./MeritList";

interface ReportFormsProps {
  learners: Learner[];
  marks: any;
  remarks: Record<string, string>;
  token: string;
  config: {
    schoolName: string;
    schoolMotto: string;
    classTeacher: string;
    className: string;
    term: string;
    assessments?: Array<{ id: string; name: string; weight: number }>;
  };
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function ReportForms({
  learners,
  marks,
  remarks,
  token,
  config,
  onRefresh,
  onAlert
}: ReportFormsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"individual" | "booklet" | "progress_tracker">("individual");
  const [isGeneratingRemarks, setIsGeneratingRemarks] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editedRemark, setEditedRemark] = useState("");

  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("final");

  const assessments = config.assessments || [
    { id: "opener", name: "Opener Examination", weight: 20 },
    { id: "midterm", name: "Mid-Term Examination", weight: 30 },
    { id: "endterm", name: "End-Term Examination", weight: 50 }
  ];

  // Default to first student if available
  const activeStudentId = selectedStudentId || (learners[0]?.id || "");

  const activeAssessmentName = activeAssessmentId === "final"
    ? "Final Term Results"
    : (assessments.find((a) => a.id === activeAssessmentId)?.name || activeAssessmentId);

  // 1. Compute totals, averages, and rankings using selected assessment or final results for report rendering
  const rankedLearners = useMemo(() => {
    if (learners.length === 0) return [];

    const calculated = learners.map((l) => {
      let lMarks: Record<string, number> = {};
      if (activeAssessmentId === "final") {
        lMarks = getFinalTermMarksLocal(config, marks, l.id);
      } else {
        const assessmentMarks = marks[activeAssessmentId] || {};
        const studentMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => {
          lMarks[sub.code] = studentMarks[sub.code] !== undefined ? studentMarks[sub.code] : 0;
        });
      }

      const subScores = SUBJECTS.map((sub) => lMarks[sub.code] || 0);
      const total = subScores.reduce((a, b) => a + b, 0);
      const average = total / SUBJECTS.length;

      return {
        id: l.id,
        name: l.name,
        admissionNumber: l.admissionNumber,
        marks: lMarks,
        total,
        average,
        remark: remarks[l.id] || "No comment generated yet."
      };
    });

    // Sort descending by total marks
    const sorted = [...calculated].sort((a, b) => b.total - a.total);

    // Apply standard competitive rank
    let rank = 1;
    return sorted.map((item, idx) => {
      if (idx > 0 && item.total < sorted[idx - 1].total) {
        rank = idx + 1;
      }
      return {
        ...item,
        position: rank
      };
    });
  }, [learners, marks, remarks, config, activeAssessmentId]);

  // Find active student details
  const activeReport = rankedLearners.find((rl) => rl.id === activeStudentId);

  // Indexing helper for navigation
  const activeIndex = rankedLearners.findIndex((rl) => rl.id === activeStudentId);

  const handleNext = () => {
    if (activeIndex < rankedLearners.length - 1) {
      setSelectedStudentId(rankedLearners[activeIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setSelectedStudentId(rankedLearners[activeIndex - 1].id);
    }
  };

  // Bulk Generate comments using Gemini API or Fallback Heuristics
  const handleGenerateRemarks = async () => {
    setIsGeneratingRemarks(true);
    try {
      const response = await fetch("/api/remarks/generate-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate comments");
      }
      onAlert(data.message || "Personalized CBC comments compiled!", "success");
      onRefresh();
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setIsGeneratingRemarks(false);
    }
  };

  const handleStartEditRemark = (id: string, current: string) => {
    setEditingRemarkId(id);
    setEditedRemark(current);
  };

  const handleSaveRemark = async (id: string) => {
    try {
      const response = await fetch("/api/remarks/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ learnerId: id, remark: editedRemark })
      });
      if (!response.ok) {
        throw new Error("Failed to save comment");
      }
      onAlert("Comment updated successfully", "success");
      setEditingRemarkId(null);
      onRefresh();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  const handlePrint = () => {
    if (window.self !== window.top) {
      onAlert("Notice: If the print dialog does not appear, please click the 'Open in a new tab' icon at the top-right of the preview pane. Browsers block print actions inside sandboxed iframes!", "error");
    }
    window.focus();
    window.print();
  };

  if (learners.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center text-gray-500 dark:text-slate-400">
        Please enroll learners first under the <span className="font-semibold">Learners Management</span> page to generate reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Report Forms Center</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-sans">Preview individual report cards, compile booklet, or batch generate comments</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-bulk-remarks"
            onClick={handleGenerateRemarks}
            disabled={isGeneratingRemarks}
            className="flex items-center gap-2 py-2 px-3.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-850 text-indigo-700 dark:text-indigo-400 disabled:opacity-50 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            {isGeneratingRemarks ? (
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
            {isGeneratingRemarks ? "Compiling comments..." : "AI Generate Comments"}
          </button>
          
          <button
            id="btn-print-reports"
            onClick={handlePrint}
            className="flex items-center gap-2 py-2 px-4 bg-[#1b365d] hover:bg-[#152a4a] text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {activeTab === "individual" ? "Print Active Report" : "Print Report Booklet"}
          </button>
        </div>
      </div>

      {/* Iframe warning banner */}
      {window.self !== window.top && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4 flex gap-3 text-amber-850 dark:text-amber-400 text-xs shadow-xs no-print leading-relaxed">
          <span className="text-lg select-none shrink-0">💡</span>
          <div>
            <span className="font-bold text-amber-950 dark:text-amber-300 block mb-0.5">Editor Preview Limitations</span>
            <span>
              Because this application is currently running inside the secure AI Studio preview iframe, browsers block standard print dialogs.
              To print beautifully as A4 PDFs, click the <strong className="font-bold text-amber-950 dark:text-amber-200">"Open in a new tab"</strong> button at the top-right of the preview window, then try printing again there. It works instantly and flawlessly!
            </span>
          </div>
        </div>
      )}

      {/* Mode Selectors */}
      <div className="flex items-center border-b border-gray-200 dark:border-slate-800 gap-6 no-print">
        <button
          onClick={() => setActiveTab("individual")}
          className={`pb-3 text-sm font-semibold transition-all cursor-pointer relative ${
            activeTab === "individual" ? "text-[#1b365d] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Individual Learner Card
          {activeTab === "individual" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b365d]" />}
        </button>
        <button
          onClick={() => setActiveTab("booklet")}
          className={`pb-3 text-sm font-semibold transition-all cursor-pointer relative ${
            activeTab === "booklet" ? "text-[#1b365d] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Complete Report Booklet ({learners.length} students)
          {activeTab === "booklet" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b365d]" />}
        </button>
        <button
          onClick={() => setActiveTab("progress_tracker")}
          className={`pb-3 text-sm font-semibold transition-all cursor-pointer relative flex items-center gap-1.5 ${
            activeTab === "progress_tracker" ? "text-[#1b365d] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Progress Tracker
          {activeTab === "progress_tracker" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b365d]" />}
        </button>
      </div>

      {/* Assessment Selector */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-2.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            <Layers className="h-4 w-4 text-[#1b365d]" />
            <span>Select Report Card Category:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg">
            <button
              onClick={() => setActiveAssessmentId("opener")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "opener"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Opener Report Form
            </button>
            <button
              onClick={() => setActiveAssessmentId("midterm")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "midterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Mid-Term Report Form
            </button>
            <button
              onClick={() => setActiveAssessmentId("endterm")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "endterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              End-Term Report Form
            </button>
            <button
              onClick={() => setActiveAssessmentId("final")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "final"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Terminal Report Form
            </button>
          </div>
        </div>
      </div>

      {activeTab === "individual" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block">
          {/* Quick Picker Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 space-y-3 max-h-[600px] overflow-y-auto no-print">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm pb-2 border-b dark:border-slate-800">
              Pupils Roll ({rankedLearners.length})
            </h3>
            <div className="space-y-1">
              {rankedLearners.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between ${
                    student.id === activeStudentId
                      ? "bg-[#1b365d]/5 text-[#1b365d] font-bold"
                      : "text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span className="truncate max-w-[150px]">{student.name}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                    Pos {student.position}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Individual Report Card Display */}
          <div className="lg:col-span-3 space-y-4 print:w-full print:max-w-full">
            {/* Navigation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <button
                  id="btn-prev-student"
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#1b365d] disabled:opacity-30 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Learner
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md">
                  {activeIndex + 1} / {rankedLearners.length}
                </span>
                <button
                  id="btn-next-student"
                  onClick={handleNext}
                  disabled={activeIndex === rankedLearners.length - 1}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#1b365d] disabled:opacity-30 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                >
                  Next Learner
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Individual Printable A4 Report */}
            {activeReport && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-10 space-y-6 print:border-none print:shadow-none print:p-4 print:space-y-3 print-container">
                {/* School Header */}
                <div className="text-center border-b dark:border-slate-800 pb-4 print:pb-2">
                  <h1 className="text-2xl font-display font-bold text-gray-950 dark:text-white uppercase tracking-tight print:text-xl">
                    {config.schoolName}
                  </h1>
                  <p className="text-xs font-semibold text-[#1b365d] tracking-wider uppercase mt-1 print:text-[10px] print:mt-0.5">
                    Motto: {config.schoolMotto}
                  </p>
                  <h2 className="text-base font-bold text-gray-800 dark:text-slate-300 mt-4 tracking-wider uppercase border border-gray-950 dark:border-slate-700 py-1 max-w-sm mx-auto print:text-xs print:mt-2 print:py-0.5 print:max-w-xs text-center">
                    {activeAssessmentId === "final" ? "Learner Terminal Report Form" : `${activeAssessmentName} Report Form`}
                  </h2>
                </div>

                {/* Learner Info Grid */}
                <div className="grid grid-cols-2 gap-y-2 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-xs bg-slate-50/20 dark:bg-slate-950/20 print:p-2.5 print:gap-y-0.5 print:rounded-lg print:text-[10px]">
                  <div>
                    Learner Name: <strong className="text-gray-950 dark:text-white text-sm ml-1 print:text-[11px]">{activeReport.name}</strong>
                  </div>
                  <div>
                    Admission Number: <strong className="text-gray-950 dark:text-white ml-1">{activeReport.admissionNumber || "—"}</strong>
                  </div>
                  <div>
                    Class: <strong className="text-gray-950 dark:text-white ml-1">{config.className}</strong>
                  </div>
                  <div>
                    Term: <strong className="text-gray-950 dark:text-white ml-1">{config.term}</strong>
                  </div>
                  <div>
                    {activeAssessmentId === "final" ? "Final Term Total" : "Assessment Total"}: <strong className="text-[#1b365d] ml-1">{activeReport.total} / 900</strong>
                  </div>
                  <div>
                    {activeAssessmentId === "final" ? "Final Term Mean Score" : "Assessment Mean Score"}: <strong className="text-[#1b365d] ml-1">{activeReport.average.toFixed(1)}%</strong>
                  </div>
                  <div>
                    Class Position: <strong className="text-emerald-700 dark:text-emerald-400 text-sm ml-1 print:text-[10px]">{activeReport.position} <span className="text-xs text-gray-400 font-normal print:text-[9px]">out of {learners.length}</span></strong>
                  </div>
                  <div>
                    Year: <strong className="text-gray-950 dark:text-white ml-1">{new Date().getFullYear()}</strong>
                  </div>
                </div>

                {/* Subject Performances Grid Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 border dark:border-slate-800 text-xs text-left print:text-[10px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-gray-600 dark:text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-2.5 border-r border-b dark:border-slate-800 print:py-1 print:px-2.5">Subject Name</th>
                        
                        {activeAssessmentId === "opener" && (
                          <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">Opener Score</th>
                        )}
                        
                        {activeAssessmentId === "midterm" && (
                          <>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-20 print:py-1 print:px-1.5 font-semibold">Opener</th>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-20 print:py-1 print:px-1.5 font-semibold">Mid-Term</th>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">Trend</th>
                          </>
                        )}
                        
                        {activeAssessmentId === "endterm" && (
                          <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">End-Term</th>
                        )}
                        
                        {activeAssessmentId === "final" && (
                          <>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">Opener</th>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">Mid-Term</th>
                            <th className="px-2 py-2.5 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">End-Term</th>
                            <th className="px-4 py-2.5 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-2.5 print:w-16 font-bold bg-[#1b365d]/5">Terminal Score</th>
                          </>
                        )}

                        <th className="px-4 py-2.5 border-r border-b dark:border-slate-800 text-center w-32 print:py-1 print:px-2.5 print:w-24">Band</th>
                        <th className="px-4 py-2.5 border-b dark:border-slate-800 text-center w-36 print:py-1 print:px-2.5 print:w-30">CBE Performance Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {SUBJECTS.map((sub, sIdx) => {
                        const score = activeReport.marks[sub.code] || 0;
                        const band = getCBEBand(score);

                        const parseScore = (val: any) => {
                          if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
                            return 0;
                          }
                          return Number(val);
                        };

                        const getDisplayScore = (val: any) => {
                          if (val === undefined || val === null || val === "" || val === 0 || val === "0") {
                            return "-";
                          }
                          return String(val);
                        };

                        const openerRaw = marks["opener"]?.[activeReport.id]?.[sub.code];
                        const midtermRaw = marks["midterm"]?.[activeReport.id]?.[sub.code];
                        const endtermRaw = marks["endterm"]?.[activeReport.id]?.[sub.code];

                        const openerVal = parseScore(openerRaw);
                        const midtermVal = parseScore(midtermRaw);
                        const endtermVal = parseScore(endtermRaw);

                        const isEven = sIdx % 2 === 0;
                        const rowBg = isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/10";

                        return (
                          <tr key={sub.code} className={`${rowBg} hover:bg-slate-50/50 dark:hover:bg-slate-800/20`}>
                            <td className="px-4 py-2.5 border-r dark:border-slate-800 font-medium text-gray-900 dark:text-slate-200 print:py-1 print:px-2.5">
                              <div>{sub.name}</div>
                              <span className="text-[9px] text-gray-400 font-mono no-print">Code: {sub.code}</span>
                            </td>

                            {activeAssessmentId === "opener" && (
                              <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                                {getDisplayScore(openerRaw)}
                              </td>
                            )}

                            {activeAssessmentId === "midterm" && (
                              <>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                  {getDisplayScore(openerRaw)}
                                </td>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                                  {getDisplayScore(midtermRaw)}
                                </td>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-semibold print:py-1 print:px-1.5">
                                  {midtermVal > openerVal ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">▲ +{midtermVal - openerVal}</span>
                                  ) : midtermVal < openerVal ? (
                                    <span className="text-rose-600 dark:text-rose-400">▼ {midtermVal - openerVal}</span>
                                  ) : (
                                    <span className="text-gray-400 font-mono">-</span>
                                  )}
                                </td>
                              </>
                            )}

                            {activeAssessmentId === "endterm" && (
                              <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                                {getDisplayScore(endtermRaw)}
                              </td>
                            )}

                            {activeAssessmentId === "final" && (
                              <>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                  {getDisplayScore(openerRaw)}
                                </td>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                  {getDisplayScore(midtermRaw)}
                                </td>
                                <td className="px-2 py-2.5 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                  {getDisplayScore(endtermRaw)}
                                </td>
                                <td className="px-4 py-2.5 border-r dark:border-slate-800 text-center font-mono font-bold text-gray-950 dark:text-white print:py-1 print:px-2.5 bg-[#1b365d]/5">
                                  {score}
                                </td>
                              </>
                            )}

                            <td className="px-4 py-2.5 border-r dark:border-slate-800 text-center print:py-1 print:px-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${band.bgClass} print:text-[9px] print:px-1.5`}>
                                {band.band} ({band.points} Pts)
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-gray-800 dark:text-slate-200 print:py-1 print:px-2.5">
                              <span className={band.color}>{band.levelName}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeAssessmentId === "endterm" && (
                  <div className="border border-[#1b365d]/20 bg-[#1b365d]/5 rounded-xl p-4 mt-4 print:p-2.5 print:rounded-lg print:mt-2">
                    <h4 className="text-xs font-bold text-[#1b365d] dark:text-[#3b5d8d] uppercase tracking-wider mb-2 print:text-[9px] print:mb-1">
                      Closing Term's Academic Targets & Achievements
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs dark:text-slate-300 print:text-[9px] print:gap-2">
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-600 dark:text-slate-400">Core Objectives Met:</span>
                        <p className="text-gray-500 leading-relaxed print:leading-normal">
                          Demonstrated consistent application of core competencies and learning outcomes across key learning areas. Overall engagement in project-based activities remained highly satisfactory.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-600 dark:text-slate-400">Next Term's Targets:</span>
                        <p className="text-gray-500 leading-relaxed print:leading-normal">
                          To focus on improving reasoning skills in Mathematics and analytical writing in Language. Maintain regular attendance and high engagement in all assessments.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editable Class Teacher Comments */}
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-2 print:p-2.5 print:rounded-lg print:space-y-0.5 print:mt-1">
                  <div className="flex items-center justify-between no-print">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Class Teacher's Remarks
                    </h4>
                    {editingRemarkId !== activeReport.id ? (
                      <button
                        onClick={() => handleStartEditRemark(activeReport.id, activeReport.remark)}
                        className="text-xs text-[#1b365d] hover:text-[#152a4a] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit Comment
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveRemark(activeReport.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        Save Comment
                      </button>
                    )}
                  </div>
                  <div className="hidden print:block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 print:text-[9px]">
                    Class Teacher's Remarks:
                  </div>

                  {editingRemarkId === activeReport.id ? (
                    <textarea
                      value={editedRemark}
                      onChange={(e) => setEditedRemark(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-2.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1b365d] rounded-lg dark:bg-slate-950 dark:text-white"
                    />
                  ) : (
                    <p className="text-xs italic text-gray-800 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/45 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 leading-relaxed font-medium print:p-1.5 print:text-[10px]">
                      {activeReport.remark}
                    </p>
                  )}
                </div>

                {/* Report Sign-off Section */}
                <div className="grid grid-cols-2 text-xs text-gray-500 pt-6 border-t dark:border-slate-800 font-medium print:pt-2 print:mt-1 print:text-[10px]">
                  <div className="space-y-1">
                    <p>Class Teacher: <strong className="dark:text-slate-300">{config.classTeacher}</strong></p>
                    <p className="mt-8 print:mt-4">Teacher Signature: _______________________</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p>Headteacher: <strong className="dark:text-slate-300">MR PAUL KAMAU</strong></p>
                    <p className="mt-8 print:mt-4">Signature & Stamp: ______________________</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "booklet" ? (
        /* BOOKLET VIEW - Renders all report forms sequentially with page breaks */
        <div className="space-y-8 print:space-y-0">
          <div className="bg-[#f0f4f8] border border-[#1b365d]/20 p-4 rounded-xl flex items-center gap-2.5 text-xs text-[#1b365d] no-print">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>Ready! Renders all {rankedLearners.length} student report cards. Clicking <strong>Print Report Booklet</strong> compiles them with clean physical A4 page-breaks.</span>
          </div>

          {rankedLearners.map((student, idx) => (
            <div
              key={student.id}
              className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-10 space-y-6 print:border-none print:shadow-none print:p-4 print:space-y-3 print-container print-page-break`}
            >
              {/* School Header */}
              <div className="text-center border-b dark:border-slate-800 pb-4 print:pb-2">
                <h1 className="text-2xl font-display font-bold text-gray-950 dark:text-white uppercase tracking-tight print:text-xl">
                  {config.schoolName}
                </h1>
                <p className="text-xs font-semibold text-[#1b365d] tracking-wider uppercase mt-1 print:text-[10px] print:mt-0.5">
                  Motto: {config.schoolMotto}
                </p>
                <h2 className="text-base font-bold text-gray-800 dark:text-slate-300 mt-4 tracking-wider uppercase border border-gray-950 dark:border-slate-700 py-1 max-w-sm mx-auto text-center print:text-xs print:mt-2 print:py-0.5 print:max-w-xs">
                  {activeAssessmentId === "final" ? "Learner Terminal Report Form" : `${activeAssessmentName} Report Form`}
                </h2>
              </div>

              {/* Learner Info Grid */}
              <div className="grid grid-cols-2 gap-y-2 border border-gray-200 dark:border-slate-800 p-4 rounded-xl text-xs bg-slate-50/20 dark:bg-slate-950/20 print:p-2.5 print:gap-y-0.5 print:rounded-lg print:text-[10px]">
                <div>
                  Learner Name: <strong className="text-gray-950 dark:text-white text-sm ml-1 print:text-[11px]">{student.name}</strong>
                </div>
                <div>
                  Admission Number: <strong className="text-gray-950 dark:text-white ml-1">{student.admissionNumber || "—"}</strong>
                </div>
                <div>
                  Class: <strong className="text-gray-950 dark:text-white ml-1">{config.className}</strong>
                </div>
                <div>
                  Term: <strong className="text-gray-950 dark:text-white ml-1">{config.term}</strong>
                </div>
                <div>
                  {activeAssessmentId === "final" ? "Final Term Total" : "Assessment Total"}: <strong className="text-[#1b365d] ml-1">{student.total} / 900</strong>
                </div>
                <div>
                  {activeAssessmentId === "final" ? "Final Term Mean Score" : "Assessment Mean Score"}: <strong className="text-[#1b365d] ml-1">{student.average.toFixed(1)}%</strong>
                </div>
                <div>
                  Class Position: <strong className="text-emerald-700 dark:text-emerald-400 text-sm ml-1 print:text-[10px]">{student.position} <span className="text-xs text-gray-400 font-normal font-sans print:text-[9px]">out of {learners.length}</span></strong>
                </div>
                <div>
                  Year: <strong className="text-gray-950 dark:text-white ml-1">{new Date().getFullYear()}</strong>
                </div>
              </div>

              {/* Subject Performances Grid Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 border dark:border-slate-800 text-xs text-left print:text-[10px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-gray-600 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2 border-r border-b dark:border-slate-800 print:py-1 print:px-2.5">Subject Name</th>
                      
                      {activeAssessmentId === "opener" && (
                        <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">Opener Score</th>
                      )}
                      
                      {activeAssessmentId === "midterm" && (
                        <>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-20 print:py-1 print:px-1.5 font-semibold">Opener</th>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-20 print:py-1 print:px-1.5 font-semibold">Mid-Term</th>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">Trend</th>
                        </>
                      )}
                      
                      {activeAssessmentId === "endterm" && (
                        <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-1.5 font-semibold">End-Term</th>
                      )}
                      
                      {activeAssessmentId === "final" && (
                        <>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">Opener</th>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">Mid-Term</th>
                          <th className="px-2 py-2 border-r border-b dark:border-slate-800 text-center w-16 print:py-1 print:px-1.5 font-semibold">End-Term</th>
                          <th className="px-4 py-2 border-r border-b dark:border-slate-800 text-center w-24 print:py-1 print:px-2.5 print:w-16 font-semibold bg-[#1b365d]/5">Terminal Score</th>
                        </>
                      )}

                      <th className="px-4 py-2 border-r border-b dark:border-slate-800 text-center w-32 print:py-1 print:px-2.5 print:w-24">Band</th>
                      <th className="px-4 py-2 border-b dark:border-slate-800 text-center w-36 print:py-1 print:px-2.5 print:w-30">CBE Performance Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {SUBJECTS.map((sub, sIdx) => {
                      const score = student.marks[sub.code] || 0;
                      const band = getCBEBand(score);

                      const parseScore = (val: any) => {
                        if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
                          return 0;
                        }
                        return Number(val);
                      };

                      const getDisplayScore = (val: any) => {
                        if (val === undefined || val === null || val === "" || val === 0 || val === "0") {
                          return "-";
                        }
                        return String(val);
                      };

                      const openerRaw = marks["opener"]?.[student.id]?.[sub.code];
                      const midtermRaw = marks["midterm"]?.[student.id]?.[sub.code];
                      const endtermRaw = marks["endterm"]?.[student.id]?.[sub.code];

                      const openerVal = parseScore(openerRaw);
                      const midtermVal = parseScore(midtermRaw);
                      const endtermVal = parseScore(endtermRaw);

                      const isEven = sIdx % 2 === 0;
                      const rowBg = isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/10";

                      return (
                        <tr key={sub.code} className={`${rowBg} hover:bg-slate-50/50 dark:hover:bg-slate-800/20`}>
                          <td className="px-4 py-2 border-r dark:border-slate-800 font-medium text-gray-900 dark:text-slate-200 print:py-1 print:px-2.5">{sub.name}</td>
                          
                          {activeAssessmentId === "opener" && (
                            <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                              {getDisplayScore(openerRaw)}
                            </td>
                          )}

                          {activeAssessmentId === "midterm" && (
                            <>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                {getDisplayScore(openerRaw)}
                              </td>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                                {getDisplayScore(midtermRaw)}
                              </td>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-semibold print:py-1 print:px-1.5">
                                {midtermVal > openerVal ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">▲ +{midtermVal - openerVal}</span>
                                ) : midtermVal < openerVal ? (
                                  <span className="text-rose-600 dark:text-rose-400">▼ {midtermVal - openerVal}</span>
                                ) : (
                                  <span className="text-gray-400 font-mono">-</span>
                                )}
                              </td>
                            </>
                          )}

                          {activeAssessmentId === "endterm" && (
                            <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5 font-bold">
                              {getDisplayScore(endtermRaw)}
                            </td>
                          )}

                          {activeAssessmentId === "final" && (
                            <>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                {getDisplayScore(openerRaw)}
                              </td>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                {getDisplayScore(midtermRaw)}
                              </td>
                              <td className="px-2 py-2 border-r dark:border-slate-800 text-center font-mono text-gray-700 dark:text-slate-350 print:py-1 print:px-1.5">
                                {getDisplayScore(endtermRaw)}
                              </td>
                              <td className="px-4 py-2 border-r dark:border-slate-800 text-center font-mono font-bold text-gray-950 dark:text-white print:py-1 print:px-2.5 bg-[#1b365d]/5">
                                {score}
                              </td>
                            </>
                          )}

                          <td className="px-4 py-2 border-r dark:border-slate-800 text-center print:py-1 print:px-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${band.bgClass} print:text-[9px] print:px-1.5`}>
                              {band.band} ({band.points} Pts)
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-gray-800 dark:text-slate-200 print:py-1 print:px-2.5">
                            <span className={band.color}>{band.levelName}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {activeAssessmentId === "endterm" && (
                <div className="border border-[#1b365d]/20 bg-[#1b365d]/5 rounded-xl p-4 mt-4 print:p-2.5 print:rounded-lg print:mt-2">
                  <h4 className="text-xs font-bold text-[#1b365d] dark:text-[#3b5d8d] uppercase tracking-wider mb-2 print:text-[9px] print:mb-1">
                    Closing Term's Academic Targets & Achievements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs dark:text-slate-300 print:text-[9px] print:gap-2">
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-600 dark:text-slate-400">Core Objectives Met:</span>
                      <p className="text-gray-500 leading-relaxed print:leading-normal">
                        Demonstrated consistent application of core competencies and learning outcomes across key learning areas. Overall engagement in project-based activities remained highly satisfactory.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-600 dark:text-slate-400">Next Term's Targets:</span>
                      <p className="text-gray-500 leading-relaxed print:leading-normal">
                        To focus on improving reasoning skills in Mathematics and analytical writing in Language. Maintain regular attendance and high engagement in all assessments.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Teacher Comments */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-1 print:p-2.5 print:rounded-lg print:space-y-0.5 print:mt-1">
                <div className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 print:text-[9px]">
                  Class Teacher's Remarks:
                </div>
                <p className="text-xs italic text-gray-800 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/45 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 leading-relaxed font-medium print:p-1.5 print:text-[10px]">
                  {student.remark}
                </p>
              </div>

              {/* Report Sign-off Section */}
              <div className="grid grid-cols-2 text-xs text-gray-500 pt-6 border-t dark:border-slate-800 font-medium print:pt-2 print:mt-1 print:text-[10px]">
                <div className="space-y-1">
                  <p>Class Teacher: <strong className="dark:text-slate-300">{config.classTeacher}</strong></p>
                  <p className="mt-6 print:mt-4">Teacher Signature: _______________________</p>
                </div>
                <div className="text-right space-y-1">
                  <p>Headteacher: <strong className="dark:text-slate-300">MR PAUL KAMAU</strong></p>
                  <p className="mt-6 print:mt-4">Signature & Stamp: ______________________</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Progress Tracker Tab */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
          {/* Quick Picker Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 space-y-3 max-h-[600px] overflow-y-auto">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm pb-2 border-b dark:border-slate-800">
              Select Learner ({rankedLearners.length})
            </h3>
            <div className="space-y-1">
              {rankedLearners.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between ${
                    student.id === activeStudentId
                      ? "bg-[#1b365d]/5 text-[#1b365d] font-bold"
                      : "text-gray-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span className="truncate max-w-[150px]">{student.name}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                    Avg {student.average.toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Tracker Dashboard */}
          <div className="lg:col-span-3 space-y-6">
            {activeReport && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 space-y-6">
                {/* Header Profile Summary */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b dark:border-slate-800 pb-5 gap-4">
                  <div>
                    <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                      {activeReport.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono uppercase tracking-wider">
                      Admission Number: {activeReport.admissionNumber} | Class Position: {activeReport.position} out of {learners.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-[#1b365d]/5 border border-[#1b365d]/20 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#1b365d] uppercase tracking-widest">Weighted Avg</p>
                      <p className="text-xl font-mono font-bold text-[#1b365d] mt-0.5">{activeReport.average.toFixed(1)}%</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-[10px] font-bold text-emerald-400 dark:text-emerald-500 uppercase tracking-widest">Total Points</p>
                      <p className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {SUBJECTS.map((sub) => getCBEBand(activeReport.marks[sub.code] || 0).points).reduce((a, b) => a + b, 0)} Pts
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid of Subject Trajectories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SUBJECTS.map((sub) => {
                    const score = activeReport.marks[sub.code] || 0;
                    const progressData = getHistoricalScoresReal(activeReport.id, sub.code, config, marks);
                    
                    // Calculate trend direction
                    const firstVal = progressData[0]?.score ?? 0;
                    const lastVal = progressData[progressData.length - 1]?.score ?? 0;
                    const diff = lastVal - firstVal;
                    let trendLabel = "Stable";
                    let trendColor = "text-gray-500 bg-gray-50 dark:bg-slate-950 dark:text-slate-400 border-gray-100 dark:border-slate-800";
                    if (diff > 2) {
                      trendLabel = "Improving 📈";
                      trendColor = "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40";
                    } else if (diff < -2) {
                      trendLabel = "Declining 📉";
                      trendColor = "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/40";
                    }

                    return (
                      <div key={sub.code} className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/10 dark:bg-slate-950/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-gray-900 dark:text-white text-xs truncate max-w-[150px]" title={sub.name}>
                              {sub.name}
                            </span>
                            <span className="font-mono text-[9px] bg-white dark:bg-slate-950 border dark:border-slate-800 px-1.5 py-0.5 rounded font-bold text-gray-400 shrink-0">
                              {sub.code}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-lg font-mono font-black text-gray-950 dark:text-white">{score}%</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${trendColor}`}>
                              {trendLabel}
                            </span>
                          </div>
                        </div>

                        {/* Trajectory Sparkline */}
                        <div className="h-16 w-full my-1 bg-slate-50/40 dark:bg-slate-950/40 rounded-lg p-1.5 border border-dashed border-gray-100 dark:border-slate-800">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressData} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
                              <Line
                                type="monotone"
                                dataKey="score"
                                stroke={score >= 50 ? "#2563eb" : "#f43f5e"}
                                strokeWidth={2.5}
                                dot={{ r: 3, strokeWidth: 1.5, fill: "#ffffff" }}
                                activeDot={{ r: 5 }}
                              />
                              <RechartsTooltip
                                cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-950 text-white text-[8px] font-mono px-2 py-0.5 rounded shadow">
                                        {payload[0].payload.name}: <span className="font-bold text-amber-400">{payload[0].value}%</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Assessment comparison list */}
                        <div className="grid grid-cols-3 text-[10px] font-mono text-center text-gray-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          {progressData.map((pd: any, pIdx: number) => {
                            const isLast = pIdx === progressData.length - 1;
                            return (
                              <div key={pd.name} className={pIdx > 0 ? "border-l border-slate-100 dark:border-slate-800" : ""}>
                                <p className={`font-bold ${isLast ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-slate-450"}`}>{pd.score}%</p>
                                <p className="text-[7.5px] uppercase truncate px-0.5">{pd.shortName}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
