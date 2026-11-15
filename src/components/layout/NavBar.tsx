"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_ROUTES } from "@/lib/permissions";
import { EmployeeRole } from "@/types";
import { GooeyNav } from "@/components/ui/GooeyNav";

const ALL_NAV_ITEMS = [
  { href: "/production", label: "Production" },
  { href: "/storage", label: "Storage" },
  { href: "/sales", label: "Sales" },
  { href: "/expenses", label: "Expenses" },
  { href: "/banking", label: "Banking" },
  { href: "/payments", label: "Payments" },
  { href: "/analytics", label: "Analytics" },
  { href: "/profit", label: "Profit" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/targets", label: "Targets" },
  { href: "/admin/users", label: "Users" },
];

const AUTH_PAGES = ["/login", "/signup", "/reset-password", "/no-access"];

export function NavBar() {
  const pathname = usePathname();
  const { user, userRole, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user || loggingOut || AUTH_PAGES.includes(pathname)) return null;

  const allowedRoutes = ROLE_ROUTES[(userRole?.role ?? "") as EmployeeRole] ?? [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedRoutes.includes(item.href));
  const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";

  return (
    <header className="sticky top-0 z-40 mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
      <div className="bg-black/90 border border-gray-800 backdrop-blur-lg p-1 rounded-full shadow-xl shadow-black/30">
        <div className="flex h-12 min-w-0 items-center pl-4 pr-1">
          <Link
            href="/"
            className="text-base font-bold text-white whitespace-nowrap hover:text-gray-300 transition-colors pl-1"
          >
            Star Durable Pads
          </Link>
          <div className={`min-w-0 flex-1 ${isSupervisor ? "flex justify-center" : "ml-3"}`}>
            <div className="hidden w-full xl:block">
              <GooeyNav items={navItems} />
            </div>
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-1.5">
            <Link
              href="/profile"
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-white 2xl:px-4 2xl:text-sm"
            >
              <span className="2xl:hidden">Profile</span><span className="hidden 2xl:inline">Profile Settings</span>
            </Link>
            <button
              onClick={async () => {
                setLoggingOut(true);
                await logout();
              }}
              className="whitespace-nowrap rounded-full bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white 2xl:px-5 2xl:text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-x-auto border-t border-gray-200 bg-white xl:hidden">
        <div className="flex min-w-max gap-1 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center rounded-md px-2 py-1 text-xs font-medium ${
                pathname.startsWith(item.href)
                  ? "text-gray-900"
                  : "text-gray-400"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
