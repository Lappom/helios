"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patchReferralProgram } from "@/lib/referrals/api-client";
import type { ReferralProgramDto } from "@/lib/referrals/types";
import type { PromoDiscountType } from "@/lib/validators/checkout";

type ReferralProgramPanelProps = {
  initialProgram: ReferralProgramDto;
  onUpdated: (program: ReferralProgramDto) => void;
};

export function ReferralProgramPanel({
  initialProgram,
  onUpdated,
}: ReferralProgramPanelProps) {
  const [program, setProgram] = useState(initialProgram);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await patchReferralProgram({
        refereeDiscountType: program.refereeDiscountType,
        refereeDiscountValue: program.refereeDiscountValue,
        commissionType: program.commissionType,
        commissionValue: program.commissionValue,
        isActive: program.isActive,
      });
      setProgram(updated);
      onUpdated(updated);
      toast.success("Programme mis à jour");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewLabel =
    program.refereeDiscountType === "percent"
      ? `Filleul -${program.refereeDiscountValue} %`
      : `Filleul -${(program.refereeDiscountValue / 100).toFixed(0)} €`;
  const commissionLabel =
    program.commissionType === "percent"
      ? `Parrain +${program.commissionValue} %`
      : `Parrain +${(program.commissionValue / 100).toFixed(0)} €`;

  return (
    <div className="border-hairline bg-surface-card space-y-6 rounded-lg border p-6">
      <div>
        <h2 className="text-title-md text-on-dark font-semibold">Programme</h2>
        <p className="text-body-sm text-muted mt-1">
          Chaque client actif reçoit un code unique à partager.
        </p>
      </div>

      <div className="bg-surface-yellow-band text-on-yellow rounded-lg px-6 py-4">
        <p className="text-caption-uppercase tracking-widest uppercase">
          Aperçu
        </p>
        <p className="text-title-lg mt-1 font-bold">
          {previewLabel} → {commissionLabel}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-title-sm text-on-dark font-semibold">
            Réduction filleul
          </label>
          <Select
            value={program.refereeDiscountType}
            onValueChange={(value: PromoDiscountType) =>
              setProgram((prev) => ({
                ...prev,
                refereeDiscountType: value,
              }))
            }
          >
            <SelectTrigger className="bg-surface-elevated border-hairline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Pourcentage</SelectItem>
              <SelectItem value="fixed">Montant fixe (centimes)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={program.refereeDiscountValue}
            onChange={(e) =>
              setProgram((prev) => ({
                ...prev,
                refereeDiscountValue: Number(e.target.value),
              }))
            }
            className="bg-surface-elevated border-hairline"
          />
        </div>

        <div className="space-y-2">
          <label className="text-title-sm text-on-dark font-semibold">
            Commission parrain
          </label>
          <Select
            value={program.commissionType}
            onValueChange={(value: PromoDiscountType) =>
              setProgram((prev) => ({
                ...prev,
                commissionType: value,
              }))
            }
          >
            <SelectTrigger className="bg-surface-elevated border-hairline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Pourcentage du paiement</SelectItem>
              <SelectItem value="fixed">Montant fixe (centimes)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={program.commissionValue}
            onChange={(e) =>
              setProgram((prev) => ({
                ...prev,
                commissionValue: Number(e.target.value),
              }))
            }
            className="bg-surface-elevated border-hairline"
          />
        </div>
      </div>

      <label className="flex items-center gap-3">
        <Checkbox
          checked={program.isActive}
          onCheckedChange={(checked) =>
            setProgram((prev) => ({
              ...prev,
              isActive: checked === true,
            }))
          }
        />
        <span className="text-body-md text-on-dark">
          Programme actif (génère des codes pour les clients éligibles)
        </span>
      </label>

      <Button
        className="bg-primary text-on-primary hover:bg-primary-active"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? "Enregistrement…" : "Enregistrer le programme"}
      </Button>
    </div>
  );
}
