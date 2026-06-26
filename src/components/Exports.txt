/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Learner, SUBJECTS } from "../types";
import { getFinalTermMarksLocal } from "./MeritList";
import { Download, FileSpreadsheet, Printer, Upload, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportsProps {
  learners: Learner[];
  marks: any;
  remarks: Record<string, string>;
  token: string;
  config: any;
  onRefresh: () => void;
  onAlert: (msg: string, type: "success" | "error") => void;
}

export default function Exports({
  learners,
  marks,
  remarks,
  token,
  config,
  onRefresh,
  onAlert
}: ExportsProps) {
  const [importingJson, setImportingJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Export Excel function
  const handleExportXLSX = () => {
    if (learners.length === 0) {
      onAlert("No learners to export", "error");
      return;
    }

    try {
      const data = learners.map((l, index) => {
        const studentMarks = getFinalTermMarksLocal(config, marks, l.id);
        const row: any = {
          "Rank/No": index + 1,
          "Admission Number": l.admissionNumber,
          "Full Name": l.name,
          "Parent Phone": l.parentPhone || ""
        };

        SUBJECTS.forEach((sub) => {
          row[sub.name] = studentMarks[sub.code] || 0;
        });

        const total = Object.values(studentMarks).reduce((a, b) => a + b, 0);
        row["Total Marks"] = total;
        row["Average (%)"] = Math.round((total / SUBJECTS.length) * 10) / 10;
        row["Class Remark"] = remarks[l.id] || "";

        return row;
      });

      // Sort by aggregate descending for proper ranking output representation
      const sortedData = [...data].sort((a, b) => b["Total Marks"] - a["Total Marks"]);
      
      // Re-apply correct sequential positions
      let currentRank = 1;
      sortedData.forEach((row, idx) => {
        if (idx > 0 && row["Total Marks"] < sortedData[idx - 1]["Total Marks"]) {
          currentRank = idx + 1;
        }
        row["Rank/No"] = currentRank;
      });

      const worksheet = XLSX.utils.json_to_sheet(sortedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grade 8 Blue Marks");

      // Generate buffer and trigger local save
      XLSX.writeFile(workbook, `${config.className.replace(/\s+/g, "_")}_MeritList_Backup.xlsx`);
      onAlert("Excel report spreadsheet compiled and saved successfully!", "success");
      
      // Log export action to local storage
      localStorage.setItem("last_export_completed", "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  // 2. Export Database JSON Backup
  const handleDownloadBackup = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        schoolProfile: config,
        learners,
        marks,
        remarks
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${config.className.replace(/\s+/g, "_")}_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onAlert("Complete system database backup JSON file exported successfully", "success");
      
      // Update export activity logs
      localStorage.setItem("last_export_completed", "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  // 3. Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportingJson(true);
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.learners || !parsed.marks || !parsed.remarks) {
          throw new Error("Invalid backup file format. Must contain 'learners', 'marks', and 'remarks' arrays/records.");
        }

        // Send a request to restore or apply imports. Since we have standard routes, let's bulk import them!
        // We can send a POST to custom config and learners
        const response = await fetch("/api/learners/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ learners: parsed.learners })
        });

        if (!response.ok) {
          throw new Error("Server failed to restore imported learners list");
        }

        // We can also post the marks map if the server endpoint supports bulk
        const marksResponse = await fetch("/api/marks/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ marksMap: parsed.marks.endterm || parsed.marks }) // fallback to top level or standard endterm map
        });

        if (!marksResponse.ok) {
          throw new Error("Server failed to restore imported marks records");
        }

        onAlert("System restored successfully from local JSON backup! Refreshing data...", "success");
        onRefresh();
      } catch (err: any) {
        onAlert(err.message, "error");
      } finally {
        setImportingJson(false);
      }
    };
    reader.readAsText(file);
  };

  const triggerPDFPrint = () => {
    // Log PDF action to local storage
    localStorage.setItem("last_export_completed", "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    window.print();
  };

  return (
    <div className="space-y-8 bg-white text-black min-h-screen">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-950 flex items-center gap-2">
          <Download className="h-6 w-6 text-blue-600" />
          Export & Backup Center
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Export terminal merit sheets to Excel/CSV, print full registers to PDF, or backup your Firestore collections locally.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document export option card */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 space-y-5 shadow-xs">
          <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-blue-600" />
            Classroom Reports & Document Exports
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Download local offline spreadsheet files or trigger beautiful, printer-friendly PDF compilations of Grade 8 Blue's aggregate results.
          </p>

          <div className="space-y-3 pt-2">
            {/* Download Excel sheets */}
            <button
              onClick={handleExportXLSX}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div className="text-left">
                  <span className="font-bold text-gray-900 block">Export Term Excel Worksheet</span>
                  <span className="text-[10px] text-gray-400">Generates .xlsx file complete with ranks, marks & remarks</span>
                </div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>

            {/* Print full register to PDF */}
            <button
              onClick={triggerPDFPrint}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <span className="font-bold text-gray-900 block">Print Class Merit List to PDF</span>
                  <span className="text-[10px] text-gray-400">Triggers browser print system using beautiful CSS layouts</span>
                </div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Database backup card */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 space-y-5 shadow-xs">
          <h3 className="text-sm font-bold text-gray-950 flex items-center gap-2">
            <Upload className="h-4.5 w-4.5 text-indigo-600" />
            Local Database Backup & Restore Engine
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Preserve database integrity. Save your complete Firestore environment states (learners, marks, and teacher comments) to a single portable JSON file.
          </p>

          <div className="space-y-3 pt-2">
            {/* Backup database */}
            <button
              onClick={handleDownloadBackup}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-indigo-600" />
                <div className="text-left">
                  <span className="font-bold text-gray-900 block">Export JSON Database Backup</span>
                  <span className="text-[10px] text-gray-400">Complete portable freeze of current Firestore state</span>
                </div>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </button>

            {/* Restore database */}
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importingJson}
                className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {importingJson ? (
                    <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-emerald-600" />
                  )}
                  <div className="text-left">
                    <span className="font-bold text-gray-900 block">
                      {importingJson ? "Restoring backup file..." : "Restore JSON Database Backup"}
                    </span>
                    <span className="text-[10px] text-gray-400">Upload any previously exported .json configuration backup</span>
                  </div>
                </div>
                <Upload className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
