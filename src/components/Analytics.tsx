 /**  
 * @license  
 * SPDX-License-Identifier: Apache-2.0  
 */  
  
import React, { useMemo } from "react";  
import { Learner, SUBJECTS, getCBEBand } from "../types";  
import { getFinalTermMarksLocal } from "./MeritList";  
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";  
import { BarChart3, TrendingUp, Award, Percent, Inbox } from "lucide-react";  
  
// Strict type definitions  
interface SubjectMarkMap {  
  [subjectCode: string]: number | string | undefined | null;  
}  
  
interface StudentMarkMap {  
  [studentId: string]: SubjectMarkMap;  
}  
  
interface AssessmentMarks {  
  opener?: StudentMarkMap;  
  midterm?: StudentMarkMap;  
  endterm?: StudentMarkMap;  
}  
  
interface AssessmentConfig {  
  currentTerm: string;  
  year: number;  
  schoolName?: string;  
  classId?: string;  
}  
  
interface TooltipProps {  
  payload: {  
    percentage: number;  
  };  
}  
  
interface AnalyticsProps {  
  learners: Learner[];  
  marks: AssessmentMarks;  
  config: AssessmentConfig;  
}  
  
export default function Analytics({ learners, marks, config }: AnalyticsProps) {  
  // 1. Compute Subject Mean Scores & Band Distribution  
  const { subjectAverages, bandDistribution, performanceGroups, totalWithMarks } = useMemo(() => {  
    // Filter learners who have at least one grade entered in opener, midterm, or endterm  
    const learnersWithMarks = learners.filter((l) => {  
      if (!marks) return false;  
      const assessments: (keyof AssessmentMarks)[] = ["opener", "midterm", "endterm"];  
      for (const aid of assessments) {  
        const assessmentMarks = marks[aid];  
        if (assessmentMarks) {  
          const studentMarks = assessmentMarks[l.id];  
          if (studentMarks) {  
            for (const subCode of Object.keys(studentMarks)) {  
              const val = studentMarks[subCode];  
              if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {  
                return true;  
              }  
            }  
          }  
        }  
      }  
      return false;  
    });  
  
    const totalWithMarks = learnersWithMarks.length;  
  
    // Initialize metrics  
    const totalsMap: Record<string, number> = {};  
    const countsMap: Record<string, number> = {};  
    SUBJECTS.forEach((sub) => {  
      totalsMap[sub.code] = 0;  
      countsMap[sub.code] = 0;  
    });  
  
    let exceeding = 0;  
    let meeting = 0;  
    let approaching = 0;  
    let below = 0;  
  
    let groupExcellent = 0; // >80%  
    let groupGood = 0; // 60-80%  
    let groupAverage = 0; // 40-60%  
    let groupStruggling = 0; // <40%  
  
    // Only process learners that have at least one mark entry  
    learnersWithMarks.forEach((l) => {  
      // getFinalTermMarksLocal return configuration  
      const finalMarks = getFinalTermMarksLocal(config, marks, l.id) as Record<string, number>;  
      let studentTotal = 0;  
  
      SUBJECTS.forEach((sub) => {  
        const score = finalMarks[sub.code] || 0;  
        totalsMap[sub.code] += score;  
        countsMap[sub.code] += 1;  
        studentTotal += score;  
  
        // Count band distributions for individual subject scores  
        const bandDetails = getCBEBand(score);  
        if (bandDetails.level === "EE") exceeding++;  
        else if (bandDetails.level === "ME") meeting++;  
        else if (bandDetails.level === "AE") approaching++;  
        else if (bandDetails.level === "BE") below++;  
      });  
  
      const avg = studentTotal / SUBJECTS.length;  
      if (avg >= 80) groupExcellent++;  
      else if (avg >= 60) groupGood++;  
      else if (avg >= 40) groupAverage++;  
      else groupStruggling++;  
    });  
  
    const subjectAverages = SUBJECTS.map((sub) => {  
      const avg = countsMap[sub.code] > 0 ? totalsMap[sub.code] / countsMap[sub.code] : 0;  
      return {  
        subject: sub.code,  
        fullName: sub.name,  
        average: Math.round(avg * 10) / 10  
      };  
    });  
  
    const totalIndividualGrades = exceeding + meeting + approaching + below;  
    const bandDistribution = [  
      { name: "Exceeding (EE)", value: exceeding, percentage: totalIndividualGrades > 0 ? Math.round((exceeding / totalIndividualGrades) * 100) : 0, color: "#10b981" },  
      { name: "Meeting (ME)", value: meeting, percentage: totalIndividualGrades > 0 ? Math.round((meeting / totalIndividualGrades) * 100) : 0, color: "#0ea5e9" },  
      { name: "Approaching (AE)", value: approaching, percentage: totalIndividualGrades > 0 ? Math.round((approaching / totalIndividualGrades) * 100) : 0, color: "#f59e0b" },  
      { name: "Below (BE)", value: below, percentage: totalIndividualGrades > 0 ? Math.round((below / totalIndividualGrades) * 100) : 0, color: "#f43f5e" }  
    ];  
  
    const performanceGroups = [  
      { name: "Excellent (80%+)", count: groupExcellent },  
      { name: "Good (60%-79%)", count: groupGood },  
      { name: "Average (40%-59%)", count: groupAverage },  
      { name: "Struggling (<40%)", count: groupStruggling }  
    ];  
  
    return {  
      subjectAverages,  
      bandDistribution,  
      performanceGroups,  
      totalWithMarks  
    };  
  }, [learners, marks, config]);  
  
  // Graceful Empty State handling if no marks are found  
  if (totalWithMarks === 0) {  
    return (  
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-slate-950 text-center p-8 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-4">  
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 dark:text-blue-400">  
          <Inbox className="h-10 w-10" />  
        </div>  
        <div className="space-y-1 max-w-sm">  
          <h3 className="text-lg font-bold text-gray-950 dark:text-white">No Assessment Data Found</h3>  
          <p className="text-sm text-gray-500 dark:text-gray-400">  
            Analytics will dynamically populate here once learner assessments are entered into Marks Entry.  
          </p>  
        </div>  
      </div>  
    );  
  }  
  
  return (  
    <div className="space-y-8 bg-white dark:bg-slate-950 text-black dark:text-white min-h-screen">  
      {/* Title */}  
      <div>  
        <h2 className="text-2xl font-display font-bold text-gray-950 dark:text-white flex items-center gap-2">  
          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />  
          Academic Analytics & Insights  
        </h2>  
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">  
          In-depth diagnostics of learning competencies, subject performance ratios, and academic curves.  
        </p>  
      </div>  
  
      {/* Grid of charts */}  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">  
        {/* Subject averages chart */}  
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">  
          <div className="space-y-0.5">  
            <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">  
              <Percent className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />  
              Subject Mean Score Performance (%)  
            </h3>  
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Average terminal grades comparison across all {SUBJECTS.length} primary learning areas.</p>  
          </div>  
          <div className="h-72 w-full text-xs">  
            <ResponsiveContainer width="100%" height="100%">  
              <BarChart data={subjectAverages} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>  
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />  
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />  
                <XAxis dataKey="subject" tickLine={false} axisLine={false} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />  
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />  
                <Tooltip   
                  contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}   
                  labelStyle={{ fontWeight: "bold" }}  
                  formatter={(value: number) => [`${value}%`, "Class Mean"]}  
                />  
                <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]}>  
                  {subjectAverages.map((entry, index) => (  
                    <Cell   
                      key={`cell-${index}`}   
                      fill={entry.average >= 75 ? "#10b981" : entry.average >= 50 ? "#3b82f6" : "#f59e0b"}   
                    />  
                  ))}  
                </Bar>  
              </BarChart>  
            </ResponsiveContainer>  
          </div>  
        </div>  
  
        {/* Competency Band distribution chart */}  
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">  
          <div className="space-y-0.5">  
            <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">  
              <Award className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />  
              CBC Competency Band Ratios (%)  
            </h3>  
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Relative ratios of individual grades falling inside standard competency domains.</p>  
          </div>  
          <div className="h-72 w-full text-xs flex flex-col md:flex-row items-center justify-between gap-4">  
            <div className="h-full flex-1 w-full max-w-[200px]">  
              <ResponsiveContainer width="100%" height="100%">  
                <PieChart>  
                  <Pie  
                    data={bandDistribution}  
                    innerRadius={60}  
                    outerRadius={80}  
                    paddingAngle={3}  
                    dataKey="value"  
                  >  
                    {bandDistribution.map((entry, index) => (  
                      <Cell key={`cell-${index}`} fill={entry.color} />  
                    ))}  
                  </Pie>  
                  <Tooltip   
                    contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}  
                    formatter={(value: number, name: string, props: TooltipProps) => [`${value} grades (${props.payload.percentage}%)`, name]}  
                  />  
                </PieChart>  
              </ResponsiveContainer>  
            </div>  
              
            <div className="space-y-2 w-full md:w-56 shrink-0">  
              {bandDistribution.map((entry, idx) => (  
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">  
                  <div className="flex items-center gap-2">  
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />  
                    <span className="font-semibold text-gray-700 dark:text-slate-300">{entry.name}</span>  
                  </div>  
                  <span className="font-mono font-bold text-gray-950 dark:text-white">{entry.percentage}%</span>  
                </div>  
              ))}  
            </div>  
          </div>  
        </div>  
      </div>  
  
      {/* Aggregate curve analytics */}  
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">  
        <div className="space-y-0.5">  
          <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">  
            <TrendingUp className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />  
            Class Aggregate Distribution Density  
          </h3>  
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Distribution frequency of learners across custom aggregate ranges.</p>  
        </div>  
          
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">  
          {performanceGroups.map((group, idx) => (  
            <div key={idx} className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 p-4 rounded-xl space-y-1.5">  
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">{group.name}</span>  
              <span className="text-2xl font-bold text-gray-950 dark:text-white">{group.count} <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">Learners</span></span>  
              <div className="w-full bg-gray-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">  
                <div   
                  className={`h-full ${idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : "bg-rose-500"}`}  
                  style={{ width: `${totalWithMarks > 0 ? (group.count / totalWithMarks) * 100 : 0}%` }}  
                />  
              </div>  
            </div>  
          ))}  
        </div>  
      </div>  
    </div>  
  );  
}  
  
