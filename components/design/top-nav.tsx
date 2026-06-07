import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#", label: "Produit" },
  { href: "#", label: "Tarifs" },
  { href: "#", label: "Ressources" },
  { href: "#", label: "Clients" },
];

type TopNavProps = {
  className?: string;
};

export function TopNav({ className }: TopNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 border-b border-hairline bg-canvas",
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-on-dark">
          Helios
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-body hover:text-on-dark"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-body hover:text-on-dark">
            Connexion
          </Button>
          <Button size="lg" className="h-10 px-5 font-semibold">
            Commencer
          </Button>
        </div>
      </div>
    </header>
  );
}
