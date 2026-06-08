"use client";

import { useRef, useState } from "react";
import { EyeOff, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { ExerciseFormDialog } from "@/components/coach/exercises/exercise-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PlanTier } from "@/lib/auth/types";
import {
  labelEquipment,
  labelExerciseType,
  labelMuscle,
} from "@/lib/exercises/constants";
import type { ExerciseCategoryItem, ExerciseListItem } from "@/lib/exercises/types";

type ExercisePreviewModalProps = {
  exercise: ExerciseListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "coach" | "client";
  planTier?: PlanTier;
  categories?: ExerciseCategoryItem[];
  onUpdated?: (exercise: ExerciseListItem) => void;
  onCategoriesChange?: () => void;
};

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (!match?.[1]) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}

export function ExercisePreviewModal({
  exercise,
  open,
  onOpenChange,
  mode = "coach",
  planTier = "STARTER",
  categories = [],
  onUpdated,
  onCategoriesChange,
}: ExercisePreviewModalProps) {
  const aliasRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (!exercise) return null;

  const youtubeEmbed = getYoutubeEmbedUrl(exercise.media.videoUrl);
  const isBlobVideo =
    exercise.media.videoType === "blob" && exercise.media.videoUrl;

  async function handleFavorite() {
    const response = await fetch(`/api/v1/exercises/${exercise!.id}/favorite`, {
      method: "POST",
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.detail ?? "Impossible de modifier le favori.");
      return;
    }
    onUpdated?.({ ...exercise!, isFavorite: payload.isFavorite });
  }

  async function handleAliasSave() {
    const response = await fetch(`/api/v1/exercises/${exercise!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: aliasRef.current?.value ?? "" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.detail ?? "Alias non enregistré.");
      return;
    }
    onUpdated?.({ ...exercise!, alias: payload.alias, name: payload.alias });
    toast.success("Alias enregistré.");
  }

  async function handleHide() {
    const response = await fetch(`/api/v1/exercises/${exercise!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: true }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.detail ?? "Impossible de masquer l'exercice.");
      return;
    }
    toast.success("Exercice masqué pour votre organisation.");
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-hairline bg-surface-card text-on-dark max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-title-lg">{exercise.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border-hairline bg-surface-elevated overflow-hidden rounded-lg border">
              {youtubeEmbed ? (
                <iframe
                  title={exercise.name}
                  src={youtubeEmbed}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isBlobVideo ? (
                <video
                  src={exercise.media.videoUrl}
                  controls
                  className="aspect-video w-full"
                />
              ) : exercise.media.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={exercise.media.thumbnailUrl}
                  alt={exercise.name}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="text-muted flex aspect-video items-center justify-center">
                  Aucune vidéo disponible
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{labelExerciseType(exercise.type)}</Badge>
              {exercise.muscleGroups.map((muscle) => (
                <Badge key={muscle} variant="secondary">
                  {labelMuscle(muscle)}
                </Badge>
              ))}
              {exercise.equipment.map((item) => (
                <Badge key={item}>{labelEquipment(item)}</Badge>
              ))}
            </div>

            {exercise.description ? (
              <section className="space-y-2">
                <h3 className="text-caption-uppercase text-muted">Description</h3>
                <p className="text-body-md text-body-strong">{exercise.description}</p>
              </section>
            ) : null}

            {exercise.instructions ? (
              <section className="space-y-2">
                <h3 className="text-caption-uppercase text-muted">Consignes</h3>
                <p className="text-body-md text-body-strong whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </section>
            ) : null}

            {mode === "coach" ? (
              <div className="border-hairline flex flex-wrap gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleFavorite}>
                  <Star
                    className={
                      exercise.isFavorite
                        ? "fill-primary text-primary mr-2 size-4"
                        : "mr-2 size-4"
                    }
                  />
                  {exercise.isFavorite ? "Favori" : "Ajouter favori"}
                </Button>

                {exercise.source === "custom" ? (
                  <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 size-4" />
                    Modifier
                  </Button>
                ) : (
                  <>
                    <div key={exercise.id} className="flex min-w-[240px] flex-1 gap-2">
                      <Input
                        key={exercise.id}
                        ref={aliasRef}
                        defaultValue={exercise.alias ?? ""}
                        placeholder="Alias personnel"
                        className="border-hairline bg-surface-elevated text-on-dark"
                      />
                      <Button type="button" onClick={handleAliasSave}>
                        Alias
                      </Button>
                    </div>
                    <Button type="button" variant="outline" onClick={handleHide}>
                      <EyeOff className="mr-2 size-4" />
                      Masquer
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {exercise.source === "custom" ? (
        <ExerciseFormDialog
          exercise={exercise}
          planTier={planTier}
          categories={categories}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={(updated) => {
            onUpdated?.(updated);
            setEditOpen(false);
          }}
          onCategoriesChange={onCategoriesChange}
        />
      ) : null}
    </>
  );
}
