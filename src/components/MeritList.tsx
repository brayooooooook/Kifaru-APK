/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { calculateMeritList } from "./utils/assessmentEngine";
import { SUBJECTS } from "../types"; // Import at top-level
import type { Learner, AssessmentMarks, AssessmentConfig } from "../types";

/**
 * Calculates weighted terminal marks synchronously.
 */
export function getFinalTermMarksLocal(
  config: { assessments?: AssessmentConfig[] },
  marks: AssessmentMarks,
  learnerId: string
): Record<string, number> {
  const assessments = config.assessments ?? [
    { id: "opener", name: "Opener", weight: 20 },
    { id: "midterm", name: "Mid-Term", weight: 30 },
    { id: "endterm", name: "End-Term", weight: 50 },
  ];

  const weightMap = Object.fromEntries(
    assessments.map(a => [a.id, a.weight / 100])
  );

  const parseScore = (val: any) => (isNaN(Number(val)) ? 0 : Number(val));

  const weightedMarks: Record<string, number> = {};

  // Now synchronous since SUBJECTS is imported above
  SUBJECTS.forEach((sub) => {
    const opener = parseScore(marks["opener"]?.[learnerId]?.[sub.code]);
    const midterm = parseScore(marks["midterm"]?.[learnerId]?.[sub.code]);
    const endterm = parseScore(marks["endterm"]?.[learnerId]?.[sub.code]);

    const total = Math.round(
      (opener * (weightMap.opener || 0)) +
      (midterm * (weightMap.midterm || 0)) +
      (endterm * (weightMap.endterm || 0))
    );
    weightedMarks[sub.code] = total;
  });

  return weightedMarks;
}

interface MeritListProps {
  learners: Learner[];
  marks: AssessmentMarks;
  config?: { assessments?: AssessmentConfig[] };
}

export default function MeritList({ learners, marks, config = {} }: MeritListProps) {
  const rankedLearners = useMemo(() => {
    return calculateMeritList(learners, marks);
  }, [learners, marks]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Class Merit List</h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
            {rankedLearners.length} Learners Ranked
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {rankedLearners.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-4 text-left">Pos</th>
                  <th className="p-4 text-left">Learner Name</th>
                  <th className="p-4 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedLearners.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-500">#{student.position}</td>
                    <td className="p-4 font-medium text-slate-900">{student.name}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{student.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>No merit data available yet. Please ensure marks are saved.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
