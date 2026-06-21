"use client";

import Link from "next/link";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AdminPage() {
  return (
    <RouteGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/employees"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">Employee Register</h2>
            <p className="text-sm text-gray-500 mt-1">Manage workers, roles, and wage rates</p>
          </Link>
          <Link
            href="/admin/targets"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">Target Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">Set per-stage and per-worker targets</p>
          </Link>
        </div>
      </div>
    </RouteGuard>
  );
}
