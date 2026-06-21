"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ROLE_ROUTES } from "@/lib/permissions";
import { EmployeeRole } from "@/types";
import { GooeyNav } from "@/components/ui/GooeyNav";

const ALL_NAV_ITEMS = [
  { href: "/production", label: "Production" },
  { href: "/storage", label: "Storage" },
  { href: "/sales", label: "Sales" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payments", label: "Payments" },
  { href: "/analytics", label: "Analytics" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/targets", label: "Targets" },
  { href: "/admin/users", label: "Users" },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, userRole, logout } = useAuth();

  if (!user) return null;

  const allowedRoutes = ROLE_ROUTES[(userRole?.role ?? "") as EmployeeRole] ?? [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedRoutes.includes(item.href));

  return (
    <header className="sticky top-0 z-40 w-full pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-black/90 border border-gray-800 backdrop-blur-lg p-1 rounded-full shadow-xl shadow-black/30">
        <div className="flex items-center justify-between h-12 pl-4 pr-1">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-base font-bold text-white whitespace-nowrap hover:text-gray-300 transition-colors pl-1"
            >
              Star Durable Pads
            </Link>
            <div className="hidden md:block">
              <GooeyNav items={navItems} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="text-sm font-semibold px-4 py-1.5 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Profile Settings
            </Link>
            <button
              onClick={logout}
              className="text-sm font-semibold px-5 py-1.5 rounded-full text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-2 py-1 text-xs font-medium ${
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
