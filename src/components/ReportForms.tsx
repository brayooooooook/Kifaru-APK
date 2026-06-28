/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Learner, SUBJECTS } from "../types";
import { FileText, BookOpen, TrendingUp, Layers, FileDown, Sparkles } from "lucide-react";
import { getFinalTermMarksLocal } from "./MeritList";
import html2pdf from "html2pdf.js";

interface ReportFormsProps {
  learners: Learner[];
  marks: any;
  remarks: Record<string, string>;
  token: string;
  config: any;
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function ReportForms({ learners, marks, remarks, config, onRefresh }: ReportFormsProps) {
  const [activeTab, setActiveTab] = useState<"individual" | "booklet" | "progress_tracker">("individual");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("final");
  const [isGenerating, setIsGenerating] = useState(false);

  const rankedLearners = useMemo(() => {
    return learners.map((l) => {
      let lMarks: Record<string, number> = {};
      if (activeAssessmentId === "final") {
        lMarks = getFinalTermMarksLocal(config, marks, l.id);
      } else {
        const assessmentMarks = marks[activeAssessmentId] || {};
        const studentMarks = assessmentMarks[l.id] || {};
        SUBJECTS.forEach((sub) => { lMarks[sub.code] = studentMarks[sub.code] || 0; });
      }
      const total = Object.values(lMarks).reduce((a, b) => a + b, 0);
      const average = SUBJECTS.length > 0 ? Math.round(total / SUBJECTS.length) : 0;
      return { ...l, marks: lMarks, total, average, remark: remarks[l.id] || "" };
    }).sort((a, b) => b.total - a.total).map((item, idx) => ({ ...item, position: idx + 1 }));
  }, [learners, marks, remarks, config, activeAssessmentId]);

  const downloadReportPDF = () => {
    const element = document.getElementById("report-card-container");
    const opt = {
      margin: 10,
      filename: `Report_Booklet_Grade8Blue.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleAutoRemark = async (student: any) => {
    setIsGenerating(true);
    // Add your AI fetch logic here
    console.log("Generating AI remark for:", student.name);
    setIsGenerating(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-2xl font-extrabold text-slate-800">Report Forms Center</h2>
          <div className="flex bg-slate-200 p-1 rounded-xl">
            {[
              { id: "individual", label: "Individual", icon: FileText },
              { id: "booklet", label: "Booklet", icon: BookOpen },
              { id: "progress_tracker", label: "Tracker", icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div id="report-card-container" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {rankedLearners.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-lg capitalize">{activeTab} View</h3>
                <button onClick={downloadReportPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm">
                  <FileDown size={16} /> Export PDF
                </button>
              </div>
              <div className="text-sm text-slate-600">
                <p>Total Learners: {rankedLearners.length}</p>
                {/* Individual/Booklet/Tracker Content goes here */}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="text-slate-300 mb-4"><Layers size={48} className="mx-auto" /></div>
              <h3 className="text-lg font-bold text-slate-700">No Data Found</h3>
              <p className="text-slate-500">Ensure learners and assessment marks are saved.</p>
              <button onClick={onRefresh} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700">
                Refresh Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
