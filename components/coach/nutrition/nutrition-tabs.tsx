"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/coach/nutrition/foods", label: "Aliments" },
  { href: "/coach/nutrition/recipes", label: "Recettes" },
  { href: "/coach/nutrition", label: "Plans", exact: true },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (href === "/coach/nutrition") {
    return (
      pathname === href ||
      pathname.startsWith("/coach/nutrition/plans")
    );
  }

  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NutritionTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-hairline flex flex-wrap gap-2 border-b pb-4">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href, tab.exact);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-surface-card hover:text-on-dark",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
