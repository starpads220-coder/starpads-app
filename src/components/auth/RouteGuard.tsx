"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isRouteAllowed, ROLE_ROUTES } from "@/lib/permissions";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, roleLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roleLoaded) return;
    if (userRole?.status === "pending" && pathname !== "/pending-approval") {
      router.replace("/pending-approval");
      return;
    }
    const role = userRole?.role ?? null;
    if (!isRouteAllowed(role, pathname)) {
      const hasAccessibleRoutes = role && ROLE_ROUTES[role]?.length > 0;
      router.replace(hasAccessibleRoutes ? "/production" : "/no-access");
    }
  }, [user, userRole, loading, roleLoaded, router, pathname]);

  if (user && !loading && !roleLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
