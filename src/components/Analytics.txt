/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Learner, SUBJECTS, SubjectCode } from "../types";
import { getFinalTermMarksLocal } from "./MeritList";
import { getCBEBand } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, TrendingUp, HelpCircle, Activity, Award, Percent } from "lucide-react";

interface AnalyticsProps {
  learners: Learner[];
  marks: any;
  config: any;
}

export default function Analytics({ learners, marks, config }: AnalyticsProps) {
  // 1. Compute Subject Mean Scores & Band Distribution
  const { subjectAverages, bandDistribution, performanceGroups, totalWithMarks } = useMemo(() => {
    // Filter learners who have at least one grade entered in opener, midterm, or endterm
    const learnersWithMarks = learners.filter((l) => {
      if (!marks) return false;
      const assessments = ["opener", "midterm", "endterm"];
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
      const finalMarks = getFinalTermMarksLocal(config, marks, l.id);
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

  return (
    <div className="space-y-8 bg-white text-black min-h-screen">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-950 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Academic Analytics & Insights
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          In-depth diagnostics of learning competencies, subject performance ratios, and academic curves.
        </p>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject averages chart */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <Percent className="h-4.5 w-4.5 text-blue-600" />
              Subject Mean Score Performance (%)
            </h3>
            <p className="text-[11px] text-gray-500">Average terminal grades comparison across all nine primary learning areas.</p>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAverages} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subject" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }} 
                  labelStyle={{ fontWeight: "bold" }}
                  formatter={(value: any) => [`${value}%`, "Class Mean"]}
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
        <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-blue-600" />
              CBC Competency Band Ratios (%)
            </h3>
            <p className="text-[11px] text-gray-500">Relative ratios of individual grades falling inside standard competency domains.</p>
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
                    formatter={(value: any, name: string, props: any) => [`${value} grades (${props.payload.percentage}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 w-full md:w-56 shrink-0">
              {bandDistribution.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="font-semibold text-gray-700">{entry.name}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-950">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate curve analytics */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
            Class Aggregate Distribution Density
          </h3>
          <p className="text-[11px] text-gray-500">Distribution frequency of learners across custom aggregate ranges.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {performanceGroups.map((group, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-100 p-4 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{group.name}</span>
              <span className="text-2xl font-bold text-gray-950">{group.count} <span className="text-xs text-gray-400 font-normal">Learners</span></span>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
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
