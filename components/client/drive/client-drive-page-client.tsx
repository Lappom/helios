"use client";

import { Download, FileText, Film, FolderOpen, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientDriveFileItem } from "@/lib/drive/types";
import { formatBytes, mimeIconCategory } from "@/lib/drive/format";
import { getDriveDownloadUrl } from "@/lib/drive/api-client";
import { cn } from "@/lib/utils";

type ClientDrivePageClientProps = {
  initialFiles: ClientDriveFileItem[];
};

function FileIcon({ mimeType }: { mimeType: string }) {
  const category = mimeIconCategory(mimeType);
  const className = "size-7";

  switch (category) {
    case "image":
      return <ImageIcon className={cn(className, "text-accent-blue")} />;
    case "video":
      return <Film className={cn(className, "text-accent-emerald")} />;
    default:
      return <FileText className={cn(className, "text-primary")} />;
  }
}

function groupByFolderPath(files: ClientDriveFileItem[]) {
  const groups = new Map<string, ClientDriveFileItem[]>();

  for (const file of files) {
    const key =
      file.folderPath.length > 0 ? file.folderPath.join(" / ") : "Documents";
    const items = groups.get(key) ?? [];
    items.push(file);
    groups.set(key, items);
  }

  return [...groups.entries()];
}

export function ClientDrivePageClient({
  initialFiles,
}: ClientDrivePageClientProps) {
  const groups = groupByFolderPath(initialFiles);

  if (initialFiles.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="border-hairline bg-surface-card mx-auto flex max-w-lg flex-col items-center rounded-lg border px-6 py-12 text-center">
          <FolderOpen className="text-muted-soft mb-4 size-12" />
          <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
            Aucun document partagé
          </h1>
          <p className="text-body-sm text-muted mt-2">
            Votre coach n&apos;a pas encore partagé de fichiers avec vous.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
      <div>
        <p className="text-caption-uppercase text-muted tracking-widest uppercase">
          Documents
        </p>
        <h1 className="text-display-sm text-on-dark mt-1 font-bold tracking-tight">
          Mes fichiers
        </h1>
        <p className="text-body-sm text-muted mt-1">
          {initialFiles.length} fichier{initialFiles.length > 1 ? "s" : ""}{" "}
          partagé{initialFiles.length > 1 ? "s" : ""}
        </p>
      </div>

      {groups.map(([folderLabel, files]) => (
        <section key={folderLabel} className="space-y-3">
          <h2 className="text-title-sm text-on-dark font-semibold">
            {folderLabel}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="border-hairline bg-surface-card flex items-center justify-between gap-3 rounded-lg border p-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon mimeType={file.mimeType} />
                  <div className="min-w-0">
                    <p className="text-body-sm text-on-dark truncate font-medium">
                      {file.name}
                    </p>
                    <p className="text-caption text-muted mt-0.5">
                      {formatBytes(file.sizeBytes)}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={getDriveDownloadUrl(file.id)} download>
                    <Download className="size-4" />
                    Télécharger
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
