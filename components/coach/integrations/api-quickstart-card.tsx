"use client";

type ApiQuickstartCardProps = {
  onCreateKey: () => void;
};

export function ApiQuickstartCard({ onCreateKey }: ApiQuickstartCardProps) {
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/integrations/public`
      : "https://helios.lappom.fr/api/v1/integrations/public";

  return (
    <div className="border-hairline bg-surface-card rounded-lg border p-6">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        Démarrage rapide
      </p>
      <p className="text-body-sm text-muted mt-2">
        Authentifiez vos requêtes avec{" "}
        <code className="text-on-dark font-mono text-sm">
          Authorization: Bearer hls_...
        </code>
      </p>
      <pre className="border-hairline bg-canvas text-body-sm text-body mt-4 overflow-x-auto rounded-md border p-4 font-mono">
        {`curl "${baseUrl}/clients" \\
  -H "Authorization: Bearer hls_VOTRE_CLE"`}
      </pre>
      <button
        type="button"
        onClick={onCreateKey}
        className="bg-primary text-on-primary hover:bg-primary-active mt-4 inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition-colors"
      >
        Créer une clé API
      </button>
    </div>
  );
}
