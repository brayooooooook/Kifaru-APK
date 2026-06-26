/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useMemo,
  useState
} from "react";

import type { Learner } from "../types";

import {
  UserPlus,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  Search
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



  const [name,setName] =
    useState("");

  const [admissionNumber,setAdmissionNumber] =
    useState("");

  const [parentPhone,setParentPhone] =
    useState("");



  const [search,setSearch] =
    useState("");



  const [editingId,setEditingId] =
    useState<string | null>(null);



  const [editName,setEditName] =
    useState("");

  const [editAdmission,setEditAdmission] =
    useState("");

  const [editPhone,setEditPhone] =
    useState("");



  const [loading,setLoading] =
    useState(false);




  const headers = {

    "Content-Type":"application/json",

    Authorization:
      `Bearer ${token}`

  };




  const filteredLearners =
    useMemo(()=>{


      return learners.filter(
        learner =>

        learner.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )

        ||

        learner.admissionNumber
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )

      );


    },[learners,search]);







  const handleAdd =
  async(
    e:React.FormEvent
  )=>{


    e.preventDefault();


    if(!name.trim())
      return;



    try{


      const response =
      await fetch(
        "/api/learners",
        {

          method:"POST",

          headers,

          body:JSON.stringify({

            name,

            admissionNumber,

            parentPhone

          })

        });



      if(!response.ok)
        throw new Error(
          "Failed to add learner"
        );



      onAlert(
        "Learner added successfully",
        "success"
      );


      setName("");

      setAdmissionNumber("");

      setParentPhone("");

      onRefresh();



    }catch(error:any){

      onAlert(
        error.message,
        "error"
      );

    }


  };









  const startEdit =
  (learner:Learner)=>{


    setEditingId(
      learner.id
    );


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








  const cancelEdit =
  ()=>{

    setEditingId(null);

    setEditName("");

    setEditAdmission("");

    setEditPhone("");

  };









  const saveEdit =
  async(
    id:string
  )=>{


    try{


      const response =
      await fetch(
        `/api/learners/${id}`,
        {

          method:"PUT",

          headers,

          body:JSON.stringify({

            name:editName,

            admissionNumber:
            editAdmission,

            parentPhone:
            editPhone

          })

        });



      if(!response.ok)
        throw new Error(
          "Update failed"
        );



      onAlert(
        "Learner updated",
        "success"
      );


      cancelEdit();

      onRefresh();



    }catch(error:any){

      onAlert(
        error.message,
        "error"
      );

    }


  };









  const deleteLearner =
  async(
    id:string
  )=>{


    if(
      !confirm(
        "Delete this learner permanently?"
      )
    )
      return;




    try{


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



      if(!response.ok)
        throw new Error(
          "Delete failed"
        );



      onAlert(
        "Learner deleted",
        "success"
      );


      onRefresh();



    }catch(error:any){

      onAlert(
        error.message,
        "error"
      );

    }


  };









  const importExcel =
  (file:File)=>{


    setLoading(true);



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
        rows.map(row=>{


          const keys =
          Object.keys(row);



          const nameKey =
          keys.find(
            key =>
            key.toLowerCase()
            .includes("name")
            ||
            key.toLowerCase()
            .includes("learner")
            ||
            key.toLowerCase()
            .includes("student")
          );



          const admissionKey =
          keys.find(
            key =>
            key.toLowerCase()
            .includes("adm")
            ||
            key.toLowerCase()
            .includes("number")
          );



          const phoneKey =
          keys.find(
            key =>
            key.toLowerCase()
            .includes("phone")
            ||
            key.toLowerCase()
            .includes("contact")
          );



          return {

            name:
            String(
              row[nameKey || ""]
              || ""
            ).trim(),


            admissionNumber:
            String(
              row[admissionKey || ""]
              || ""
            ).trim(),


            parentPhone:
            String(
              row[phoneKey || ""]
              || ""
            ).trim()

          };


        })
        .filter(
          item =>
          item.name
        );





        const response =
        await fetch(
          "/api/learners/bulk",
          {

            method:"POST",

            headers,

            body:JSON.stringify({
              learners:imported
            })

          });



        if(!response.ok)
          throw new Error(
            "Import failed"
          );



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


        setLoading(false);


      }


    };



    reader.readAsBinaryString(file);


  };






  return (

    <div className="space-y-6">



      <h2 className="text-2xl font-bold">
        Learners Management
      </h2>





      <form
      onSubmit={handleAdd}
      className="bg-white p-5 rounded-xl border space-y-3"
      >


        <h3 className="font-bold flex gap-2">

          <UserPlus/>

          Register Learner

        </h3>



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



        <button
        className="bg-[#1b365d] text-white p-2 rounded w-full"
        >

          Add Learner

        </button>


      </form>







      <div className="flex gap-3 items-center">


        <Search/>


        <input
        className="border p-2 rounded flex-1"
        placeholder="Search learner"
        onChange={
          e=>setSearch(
            e.target.value
          )
        }
        />



        <label className="cursor-pointer">

          <Upload/>


          <input
          hidden
          type="file"
          accept=".xlsx,.csv"
          onChange={
            e=>{

              const file =
              e.target.files?.[0];

              if(file)
                importExcel(file);

            }
          }
          />

        </label>


      </div>








      <div className="bg-white rounded-xl border overflow-hidden">


      {filteredLearners.map(
      (learner,index)=>(


        <div
        key={learner.id}
        className="p-4 border-b flex justify-between"
        >



        <div>


        {
        editingId===learner.id ?


        <div className="space-y-2">


          <input
          className="border p-1"
          value={editName}
          onChange={
            e=>setEditName(
              e.target.value
            )
          }
          />


          <input
          className="border p-1"
          value={editAdmission}
          onChange={
            e=>setEditAdmission(
              e.target.value
            )
          }
          />


          <input
          className="border p-1"
          value={editPhone}
          onChange={
            e=>setEditPhone(
              e.target.value
            )
          }
          />


        </div>


        :


        <p className="font-semibold">

          {index+1}. {learner.name}

        </p>

        }


        </div>






        <div className="flex gap-2">


        {
        editingId===learner.id ?


        <button
        onClick={()=>
          saveEdit(
            learner.id
          )
        }
        >

          <Check/>

        </button>


        :


        <button
        onClick={()=>
          startEdit(learner)
        }
        >

          <Edit2/>

        </button>

        }



        {
        editingId===learner.id &&

        <button
        onClick={cancelEdit}
        >

          <X/>

        </button>

        }



        <button
        onClick={()=>
          deleteLearner(
            learner.id
          )
        }
        >

          <Trash2/>

        </button>



        </div>


        </div>


      ))

      }


      </div>





      {
      loading &&
      <p>
        Importing file...
      </p>
      }


    </div>
      );

}

