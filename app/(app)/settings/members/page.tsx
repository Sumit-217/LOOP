"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const currentUserRole = session?.user?.role;
  const isAdmin = currentUserRole === Role.ADMIN;
  const currentUserId = session?.user?.id;

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load workspace members");
      }
      setMembers(data.members || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch members";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!isAdmin) return;

    setError(null);
    setSuccess(null);
    setUpdatingId(memberId);

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update member role");
      }

      setSuccess(`Role updated to ${newRole} successfully.`);
      // Update local state optimistically
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while updating role";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspace Members</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage teammates and assign role-based access permissions within this workspace.
          </p>
        </div>

        <button
          onClick={fetchMembers}
          disabled={isLoading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          {isLoading ? "Refreshing..." : "Refresh Members"}
        </button>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
          {success}
        </div>
      )}

      {!isAdmin && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
          Note: You are currently viewing as {currentUserRole}. Only Administrators can modify team member roles.
        </div>
      )}

      {/* Members Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <span className="inline-block h-4 w-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2 align-middle" />
            Loading workspace members...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No members found in this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Member</th>
                  <th className="py-3.5 px-4 sm:px-6">Email</th>
                  <th className="py-3.5 px-4 sm:px-6">Role</th>
                  <th className="py-3.5 px-4 sm:px-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {members.map((member) => {
                  const isSelf = member.id === currentUserId;
                  const isUpdating = updatingId === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-white flex items-center gap-2">
                        <span>{member.name}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-400 font-mono">
                        {member.email}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        {isAdmin ? (
                          <select
                            value={member.role}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleRoleChange(member.id, e.target.value as Role)
                            }
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none transition-colors cursor-pointer bg-slate-950 ${
                              member.role === Role.ADMIN
                                ? "border-purple-500/40 text-purple-300"
                                : member.role === Role.ANALYST
                                ? "border-blue-500/40 text-blue-300"
                                : "border-emerald-500/40 text-emerald-300"
                            } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                          >
                            <option value={Role.ADMIN} className="bg-slate-900 text-slate-200">ADMIN</option>
                            <option value={Role.ANALYST} className="bg-slate-900 text-slate-200">ANALYST</option>
                            <option value={Role.VIEWER} className="bg-slate-900 text-slate-200">VIEWER</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                              member.role === Role.ADMIN
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                                : member.role === Role.ANALYST
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
