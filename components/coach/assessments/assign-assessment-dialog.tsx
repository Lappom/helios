"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAssessmentRequest,
  fetchAssessmentTemplates,
} from "@/lib/assessments/api-client";
import type { AssessmentTemplateListItem } from "@/lib/assessments/types";

type AssignAssessmentDialogProps = {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
};

export function AssignAssessmentDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onAssigned,
}: AssignAssessmentDialogProps) {
  const [templates, setTemplates] = useState<AssessmentTemplateListItem[]>(
    [],
  );
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    fetchAssessmentTemplates()
      .then((payload) => {
        setTemplates(payload.items);
        const defaultTemplate =
          payload.items.find((item) => item.isDefault) ?? payload.items[0];
        setTemplateId(defaultTemplate?.id ?? "");
      })
      .catch(() => toast.error("Impossible de charger les templates."))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleAssign() {
    if (!templateId) {
      toast.error("Sélectionnez un template.");
      return;
    }

    setAssigning(true);
    try {
      await createAssessmentRequest({ clientId, templateId });
      toast.success(`Bilan assigné à ${clientName}.`);
      onOpenChange(false);
      onAssigned?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner un bilan</DialogTitle>
        </DialogHeader>
        <p className="text-muted text-sm">
          Client : <span className="text-on-dark">{clientName}</span>
        </p>
        {loading ? (
          <p className="text-muted text-sm">Chargement…</p>
        ) : (
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={assigning || !templateId}>
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
