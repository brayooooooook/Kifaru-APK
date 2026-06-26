/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Learner {
  id: string;
  name: string;
  admissionNumber: string;
  parentPhone?: string;
}

export type SubjectCode = 
  | "ENG" 
  | "KIS" 
  | "MAT" 
  | "SCI" 
  | "PTS" 
  | "CAS" 
  | "SST" 
  | "CRE" 
  | "AGR";

export interface SubjectInfo {
  code: SubjectCode;
  name: string;
}

  { code: "ENG", name: "English Language" },
  { code: "KIS", name: "Kiswahili" },
  { code: "MAT", name: "Mathematics" },
  { code: "SCI", name: "Integrated Science" },
  { code: "PTS", name: "Pre-Technical Studies" },
  { code: "CAS", name: "Creative Arts and Sports" },
  { code: "AGR", name: "Agriculture" },
  { code: "SST", name: "Social Studies" },
  { code: "CRE", name: "Christian Religious Education" }


export interface CBEBandDetails {
  band: "EE1" | "EE2" | "ME1" | "ME2" | "AE1" | "AE2" | "BE1" | "BE2";
  level: "EE" | "ME" | "AE" | "BE";
  levelName: string;
  points: number;
  color: string;
  bgClass: string;
}

export function getCBEBand(score: number): CBEBandDetails {
  if (score >= 90) {
    return {
      band: "EE1",
      level: "EE",
      levelName: "Exceeding Expectations",
      points: 8,
      color: "text-emerald-800 dark:text-emerald-400 font-semibold",
      bgClass: "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
    };
  } else if (score >= 75) {
    return {
      band: "EE2",
      level: "EE",
      levelName: "Exceeding Expectations",
      points: 7,
      color: "text-teal-800 dark:text-teal-400 font-semibold",
      bgClass: "bg-teal-50/60 dark:bg-teal-950/20 text-teal-800 dark:text-teal-400 border-teal-100 dark:border-teal-900/30"
    };
  } else if (score >= 58) {
    return {
      band: "ME1",
      level: "ME",
      levelName: "Meeting Expectations",
      points: 6,
      color: "text-sky-800 dark:text-sky-400 font-semibold",
      bgClass: "bg-sky-50/60 dark:bg-sky-950/20 text-sky-800 dark:text-sky-400 border-sky-100 dark:border-sky-900/30"
    };
  } else if (score >= 41) {
    return {
      band: "ME2",
      level: "ME",
      levelName: "Meeting Expectations",
      points: 5,
      color: "text-indigo-800 dark:text-indigo-400 font-semibold",
      bgClass: "bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30"
    };
  } else if (score >= 31) {
    return {
      band: "AE1",
      level: "AE",
      levelName: "Approaching Expectations",
      points: 4,
      color: "text-amber-800 dark:text-amber-400 font-semibold",
      bgClass: "bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
    };
  } else if (score >= 21) {
    return {
      band: "AE2",
      level: "AE",
      levelName: "Approaching Expectations",
      points: 3,
      color: "text-orange-800 dark:text-orange-400 font-semibold",
      bgClass: "bg-orange-50/60 dark:bg-orange-950/20 text-orange-800 dark:text-orange-400 border-orange-100 dark:border-orange-900/30"
    };
  } else if (score >= 11) {
    return {
      band: "BE1",
      level: "BE",
      levelName: "Below Expectations",
      points: 2,
      color: "text-rose-800 dark:text-rose-400 font-semibold",
      bgClass: "bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
    };
  } else {
    return {
      band: "BE2",
      level: "BE",
      levelName: "Below Expectations",
      points: 1,
      color: "text-red-800 dark:text-red-400 font-semibold",
      bgClass: "bg-red-50/60 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30"
    };
  }
}

export interface ClassStatistics {
  subjectAverages: Record<SubjectCode, number>;
  classMean: number;
  highestTotal: number;
  lowestTotal: number;
  totalLearners: number;
}


// --- Report Card Types ---

export interface LearnerAssessment {
  learnerId: string;
  assessmentId: string;
  subjectMarks: Record<string, number>; // e.g., { "ENG": 80, "MAT": 90 }
  updatedAt: any; // Firebase Timestamp
}

// This represents the full object returned by fetchLearnerFullReport
// Keyed by assessmentId (e.g., "opener", "midterm")
export type LearnerFullReport = Record<string, LearnerAssessment>;
