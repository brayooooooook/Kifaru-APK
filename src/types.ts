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
