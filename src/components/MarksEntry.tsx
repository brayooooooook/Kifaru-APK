        /**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Learner, SUBJECTS, SubjectCode } from "../types";
import { Save, Sparkles, RefreshCw } from "lucide-react";
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

const MAX_BATCH_SIZE = 500;

export default function MarksEntry({ learners, marks, config, onRefresh, onAlert }: MarksEntryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("endterm");
  const [localMarks, setLocalMarks] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
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
    setSavingAll(true);
    try {
      for (let i = 0; i < learners.length; i += MAX_BATCH_SIZE) {
        const batch = writeBatch(db);
        learners.slice(i, i + MAX_BATCH_SIZE).forEach(learner => {
          const payloadMarks: Record<string, number> = {};
          SUBJECTS.forEach((sub) => { payloadMarks[sub.code] = parseScore(localMarks[learner.id]?.[sub.code]); });
          batch.set(doc(db, "marks", learner.id, "assessments", activeAssessmentId), {
            learnerId: learner.id,
            assessmentId: activeAssessmentId,
            subjectMarks: payloadMarks,
            updatedAt: serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      }
      onAlert("All saved.", "success");
      setHasUnsavedChanges(false);
      onRefresh();
    } catch (err: any) { onAlert(err.message, "error"); } finally { setSavingAll(false); }
  };

  return (
    <div className="space-y-6">
      <input type="text" placeholder="Search learner..." onChange={(e) => setSearchTerm(e.target.value)} className="border p-2 rounded" />
      <div className="flex gap-2">
        {assessments.map(a => <button key={a.id} onClick={() => setActiveAssessmentId(a.id)} className={`px-4 py-2 ${activeAssessmentId === a.id ? "bg-blue-900 text-white" : "bg-gray-200"}`}>{a.name}</button>)}
        <button onClick={() => setActiveAssessmentId("terminal")} className={`px-4 py-2 ${activeAssessmentId === "terminal" ? "bg-blue-900 text-white" : "bg-gray-200"}`}>Terminal</button>
      </div>

      <table className="min-w-full border">
        <thead><tr><th>Name</th>{SUBJECTS.map(s => <th key={s.code}>{s.code}</th>)}<th>Actions</th></tr></thead>
        <tbody>
          {learners.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
            <tr key={l.id}>
              <td>{l.name}</td>
              {SUBJECTS.map(sub => (
                <td key={sub.code}><input disabled={activeAssessmentId === "terminal"} value={localMarks[l.id]?.[sub.code] || ""} onChange={(e) => { setLocalMarks(prev => ({ ...prev, [l.id]: { ...prev[l.id], [sub.code]: e.target.value } })); setHasUnsavedChanges(true); }} className="w-12 border" /></td>
              ))}
              <td><button disabled={activeAssessmentId === "terminal" || savingId === l.id} onClick={() => handleSaveRow(l.id)}>{savingId === l.id ? "Saving..." : "Save"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
