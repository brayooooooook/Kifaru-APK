/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import type {
  Learner,
  AssessmentMarks,
  AssessmentConfig
} from "../types";

import {
  Download,
  FileSpreadsheet,
  Printer,
  Upload,
  FileText,
  RefreshCw
} from "lucide-react";

import * as XLSX from "xlsx";

import { calculateMeritList } from "../utils/assessmentEngine";
import { SUBJECTS } from "../types";


interface ExportsProps {
  learners: Learner[];
  marks: AssessmentMarks;
  remarks: Record<string,string>;
  token:string;
  config: AssessmentConfig;
  onRefresh:()=>void;
  onAlert:(msg:string,type:"success"|"error")=>void;
}


export default function Exports({
 learners,
 marks,
 remarks,
 token,
 config,
 onRefresh,
 onAlert
}:ExportsProps){


const [importing,setImporting]=useState(false);

const fileRef = useRef<HTMLInputElement>(null);



function exportExcel(){

 if(!learners.length){
  onAlert("No learners available","error");
  return;
 }


 const ranked = calculateMeritList(
   learners,
   marks
 );


 const rows = ranked.map(student=>{

  const row:any={
   Rank:student.position,
   Name:student.name,
   Total:student.total
  };


  SUBJECTS.forEach(subject=>{
    row[subject.code]=student.scores[subject.code];
  });


  row.Remark =
    remarks[student.id] ?? "";


  return row;

 });



 const sheet =
 XLSX.utils.json_to_sheet(rows);


 const book =
 XLSX.utils.book_new();


 XLSX.utils.book_append_sheet(
   book,
   sheet,
   "Merit List"
 );


 XLSX.writeFile(
   book,
   `${config.className}_Results.xlsx`
 );


 onAlert(
 "Excel exported successfully",
 "success"
 );

}




function exportBackup(){

 const backup={
  exportedAt:new Date().toISOString(),
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
   type:"application/json"
  }
 );


 const url =
 URL.createObjectURL(blob);


 const link =
 document.createElement("a");


 link.href=url;

 link.download =
 `${config.className}_backup.json`;


 link.click();


 URL.revokeObjectURL(url);


 onAlert(
 "Backup created",
 "success"
 );

}




async function importBackup(
 e:React.ChangeEvent<HTMLInputElement>
){

 const file =
 e.target.files?.[0];


 if(!file)return;


 if(file.size > 5_000_000){

  onAlert(
   "Backup file too large",
   "error"
  );

  return;
 }


 setImporting(true);


 try{


 const text =
 await file.text();


 const parsed =
 JSON.parse(text);


 if(
 !Array.isArray(parsed.learners)
 ||
 !parsed.marks
 ){

 throw new Error(
 "Invalid backup format"
 );

 }



 const response =
 await fetch(
 "/api/learners/bulk",
 {
 method:"POST",
 headers:{
 "Content-Type":"application/json",
 Authorization:`Bearer ${token}`
 },
 body:JSON.stringify({
 learners:parsed.learners
 })
 }
 );


 if(!response.ok)
 throw new Error(
 "Learner restore failed"
 );


 onAlert(
 "Backup restored successfully",
 "success"
 );


 onRefresh();



 }catch(error){

 onAlert(
 error instanceof Error
 ? error.message
 : "Import failed",
 "error"
 );


 }finally{

 setImporting(false);

 }

}




return (

<div className="space-y-8">


<div>

<h2 className="text-2xl font-bold flex gap-2">

<Download/>

Export Centre

</h2>


<p className="text-sm text-gray-500">
Download reports or restore backups.
</p>

</div>



<div className="grid md:grid-cols-2 gap-6">



<div className="border rounded-xl p-6 space-y-4">


<h3 className="font-bold flex gap-2">

<FileText/>

Reports

</h3>



<button
onClick={exportExcel}
className="w-full p-3 rounded-lg border flex gap-2"
>

<FileSpreadsheet/>

Export Excel

</button>



<button
onClick={()=>window.print()}
className="w-full p-3 rounded-lg border flex gap-2"
>

<Printer/>

Print PDF

</button>


</div>




<div className="border rounded-xl p-6 space-y-4">


<h3 className="font-bold">
Backup
</h3>


<button
onClick={exportBackup}
className="w-full p-3 rounded-lg border flex gap-2"
>

<Download/>

Export JSON

</button>



<input
ref={fileRef}
type="file"
accept=".json"
hidden
onChange={importBackup}
/>


<button
disabled={importing}
onClick={()=>fileRef.current?.click()}
className="w-full p-3 rounded-lg border flex gap-2"
>


{importing
?
<RefreshCw className="animate-spin"/>
:
<Upload/>
}


Restore Backup

</button>


</div>


</div>


</div>

);

}
