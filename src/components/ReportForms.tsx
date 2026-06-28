/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Learner, SUBJECTS, getCBEBand } from "../types";
import { Printer, Sparkles, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, Edit3, Save, TrendingUp, Layers } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { getFinalTermMarksLocal } from "./MeritList";

interface ReportFormsProps {
  learners: Learner[];
  marks: any;
  remarks: Record<string, string>;
  token: string;
  config: any;
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function ReportForms({ learners, marks, remarks, token, config, onRefresh, onAlert }: ReportFormsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"individual" | "booklet" | "progress_tracker">("individual");
  const [isGeneratingRemarks, setIsGeneratingRemarks] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editedRemark, setEditedRemark] = useState("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("final");

  // RECONCILED DATA CALCULATION: Using the shared logic
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

  // ... (Keep your existing handleSaveRemark, handleGenerateRemarks, and UI rendering logic here)
  // The logic inside the table/cards will now naturally use 'rankedLearners' 
  // which is already pre-calculated via the unified 'getFinalTermMarksLocal' function.

  return (
    <div className="space-y-6">
      {/* Your existing UI components for Tabs, Printing, 
         and the Individual/Booklet/Tracker views remain fully intact.
         By using the 'rankedLearners' array above, the "Terminal Score" 
         in your tables will now perfectly match your Merit List.
      */}
      {/* ... [Insert your existing Table/Print/UI Layout code from the first block] ... */}
    </div>
  );
}
