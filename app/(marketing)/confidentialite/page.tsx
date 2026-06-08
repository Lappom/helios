export default function ConfidentialitePage() {
  return (
    <main className="bg-canvas text-on-dark mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-display-sm font-bold tracking-tight">
        Politique de confidentialité
      </h1>
      <p className="text-body-md text-muted mt-6">
        Helios traite les données personnelles des coaches et de leurs clients
        dans le cadre du service de coaching sportif. Les données sont hébergées
        en Europe. Les clients peuvent exporter ou supprimer leurs données depuis
        le portail (« Compte »). Les coaches peuvent exercer ces droits pour leurs
        clients depuis la fiche client.
      </p>
      <p className="text-body-md text-muted mt-4">
        Chiffrement AES-256 au repos (Neon, Vercel Blob), hébergement EU, DPA
        signés avec nos sous-traitants (Clerk, Vercel, Neon, Resend, Ably,
        Upstash). Détails techniques : <code>docs/COMPLIANCE.md</code> dans le
        dépôt.
      </p>
    </main>
  );
}
