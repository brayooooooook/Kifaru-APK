/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Learner, SUBJECTS, SubjectCode } from "../types";
import { Printer, Download, FileSpreadsheet, TrendingUp, Trophy, Users, Award, Sparkles, Layers } from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from "recharts";

interface MeritListProps {
  learners: Learner[];
  marks: any;
  config: {
    schoolName: string;
    schoolMotto: string;
    classTeacher: string;
    className: string;
    term: string;
    assessments?: Array<{ id: string; name: string; weight: number }>;
  };
  onAlert?: (msg: string, type: "success" | "error") => void;
}

interface LearnerWithRank {
  id: string;
  name: string;
  admissionNumber: string;
  marks: Record<string, number>;
  total: number;
  average: number;
  position: number;
  openerTotal: number;
  midtermTotal: number;
  endtermTotal: number;
}

// Helper to compute final term marks exactly as the server does (simple average of Opener, Mid-Term, and End-Term)
export function getFinalTermMarksLocal(config: any, marks: any, learnerId: string) {
  const finalMarks: Record<string, number> = {};
  
  const parseScore = (val: any) => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
      return 0;
    }
    return Number(val);
  };

  SUBJECTS.forEach((sub) => {
    const opener = parseScore(marks["opener"]?.[learnerId]?.[sub.code]);
    const midterm = parseScore(marks["midterm"]?.[learnerId]?.[sub.code]);
    const endterm = parseScore(marks["endterm"]?.[learnerId]?.[sub.code]);
    
    // Final Term Score = (Opener Exam + Mid-Term Exam + End-Term Exam) ÷ 3
    finalMarks[sub.code] = Math.round((opener + midterm + endterm) / 3);
  });
  
  return finalMarks;
}

