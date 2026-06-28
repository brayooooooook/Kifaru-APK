import { useMemo } from "react";
import type { Learner, AssessmentMarks } from "../types";
import { calculateMeritList } from "../components/utils/assessmentEngine";

export function useDashboardStatistics(
  learners: Learner[],
  marks: AssessmentMarks,
  remarks: Record<string, string>,
  config: any
) {
  return useMemo(() => {
    // 1. Handle empty state
    if (!learners.length) {
      return {
        topLearner: {
          id: "N/A",
          name: "N/A",
          admissionNumber: "N/A",
          scores: {},
          total: 0,
          position: 0
        },
        classMean: 0,
        highestScore: 0,
        lowestScore: 0,
        reportsGeneratedCount: 0
      };
    }

    const ranked = calculateMeritList(learners, marks);

    // 2. Top Learner object with full Learner interface compliance
    const topLearner = ranked[0] || {
      id: "N/A",
      name: "N/A",
      admissionNumber: "N/A",
      scores: {},
      total: 0,
      position: 0
    };

    // 3. Class Mean
    const totalScore = ranked.reduce((sum, s) => sum + (s.total || 0), 0);
    const classMean = ranked.length > 0 ? Number((totalScore / ranked.length).toFixed(1)) : 0;

    // 4. Highest and Lowest
    const highestScore = ranked[0]?.total || 0;
    const lowestScore = ranked[ranked.length - 1]?.total || 0;

    // 5. Reports Generated
    const reportsGeneratedCount = Object.keys(remarks).length;

    return {
      topLearner,
      classMean,
      highestScore,
      lowestScore,
      reportsGeneratedCount
    };
  }, [learners, marks, remarks, config]);
}
