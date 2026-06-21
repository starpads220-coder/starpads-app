import React from "react";

interface ChartCardBadge {
  label: string;
  value: string | number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "colored" | "glass";
  accentColor?: string;
  badge?: ChartCardBadge;
  action?: React.ReactNode;
  footerContent?: React.ReactNode;
  headerDivider?: boolean;
}

const badgeColorMap: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-purple-50 text-purple-700",
  pink: "bg-pink-50 text-pink-700",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
};

export function ChartCard({
  title,
  subtitle,
  loading = false,
  children,
  headerContent,
  className = "",
  variant = "default",
  accentColor,
  badge,
  action,
  footerContent,
  headerDivider = true,
}: ChartCardProps) {
  const variantStyles = {
    default: "bg-white border-gray-200",
    gradient: "bg-gradient-to-br from-white to-gray-50 border-gray-200",
    colored: "bg-white border-gray-200",
    glass: "bg-white/80 backdrop-blur-sm border-gray-100",
  };

  return (
    <div
      className={`rounded-2xl shadow-sm border flex flex-col ${variantStyles[variant]} ${className}`}
      style={variant === "colored" && accentColor ? { borderTopColor: accentColor, borderTopWidth: 3 } : undefined}
    >
      <div className={`flex items-center justify-between px-5 py-4 ${headerDivider ? "border-b border-gray-100" : ""}`}>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {badge && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColorMap[badge.color as keyof typeof badgeColorMap] || "bg-blue-50 text-blue-700"}`}>
              {badge.label}: {badge.value}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerContent && <div>{headerContent}</div>}
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col relative min-h-[200px]">
        {loading ? (
          <div className="absolute inset-0 m-5 rounded-lg bg-gray-50 animate-pulse border border-gray-100" />
        ) : (
          children
        )}
      </div>
      {footerContent && (
        <div className="px-5 py-3 border-t border-gray-100">{footerContent}</div>
      )}
    </div>
  );
}
