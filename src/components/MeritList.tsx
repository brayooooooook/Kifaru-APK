/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { calculateMeritList } from "./utils/assessmentEngine";
import type { Learner, AssessmentMarks, AssessmentConfig } from "../types";

/**
 * Calculates weighted terminal marks for a specific student.
 * This is now the "source of truth" for terminal calculations.
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

  // Assuming SUBJECTS is imported from "../types"
  import("../types").then(({ SUBJECTS }) => {
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
  });

  return weightedMarks;
}

interface MeritListProps {
  learners: Learner[];
  marks: AssessmentMarks;
}

export default function MeritList({ learners, marks }: MeritListProps) {
  const rankedLearners = useMemo(() => {
    return calculateMeritList(learners, marks);
  }, [learners, marks]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Class Merit List</h2>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Position</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {rankedLearners.map((student) => (
              <tr key={student.id} className="border-t">
                <td className="p-3">{student.position}</td>
                <td className="p-3">{student.name}</td>
                <td className="p-3 font-semibold">{student.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
