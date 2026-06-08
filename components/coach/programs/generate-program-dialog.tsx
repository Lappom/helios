"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiCreditsQuotaBar } from "@/components/coach/billing/ai-credits-quota-bar";
import { FeatureGate } from "@/components/billing/feature-gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchAiCredits,
  generateProgramRequest,
  type AiCreditsResponse,
} from "@/lib/ai/api-client";
import { AI_CREDIT_COSTS } from "@/lib/billing/ai-credit-costs";

function GenerateSkeleton() {
  return (
    <div className="space-y-3">
      {["Semaine 1", "Semaine 2", "Semaine 3"].map((label) => (
        <div
          key={label}
          className="border-hairline bg-surface-elevated rounded-md border p-4"
        >
          <div className="bg-surface-card mb-3 h-3 w-24 animate-pulse rounded" />
          <div className="bg-surface-card h-2 w-full animate-pulse rounded" />
          <div className="bg-surface-card mt-2 h-2 w-4/5 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-elevated rounded-lg border p-6 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Génération IA — plan Pro+
      </p>
      <p className="text-body-sm text-muted mt-2">
        La génération automatique de programmes nécessite la fonctionnalité IA
        avancée, disponible à partir du plan Pro.
      </p>
      <Button
        asChild
        className="bg-primary text-on-primary hover:bg-primary-active mt-4 font-semibold"
      >
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

function GenerateProgramForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<AiCreditsResponse | null>(null);

  useEffect(() => {
    if (!open) return;

    void fetchAiCredits()
      .then(setCredits)
      .catch(() => setCredits(null));
  }, [open]);

  const insufficientCredits =
    credits != null &&
    credits.quota.limit !== Number.POSITIVE_INFINITY &&
    credits.quota.remaining < AI_CREDIT_COSTS.generateProgram;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || loading || insufficientCredits) return;

    setLoading(true);
    try {
      const result = await generateProgramRequest({ prompt: prompt.trim() });

      if (result.unresolvedExercises.length > 0) {
        toast.warning(
          `${result.unresolvedExercises.length} exercice(s) non trouvé(s) — complétez le brouillon dans l'éditeur.`,
        );
      } else {
        toast.success("Brouillon généré");
      }

      setOpen(false);
      setPrompt("");
      router.push(`/coach/programs/${result.program.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Génération impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-hairline-strong text-on-dark hover:bg-surface-elevated font-semibold"
        >
          <Sparkles className="mr-2 size-4" />
          Générer avec IA
        </Button>
      </DialogTrigger>
      <DialogContent className="border-hairline bg-surface-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-on-dark">
            Générer un programme
          </DialogTitle>
        </DialogHeader>

        {credits ? (
          <AiCreditsQuotaBar quota={credits.quota} />
        ) : null}

        {loading ? (
          <GenerateSkeleton />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="ai-program-prompt"
                className="text-caption text-muted uppercase tracking-wide"
              >
                Décrivez le programme
              </label>
              <textarea
                id="ai-program-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex. Programme PPL 3 jours par semaine, force, 4 semaines, niveau intermédiaire, accès salle complète…"
                rows={6}
                className="border-hairline bg-surface-elevated text-body-md text-on-dark placeholder:text-muted-soft focus:border-primary/60 w-full resize-y rounded-md border px-3 py-2 font-mono outline-none"
                autoFocus
              />
              <p className="text-caption text-muted-soft">
                Soyez précis sur objectifs, fréquence, niveau et matériel
                disponible.
              </p>
            </div>

            {insufficientCredits ? (
              <p className="text-body-sm text-accent-rose">
                Crédits insuffisants ({AI_CREDIT_COSTS.generateProgram}{" "}
                requis).{" "}
                <Link
                  href="/coach/settings"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Voir l&apos;usage
                </Link>
              </p>
            ) : null}

            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-muted">
                Coût : {AI_CREDIT_COSTS.generateProgram} crédits
              </p>
              <Button
                type="submit"
                disabled={loading || !prompt.trim() || insufficientCredits}
                className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
              >
                {loading ? "Génération…" : "Générer le brouillon"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GenerateProgramDialog() {
  return (
    <FeatureGate feature="advanced_ai" fallback={<UpgradeFallback />}>
      <GenerateProgramForm />
    </FeatureGate>
  );
}
