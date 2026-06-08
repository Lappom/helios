"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { testAutomationRequest } from "@/lib/automations/api-client";
import type { AutomationTestResult } from "@/lib/automations/types";

type TestRunDialogProps = {
  automationId: string;
};

export function TestRunDialog({ automationId }: TestRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [result, setResult] = useState<AutomationTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    try {
      const preview = await testAutomationRequest(automationId, {
        clientId: clientId.trim() || undefined,
      });
      setResult(preview);
      toast.success("Dry-run terminé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Test impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Tester
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dry-run automatisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="ID client (optionnel)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <Button onClick={handleTest} disabled={loading}>
            Lancer le test
          </Button>
          {result ? (
            <pre className="border-hairline bg-surface-elevated text-body-sm max-h-64 overflow-auto rounded-lg border p-4 font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
