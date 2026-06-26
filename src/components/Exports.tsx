/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { calculateMeritList } from "../utils/assessmentEngine";
import { SUBJECTS } from "../types";
import type { Learner, AssessmentMarks } from "../types";
import {
  Download,
  FileSpreadsheet,
  Printer,
  Upload,
  FileText,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";


interface ExportsProps {
  learners: Learner[];
  marks: AssessmentMarks;
  remarks: Record<string, string>;
  token: string;
  config: any;
  onRefresh: () => void;
  onAlert: (
    msg: string,
    type: "success" | "error"
  ) => void;
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


  const [importingJson, setImportingJson] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);



  const handleExportXLSX = () => {

    if (!learners.length) {
      onAlert(
        "No learners to export",
        "error"
      );
      return;
    }


    const ranked =
      calculateMeritList(
        learners,
        marks
      );


    const data =
      ranked.map(student => {

        const row:any = {

          "Position":
            student.position,

          "Name":
            student.name,

          "Total Marks":
            student.total

        };


        SUBJECTS.forEach(subject => {

          row[subject.name] =
            student.scores[
              subject.code
            ] ?? 0;

        });


        row["Remark"] =
          remarks[student.id] || "";


        return row;

      });



    const worksheet =
      XLSX.utils.json_to_sheet(data);


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
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



  const handleDownloadBackup = () => {

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
          type:
          "application/json"
        }
      );


    const url =
      URL.createObjectURL(blob);


    const a =
      document.createElement("a");


    a.href = url;

    a.download =
      "school_backup.json";


    a.click();


    URL.revokeObjectURL(url);


    onAlert(
      "Backup created",
      "success"
    );

  };



  const handleImportBackup =
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {

    const file =
      e.target.files?.[0];


    if (!file) return;


    const reader =
      new FileReader();


    reader.onload = () => {

      try {

        JSON.parse(
          reader.result as string
        );


        setImportingJson(false);


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

    };


    reader.readAsText(file);

  };



  return (

    <div className="space-y-6">


      <h2 className="text-2xl font-bold flex gap-2 items-center">

        <Download />

        Export & Backup Centre

      </h2>



      <div className="grid md:grid-cols-2 gap-6">


        <div className="p-5 border rounded-xl">

          <h3 className="font-bold flex gap-2">

            <FileText />

            Reports

          </h3>



          <button

            onClick={handleExportXLSX}

            className="mt-4 w-full p-3 bg-slate-100 rounded-lg flex gap-2"

          >

            <FileSpreadsheet />

            Export Excel

          </button>



          <button

            onClick={() => window.print()}

            className="mt-3 w-full p-3 bg-slate-100 rounded-lg flex gap-2"

          >

            <Printer />

            Print PDF

          </button>


        </div>




        <div className="p-5 border rounded-xl">


          <h3 className="font-bold flex gap-2">

            <Upload />

            Backup

          </h3>


          <button

            onClick={handleDownloadBackup}

            className="mt-4 w-full p-3 bg-slate-100 rounded-lg"

          >

            Download Backup

          </button>



          <input

            hidden

            ref={fileInputRef}

            type="file"

            accept=".json"

            onChange={handleImportBackup}

          />


          <button

            onClick={() =>
              fileInputRef.current?.click()
            }

            className="mt-3 w-full p-3 bg-slate-100 rounded-lg flex gap-2"

          >

            {importingJson &&
              <RefreshCw className="animate-spin" />
            }

            Restore Backup

          </button>


        </div>


      </div>


    </div>

  );

      }
