"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isRouteAllowed } from "@/lib/permissions";
export function AccountsSwitcher() {
  const path = usePathname();
  const { userRole } = useAuth();
  const routes = path === "/sales"
    ? [["/sales", "Sales"], ["/accounts", "Accounts"]]
    : path === "/expenses"
      ? [["/expenses", "Expenses"], ["/accounts", "Accounts"]]
      : [["/sales", "Sales"], ["/expenses", "Expenses"], ["/accounts", "Accounts"]];

  return <nav aria-label="Financial screens" className="flex flex-wrap gap-2">{routes.filter(([href]) => isRouteAllowed(userRole?.role, href)).map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-medium ${path === href ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{label}</Link>)}</nav>;
}
