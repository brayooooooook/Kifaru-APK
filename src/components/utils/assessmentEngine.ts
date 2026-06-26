/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Learner, AssessmentMarks } from "../types";
import { SUBJECTS } from "../types";

export interface RankedLearner {
  id: string;
  name: string;
  scores: Record<string, number>;
  total: number;
  position: number;
}

/**
 * Converts raw marks into safe curriculum values.
 */
function normalizeMarkPolicy(raw: unknown): number {
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

/**
 * Handles learner name sorting consistently.
 */
function compareLearnerNames(a: string, b: string): number {
  return a.localeCompare(b, "en", {
    sensitivity: "base",
  });
}

/**
 * Keeps totals accurate to two decimal places.
 */
function roundToCurriculumPrecision(total: number): number {
  return Math.round(total * 100) / 100;
}

/**
 * Extracts and cleans marks for one learner.
 */
function extractLearnerMarks(
  marks: AssessmentMarks,
  learnerId: string
): Record<string, number> {

  const normalized: Record<string, number> = {};

  for (const subject of SUBJECTS) {
    normalized[subject.code] = normalizeMarkPolicy(
      marks[learnerId]?.[subject.code]
    );
  }

  return normalized;
}


/**
 * Calculates totals and positions.
 */
export function calculateMeritList(
  learners: Learner[],
  marks: AssessmentMarks
): RankedLearner[] {

  if (!learners.length) {
    return [];
  }


  const compiled = learners.map((learner) => {

    const studentMarks = extractLearnerMarks(
      marks,
      learner.id
    );


    const rawTotal = SUBJECTS.reduce(
      (sum, subject) =>
        sum + (studentMarks[subject.code] ?? 0),
      0
    );


    return {
      id: learner.id,
      name: learner.name,
      scores: studentMarks,
      total: roundToCurriculumPrecision(rawTotal),
      position: 1,
    };
  });



  const sorted = [...compiled].sort((a, b) => {

    if (a.total !== b.total) {
      return b.total - a.total;
    }

    return compareLearnerNames(
      a.name,
      b.name
    );

  });



  let currentRank = 1;


  return sorted.map((item, index) => {

    if (
      index > 0 &&
      sorted[index - 1].total > item.total
    ) {
      currentRank = index + 1;
    }


    return {
      ...item,
      position: currentRank,
    };

  });
                    }
