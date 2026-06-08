"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiKeysPanel } from "./api-keys-panel";
import { ApiQuickstartCard } from "./api-quickstart-card";
import { WebhooksPanel } from "./webhooks-panel";
import type { ApiKeyListItem, WebhookListItem } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type IntegrationsPageClientProps = {
  initialApiKeys: ApiKeyListItem[];
  initialWebhooks: WebhookListItem[];
};

type Tab = "api-keys" | "webhooks";

export function IntegrationsPageClient({
  initialApiKeys,
  initialWebhooks,
}: IntegrationsPageClientProps) {
  const [tab, setTab] = useState<Tab>("api-keys");
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/coach/settings"
          className="text-body-sm text-muted hover:text-on-dark"
        >
          ← Paramètres
        </Link>
        <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
          Intégrations
        </h1>
        <p className="text-body-md text-muted mt-2">
          Clés API, webhooks sortants et connexion Zapier / Make.
        </p>
        <p className="text-body-sm text-muted mt-2">
          Consultez <code className="text-on-dark font-mono text-xs">docs/API.md</code>{" "}
          pour la référence complète des endpoints et recettes Zapier/Make.
        </p>
      </div>

      <ApiQuickstartCard
        onCreateKey={() => {
          setTab("api-keys");
          setCreateKeyDialogOpen(true);
        }}
      />

      <div className="border-hairline flex gap-1 rounded-lg border p-1">
        {(
          [
            ["api-keys", "Clés API"],
            ["webhooks", "Webhooks"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              tab === value
                ? "bg-primary text-on-primary"
                : "text-muted hover:text-on-dark",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "api-keys" ? (
        <ApiKeysPanel
          initialKeys={initialApiKeys}
          createDialogOpen={createKeyDialogOpen}
          onCreateDialogOpenChange={setCreateKeyDialogOpen}
        />
      ) : (
        <WebhooksPanel initialWebhooks={initialWebhooks} />
      )}
    </div>
  );
}
