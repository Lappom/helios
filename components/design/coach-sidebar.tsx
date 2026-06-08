"use client";

import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Bell,
  Calendar,
  ClipboardList,
  Dumbbell,
  FileQuestion,
  Flame,
  FolderOpen,
  LayoutDashboard,
  Library,
  Menu,
  MessageSquare,
  Play,
  Settings,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/exercises", label: "Exercices", icon: Library },
  { href: "/coach/programs", label: "Programmes", icon: Dumbbell },
  { href: "/coach/nutrition", label: "Nutrition", icon: Apple },
  { href: "/coach/messages", label: "Messages", icon: MessageSquare },
  { href: "/coach/drive", label: "Drive", icon: FolderOpen },
  { href: "/coach/videos", label: "Vidéothèque", icon: Play },
  { href: "/coach/notifications", label: "Notifications", icon: Bell },
  { href: "/coach/automations", label: "Automatisations", icon: Zap },
  { href: "/coach/assessments", label: "Bilans", icon: ClipboardList },
  { href: "/coach/questionnaires", label: "Questionnaires", icon: FileQuestion },
  { href: "/coach/calendar", label: "Agenda", icon: Calendar },
  { href: "/coach/habits", label: "Habitudes", icon: Flame },
  { href: "/coach/boutique", label: "Boutique", icon: Store },
  { href: "/coach/revenue", label: "Revenus", icon: TrendingUp },
  { href: "/coach/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
      })}
    </nav>
  );
}

export function CoachSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="bg-sidebar border-sidebar-border hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="border-sidebar-border border-b px-6 py-5">
          <Link href="/coach" className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Helios
          </Link>
          <p className="text-body-sm text-muted mt-1">Espace coach</p>
        </div>
        <NavLinks />
      </aside>

      <div className="border-sidebar-border bg-sidebar border-b px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="text-sidebar-foreground"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
          Menu
        </Button>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="bg-sidebar border-sidebar-border max-w-xs p-0">
          <DialogHeader className="border-sidebar-border border-b px-6 py-4">
            <DialogTitle className="text-sidebar-foreground">Navigation</DialogTitle>
          </DialogHeader>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
