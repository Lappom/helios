import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PricingTierCardProps = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  featured?: boolean;
  ctaLabel?: string;
  className?: string;
};

export function PricingTierCard({
  name,
  price,
  period = "/mois",
  description,
  features,
  featured = false,
  ctaLabel = "Choisir",
  className,
}: PricingTierCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-lg p-8",
        featured
          ? "bg-primary text-on-yellow"
          : "border border-hairline bg-surface-card text-on-dark",
        className,
      )}
    >
      <h3 className="text-title-lg mb-2">{name}</h3>
      <p className={cn("text-body-sm mb-6", featured ? "opacity-80" : "text-muted")}>
        {description}
      </p>
      <div className="mb-6">
        <span className="text-display-sm">{price}</span>
        <span className={cn("text-body-sm", featured ? "opacity-80" : "text-muted")}>
          {period}
        </span>
      </div>
      <ul className="mb-8 flex flex-1 flex-col gap-2">
        {features.map((feature) => (
          <li key={feature} className="text-body-sm">
            {feature}
          </li>
        ))}
      </ul>
      <Button
        variant={featured ? "secondary" : "default"}
        className={cn(
          "h-10 w-full font-semibold",
          featured && "bg-canvas text-on-dark hover:bg-canvas/90",
        )}
      >
        {ctaLabel}
      </Button>
    </article>
  );
}
