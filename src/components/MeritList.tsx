/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { calculateMeritList } from "../utils/assessmentEngine";


export interface RankedLearner {
  id: string;
  name: string;
  scores: Record<string, number>;
  total: number;
  position: number;
}

/**
 * BUSINESS POLICY: Normalises raw input into valid curriculum marks.
 * Separates data parsing from school evaluation rules.
 */

  const value = Number(raw);

  if (!Number.isFinite(value)) return 0;

  // Negative marks are not allowed under the current grading policy.
  return Math.max(0, value);
}

/**
 * NAME SORT POLICY: Compares learner names deterministically.
 * Ensures consistent ordering when learners have identical totals.
 */

  return a.localeCompare(b, "en", { sensitivity: "base" });
}

/**
 * CURRICULUM ROUNDING POLICY: Standardises decimal totals.
 * Prevents floating-point precision drift during ranking.
 */

  return Math.round(total * 100) / 100;
}

/**
 * Private helper that creates a safe normalised subject score object.
 */

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
 * Computes aggregate totals and assigns standard competitive rankings.
 * Ranking format: 1, 1, 3, 4...
 */
export function calculateMeritList(
  learners: Learner[],
  marks: AssessmentMarks
): RankedLearner[] {
  if (!learners.length) return [];

  // Remove accidental duplicate learner records.
  const uniqueLearners = Array.from(
    new Map(
      learners.map((learner) => [learner.id, learner])
    ).values()
  );

  const compiled = uniqueLearners.map((learner) => {
    const studentMarks = extractLearnerMarks(marks, learner.id);

    const rawTotal = SUBJECTS.reduce(
      (sum, subject) => sum + (studentMarks[subject.code] ?? 0),
      0
    );

    return {
      id: learner.id,
      name: learner.name,
      scores: studentMarks,
      total: roundToCurriculumPrecision(rawTotal),
      position: 1
    };
  });

  // Sort by highest total first.
  // If totals match, sort alphabetically for deterministic output.
  const sorted = [...compiled].sort((a, b) => {
    if (a.total !== b.total) {
      return b.total - a.total;
    }

    return compareLearnerNames(a.name, b.name);
  });

  // Standard competitive ranking: 1, 1, 3, 4
  let currentRank = 1;

  return sorted.map((item, idx) => {
    if (idx > 0 && sorted[idx - 1].total > item.total) {
      currentRank = idx + 1;
    }

    return {
      ...item,
      position: currentRank
    };
  });
}
