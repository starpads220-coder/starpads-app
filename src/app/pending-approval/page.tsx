"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function PendingApprovalPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (userRole && userRole.status === "active") {
      router.replace("/production");
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pending Approval
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Your account has been created and is awaiting approval from an administrator.
          You will be able to access the application once your account is approved.
        </p>
        <Link
          href="/login"
          className="inline-block py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
