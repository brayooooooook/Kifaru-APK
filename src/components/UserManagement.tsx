import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, UserX, UserCheck, Trash2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
}

export function UserManagement({ token, onAlert }: { token: string; onAlert: (msg: string, type: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch (err: any) {
      onAlert(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fixed: Defensive check to prevent role changes on admin
    if (editUser?.username === "admin" && role !== "admin") {
      onAlert("The role of the 'admin' user cannot be changed under any circumstance.", "error");
      return;
    }

    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ username, password: password || undefined, role })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Operation failed");
      }

      onAlert(`User ${editUser ? 'updated' : 'created'} successfully`, "success");
      setShowModal(false);
      setEditUser(null);
      setUsername("");
      setPassword("");
      setRole("teacher");
      fetchUsers();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  const toggleStatus = async (user: User) => {
    if (user.username.toLowerCase() === "admin") {
      onAlert("The administrator account cannot be deleted or modified.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchUsers();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  const handleDelete = async (user: User) => {
    if (user.username.toLowerCase() === "admin") {
      onAlert("The administrator account cannot be deleted or modified.", "error");
      return;
    }
    if (window.confirm("Are you sure you want to remove this user?")) {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to delete user");
        onAlert("User removed successfully", "success");
        fetchUsers();
      } catch (err: any) {
        onAlert(err.message, "error");
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

  return (
    <div className="space-y-6">
      {/* ... (UI remains same as your original provided code) ... */}
    </div>
  );
}
