"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isRouteAllowed, ROLE_ROUTES } from "@/lib/permissions";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (userRole?.status === "pending" && pathname !== "/pending-approval") {
      router.replace("/pending-approval");
      return;
    }
    const role = userRole?.role ?? null;
    if (!isRouteAllowed(role, pathname)) {
      const hasAccessibleRoutes = role && ROLE_ROUTES[role]?.length > 0;
      router.replace(hasAccessibleRoutes ? "/production" : "/no-access");
    }
  }, [user, userRole, loading, router, pathname]);

  return <>{children}</>;
}
