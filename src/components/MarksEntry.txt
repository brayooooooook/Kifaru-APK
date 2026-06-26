/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Learner, SUBJECTS, SubjectCode, getCBEBand } from "../types";
import { Search, Save, Sparkles, RefreshCw, Layers } from "lucide-react";

interface MarksEntryProps {
  learners: Learner[];
  marks: any;
  token: string;
  config: {
    assessments?: Array<{ id: string; name: string; weight: number }>;
  };
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function MarksEntry({
  learners,
  marks,
  token,
  config,
  onRefresh,
  onAlert
}: MarksEntryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("endterm");
  const [localMarks, setLocalMarks] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const assessments = config.assessments || [
    { id: "opener", name: "Opener Examination", weight: 20 },
    { id: "midterm", name: "Mid-Term Examination", weight: 30 },
    { id: "endterm", name: "End-Term Examination", weight: 50 }
  ];

  // Sync server marks of the active assessment to local state on load, reset, or assessment toggle
  useEffect(() => {
    const formatted: Record<string, Record<string, string>> = {};
    if (activeAssessmentId === "terminal") {
      learners.forEach((l) => {
        formatted[l.id] = {};
        SUBJECTS.forEach((sub) => {
          const parseScore = (val: any) => {
            if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
              return 0;
            }
            return Number(val);
          };
          const opener = parseScore(marks["opener"]?.[l.id]?.[sub.code]);
          const midterm = parseScore(marks["midterm"]?.[l.id]?.[sub.code]);
          const endterm = parseScore(marks["endterm"]?.[l.id]?.[sub.code]);
          const avg = Math.round((opener + midterm + endterm) / 3);
          
          // Show blank if they have absolutely no score entered in any exam
          const hasOpener = marks["opener"]?.[l.id]?.[sub.code] !== undefined;
          const hasMid = marks["midterm"]?.[l.id]?.[sub.code] !== undefined;
          const hasEnd = marks["endterm"]?.[l.id]?.[sub.code] !== undefined;
          if (!hasOpener && !hasMid && !hasEnd) {
            formatted[l.id][sub.code] = "";
          } else {
            formatted[l.id][sub.code] = String(avg);
          }
        });
      });
    } else {
      const assessmentMarks = marks[activeAssessmentId] || {};
      learners.forEach((l) => {
        formatted[l.id] = {};
        const lMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => {
          const score = lMarks[sub.code];
          // Display score or empty
          formatted[l.id][sub.code] = score !== undefined && score !== null && score !== 0 && score !== "0" ? String(score) : "";
        });
      });
    }
    setLocalMarks(formatted);
    setHasUnsavedChanges(false);
  }, [marks, learners, activeAssessmentId]);

  const handleCellChange = (learnerId: string, subCode: SubjectCode, value: string) => {
    // Only allow digits or empty string
    if (value !== "" && !/^\d+$/.test(value)) return;
    
    // Constraint: 0 to 100
    if (value !== "") {
      const num = parseInt(value, 10);
      if (num > 100) return;
    }

    setLocalMarks((prev) => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        [subCode]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveRow = async (learnerId: string) => {
    setSavingId(learnerId);
    try {
      const rowData = localMarks[learnerId] || {};
      const payloadMarks: Record<string, number> = {};
      SUBJECTS.forEach((sub) => {
        const val = rowData[sub.code];
        payloadMarks[sub.code] = val === "" ? 0 : parseInt(val, 10);
      });

      const response = await fetch("/api/marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          assessmentId: activeAssessmentId,
          learnerId, 
          subjectMarks: payloadMarks 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save marks");
      }
      onAlert("Row marks saved successfully", "success");
      onRefresh();
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const payloadMap: Record<string, Record<string, number>> = {};
      learners.forEach((l) => {
        const rowData = localMarks[l.id] || {};
        payloadMap[l.id] = {};
        SUBJECTS.forEach((sub) => {
          const val = rowData[sub.code];
          payloadMap[l.id][sub.code] = val === "" ? 0 : parseInt(val, 10);
        });
      });

      const response = await fetch("/api/marks/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          assessmentId: activeAssessmentId,
          marksMap: payloadMap 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save all marks");
      }
      onAlert("All marks saved successfully for active assessment", "success");
      setHasUnsavedChanges(false);
      onRefresh();
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setSavingAll(false);
    }
  };

  // Keyboard navigation helpers
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    learnerIndex: number,
    subIndex: number,
    filteredList: Learner[]
  ) => {
    const key = e.key;
    let targetLearnerIndex = learnerIndex;
    let targetSubIndex = subIndex;

    if (key === "ArrowUp") {
      e.preventDefault();
      targetLearnerIndex = Math.max(0, learnerIndex - 1);
    } else if (key === "ArrowDown") {
      e.preventDefault();
      targetLearnerIndex = Math.min(filteredList.length - 1, learnerIndex + 1);
    } else if (key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      targetSubIndex = Math.max(0, subIndex - 1);
    } else if (key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      targetSubIndex = Math.min(SUBJECTS.length - 1, subIndex + 1);
    } else if (key === "Enter") {
      e.preventDefault();
      // Move to next student in same column
      targetLearnerIndex = Math.min(filteredList.length - 1, learnerIndex + 1);
    } else {
      return;
    }

    const targetLearner = filteredList[targetLearnerIndex];
    const targetSub = SUBJECTS[targetSubIndex];
    if (targetLearner && targetSub) {
      const el = document.getElementById(`input-${targetLearner.id}-${targetSub.code}`);
      if (el) {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select();
      }
    }
  };

  const filteredLearners = learners.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Marks Entry Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Select an assessment from the tabs below, enter terminal subject scores (0–100), and click Save.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Unsaved changes
            </span>
          )}
          <button
            id="btn-save-all-marks"
            onClick={handleSaveAll}
            disabled={savingAll || activeAssessmentId === "terminal"}
            className="flex items-center gap-2 py-2 px-4 bg-[#1b365d] hover:bg-[#152a4a] disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            {savingAll ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save All Marks
              </>
            )}
          </button>
        </div>
      </div>

      {/* Assessment Tabs Selector */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            <Layers className="h-4 w-4 text-[#1b365d]" />
            <span>Select Assessment Type:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg">
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!confirm("You have unsaved changes in the current assessment. Do you want to discard them and switch?")) {
                    return;
                  }
                }
                setActiveAssessmentId("opener");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "opener"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Opener Examination
            </button>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!confirm("You have unsaved changes in the current assessment. Do you want to discard them and switch?")) {
                    return;
                  }
                }
                setActiveAssessmentId("midterm");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "midterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Mid-Term Examination
            </button>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!confirm("You have unsaved changes in the current assessment. Do you want to discard them and switch?")) {
                    return;
                  }
                }
                setActiveAssessmentId("endterm");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "endterm"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              End-Term Examination
            </button>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!confirm("You have unsaved changes in the current assessment. Do you want to discard them and switch?")) {
                    return;
                  }
                }
                setActiveAssessmentId("terminal");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeAssessmentId === "terminal"
                  ? "bg-white dark:bg-slate-800 text-[#1b365d] shadow-sm font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900"
              }`}
            >
              Terminal Performance
            </button>
          </div>
        </div>
      </div>

      {/* Statistics and Keyboard Tips Banner */}
      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-navy-50 text-[#1b365d] rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">Keyboard Arrow Key Navigation Active</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              Use Arrow keys <kbd className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded font-sans shadow-sm">↑</kbd> <kbd className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded font-sans shadow-sm">↓</kbd> <kbd className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded font-sans shadow-sm">←</kbd> <kbd className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded font-sans shadow-sm">→</kbd> or <kbd className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded font-sans shadow-sm">Enter</kbd> to fly across cells.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> EE (90–100)
          </span>
          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> ME (41–89)
          </span>
          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> AE (21–40)
          </span>
          <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> BE (0–20)
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 space-y-4">
        {/* Search header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">
            Learners Marks Roll ({activeAssessmentId === "terminal" ? "Terminal Performance (Read-Only)" : (assessments.find(a => a.id === activeAssessmentId)?.name || activeAssessmentId)})
          </h3>
          <div className="relative rounded-lg shadow-sm max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="search-marks-input"
              type="text"
              placeholder="Search learner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-[#1b365d] focus:ring-1 focus:ring-[#1b365d] rounded-lg text-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Dense Marks Entry Table */}
        <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-xl">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-12 text-center">
                  No.
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Learner Name
                </th>
                {SUBJECTS.map((sub) => (
                  <th key={sub.code} scope="col" className="px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-20" title={sub.name}>
                    {sub.code}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-400">
                    No matching learners found.
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner, lIdx) => {
                  const studentMarks = localMarks[learner.id] || {};
                  
                  const isEven = lIdx % 2 === 0;
                  const rowBg = isEven 
                    ? "bg-white dark:bg-slate-900" 
                    : "bg-slate-50/40 dark:bg-slate-800/10";
                  
                  return (
                    <tr key={learner.id} className={`${rowBg} hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`}>
                      <td className="px-4 py-2.5 text-center text-xs font-mono text-gray-400">
                        {lIdx + 1}
                      </td>
                      <td className={`px-4 py-2.5 font-medium text-sm text-gray-900 dark:text-slate-200 sticky left-0 ${isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-850"} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]`}>
                        <div className="truncate max-w-[190px]" title={learner.name}>
                          {learner.name}
                        </div>
                        {learner.admissionNumber && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {learner.admissionNumber}
                          </div>
                        )}
                      </td>
                      
                      {SUBJECTS.map((sub, sIdx) => {
                        const valString = studentMarks[sub.code] || "";
                        const valNum = valString === "" ? 0 : parseInt(valString, 10);
                        const band = getCBEBand(valNum);

                        // Highlight border if marks was edited locally and not saved
                        const assessmentMarks = marks[activeAssessmentId] || {};
                        const originalScore = assessmentMarks[learner.id]?.[sub.code] ?? 0;
                        const isModified = activeAssessmentId !== "terminal" && String(originalScore) !== valString;

                        // Dynamic background colored subtle highlights for speed entries
                        let bgCell = "bg-gray-50/50 dark:bg-slate-950/50 text-gray-900 dark:text-white";
                        if (valString !== "") {
                          if (band.level === "EE") bgCell = "bg-emerald-50/20 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/20";
                          else if (band.level === "ME") bgCell = "bg-sky-50/20 text-sky-800 dark:text-sky-400 dark:bg-sky-950/20";
                          else if (band.level === "AE") bgCell = "bg-amber-50/20 text-amber-800 dark:text-amber-400 dark:bg-amber-950/20";
                          else bgCell = "bg-rose-50/20 text-rose-800 dark:text-rose-400 dark:bg-rose-950/20";
                        }

                        return (
                          <td key={sub.code} className="px-1 py-2 text-center">
                            <input
                              id={`input-${learner.id}-${sub.code}`}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={valString}
                              disabled={activeAssessmentId === "terminal"}
                              onChange={(e) => handleCellChange(learner.id, sub.code, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, lIdx, sIdx, filteredLearners)}
                              className={`w-14 text-center py-1.5 text-xs font-mono font-bold rounded-lg border focus:ring-1 focus:ring-[#1b365d] focus:outline-none transition-all ${bgCell} ${
                                isModified 
                                  ? "border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950" 
                                  : "border-gray-200 dark:border-slate-800 focus:border-[#1b365d]"
                              }`}
                              placeholder={activeAssessmentId === "terminal" ? "-" : "0"}
                              title={`${learner.name} - ${sub.name}`}
                            />
                          </td>
                        );
                      })}

                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs">
                        <button
                          id={`btn-save-row-${learner.id}`}
                          onClick={() => handleSaveRow(learner.id)}
                          disabled={savingId === learner.id || activeAssessmentId === "terminal"}
                          className="py-1 px-2 bg-slate-100 hover:bg-[#1b365d] dark:bg-slate-800 dark:hover:bg-[#1b365d] hover:text-white text-gray-600 dark:text-slate-300 rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-1 ml-auto"
                        >
                          {savingId === learner.id ? (
                            "Saving..."
                          ) : (
                            <>
                              <Save className="h-3 w-3" />
                              Row
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
