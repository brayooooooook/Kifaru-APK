/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Learner, AssessmentMarks } from "../../types";
import { SUBJECTS } from "../../types";


export interface RankedLearner {
  id: string;
  name: string;
  admissionNumber: string;
  scores: Record<string, number>;
  total: number;
  position: number;
}


/**
 * Converts any mark input into a safe number.
 */
function normalizeMarkPolicy(raw: unknown): number {
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}


/**
 * Sorts learner names consistently.
 */
function compareLearnerNames(
  a: string,
  b: string
): number {
  return a.localeCompare(
    b,
    "en",
    { sensitivity: "base" }
  );
}


/**
 * Keeps totals accurate to two decimal places.
 */
function roundToCurriculumPrecision(
  total: number
): number {
  return Math.round(total * 100) / 100;
}


/**
 * Gets clean marks for one learner.
 */
function extractLearnerMarks(
  marks: AssessmentMarks,
  learnerId: string
): Record<string, number> {

  const normalized: Record<string, number> = {};

  for (const subject of SUBJECTS) {

    normalized[subject.code] =
      normalizeMarkPolicy(
        marks[learnerId]?.[subject.code]
      );

  }

  return normalized;
}


/**
 * Calculates totals and rankings.
 */
export function calculateMeritList(
  learners: Learner[],
  marks: AssessmentMarks
): RankedLearner[] {


  if (!learners.length) {
    return [];
  }


  const uniqueLearners =
    Array.from(
      new Map(
        learners.map(
          learner => [learner.id, learner]
        )
      ).values()
    );


  const compiled = uniqueLearners.map(
    learner => {

      const studentMarks =
        extractLearnerMarks(
          marks,
          learner.id
        );


      const total =
        SUBJECTS.reduce(
          (sum, subject) =>
            sum + studentMarks[subject.code],
          0
        );


return {
  id: learner.id,
  name: learner.name,
  admissionNumber: learner.admissionNumber,
  scores: studentMarks,
  total: roundToCurriculumPrecision(total),
  position: 1
};

    }
  );


  const sorted =
    [...compiled].sort(
      (a, b) => {

        if (a.total !== b.total) {
          return b.total - a.total;
        }

        return compareLearnerNames(
          a.name,
          b.name
        );

      }
    );


  let currentRank = 1;


  return sorted.map(
    (student, index) => {

      if (
        index > 0 &&
        sorted[index - 1].total >
        student.total
      ) {
        currentRank = index + 1;
      }


      return {
        ...student,
        position: currentRank
      };

    }
  );
}
