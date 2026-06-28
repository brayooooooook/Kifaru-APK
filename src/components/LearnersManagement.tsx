/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
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
  onAlert: (message: string, type: "success" | "error") => void;
}

export default function LearnersManagement({
  learners,
  token,
  onRefresh,
  onAlert,
}: LearnersManagementProps) {
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAdmission, setEditAdmission] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const filteredLearners = useMemo(() => {
    return learners.filter(
      (learner) =>
        learner.name?.toLowerCase().includes(search.toLowerCase()) ||
        learner.admissionNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [learners, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const response = await fetch("/api/learners", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          admissionNumber,
          parentPhone: "", // Backend bridge
        }),
      });

      if (!response.ok) throw new Error("Failed to add learner");
      onAlert("Learner added successfully", "success");
      setName("");
      setAdmissionNumber("");
      onRefresh();
    } catch (error: any) {
      onAlert(error.message, "error");
    }
  };

  const startEdit = (learner: Learner) => {
    setEditingId(learner.id);
    setEditName(learner.name);
    setEditAdmission(learner.admissionNumber || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAdmission("");
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/learners/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: editName,
          admissionNumber: editAdmission,
          parentPhone: "", // Backend bridge
        }),
      });

      if (!response.ok) throw new Error("Update failed");
      onAlert("Learner updated", "success");
      cancelEdit();
      onRefresh();
    } catch (error: any) {
      onAlert(error.message, "error");
    }
  };

  const deleteLearner = async (id: string) => {
    if (!confirm("Delete this learner permanently?")) return;
    try {
      const response = await fetch(`/api/learners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Delete failed");
      onAlert("Learner deleted successfully", "success");
      onRefresh();
    } catch (error: any) {
      onAlert(error.message, "error");
    }
  };

  const importExcel = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        if (!workbook.SheetNames.length) throw new Error("No worksheet found");
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);
        const imported = rows.map((row) => ({
          name: String(row.name || row.Name || row.Learner || "").trim(),
          admissionNumber: String(row.admissionNumber || row.AdmissionNumber || row.Adm || "").trim(),
        })).filter((item) => item.name);

        const response = await fetch("/api/learners/bulk", {
          method: "POST",
          headers,
          body: JSON.stringify({ learners: imported }),
        });

        if (!response.ok) throw new Error("Import failed");
        onAlert(`${imported.length} learners imported`, "success");
        onRefresh();
      } catch (error: any) {
        onAlert(error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-8 bg-[#F8FAFC] min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-6">
        <h2 className="text-3xl font-display font-bold text-[#1B365D]">Learners Management</h2>
        <p className="text-sm text-gray-600">Manage class register, learner details and records</p>
      </div>

      {/* Register Learner */}
      <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-[#1B365D] flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Register New Learner
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border border-gray-200 p-3 rounded-xl w-full text-gray-950"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border border-gray-200 p-3 rounded-xl w-full text-gray-950"
            placeholder="Admission Number"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
          />
        </div>
        <button type="submit" className="bg-[#1B365D] text-white px-6 py-3 rounded-xl font-bold">
          Save Learner
        </button>
      </form>

      {/* Search and Import */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
          <input
            className="border border-gray-200 p-3 pl-10 rounded-xl w-full bg-white text-gray-950"
            placeholder="Search by name or admission..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="cursor-pointer bg-white border border-gray-200 p-3 rounded-xl text-[#1B365D]">
          <Upload className="h-5 w-5" />
          <input
            hidden
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importExcel(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Learner List */}
      <div className="space-y-4">
        {loading && <p className="text-center text-gray-500 animate-pulse">Importing learners...</p>}

        {filteredLearners.map((learner, index) => (
          <div key={learner.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
            {editingId === learner.id ? (
              <div className="flex-1 space-y-2">
                <input
                  className="border p-2 rounded-lg w-full text-gray-950"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  className="border p-2 rounded-lg w-full text-gray-950"
                  value={editAdmission}
                  onChange={(e) => setEditAdmission(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <p className="font-bold text-gray-950">{index + 1}. {learner.name}</p>
                <p className="text-xs text-gray-500 font-mono">Adm: {learner.admissionNumber ?? "N/A"}</p>
              </div>
            )}

            <div className="flex gap-2 ml-3">
              {editingId === learner.id ? (
                <>
                  <button type="button" onClick={() => saveEdit(learner.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <Check className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={cancelEdit} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => startEdit(learner)} className="p-2 text-[#1B365D] hover:bg-[#F0F4F8] rounded-lg">
                  <Edit2 className="h-5 w-5" />
                </button>
              )}
              <button type="button" onClick={() => deleteLearner(learner.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}

        {filteredLearners.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
            No learners found. Add your first learner above.
          </div>
        )}
      </div>
    </div>
  );
}
