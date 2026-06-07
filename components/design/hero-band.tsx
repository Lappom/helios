import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroBandProps = {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  className?: string;
  children?: React.ReactNode;
};

export function HeroBand({
  title,
  subtitle,
  ctaLabel = "Commencer",
  className,
  children,
}: HeroBandProps) {
  return (
    <section className={cn("py-section bg-canvas", className)}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-display-lg text-on-dark mb-6">{title}</h1>
          <p className="text-body-md text-body mb-8 max-w-xl">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="h-10 px-5 font-semibold">
              {ctaLabel}
            </Button>
            <Button variant="secondary" size="lg" className="h-10 px-5">
              Voir la démo
            </Button>
          </div>
        </div>
        <div className="lg:col-span-5">
          {children ?? (
            <div className="rounded-lg border border-hairline bg-surface-card p-6 font-mono text-sm">
              <div className="text-muted-soft mb-4 text-xs uppercase tracking-wider">
                Session du jour
              </div>
              <pre className="text-accent-blue overflow-x-auto whitespace-pre-wrap">
                {`SELECT client, program, status
FROM helios.sessions
WHERE coach_id = 'you'
  AND date = today();`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
