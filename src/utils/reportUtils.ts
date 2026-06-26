import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { LearnerFullReport, LearnerAssessment } from "../types";

/**
 * Fetches all assessments for a specific learner from Firestore.
 * Returns a clean object keyed by assessment ID (e.g., "opener", "midterm").
 */
export async function fetchLearnerFullReport(learnerId: string): Promise<LearnerFullReport> {
  const assessmentCollectionRef = collection(db, "marks", learnerId, "assessments");
  const querySnapshot = await getDocs(assessmentCollectionRef);

  const fullReport: LearnerFullReport = {};

  querySnapshot.forEach((doc) => {
    // We cast the data to our interface for strict type safety
    fullReport[doc.id] = doc.data() as LearnerAssessment;
  });

  return fullReport;
}

