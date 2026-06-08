"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AiCreditsQuotaBar } from "@/components/coach/billing/ai-credits-quota-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAiCredits, type AiCreditsResponse } from "@/lib/ai/api-client";
import { AI_CREDIT_COSTS } from "@/lib/billing/ai-credit-costs";

type CoachAiChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getMessageText(
  message: { parts: Array<{ type: string; text?: string }> },
): string {
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n");
}

export function CoachAiChatPanel({
  open,
  onOpenChange,
}: CoachAiChatPanelProps) {
  const [input, setInput] = useState("");
  const [credits, setCredits] = useState<AiCreditsResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/v1/ai/chat",
    }),
  });

  useEffect(() => {
    if (!open) return;

    void fetchAiCredits()
      .then(setCredits)
      .catch(() => setCredits(null));
  }, [open, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const insufficientCredits =
    credits != null &&
    credits.quota.limit !== Number.POSITIVE_INFINITY &&
    credits.quota.remaining < AI_CREDIT_COSTS.chat;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    if (insufficientCredits) return;

    setInput("");
    await sendMessage({ text });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-hairline bg-surface-card fixed top-0 right-0 left-auto flex h-full max-h-none w-full max-w-md translate-x-0 translate-y-0 flex-col rounded-none border-l p-0 sm:max-w-md"
        aria-label="Assistant IA coach"
      >
        <DialogHeader className="border-hairline shrink-0 border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-on-dark text-title-md">
                Assistant IA
              </DialogTitle>
              <p className="text-caption text-muted mt-1">
                {AI_CREDIT_COSTS.chat} crédit par message
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-muted hover:text-on-dark shrink-0"
              aria-label="Fermer l'assistant"
            >
              <X className="size-4" />
            </Button>
          </div>
          {credits ? (
            <div className="mt-3">
              <AiCreditsQuotaBar quota={credits.quota} compact />
            </div>
          ) : null}
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="border-hairline bg-surface-elevated rounded-lg border p-4">
              <p className="text-caption-uppercase text-muted tracking-widest uppercase">
                Terminal coach
              </p>
              <p className="text-body-sm text-body mt-2 font-mono">
                Posez une question sur la programmation, la périodisation ou
                l&apos;accompagnement client.
              </p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "border-hairline bg-surface-elevated ml-8 rounded-lg border px-3 py-2"
                  : "border-hairline bg-surface-card mr-4 rounded-lg border px-3 py-2"
              }
            >
              <p className="text-caption-uppercase text-muted mb-1 tracking-widest uppercase">
                {message.role === "user" ? "Vous" : "Assistant"}
              </p>
              <p className="text-body-sm text-on-dark whitespace-pre-wrap font-mono">
                {getMessageText(message)}
              </p>
            </div>
          ))}

          {(status === "streaming" || status === "submitted") && (
            <p className="text-caption text-primary animate-pulse">
              Réponse en cours…
            </p>
          )}

          {error ? (
            <p className="text-body-sm text-accent-rose">{error.message}</p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-hairline shrink-0 border-t p-4"
        >
          {insufficientCredits ? (
            <p className="text-caption text-accent-rose mb-2">
              Crédits IA épuisés pour ce mois.
            </p>
          ) : null}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Votre question…"
              rows={2}
              className="border-hairline bg-surface-elevated text-body-sm text-on-dark placeholder:text-muted-soft focus:border-primary/60 min-h-[44px] flex-1 resize-none rounded-md border px-3 py-2 font-mono outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event);
                }
              }}
            />
            <Button
              type="submit"
              disabled={
                !input.trim() ||
                status === "streaming" ||
                status === "submitted" ||
                insufficientCredits
              }
              className="bg-primary text-on-primary hover:bg-primary-active shrink-0 self-end font-semibold"
            >
              Envoyer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
