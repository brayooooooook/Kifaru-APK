/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Learner, SUBJECTS } from "../types";
import { Save } from "lucide-react";
import { db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";

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
  config: { assessments?: AssessmentConfig[] };
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function MarksEntry({ learners, marks, config, onRefresh, onAlert }: MarksEntryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("endterm");
  const [localMarks, setLocalMarks] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const assessments = useMemo(() => config.assessments ?? [
    { id: "opener", name: "Opener", weight: 20 },
    { id: "midterm", name: "Mid-Term", weight: 30 },
    { id: "endterm", name: "End-Term", weight: 50 },
  ], [config.assessments]);

  const weightMap = useMemo(() => Object.fromEntries(
    assessments.map(a => [a.id, a.weight / 100])
  ), [assessments]);

  const parseScore = (val: number | string | null | undefined): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const formatted: Record<string, Record<string, string>> = {};
    if (activeAssessmentId === "terminal") {
      learners.forEach((l) => {
        formatted[l.id] = {};
        SUBJECTS.forEach((sub) => {
          const opener = parseScore(marks["opener"]?.[l.id]?.[sub.code]);
          const midterm = parseScore(marks["midterm"]?.[l.id]?.[sub.code]);
          const endterm = parseScore(marks["endterm"]?.[l.id]?.[sub.code]);
          const weightedScore = Math.round((opener * (weightMap.opener || 0)) + (midterm * (weightMap.midterm || 0)) + (endterm * (weightMap.endterm || 0)));
          formatted[l.id][sub.code] = String(weightedScore);
        });
      });
    } else {
      const assessmentMarks = marks[activeAssessmentId] || {};
      learners.forEach((l) => {
        formatted[l.id] = {};
        const lMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => {
          const score = lMarks[sub.code];
          formatted[l.id][sub.code] = (score !== undefined && score !== null && score !== 0) ? String(score) : "";
        });
      });
    }
    setLocalMarks(formatted);
    setHasUnsavedChanges(false);
  }, [marks, learners, activeAssessmentId, assessments, weightMap]);

  const handleSaveRow = async (learnerId: string) => {
    setSavingId(learnerId);
    try {
      const rowData = localMarks[learnerId] || {};
      const payloadMarks: Record<string, number> = {};
      SUBJECTS.forEach((sub) => { payloadMarks[sub.code] = parseScore(rowData[sub.code]); });

      await setDoc(doc(db, "marks", learnerId, "assessments", activeAssessmentId), {
        learnerId,
        assessmentId: activeAssessmentId,
        subjectMarks: payloadMarks,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onAlert("Row saved.", "success");
      onRefresh();
    } catch (err: any) { onAlert(err.message, "error"); } finally { setSavingId(null); }
  };

  const handleSaveAll = async () => {
    setSavingId("all");
    try {
      const batch = writeBatch(db);
      learners.forEach(l => {
        const rowData = localMarks[l.id] || {};
        const payloadMarks: Record<string, number> = {};
        SUBJECTS.forEach((sub) => { payloadMarks[sub.code] = parseScore(rowData[sub.code]); });
        
        const docRef = doc(db, "marks", l.id, "assessments", activeAssessmentId);
        batch.set(docRef, {
          learnerId: l.id,
          assessmentId: activeAssessmentId,
          subjectMarks: payloadMarks,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      await batch.commit();
      onAlert("All marks saved successfully!", "success");
      setHasUnsavedChanges(false);
      onRefresh();
    } catch (err: any) { 
      onAlert("Error saving marks: " + err.message, "error"); 
    } finally { 
      setSavingId(null); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <input 
          type="text" 
          placeholder="Search learner..." 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="bg-slate-800 border border-slate-700 text-white p-2 rounded-lg w-full sm:w-64" 
        />
        <div className="flex bg-slate-800 p-1 rounded-lg">
          {assessments.map(a => (
            <button 
              key={a.id} 
              onClick={() => setActiveAssessmentId(a.id)} 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeAssessmentId === a.id ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
            >
              {a.name}
            </button>
          ))}
          <button 
            onClick={() => setActiveAssessmentId("terminal")} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeAssessmentId === "terminal" ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}
          >
            Terminal
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-slate-300 uppercase text-[10px] tracking-wider">
              <th className="py-4 pl-4">Name</th>
              {SUBJECTS.map(s => <th key={s.code} className="text-center py-4">{s.code}</th>)}
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {learners.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
              <tr key={l.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                <td className="pl-4 py-3 font-medium text-white">{l.name}</td>
                {SUBJECTS.map(sub => (
                  <td key={sub.code} className="text-center">
                    <input 
                      disabled={activeAssessmentId === "terminal"} 
                      value={localMarks[l.id]?.[sub.code] || ""} 
                      onChange={(e) => { 
                        setLocalMarks(prev => ({ ...prev, [l.id]: { ...prev[l.id], [sub.code]: e.target.value } })); 
                        setHasUnsavedChanges(true); 
                      }} 
                      className="w-12 bg-slate-700 border border-slate-600 rounded text-center text-sm font-mono text-white p-1" 
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button 
                    disabled={activeAssessmentId === "terminal" || savingId === l.id} 
                    onClick={() => handleSaveRow(l.id)}
                    className="text-slate-400 hover:text-white"
                  >
                    {savingId === l.id ? "..." : <Save size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Save All Action */}
        <div className="flex justify-end p-4 border-t border-slate-700 bg-slate-800">
          <button 
            disabled={activeAssessmentId === "terminal" || savingId === "all"} 
            onClick={handleSaveAll}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            {savingId === "all" ? "Saving All..." : "Save All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
