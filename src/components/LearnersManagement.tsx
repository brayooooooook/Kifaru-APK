/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import type { Learner } from "../types";

import {
  UserPlus,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  RotateCcw,
  Search,
  HelpCircle,
  Trash
} from "lucide-react";

import * as XLSX from "xlsx";


interface LearnersManagementProps {
  learners: Learner[];
  token: string;
  onRefresh: () => void;
  onAlert: (
    message: string,
    type: "success" | "error"
  ) => void;
}


export default function LearnersManagement({
  learners,
  token,
  onRefresh,
  onAlert
}: LearnersManagementProps) {


  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [search, setSearch] = useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editAdmission, setEditAdmission] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [importing, setImporting] = useState(false);



  const apiHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };



  const handleAdd = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();


    if (!name.trim()) {
      return;
    }


    try {

      const response =
        await fetch("/api/learners", {

          method: "POST",

          headers: apiHeaders,

          body: JSON.stringify({
            name,
            admissionNumber,
            parentPhone
          })

        });


      if (!response.ok) {
        throw new Error(
          "Failed to add learner"
        );
      }


      onAlert(
        "Learner added successfully",
        "success"
      );


      setName("");
      setAdmissionNumber("");
      setParentPhone("");

      onRefresh();


    } catch (error:any) {

      onAlert(
        error.message,
        "error"
      );

    }

  };




  const startEdit = (
    learner:Learner
  ) => {

    setEditingId(learner.id);

    setEditName(
      learner.name
    );

    setEditAdmission(
      learner.admissionNumber || ""
    );

    setEditPhone(
      learner.parentPhone || ""
    );

  };




  const saveEdit = async (
    id:string
  ) => {


    try {

      const response =
        await fetch(
          `/api/learners/${id}`,
          {

            method:"PUT",

            headers:apiHeaders,

            body:JSON.stringify({

              name:editName,

              admissionNumber:
                editAdmission,

              parentPhone:
                editPhone

            })

          });


      if(!response.ok){
        throw new Error(
          "Update failed"
        );
      }


      onAlert(
        "Learner updated",
        "success"
      );


      setEditingId(null);

      onRefresh();


    }catch(error:any){

      onAlert(
        error.message,
        "error"
      );

    }

  };




  const deleteLearner = async(
    id:string
  )=>{


    if(
      !confirm(
        "Delete this learner permanently?"
      )
    ) return;



    const response =
      await fetch(
        `/api/learners/${id}`,
        {

          method:"DELETE",

          headers:{
            Authorization:
            `Bearer ${token}`
          }

        });



    if(response.ok){

      onAlert(
        "Learner deleted",
        "success"
      );

      onRefresh();

    }


  };




  const importExcel = (
    file:File
  )=>{


    setImporting(true);


    const reader =
      new FileReader();


    reader.onload =
      async(event)=>{


      try{


        const workbook =
          XLSX.read(
            event.target?.result,
            {
              type:"binary"
            }
          );


        const sheet =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];


        const rows =
          XLSX.utils.sheet_to_json<any>(
            sheet
          );



        const imported =
          rows.map(row=>({

            name:
              String(
                row.Name ||
                row["Learner Name"] ||
                ""
              ),

            admissionNumber:
              String(
                row.Admission ||
                row["Admission Number"] ||
                ""
              ),

            parentPhone:
              String(
                row.Phone ||
                ""
              )

          }))
          .filter(
            x=>x.name
          );



        const response =
          await fetch(
            "/api/learners/bulk",
            {

              method:"POST",

              headers:apiHeaders,

              body:
              JSON.stringify({
                learners:imported
              })

            });



        if(!response.ok){
          throw new Error(
            "Import failed"
          );
        }



        onAlert(
          `${imported.length} learners imported`,
          "success"
        );


        onRefresh();



      }catch(error:any){

        onAlert(
          error.message,
          "error"
        );

      }finally{

        setImporting(false);

      }

    };


    reader.readAsBinaryString(file);

  };




  const filtered =
    learners.filter(
      learner =>
        learner.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );




  return (

    <div className="space-y-6">


      <h2 className="text-2xl font-bold">
        Learners Management
      </h2>



      <div className="bg-white p-5 rounded-xl border">


        <h3 className="font-bold flex gap-2">

          <UserPlus />

          Register Learner

        </h3>



        <form
          onSubmit={handleAdd}
          className="space-y-3 mt-4"
        >

          <input
            className="border p-2 rounded w-full"
            placeholder="Learner name"
            value={name}
            onChange={
              e=>setName(e.target.value)
            }
          />


          <input
            className="border p-2 rounded w-full"
            placeholder="Admission number"
            value={admissionNumber}
            onChange={
              e=>setAdmissionNumber(
                e.target.value
              )
            }
          />


          <input
            className="border p-2 rounded w-full"
            placeholder="Parent phone"
            value={parentPhone}
            onChange={
              e=>setParentPhone(
                e.target.value
              )
            }
          />


          <button className="bg-[#1b365d] text-white p-2 rounded w-full">

            Add Learner

          </button>


        </form>

      </div>




      <div className="flex gap-2">

        <Search />

        <input

          className="border p-2 rounded w-full"

          placeholder="Search learner..."

          onChange={
            e=>setSearch(
              e.target.value
            )
          }

        />

      </div>





      <div className="bg-white rounded-xl border overflow-hidden">

        {filtered.map(
          (learner,index)=>(


          <div
            key={learner.id}
            className="p-4 border-b flex justify-between"
          >


          <div>

          {editingId===learner.id ?

          <input
            value={editName}
            onChange={
              e=>setEditName(
                e.target.value
              )
            }
            className="border p-1"
          />

          :

          <p className="font-semibold">

          {index+1}.
          {learner.name}

          </p>

          }


          </div>



          <div className="flex gap-2">


          <button
          onClick={()=>
            startEdit(learner)
          }
          >

          <Edit2 size={18}/>

          </button>



          <button
          onClick={()=>
            deleteLearner(
              learner.id
            )
          }
          >

          <Trash2
          size={18}
          />

          </button>



          </div>


          </div>


          )

        )}

      </div>


    </div>

  );

            }
