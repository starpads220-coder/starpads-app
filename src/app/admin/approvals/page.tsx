"use client";

import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AdminApprovalsPage() {
  const { userRole } = useAuth();

  return (
    <RouteGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <p>This page has been moved. Please go to <a href="/admin/users" className="text-stock-blue hover:underline">Users</a> to manage approvals.</p>
        </div>
      </div>
    </RouteGuard>
  );
}
