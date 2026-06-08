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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PlanTier } from "@/lib/auth/types";
import {
  createYoutubeVideo,
  uploadVideoWithProgress,
} from "@/lib/videos/api-client";
import type { VideoCategoryItem } from "@/lib/videos/types";
import { VideoUploadField } from "./video-upload-field";

type VideoFormDialogProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: VideoCategoryItem[];
  planTier: PlanTier;
  onCreated: () => void;
};

type UploadPayload = {
  file: File;
  thumbnail: File | null;
  durationSeconds: number | null;
};

export function VideoFormDialog({
  organizationId,
  open,
  onOpenChange,
  categories,
  planTier,
  onCreated,
}: VideoFormDialogProps) {
  const [tab, setTab] = useState<"youtube" | "upload">("youtube");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [visibility, setVisibility] = useState<"all_clients" | "selected">(
    "all_clients",
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [clients, setClients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [uploadPayload, setUploadPayload] = useState<UploadPayload | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    fetch("/api/v1/clients?limit=200")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load clients");
        }
        const payload = (await response.json()) as {
          items: Array<{
            id: string;
            firstName: string;
            lastName: string;
          }>;
        };
        setClients(payload.items);
      })
      .catch(() => {
        setClients([]);
      });
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategoryId("none");
    setVisibility("all_clients");
    setYoutubeUrl("");
    setClientIds([]);
    setUploadPayload(null);
    setUploadProgress(0);
    setTab("youtube");
  }

  function toggleClient(clientId: string) {
    setClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }

    if (visibility === "selected" && clientIds.length === 0) {
      toast.error("Sélectionnez au moins un client.");
      return;
    }

    setLoading(true);
    try {
      const parsedCategoryId =
        categoryId === "none" ? null : categoryId;

      if (tab === "youtube") {
        if (!youtubeUrl.trim()) {
          toast.error("L'URL YouTube est requise.");
          return;
        }

        await createYoutubeVideo({
          title: title.trim(),
          description: description.trim() || null,
          categoryId: parsedCategoryId,
          visibility,
          clientIds: visibility === "selected" ? clientIds : undefined,
          youtubeUrl: youtubeUrl.trim(),
        });
      } else {
        if (!uploadPayload) {
          toast.error("Choisissez un fichier vidéo.");
          return;
        }

        await uploadVideoWithProgress(
          organizationId,
          uploadPayload.file,
          {
            title: title.trim(),
            description: description.trim() || null,
            categoryId: parsedCategoryId,
            visibility,
            clientIds: visibility === "selected" ? clientIds : undefined,
            durationSeconds: uploadPayload.durationSeconds,
          },
          uploadPayload.thumbnail,
          setUploadProgress,
        );
      }

      toast.success("Vidéo ajoutée.");
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-hairline bg-surface-card max-h-[90vh] max-w-2xl overflow-y-auto border">
        <DialogHeader>
          <DialogTitle className="text-title-lg text-on-dark font-bold tracking-tight">
            Ajouter une vidéo
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="bg-surface-elevated w-full">
            <TabsTrigger value="youtube" className="flex-1">
              YouTube
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              Upload
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="video-title" className="text-body-sm text-body-strong font-medium">
                Titre
              </label>
              <Input
                id="video-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nom de la vidéo"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="video-description"
                className="text-body-sm text-body-strong font-medium"
              >
                Description
              </label>
              <Textarea
                id="video-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description optionnelle"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <p className="text-body-sm text-body-strong font-medium">Catégorie</p>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sans catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans catégorie</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-body-sm text-body-strong font-medium">Visibilité</p>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as "all_clients" | "selected")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_clients">Tous les clients</SelectItem>
                  <SelectItem value="selected">Clients sélectionnés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visibility === "selected" ? (
              <div className="border-hairline bg-surface-elevated max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {clients.map((client) => {
                  const checked = clientIds.includes(client.id);
                  return (
                    <label
                      key={client.id}
                      className="text-body-sm text-on-dark flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClient(client.id)}
                      />
                      {client.firstName} {client.lastName}
                    </label>
                  );
                })}
              </div>
            ) : null}

            <TabsContent value="youtube" className="mt-0 space-y-2">
              <label
                htmlFor="youtube-url"
                className="text-body-sm text-body-strong font-medium"
              >
                URL YouTube
              </label>
              <Input
                id="youtube-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-0 space-y-2">
              <VideoUploadField
                planTier={planTier}
                disabled={loading}
                onFileReady={(payload) =>
                  setUploadPayload({
                    file: payload.file,
                    thumbnail: payload.thumbnail,
                    durationSeconds: payload.durationSeconds,
                  })
                }
                onClear={() => setUploadPayload(null)}
              />
              {loading && uploadProgress > 0 ? (
                <p className="text-body-sm text-muted">
                  Upload {uploadProgress}%
                </p>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="button" disabled={loading} onClick={handleSubmit}>
            {loading ? "Enregistrement…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
