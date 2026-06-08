"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ClientListItem } from "@/lib/clients/service";
import { assignNutritionPlanRequest } from "@/lib/nutrition/api-client";
import { cn } from "@/lib/utils";

type AssignNutritionDialogProps = {
  planId: string;
  planName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
};

export function AssignNutritionDialog({
  planId,
  planName,
  open,
  onOpenChange,
  onAssigned,
}: AssignNutritionDialogProps) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingData(true);
    setSelectedIds([]);

    fetch("/api/v1/clients?limit=100")
      .then((response) => response.json())
      .then((payload: { items: ClientListItem[] }) => {
        setClients(payload.items ?? []);
      })
      .catch(() => {
        toast.error("Impossible de charger les clients.");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [open]);

  const assignableClients = useMemo(
    () =>
      clients.filter(
        (client) => client.status === "ACTIVE" || client.status === "TRIAL",
      ),
    [clients],
  );

  const filteredClients = useMemo(() => {
    if (!search.trim()) {
      return assignableClients;
    }

    const query = search.trim().toLowerCase();
    return assignableClients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        client.email.toLowerCase().includes(query)
      );
    });
  }, [assignableClients, search]);

  async function handleAssign() {
    if (selectedIds.length === 0) {
      toast.error("Sélectionnez au moins un client.");
      return;
    }

    setLoading(true);
    try {
      const result = await assignNutritionPlanRequest(planId, {
        clientIds: selectedIds,
        startDate: startDate.toISOString(),
      });

      if (result.created.length > 0) {
        toast.success(
          `Plan assigné à ${result.created.length} client(s).`,
        );
      }

      if (result.skipped.length > 0) {
        toast.message(
          `${result.skipped.length} client(s) ignoré(s) : ${result.skipped[0]?.reason}`,
        );
      }

      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Assignation impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface-card max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-on-dark">
            Assigner « {planName} »
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-hairline w-full justify-start"
              >
                Début : {startDate.toLocaleDateString("fr-FR")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-hairline bg-surface-card p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(date);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un client…"
            className="border-hairline bg-surface-elevated"
          />

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {loadingData ? (
              <p className="text-muted text-sm">Chargement…</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-muted text-sm">Aucun client assignable.</p>
            ) : (
              filteredClients.map((client) => {
                const checked = selectedIds.includes(client.id);
                return (
                  <label
                    key={client.id}
                    className={cn(
                      "border-hairline flex cursor-pointer items-center gap-3 rounded-md border p-3",
                      checked && "bg-surface-elevated",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedIds((prev) =>
                          value
                            ? [...prev, client.id]
                            : prev.filter((id) => id !== client.id),
                        );
                      }}
                    />
                    <div>
                      <p className="text-on-dark text-sm font-medium">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-muted text-xs">{client.email}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-hairline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
            disabled={loading}
            onClick={() => void handleAssign()}
          >
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
