"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function ProfilePage() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <RouteGuard>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </RouteGuard>
    );
  }

  if (!user) {
    return (
      <RouteGuard>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
          No authenticated user found.
        </div>
      </RouteGuard>
    );
  }

  // Format created date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to format role names beautifully
  const formatRole = (role?: string) => {
    if (!role) return "No Role Assigned";
    return role
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <RouteGuard>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/production"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Card Header Background Gradient */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8 text-white relative">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white/20 shadow-md">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Profile Settings</h1>
                <p className="text-sm text-gray-400 mt-1">Manage and view your system account details</p>
              </div>
            </div>
          </div>

          {/* User Details Details Section */}
          <div className="p-6 divide-y divide-gray-100">
            {/* Account Details */}
            <div className="pb-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Account Information</h2>
              
              <div className="space-y-4">
                {/* Email Address */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Email Address</span>
                    <span className="text-sm font-semibold text-gray-900">{user.email}</span>
                  </div>
                </div>

                {/* Role / Permissions */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">User Role / Level</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-2 mt-0.5">
                      {formatRole(userRole?.role)}
                      {userRole?.role === "ADMIN" && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                          System Admin
                        </span>
                      )}
                      {userRole?.role === "PRODUCTION_SUPERVISOR" && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                          Supervisor
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Account Status */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h2l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Account Status</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-2 mt-0.5">
                      {userRole?.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending Approval
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Employee ID */}
                {userRole?.employeeId && (
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m0-4a2 2 0 00-2 2m0 0a2 2 0 002 2m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-medium text-gray-500 uppercase">Linked Employee ID</span>
                      <span className="text-sm font-mono font-semibold text-gray-900">{userRole.employeeId}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Metadata Details */}
            <div className="pt-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Metadata & Session</h2>
              
              <div className="space-y-4">
                {/* Account Created At */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Account Registered On</span>
                    <span className="text-sm font-semibold text-gray-900">{formatDate(userRole?.createdAt)}</span>
                  </div>
                </div>

                {/* User UID */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Security Identifier (UID)</span>
                    <span className="text-xs font-mono text-gray-600 select-all">{user.uid}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
