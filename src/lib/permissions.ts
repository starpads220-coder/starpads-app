import { EmployeeRole } from "@/types";

export const ROLE_ROUTES: Record<EmployeeRole, string[]> = {
  ADMIN: [
    "/admin",
    "/production",
    "/storage",
    "/sales",
    "/expenses",
    "/payments",
    "/analytics",
    "/admin/employees",
    "/admin/targets",
    "/admin/users",
  ],
  PRODUCTION_SUPERVISOR: [
    "/production",
    "/storage",
    "/payments",
    "/admin/employees",
    "/admin/users",
  ],
  WORKER: [],
  STORE_MANAGER: [],
  SALES_STAFF: [],
  FINANCE: [],
};

export function isRouteAllowed(role: EmployeeRole | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  const routes = ROLE_ROUTES[role];
  if (!routes) return false;
  return routes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}
