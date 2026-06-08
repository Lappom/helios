"use client";

import { Barcode, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodListItem } from "@/lib/foods/types";

type FoodSearchBarProps = {
  onBarcodeFound: (food: FoodListItem) => void;
};

export function FoodSearchBar({ onBarcodeFound }: FoodSearchBarProps) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBarcodeLookup(event: React.FormEvent) {
    event.preventDefault();
    const code = barcode.trim();
    if (!code) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/foods/barcode/${encodeURIComponent(code)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.detail ?? "Code-barres introuvable.");
        return;
      }
      onBarcodeFound(payload);
      setBarcode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleBarcodeLookup}
      className="border-hairline bg-surface-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
    >
      <div className="text-muted flex items-center gap-2">
        <Search className="size-4" />
        <span className="text-body-sm">Recherche textuelle dans la barre latérale</span>
      </div>
      <div className="flex min-w-[240px] flex-1 items-center gap-2">
        <Barcode className="text-muted size-4 shrink-0" />
        <Input
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="Code-barres EAN"
          inputMode="numeric"
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !barcode.trim()}>
          {loading ? "Scan…" : "Scanner"}
        </Button>
      </div>
    </form>
  );
}
