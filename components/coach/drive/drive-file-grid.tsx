"use client";

import {
  Download,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DriveFileItem, DriveFolderItem } from "@/lib/drive/types";
import { formatBytes, mimeIconCategory } from "@/lib/drive/format";
import { getDriveDownloadUrl } from "@/lib/drive/api-client";
import { cn } from "@/lib/utils";

type DriveFileGridProps = {
  folders: DriveFolderItem[];
  files: DriveFileItem[];
  onOpenFolder: (folderId: string) => void;
  onShareFile: (file: DriveFileItem) => void;
  onShareFolder: (folder: DriveFolderItem) => void;
  onDeleteFile: (file: DriveFileItem) => void;
  onManageShares: (target: {
    type: "file" | "folder";
    id: string;
    name: string;
  }) => void;
};

function FileIcon({ mimeType }: { mimeType: string }) {
  const category = mimeIconCategory(mimeType);
  const className = "size-8";

  switch (category) {
    case "image":
      return <ImageIcon className={cn(className, "text-accent-blue")} />;
    case "video":
      return <Film className={cn(className, "text-accent-emerald")} />;
    case "pdf":
    case "text":
      return <FileText className={cn(className, "text-primary")} />;
    default:
      return <FileText className={cn(className, "text-muted")} />;
  }
}

export function DriveFileGrid({
  folders,
  files,
  onOpenFolder,
  onShareFile,
  onShareFolder,
  onDeleteFile,
  onManageShares,
}: DriveFileGridProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="border-hairline bg-surface-elevated text-muted flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Folder className="text-muted-soft mb-3 size-10" />
        <p className="text-title-sm text-on-dark font-semibold">
          Dossier vide
        </p>
        <p className="text-body-sm mt-1 max-w-sm">
          Glissez des fichiers ici ou utilisez le bouton Uploader.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {folders.map((folder, index) => (
        <div
          key={folder.id}
          className="border-hairline bg-surface-card group rounded-lg border p-4 transition-colors hover:border-hairline-strong"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenFolder(folder.id)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <Folder className="text-primary mt-0.5 size-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-title-sm text-on-dark truncate font-semibold">
                  {folder.name}
                </p>
                <p className="text-caption text-muted mt-1">
                  {folder.fileCount} fichier{folder.fileCount > 1 ? "s" : ""}
                </p>
              </div>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onShareFolder(folder)}>
                  <Share2 className="size-4" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onManageShares({
                      type: "folder",
                      id: folder.id,
                      name: folder.name,
                    })
                  }
                >
                  Accès clients
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {files.map((file, index) => (
        <div
          key={file.id}
          className="border-hairline bg-surface-card group rounded-lg border p-4 transition-colors hover:border-hairline-strong"
          style={{ animationDelay: `${(folders.length + index) * 40}ms` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <FileIcon mimeType={file.mimeType} />
              <div className="min-w-0">
                <p className="text-title-sm text-on-dark truncate font-semibold">
                  {file.name}
                </p>
                <p className="text-caption text-muted mt-1">
                  {formatBytes(file.sizeBytes)}
                  {file.shareCount > 0
                    ? ` · ${file.shareCount} partage${file.shareCount > 1 ? "s" : ""}`
                    : ""}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={getDriveDownloadUrl(file.id)} download>
                    <Download className="size-4" />
                    Télécharger
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShareFile(file)}>
                  <Share2 className="size-4" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onManageShares({
                      type: "file",
                      id: file.id,
                      name: file.name,
                    })
                  }
                >
                  Accès clients
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeleteFile(file)}
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
