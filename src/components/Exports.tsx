/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

import { calculateMeritList } from "../utils/assessmentEngine";
import { SUBJECTS } from "../types";

import type { Learner } from "../types";


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


  const [importing, setImporting] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);



  const handleExportXLSX = () => {

    const ranked =
      calculateMeritList(
        learners,
        marks
      );


    const data =
      ranked.map(student => {

        const row: any = {

          "Position": student.position,

          "Name": student.name,

          "Total Marks": student.total,

          "Remark":
            remarks[student.id] || ""

        };


        SUBJECTS.forEach(subject => {

          row[subject.name] =
            student.scores[subject.code] ?? 0;

        });


        return row;

      });



    const sheet =
      XLSX.utils.json_to_sheet(data);


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      "Merit List"
    );


    XLSX.writeFile(
      workbook,
      `${config.className}_MeritList.xlsx`
    );


    onAlert(
      "Excel exported successfully",
      "success"
    );
  };




  const handleBackup = () => {

    const backup = {

      exportedAt:
        new Date().toISOString(),

      config,

      learners,

      marks,

      remarks

    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          )
        ],
        {
          type: "application/json"
        }
      );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      "school_backup.json";


    link.click();


    URL.revokeObjectURL(url);


    onAlert(
      "Backup exported",
      "success"
    );
  };




  const handleImport =
    (e: React.ChangeEvent<HTMLInputElement>) => {

      const file =
        e.target.files?.[0];

      if (!file) return;


      setImporting(true);


      const reader =
        new FileReader();


      reader.onload = () => {

        try {

          JSON.parse(
            reader.result as string
          );


          onAlert(
            "Backup file loaded",
            "success"
          );


        } catch {

          onAlert(
            "Invalid backup file",
            "error"
          );

        }


        setImporting(false);

      };


      reader.readAsText(file);

    };




  return (

    <div className="space-y-6">

      <h2 className="text-xl font-bold">
        Export & Backup Centre
      </h2>



      <button
        onClick={handleExportXLSX}
        className="p-3 rounded-lg bg-slate-100 flex gap-2"
      >

        <FileSpreadsheet />

        Export Excel

      </button>




      <button
        onClick={handleBackup}
        className="p-3 rounded-lg bg-slate-100 flex gap-2"
      >

        <Download />

        Backup JSON

      </button>




      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        hidden
        onChange={handleImport}
      />


      <button
        disabled={importing}
        onClick={() =>
          fileInputRef.current?.click()
        }
        className="p-3 rounded-lg bg-slate-100 flex gap-2"
      >

        {importing
          ? <RefreshCw className="animate-spin"/>
          : <Upload />
        }

        Restore Backup

      </button>




      <button
        onClick={() => window.print()}
        className="p-3 rounded-lg bg-slate-100 flex gap-2"
      >

        <Printer />

        Print

      </button>


    </div>

  );

}
