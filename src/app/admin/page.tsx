"use client";

import { useState } from "react";
import Link from "next/link";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AdminPage() {
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState("");

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult("");
    try {
      const res = await fetch("/api/migrate-admins", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMigrateResult(`Done: ${data.message}`);
      } else {
        setMigrateResult(`Error: ${data.error}`);
      }
    } catch {
      setMigrateResult("Network error. Please try again.");
    } finally {
      setMigrating(false);
    }
  };

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
          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">Users</h2>
            <p className="text-sm text-gray-500 mt-1">Manage accounts, approvals, and roles</p>
          </Link>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="bg-white rounded-lg shadow-sm border border-amber-300 p-6 hover:shadow-md text-left disabled:opacity-50"
          >
            <h2 className="font-semibold text-gray-900">Migrate Admins</h2>
            <p className="text-sm text-gray-500 mt-1">
              {migrating ? "Running..." : "Grant access to all existing admin accounts"}
            </p>
            {migrateResult && (
              <p className="text-xs mt-2 text-gray-600">{migrateResult}</p>
            )}
          </button>
        </div>
      </div>
    </RouteGuard>
  );
}
