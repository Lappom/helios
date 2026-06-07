import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-display-md text-on-dark font-bold tracking-tight">Helios</h1>
      <p className="text-body-md text-muted max-w-md text-center">
        Plateforme SaaS de coaching sportif — fondations P0.
      </p>
      <Link
        href="/_design"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
      >
        Design sandbox
      </Link>
    </main>
  );
}
