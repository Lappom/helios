"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProgramRequest } from "@/lib/programs/api-client";

export function CreateProgramDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const program = await createProgramRequest({ name: name.trim() });
      toast.success("Programme créé");
      setOpen(false);
      setName("");
      router.push(`/coach/programs/${program.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de créer le programme",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-on-primary hover:bg-primary-active font-semibold">
          Nouveau programme
        </Button>
      </DialogTrigger>
      <DialogContent className="border-hairline bg-surface-card">
        <DialogHeader>
          <DialogTitle className="text-on-dark">Nouveau programme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="program-name"
              className="text-caption text-muted uppercase tracking-wide"
            >
              Nom
            </label>
            <Input
              id="program-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. PPL 3 jours"
              className="border-hairline bg-surface-elevated"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
            >
              {loading ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
