"use client";

import { FolderPlus, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { DriveBreadcrumb } from "./drive-breadcrumb";
import { DriveDropZone } from "./drive-drop-zone";
import { DriveFileGrid } from "./drive-file-grid";
import { DriveFolderTree } from "./drive-folder-tree";
import { DriveShareDialog, type ShareTarget } from "./drive-share-dialog";
import {
  DriveSharesPanel,
  type ShareManageTarget,
} from "./drive-shares-panel";
import { DriveStorageMeter } from "./drive-storage-meter";
import {
  DriveUploadProgress,
  type UploadItem,
} from "./drive-upload-progress";
import type { PlanTier } from "@/lib/auth/types";
import { getDriveFileLimitMb } from "@/lib/billing/plans";
import {
  createDriveFolder,
  deleteDriveFileApi,
  fetchDriveStorageQuota,
  fetchDriveTree,
  fetchFolderContents,
  uploadDriveFileWithProgress,
} from "@/lib/drive/api-client";
import type {
  DriveFileItem,
  DriveFolderContents,
  DriveFolderItem,
  DriveFolderTreeNode,
  DriveStorageQuota,
} from "@/lib/drive/types";

type DrivePageClientProps = {
  organizationId: string;
  planTier: PlanTier;
  initialTree: DriveFolderTreeNode[];
  initialContents: DriveFolderContents;
  initialQuota: DriveStorageQuota;
};

function findPathToFolder(
  tree: DriveFolderTreeNode[],
  folderId: string | null,
): Array<{ id: string | null; name: string }> {
  if (!folderId) {
    return [{ id: null, name: "Racine" }];
  }

  function walk(
    nodes: DriveFolderTreeNode[],
    trail: Array<{ id: string | null; name: string }>,
  ): Array<{ id: string | null; name: string }> | null {
    for (const node of nodes) {
      const nextTrail = [...trail, { id: node.id, name: node.name }];
      if (node.id === folderId) {
        return nextTrail;
      }
      const found = walk(node.children, nextTrail);
      if (found) {
        return found;
      }
    }
    return null;
  }

  return walk(tree, [{ id: null, name: "Racine" }]) ?? [
    { id: null, name: "Racine" },
    { id: folderId, name: "Dossier" },
  ];
}

export function DrivePageClient({
  organizationId,
  planTier,
  initialTree,
  initialContents,
  initialQuota,
}: DrivePageClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tree, setTree] = useState(initialTree);
  const [contents, setContents] = useState(initialContents);
  const [quota, setQuota] = useState(initialQuota);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [shareTarget, setShareTarget] = useState<ShareTarget>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<ShareManageTarget | null>(
    null,
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fileLimitMb = getDriveFileLimitMb(planTier);
  const breadcrumbs = useMemo(
    () => findPathToFolder(tree, currentFolderId),
    [tree, currentFolderId],
  );

  const refresh = useCallback(async (folderId: string | null) => {
    const [treeResult, folderContents, quotaResult] = await Promise.all([
      fetchDriveTree(),
      fetchFolderContents({ parentId: folderId ?? undefined }),
      fetchDriveStorageQuota(),
    ]);
    setTree(treeResult.items);
    setContents(folderContents);
    setQuota(quotaResult);
  }, []);

  async function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId);
    const folderContents = await fetchFolderContents({
      parentId: folderId ?? undefined,
    });
    setContents(folderContents);
  }

  async function handleUploadFiles(files: File[]) {
    for (const file of files) {
      const uploadId = `${file.name}-${Date.now()}`;
      setUploads((prev) => [
        ...prev,
        { id: uploadId, name: file.name, percent: 0, done: false },
      ]);

      try {
        await uploadDriveFileWithProgress(organizationId, file, {
          folderId: currentFolderId,
          onProgress: (percent) => {
            setUploads((prev) =>
              prev.map((item) =>
                item.id === uploadId ? { ...item, percent } : item,
              ),
            );
          },
        });
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, percent: 100, done: true }
              : item,
          ),
        );
      } catch (error) {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  error: error instanceof Error ? error.message : "Erreur",
                }
              : item,
          ),
        );
      }
    }

    await refresh(currentFolderId);
    setTimeout(() => {
      setUploads((prev) => prev.filter((item) => !item.done && !item.error));
    }, 2500);
  }

  async function handleCreateFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!newFolderName.trim()) {
      return;
    }

    setCreatingFolder(true);
    try {
      await createDriveFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId,
      });
      setNewFolderName("");
      setCreateFolderOpen(false);
      await refresh(currentFolderId);
      toast.success("Dossier créé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFile(file: DriveFileItem) {
    if (!window.confirm(`Supprimer « ${file.name} » ?`)) {
      return;
    }

    try {
      await deleteDriveFileApi(file.id);
      await refresh(currentFolderId);
      toast.success("Fichier supprimé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  function openShareFile(file: DriveFileItem) {
    setShareTarget({ type: "file", id: file.id, name: file.name });
    setShareOpen(true);
  }

  function openShareFolder(folder: DriveFolderItem) {
    setShareTarget({ type: "folder", id: folder.id, name: folder.name });
    setShareOpen(true);
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Drive
          </p>
          <h1 className="text-display-sm text-on-dark mt-1 font-bold tracking-tight">
            Documents
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Max {fileLimitMb} MB par fichier
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus className="size-4" />
            Nouveau dossier
          </Button>
          <Button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Uploader
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              if (files.length > 0) {
                void handleUploadFiles(files);
              }
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <DriveStorageMeter quota={quota} />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-hairline bg-surface-card hidden overflow-y-auto rounded-lg border p-3 lg:block">
          <DriveFolderTree
            tree={tree}
            selectedFolderId={currentFolderId}
            onSelect={(folderId) => void navigateToFolder(folderId)}
          />
        </aside>

        <DriveDropZone onFilesDropped={(files) => void handleUploadFiles(files)}>
          <div className="flex h-full min-h-0 flex-col gap-4">
            <DriveBreadcrumb
              segments={breadcrumbs}
              onNavigate={(folderId) => void navigateToFolder(folderId)}
            />
            <DriveUploadProgress items={uploads} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DriveFileGrid
                folders={contents.folders}
                files={contents.files}
                onOpenFolder={(folderId) => void navigateToFolder(folderId)}
                onShareFile={openShareFile}
                onShareFolder={openShareFolder}
                onDeleteFile={(file) => void handleDeleteFile(file)}
                onManageShares={(target) => {
                  setManageTarget(target);
                  setManageOpen(true);
                }}
              />
            </div>
          </div>
        </DriveDropZone>
      </div>

      <DriveShareDialog
        target={shareTarget}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onShared={() => void refresh(currentFolderId)}
      />

      <DriveSharesPanel
        target={manageTarget}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onChanged={() => void refresh(currentFolderId)}
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void handleCreateFolder(event)} className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Nom du dossier"
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateFolderOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creatingFolder}>
                {creatingFolder ? "Création…" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