export default function MeritList({ learners, marks, config, onAlert }: MeritListProps) {
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("final");

  const assessments = config.assessments || [
    { id: "opener", name: "Opener Examination", weight: 20 },
    { id: "midterm", name: "Mid-Term Examination", weight: 30 },
    { id: "endterm", name: "End-Term Examination", weight: 50 }
  ];

  // 1. Calculate ranks, totals, and averages for the selected assessment or final weighted aggregate
  const { sortedList, stats } = useMemo(() => {
    if (learners.length === 0) {
      return { sortedList: [], stats: null };
    }

    const learnersWithTotals: Omit<LearnerWithRank, "position">[] = learners.map((l) => {
      let studentMarks: Record<string, number> = {};

      if (activeAssessmentId === "final") {
        studentMarks = getFinalTermMarksLocal(config, marks, l.id);
      } else {
        const assessmentMarks = marks[activeAssessmentId] || {};
        const rawMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => {
          studentMarks[sub.code] = rawMarks[sub.code] || 0;
        });
      }

      const subScores = SUBJECTS.map((sub) => studentMarks[sub.code] || 0);
      const total = subScores.reduce((a, b) => a + b, 0);
      const average = total / SUBJECTS.length;

      // Calculate totals for opener, midterm, endterm side-by-side
      const openerMarks = marks["opener"]?.[l.id] || {};
      const openerTotal = SUBJECTS.reduce((sum, sub) => sum + (openerMarks[sub.code] || 0), 0);

      const midtermMarks = marks["midterm"]?.[l.id] || {};
      const midtermTotal = SUBJECTS.reduce((sum, sub) => sum + (midtermMarks[sub.code] || 0), 0);

      const endtermMarks = marks["endterm"]?.[l.id] || {};
      const endtermTotal = SUBJECTS.reduce((sum, sub) => sum + (endtermMarks[sub.code] || 0), 0);

      return {
        id: l.id,
        name: l.name,
        admissionNumber: l.admissionNumber,
        marks: studentMarks,
        total,
        average,
        openerTotal,
        midtermTotal,
        endtermTotal
      };
    });

    // Sort by total descending
    const sorted = [...learnersWithTotals].sort((a, b) => b.total - a.total);

    // Apply Standard Competitive Ranking (1224)
    let currentRank = 1;
    const sortedList: LearnerWithRank[] = sorted.map((item, idx) => {
      if (idx > 0 && item.total < sorted[idx - 1].total) {
        currentRank = idx + 1;
      }
      return {
        ...item,
        position: currentRank
      };
    });

    // Calculate detailed statistics
    const subjectAverages: Record<string, number> = {};
    SUBJECTS.forEach((sub) => {
      const totalScore = learnersWithTotals.reduce((sum, item) => sum + (item.marks[sub.code] || 0), 0);
      subjectAverages[sub.code] = learners.length > 0 ? totalScore / learners.length : 0;
    });

    const totalScoresSum = sortedList.reduce((sum, item) => sum + item.total, 0);
    const classMean = sortedList.length > 0 ? totalScoresSum / sortedList.length : 0;

    const highestTotal = sortedList.length > 0 ? sortedList[0].total : 0;
    const lowestTotal = sortedList.length > 0 ? sortedList[sortedList.length - 1].total : 0;

    // Class average totals for assessments
    const classOpenerMean = sortedList.reduce((sum, item) => sum + item.openerTotal, 0) / sortedList.length;
    const classMidtermMean = sortedList.reduce((sum, item) => sum + item.midtermTotal, 0) / sortedList.length;
    const classEndtermMean = sortedList.reduce((sum, item) => sum + item.endtermTotal, 0) / sortedList.length;

    return {
      sortedList,
      stats: {
        subjectAverages,
        classMean,
        highestTotal,
        lowestTotal,
        totalLearners: learners.length,
        classOpenerMean,
        classMidtermMean,
        classEndtermMean
      }
    };
  }, [learners, marks, activeAssessmentId, config]);

  const activeAssessmentName = activeAssessmentId === "final" 
    ? "Final Term Results" 
    : (assessments.find(a => a.id === activeAssessmentId)?.name || activeAssessmentId);

  // Excel Export
  const handleExportXLSX = () => {
    if (sortedList.length === 0) return;

    // Excel header row
    const headers = [
      "Pos",
      "Admission No",
      "Student Name",
      ...SUBJECTS.map((s) => s.code),
      "Total Marks",
      "Average Score (%)"
    ];

    // Data rows
    const rows = sortedList.map((item) => [
      item.position,
      item.admissionNumber,
      item.name,
      ...SUBJECTS.map((s) => item.marks[s.code]),
      item.total,
      item.average.toFixed(1)
    ]);

    // Statistics Rows
    const subjectAvgRow = [
      "AVG",
      "",
      "Subject Averages",
      ...SUBJECTS.map((s) => stats?.subjectAverages[s.code].toFixed(1) || ""),
      "",
      ""
    ];

    const meanRow = [
      "MEAN",
      "",
      "Class Mean Total Score",
      ...Array(SUBJECTS.length).fill(""),
      stats?.classMean.toFixed(1) || "",
      ""
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      [`${config.schoolName} - ${config.className} ${config.term.toUpperCase()} ${activeAssessmentName.toUpperCase()} MERIT LIST`],
      [`Motto: ${config.schoolMotto} | Teacher: ${config.classTeacher}`],
      [],
      headers,
      ...rows,
      [],
      subjectAvgRow,
      meanRow
    ]);

    // Format Excel workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merit List");
    
    // Download File
    XLSX.writeFile(wb, `Muchorwe_Grade_8_Blue_${activeAssessmentId}_Merit_List.xlsx`);
  };

  const handlePrint = () => {
    if (window.self !== window.top) {
      if (onAlert) {
        onAlert("Notice: If the print dialog does not appear, please click the 'Open in a new tab' icon at the top-right of the preview pane. Browsers block print actions inside sandboxed iframes!", "error");
      }
    }
    window.focus();
    window.print();
  };

  if (learners.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center text-gray-500 dark:text-slate-400">
        Please add learners first under the <span className="font-semibold">Learners Management</span> page to calculate rankings and statistics.
      </div>
    );
  }

  // Prep charts data
  const chartData = SUBJECTS.map((sub) => ({
    name: sub.code,
    fullName: sub.name,
    average: parseFloat((stats?.subjectAverages[sub.code] || 0).toFixed(1))
  }));

  const globalAvg = chartData.reduce((sum, item) => sum + item.average, 0) / SUBJECTS.length;

  return (
    <div className="space-y-6">
      {/* Upper Action Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Merit List & Performance Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Auto-calculated rankings, class means, and subject performance stats</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-export-merit"
            onClick={handleExportXLSX}
            className="flex items-center gap-2 py-2 px-3.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-emerald-200 text-gray-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/20 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export to Google Sheets
          </button>
          <button
            id="btn-print-merit"
            onClick={handlePrint}
            className="flex items-center gap-2 py-2 px-4 bg-[#1b365d] hover:bg-[#152a4a] text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Merit List
          </button>
        </div>
      </div>

      {/* Assessment Selector */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-2.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            <Layers className="h-4 w-4 text-[#1b365d]" />
            <span>Select Merit List Category:</span>
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
              Opener Examination
            </button>
            <button
              onClick={() => setActiveAssessmentId("midterm")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "midterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Mid-Term Examination
            </button>
            <button
              onClick={() => setActiveAssessmentId("endterm")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "endterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              End-Term Examination
            </button>
            <button
              onClick={() => setActiveAssessmentId("final")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "final"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Terminal Performance
            </button>
          </div>
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

      {/* Class Overview Cards - Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-navy-50 text-[#1b365d] rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">Class Mean Score</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.classMean.toFixed(1)} <span className="text-xs text-gray-400 font-normal">/ 900</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">Highest Total Marks</p>
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.highestTotal} <span className="text-xs text-gray-400 font-normal">/ 900</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">Lowest Total Marks</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.lowestTotal} <span className="text-xs text-gray-400 font-normal">/ 900</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">Learners Assessed</p>
              <h3 className="text-xl font-bold text-violet-700 dark:text-violet-400 mt-0.5">{stats.totalLearners} <span className="text-xs text-gray-400 font-normal">Students</span></h3>
            </div>
          </div>
        </div>
      )}

      {/* Visual Subject Performance Dashboard */}
      {stats && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 space-y-6 no-print">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                Class Subject Performance Dashboard ({activeAssessmentName})
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Analyze class average scores across all 9 subjects to identify learning areas requiring critical support or remediation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Column */}
            <div className="lg:col-span-2 border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/10 dark:bg-slate-950/10 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Subject Mean Score Comparison (%)
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  Class Average Score: {globalAvg.toFixed(1)}%
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0F172A",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px"
                      }}
                      formatter={(value: any, name: any, props: any) => [
                        `${value}%`,
                        props.payload.fullName
                      ]}
                    />
                    <ReferenceLine y={60} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]} barSize={28}>
                      {chartData.map((entry, index) => {
                        let color = "#3B82F6"; // Default Blue for ME
                        if (entry.average >= 90) color = "#10B981"; // Emerald
                        else if (entry.average < 40) color = "#F59E0B"; // Orange/Amber
                        else if (entry.average < 20) color = "#EF4444"; // Red/Rose
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Rankings List column */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Remediation & Performance Index
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {[...chartData]
                  .sort((a, b) => b.average - a.average)
                  .map((sub, sIdx) => {
                    let indicatorBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                    let statusLabel = "Exceeding Expectation";
                    if (sub.average < 40) {
                      indicatorBg = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                      statusLabel = "Critical Support Required";
                    } else if (sub.average < 60) {
                      indicatorBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                      statusLabel = "Approaching Remediations";
                    } else if (sub.average < 90) {
                      indicatorBg = "bg-navy-50 text-[#1b365d]";
                      statusLabel = "Meeting Expectation";
                    }

                    return (
                      <div key={sub.name} className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 w-3 text-right">
                            {sIdx + 1}
                          </span>
                          <span className="font-bold text-gray-800 dark:text-slate-200">
                            {sub.name}
                          </span>
                          <span className="text-[10px] text-gray-400 truncate max-w-[110px]">
                            {sub.fullName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {sub.average.toFixed(1)}%
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase ${indicatorBg}`} title={statusLabel}>
                            {sub.average >= 90 ? "EE" : sub.average < 40 ? "BE/AE" : sub.average < 60 ? "ME-" : "ME"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Print / Web Merit List Card */}
      <div id="section-print-merit" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
        
        {/* Printable Header - hidden on web screen, visible on print */}
        <div className="print-only text-center border-b-2 border-gray-900 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
            {config.schoolName}
          </h1>
          <p className="text-xs font-semibold text-gray-600 italic tracking-wider mt-0.5">
            Motto: "{config.schoolMotto}"
          </p>
          <div className="flex justify-between text-xs text-gray-700 font-medium mt-4 max-w-xl mx-auto">
            <span><strong>CLASS:</strong> {config.className} Blue</span>
            <span><strong>ASSESSMENT:</strong> {activeAssessmentName.toUpperCase()}</span>
            <span><strong>TEACHER:</strong> {config.classTeacher}</span>
          </div>
        </div>

        {/* Web screen header for the card */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4 no-print">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">
              Official Class Merit List & Rankings Roll ({activeAssessmentName})
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Sorted by Total Marks (Standard Competitive Rank)
          </span>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-700 dark:text-slate-400 uppercase w-12 border border-gray-200 dark:border-slate-800">
                  Pos
                </th>
                <th scope="col" className="px-3 py-3 font-bold text-gray-700 dark:text-slate-400 uppercase w-28 border border-gray-200 dark:border-slate-800">
                  Adm No
                </th>
                <th scope="col" className="px-4 py-3 font-bold text-gray-700 dark:text-slate-400 uppercase min-w-[180px] border border-gray-200 dark:border-slate-800">
                  Learner Name
                </th>
                {SUBJECTS.map((sub) => (
                  <th key={sub.code} scope="col" className="px-1.5 py-3 text-center font-bold text-gray-700 dark:text-slate-400 uppercase border border-gray-200 dark:border-slate-800 w-14" title={sub.name}>
                    {sub.code}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-700 dark:text-slate-400 uppercase border border-gray-200 dark:border-slate-800 w-16">
                  Opener
                </th>
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-700 dark:text-slate-400 uppercase border border-gray-200 dark:border-slate-800 w-16">
                  Mid-Term
                </th>
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-700 dark:text-slate-400 uppercase border border-gray-200 dark:border-slate-800 w-16">
                  End-Term
                </th>
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-900 dark:text-slate-200 uppercase border border-gray-200 dark:border-slate-800 w-18">
                  Final Score
                </th>
                <th scope="col" className="px-3 py-3 text-center font-bold text-gray-900 dark:text-slate-200 uppercase border border-gray-200 dark:border-slate-800 w-18">
                  Mean %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
              {sortedList.map((learner, lIdx) => {
                const isTopThree = learner.position <= 3;
                const isEven = lIdx % 2 === 0;
                const rowBg = isTopThree 
                  ? "bg-amber-50/15 dark:bg-amber-950/10 font-medium" 
                  : (isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/10");
                return (
                  <tr key={learner.id} className={`${rowBg} hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors`}>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-slate-800">
                      {learner.position}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                      {learner.admissionNumber || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        {learner.position === 1 && <span className="text-yellow-500 no-print">🏆</span>}
                        {learner.position === 2 && <span className="text-slate-400 no-print">🥈</span>}
                        {learner.position === 3 && <span className="text-amber-600 no-print">🥉</span>}
                        <span>{learner.name}</span>
                      </div>
                    </td>
                    
                    {SUBJECTS.map((sub) => {
                      const score = learner.marks[sub.code] || 0;
                      
                      // Check if it is a missing mark for a specific assessment (when not looking at final)
                      const isMissing = activeAssessmentId !== "final" && (
                        marks[activeAssessmentId]?.[learner.id]?.[sub.code] === undefined ||
                        marks[activeAssessmentId]?.[learner.id]?.[sub.code] === null ||
                        marks[activeAssessmentId]?.[learner.id]?.[sub.code] === "" ||
                        marks[activeAssessmentId]?.[learner.id]?.[sub.code] === 0 ||
                        marks[activeAssessmentId]?.[learner.id]?.[sub.code] === "0"
                      );

                      let scoreColor = "text-gray-900 dark:text-slate-200";
                      if (score >= 90) scoreColor = "text-emerald-600 dark:text-emerald-400 font-bold";
                      else if (score <= 20) scoreColor = "text-rose-600 dark:text-rose-400 font-semibold";
                      return (
                        <td key={sub.code} className={`px-1.5 py-2.5 text-center border border-gray-100 dark:border-slate-800 font-mono ${scoreColor}`}>
                          {isMissing ? "-" : score}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                      {learner.openerTotal === 0 ? "-" : learner.openerTotal}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                      {learner.midtermTotal === 0 ? "-" : learner.midtermTotal}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                      {learner.endtermTotal === 0 ? "-" : learner.endtermTotal}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-[#1b365d] bg-[#1b365d]/5 border border-gray-100 dark:border-slate-800">
                      {learner.total}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-slate-800">
                      {learner.average.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}

              {/* Subject Averages Footer Row */}
              <tr className="bg-slate-50 dark:bg-slate-950/50 font-bold text-gray-900 dark:text-white">
                <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider border border-gray-200 dark:border-slate-800">
                  Subject Mean Score (%)
                </td>
                {SUBJECTS.map((sub) => (
                  <td key={sub.code} className="px-1.5 py-3 text-center font-mono border border-gray-200 dark:border-slate-800 text-[#1b365d]">
                    {(stats?.subjectAverages[sub.code] || 0).toFixed(1)}
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-mono border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
                  {stats?.classOpenerMean.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-center font-mono border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
                  {stats?.classMidtermMean.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-center font-mono border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
                  {stats?.classEndtermMean.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-center font-mono border border-gray-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50/10">
                  {stats?.classMean.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-center font-mono border border-gray-200 dark:border-slate-800">
                  {(globalAvg || 0).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures block for printing */}
        <div className="print-only pt-16 flex justify-between text-xs font-semibold max-w-2xl mx-auto">
          <div className="text-center w-48">
            <div className="border-b border-gray-400 pb-1"></div>
            <p className="mt-2 text-gray-700">Class Teacher's Signature</p>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-gray-400 pb-1"></div>
            <p className="mt-2 text-gray-700">Head Teacher's Stamp & Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
