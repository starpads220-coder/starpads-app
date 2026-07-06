"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function NoAccessPage() {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          No Access
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Your account role does not have access to any pages in this application.
          Please contact an administrator if you believe this is a mistake.
        </p>
        <button
          onClick={logout}
          className="inline-block w-full py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
        >
          Sign Out
        </button>
        <div className="mt-3">
          <Link
            href="/login"
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
