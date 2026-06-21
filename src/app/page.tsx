"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (user) {
      router.replace("/production");
    } else {
      router.replace("/login");
    }
  }, [loading, configured, user, router]);

  if (!configured) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-gray-500 text-sm">
        Firebase is not configured. Set up your <code className="bg-gray-100 px-1 rounded mx-1">.env.local</code> file and restart the dev server.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] text-gray-400">
      {loading ? "Loading..." : "Redirecting..."}
    </div>
  );
}
