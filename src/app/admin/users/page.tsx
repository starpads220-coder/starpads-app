"use client";

import { useState } from "react";
import { orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { UserRole, Employee } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCollectionQuery } from "@/hooks/use-firestore-query";

type Tab = "all" | "pending";

export default function AdminUsersPage() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useCollectionQuery<UserRole>("userRoles", [], {
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [] } = useCollectionQuery<Employee>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const displayedUsers = activeTab === "pending"
    ? users.filter((u) => u.status === "pending")
    : users;

  const handleApprove = async (uid: string) => {
    setActionLoading(uid);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action: "approve", adminUid: userRole?.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to approve user");
        return;
      }
      setActionSuccess("User approved successfully.");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: rejectTarget, action: "reject", adminUid: userRole?.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to reject user");
        return;
      }
      setActionSuccess("User rejected and removed.");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: deleteTarget, adminUid: userRole?.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to delete user");
        return;
      }
      setActionSuccess("User deleted successfully.");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  return (
    <RouteGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-md">
            {actionSuccess}
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(["all", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "all" ? "All Users" : "Pending"}
              {tab === "pending" && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                  {users.filter((u) => u.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usersLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : displayedUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {activeTab === "pending" ? "No pending approvals." : "No users found."}
                </td></tr>
              ) : displayedUsers.map((u) => {
                const linkedEmployee = employees.find((e) => e.id === u.employeeId);
                const isPending = u.status === "pending";
                return (
                  <tr key={u.uid} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        isPending
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {isPending ? "Pending" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {linkedEmployee ? `${linkedEmployee.name} (${linkedEmployee.department})` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleApprove(u.uid)}
                            disabled={actionLoading !== null}
                            className="py-1.5 px-4 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === u.uid ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => setRejectTarget(u.uid)}
                            disabled={actionLoading !== null}
                            className="py-1.5 px-4 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        u.uid !== userRole?.uid && (
                          <button onClick={() => setDeleteTarget(u.uid)}
                            className="text-sm text-red-500 hover:underline">
                            Delete
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ConfirmDialog
          open={rejectTarget !== null}
          title="Reject User"
          message="Are you sure you want to reject this user? This will permanently delete their account."
          confirmLabel="Reject"
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
          variant="danger"
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Delete User"
          message="Are you sure you want to delete this user? This will permanently remove their account and all associated data."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      </div>
    </RouteGuard>
  );
}
