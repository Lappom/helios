import Link from "next/link";
import { cn } from "@/lib/utils";

const footerColumns = [
  {
    title: "Produit",
    links: ["Programmes", "Nutrition", "Bilans", "Messagerie"],
  },
  {
    title: "Ressources",
    links: ["Documentation", "Blog", "Support", "Statut"],
  },
  {
    title: "Entreprise",
    links: ["À propos", "Tarifs", "Contact", "Carrières"],
  },
  {
    title: "Légal",
    links: ["Confidentialité", "CGU", "Cookies"],
  },
];

type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("border-t border-hairline bg-canvas py-16", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-lg font-bold text-on-dark">Helios</div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-caption-uppercase text-on-dark mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      href={
                        link === "Tarifs"
                          ? "/tarifs"
                          : link === "Confidentialité"
                            ? "/confidentialite"
                            : "#"
                      }
                      className="text-body-sm text-muted hover:text-body"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-body-sm text-muted-soft mt-12">
          © {new Date().getFullYear()} Helios. Sandbox design — retirer avant prod.
        </p>
      </div>
    </footer>
  );
}
