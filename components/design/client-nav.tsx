"use client";

import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Calendar,
  Flame,
  FolderOpen,
  Home,
  MessageSquare,
  TrendingUp,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  feature?: string;
};

const navItems: NavItem[] = [
  { href: "/client", label: "Accueil", icon: Home, exact: true },
  { href: "/client/program", label: "Programme", icon: Dumbbell },
  { href: "/client/nutrition", label: "Nutrition", icon: Apple },
  { href: "/client/bookings", label: "RDV", icon: Calendar },
  { href: "/client/habits", label: "Habitudes", icon: Flame, feature: "habits" },
  { href: "/client/progress", label: "Progrès", icon: TrendingUp },
  { href: "/client/messages", label: "Messages", icon: MessageSquare },
  { href: "/client/drive", label: "Documents", icon: FolderOpen },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item);
  const Icon = item.icon;

  if (variant === "bottom") {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
          active ? "text-primary" : "text-muted",
        )}
      >
        <Icon className="size-5" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function ClientNav() {
  return (
    <>
      <aside className="bg-sidebar border-sidebar-border hidden w-56 shrink-0 border-r md:flex md:flex-col">
        <div className="border-sidebar-border border-b px-6 py-5">
          <p className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Mon espace
          </p>
          <p className="text-body-sm text-muted mt-1">Portail client</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) =>
            item.feature ? (
              <Show key={item.href} when={{ feature: item.feature }}>
                <NavLink item={item} variant="sidebar" />
              </Show>
            ) : (
              <NavLink key={item.href} item={item} variant="sidebar" />
            ),
          )}
        </nav>
      </aside>

      <nav className="border-hairline bg-surface-card fixed inset-x-0 bottom-0 z-50 flex border-t md:hidden">
        {navItems.map((item) =>
          item.feature ? (
            <Show key={item.href} when={{ feature: item.feature }}>
              <NavLink item={item} variant="bottom" />
            </Show>
          ) : (
            <NavLink key={item.href} item={item} variant="bottom" />
          ),
        )}
      </nav>
    </>
  );
}
