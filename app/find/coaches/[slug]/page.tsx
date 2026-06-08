import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CoachProfileHero } from "@/components/find/coach-profile-hero";
import { CoachServicesGrid } from "@/components/find/coach-services-grid";
import { getPublicCoachBySlug } from "@/lib/coach-profile/service";

type CoachProfilePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export async function generateMetadata({ params }: CoachProfilePageProps) {
  const { slug } = await params;

  try {
    const coach = await getPublicCoachBySlug(slug);
    const description =
      coach.bio?.slice(0, 160) ??
      `Profil public de ${coach.displayName} sur Helios Find.`;

    return {
      title: `${coach.displayName} — Coach Helios`,
      description,
      openGraph: {
        title: `${coach.displayName} — Coach Helios`,
        description,
        ...(coach.photoUrl ? { images: [{ url: coach.photoUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Coach introuvable — Helios Find" };
  }
}

export default async function CoachProfilePage({
  params,
  searchParams,
}: CoachProfilePageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;

  let coach;
  try {
    coach = await getPublicCoachBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <CoachProfileHero coach={coach} />

      <CoachServicesGrid
        services={coach.services}
        coachSlug={slug}
        referralCode={ref}
      />

      {coach.certifications.length > 0 ? (
        <section className="py-section bg-canvas">
          <div className="mx-auto max-w-7xl px-6">
            <div className="border-hairline bg-surface-card rounded-lg border p-8">
              <h2 className="text-display-sm text-on-dark mb-6 font-bold tracking-tight">
                Certifications
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {coach.certifications.map((certification) => (
                  <li
                    key={certification}
                    className="text-body-md text-body flex items-center gap-2"
                  >
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                    {certification}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {coach.services.some((s) => s.bookingEnabled) ? (
        <section className="py-section">
          <div className="mx-auto max-w-7xl px-6">
            <div className="bg-primary text-on-yellow rounded-lg px-8 py-16 text-center md:px-16">
              <h2 className="text-display-md mb-4 font-bold tracking-tight">
                Prêt à commencer ?
              </h2>
              <p className="text-body-md mx-auto mb-8 max-w-xl opacity-80">
                Réservez une séance en ligne avec {coach.displayName}.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-canvas text-on-dark hover:bg-canvas/90 h-10 px-5 font-semibold"
                asChild
              >
                <Link
                  href={`/find/coaches/${slug}/book/${coach.services.find((s) => s.bookingEnabled)!.id}`}
                >
                  Réserver une séance
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="pb-section mx-auto max-w-7xl px-6 text-center">
        <Button variant="ghost" asChild>
          <Link href="/find/coaches">← Retour à l&apos;annuaire</Link>
        </Button>
      </div>
    </>
  );
}
