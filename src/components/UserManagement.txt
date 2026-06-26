import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Key, UserX, UserCheck, Shield, Trash2 } from 'lucide-react';

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
  }, []);

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
    if (editUser && editUser.username === "admin" && role !== "admin") {
      onAlert("The role of the 'admin' user cannot be changed under any circumstance.", "error");
      return;
    }
    try {
      if (editUser) {
        const res = await fetch(`/api/users/${editUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ role, password: password || undefined })
        });
        if (!res.ok) {
          let errMsg = "Failed to update user";
          try {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } catch {
            try {
              errMsg = await res.text() || errMsg;
            } catch {}
          }
          throw new Error(errMsg);
        }
        onAlert("User updated successfully", "success");
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ username, password, role })
        });
        if (!res.ok) {
          let errMsg = "Failed to create user";
          try {
            const errData = await res.json();
            errMsg = errData.message || errData.error || errMsg;
          } catch {
            try {
              errMsg = await res.text() || errMsg;
            } catch {}
          }
          throw new Error(errMsg);
        }
        onAlert("User created successfully", "success");
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  const toggleStatus = async (user: User) => {
    if (user.username === "admin" || user.username?.toLowerCase() === "admin") {
      onAlert("The administrator account cannot be deleted or modified.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      if (!res.ok) {
        let errMsg = "Failed to update status";
        try {
          const errData = await res.json();
          errMsg = errData.message || errData.error || errMsg;
        } catch {
          try {
            errMsg = await res.text() || errMsg;
          } catch {}
        }
        throw new Error(errMsg);
      }
      fetchUsers();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  const handleDelete = async (user: User) => {
    if (user.username === "admin" || user.username?.toLowerCase() === "admin") {
      onAlert("The administrator account cannot be deleted or modified.", "error");
      return;
    }
    if (window.confirm("Are you sure you want to remove this user?")) {
      await executeDelete(user);
    }
  };

  const executeDelete = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        let errMsg = "Failed to delete user";
        try {
          const errData = await res.json();
          errMsg = errData.message || errData.error || errMsg;
        } catch {
          try {
            errMsg = await res.text() || errMsg;
          } catch {}
        }
        throw new Error(errMsg);
      }
      onAlert("User removed successfully", "success");
      fetchUsers();
    } catch (err: any) {
      onAlert(err.message, "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-slate-50"><Users className="h-6 w-6 text-[#1b365d] dark:text-indigo-400" /> User Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage system access, roles, and credentials.</p>
        </div>
        <button 
          onClick={() => { setEditUser(null); setUsername(""); setPassword(""); setRole("teacher"); setShowModal(true); }}
          className="bg-[#1b365d] dark:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#152a4a] dark:hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-semibold">
            <tr>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {users.map((u, idx) => {
              const isEven = idx % 2 === 0;
              const rowBg = isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/10";
              const isAdmin = u.username === "admin";
              return (
                <tr key={u.id} className={`${rowBg} hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors`}>
                  <td className="bg-transparent px-6 py-4 font-medium text-gray-900 dark:text-slate-100">{u.username}</td>
                  <td className="bg-transparent px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      u.role === 'admin' 
                        ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="bg-transparent px-6 py-4">
                    {u.isActive ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium text-xs">
                        <UserCheck className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      <span className="text-red-500 dark:text-rose-400 flex items-center gap-1 font-medium text-xs">
                        <UserX className="h-4 w-4" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="bg-transparent px-6 py-4">
                    <div className="flex justify-end gap-3 items-center">
                      <button onClick={() => { setEditUser(u); setUsername(u.username); setPassword(""); setRole(u.role); setShowModal(true); }} className="text-gray-400 dark:text-slate-400 hover:text-[#1b365d] dark:hover:text-white transition-colors cursor-pointer" title="Edit User & Reset Password">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleStatus(u)} disabled={isAdmin} className={`transition-opacity cursor-pointer ${isAdmin ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'} ${u.isActive ? 'text-red-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`} title={isAdmin ? "Cannot disable admin" : (u.isActive ? "Disable User" : "Enable User")}>
                        {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(u)} disabled={isAdmin} className={`transition-colors cursor-pointer ${isAdmin ? 'text-gray-200 dark:text-slate-800 cursor-not-allowed' : 'text-red-500 hover:text-red-700 dark:text-rose-400 dark:hover:text-rose-300'}`} title={isAdmin ? "Cannot delete admin" : "Delete User"}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100">{editUser ? 'Edit User / Reset Password' : 'Create New User'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username</label>
                <input required={!editUser} disabled={!!editUser} type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{editUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                <input required={!editUser} type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                <select value={role} disabled={editUser?.username === "admin"} onChange={e => setRole(e.target.value)} className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:opacity-60">
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1b365d] dark:bg-indigo-600 hover:bg-[#152a4a] dark:hover:bg-indigo-700 text-white rounded-lg">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
