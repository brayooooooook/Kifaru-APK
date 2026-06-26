    /**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Learner, SUBJECTS, SubjectCode, getCBEBand } from "../types";
import { Search, Save, Sparkles, RefreshCw, Layers } from "lucide-react";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";

interface AssessmentConfig {
  id: string;
  name: string;
  weight: number;
}

type LearnerMarks = Record<string, number>;
type AssessmentMarks = Record<string, LearnerMarks>;
type MarksData = Record<string, AssessmentMarks>;

interface MarksEntryProps {
  learners: Learner[];
  marks: MarksData;
  token: string;
  config: {
    assessments?: AssessmentConfig[];
  };
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

const MAX_BATCH_SIZE = 500;

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

  const assessments = useMemo(() => config.assessments ?? [
    { id: "opener", name: "Opener Examination", weight: 20 },
    { id: "midterm", name: "Mid-Term Examination", weight: 30 },
    { id: "endterm", name: "End-Term Examination", weight: 50 },
  ], [config.assessments]);

  const parseScore = (val: number | string | null | undefined): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const formatted: Record<string, Record<string, string>> = {};
    const weights = {
      opener: (assessments.find(a => a.id === "opener")?.weight ?? 20) / 100,
      midterm: (assessments.find(a => a.id === "midterm")?.weight ?? 30) / 100,
      endterm: (assessments.find(a => a.id === "endterm")?.weight ?? 50) / 100,
    };

    if (activeAssessmentId === "terminal") {
      learners.forEach((l) => {
        formatted[l.id] = {};
        SUBJECTS.forEach((sub) => {
          const opener = parseScore(marks["opener"]?.[l.id]?.[sub.code]);
          const midterm = parseScore(marks["midterm"]?.[l.id]?.[sub.code]);
          const endterm = parseScore(marks["endterm"]?.[l.id]?.[sub.code]);
          
          const weightedScore = Math.round((opener * weights.opener) + (midterm * weights.midterm) + (endterm * weights.endterm));
          const hasData = marks["opener"]?.[l.id]?.[sub.code] !== undefined || marks["midterm"]?.[l.id]?.[sub.code] !== undefined || marks["endterm"]?.[l.id]?.[sub.code] !== undefined;
          formatted[l.id][sub.code] = hasData ? String(weightedScore) : "";
        });
      });
    } else {
      const assessmentMarks = marks[activeAssessmentId] || {};
      learners.forEach((l) => {
        formatted[l.id] = {};
        const lMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => {
          const score = lMarks[sub.code];
          formatted[l.id][sub.code] = (score !== undefined && score !== null && score !== 0 && score !== "0") ? String(score) : "";
        });
      });
    }
    setLocalMarks(formatted);
    setHasUnsavedChanges(false);
  }, [marks, learners, activeAssessmentId, assessments]);

  const handleCellChange = (learnerId: string, subCode: SubjectCode, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    if (value !== "" && parseInt(value, 10) > 100) return;

    setLocalMarks((prev) => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [subCode]: value }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveRow = async (learnerId: string) => {
    setSavingId(learnerId);
    try {
      const rowData = localMarks[learnerId] || {};
      const payloadMarks: Record<string, number> = {};
      SUBJECTS.forEach((sub) => { payloadMarks[sub.code] = parseScore(rowData[sub.code]); });

      const docRef = doc(db, "marks", learnerId, "assessments", activeAssessmentId);
      const docSnap = await getDoc(docRef);

      await setDoc(docRef, {
        learnerId,
        assessmentId: activeAssessmentId,
        subjectMarks: payloadMarks,
        updatedAt: serverTimestamp(),
        createdAt: docSnap.exists() ? docSnap.data().createdAt : serverTimestamp()
      }, { merge: true });

      onAlert("Row marks saved successfully.", "success");
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
      for (let i = 0; i < learners.length; i += MAX_BATCH_SIZE) {
        const batchLearners = learners.slice(i, i + MAX_BATCH_SIZE);
        const batch = writeBatch(db);
        
        for (const learner of batchLearners) {
          const rowData = localMarks[learner.id] || {};
          const payloadMarks: Record<string, number> = {};
          SUBJECTS.forEach((sub) => { payloadMarks[sub.code] = parseScore(rowData[sub.code]); });

          const docRef = doc(db, "marks", learner.id, "assessments", activeAssessmentId);
          batch.set(docRef, {
            learnerId: learner.id,
            assessmentId: activeAssessmentId,
            subjectMarks: payloadMarks,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp() 
          }, { merge: true });
        }
        await batch.commit();
      }
      onAlert("All marks saved successfully.", "success");
      setHasUnsavedChanges(false);
      onRefresh();
    } catch (err: any) {
      onAlert(err.message || "Failed to save all marks.", "error");
    } finally {
      setSavingAll(false);
    }
  };

  // ... (Keep your existing logic functions above the return statement)

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Marks Entry Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Select an assessment and enter scores (0–100).</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
              <Sparkles className="h-3.5 w-3.5" /> Unsaved changes
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={savingAll || activeAssessmentId === "terminal"}
            className="flex items-center gap-2 py-2 px-4 bg-[#1b365d] text-white rounded-lg"
          >
            {savingAll ? "Saving..." : "Save All Marks"}
          </button>
        </div>
      </div>

      {/* 2. Assessment Tabs */}
      <div className="flex gap-2">
        {assessments.map(a => (
          <button 
            key={a.id} 
            onClick={() => setActiveAssessmentId(a.id)}
            className={`px-4 py-2 rounded ${activeAssessmentId === a.id ? "bg-[#1b365d] text-white" : "bg-gray-200"}`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* 3. The Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Learner Name</th>
              {SUBJECTS.map(s => <th key={s.code} className="px-2 py-3 text-center">{s.code}</th>)}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLearners.map((learner, lIdx) => (
              <tr key={learner.id}>
                <td className="px-4 py-2">{learner.name}</td>
                {SUBJECTS.map((sub, sIdx) => (
                  <td key={sub.code} className="px-1 py-2 text-center">
                    <input
                      id={`input-${learner.id}-${sub.code}`}
                      value={localMarks[learner.id]?.[sub.code] || ""}
                      onChange={(e) => handleCellChange(learner.id, sub.code, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, lIdx, sIdx, filteredLearners)}
                      className="w-14 border rounded text-center"
                    />
                  </td>
                ))}
                <td className="text-right">
                  <button onClick={() => handleSaveRow(learner.id)}>Save Row</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

}
                                              
