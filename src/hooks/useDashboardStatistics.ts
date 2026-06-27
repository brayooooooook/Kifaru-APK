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
    if (!learners.length) {  
      return {  
        topLearner: { name: "N/A", total: 0, position: 0 },  
        classMean: 0,  
        highestScore: 0,  
        lowestScore: 0,  
        reportsGeneratedCount: 0  
      };  
    }  
  
    const ranked = calculateMeritList(learners, marks);  
      
    // 1. Top Learner object  
    const topLearner = ranked[0] || {  
      name: "N/A",  
      total: 0,  
      position: 0  
    };  
      
    // 2. Class Mean  
    const totalScore = ranked.reduce((sum, s) => sum + s.total, 0);  
    const classMean = Number((totalScore / ranked.length).toFixed(1));  
      
    // 3. Highest and Lowest  
    const highestScore = ranked[0]?.total || 0;  
    const lowestScore = ranked[ranked.length - 1]?.total || 0;  
      
    // 4. Reports Generated  
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
  
