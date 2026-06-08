"use client";

import { Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type DriveDropZoneProps = {
  children: ReactNode;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
};

export function DriveDropZone({
  children,
  onFilesDropped,
  disabled = false,
}: DriveDropZoneProps) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (!disabled) {
      setDragging(true);
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) {
      return;
    }

    const files = [...event.dataTransfer.files];
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }

  return (
    <div
      className="relative min-h-0 flex-1"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {dragging ? (
        <div className="border-primary bg-canvas/80 absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed backdrop-blur-sm">
          <div className="text-center">
            <Upload className="text-primary mx-auto size-10" />
            <p className="text-title-md text-on-dark mt-3 font-semibold">
              Déposer pour uploader
            </p>
            <p className="text-body-sm text-muted mt-1">
              PDF, images, vidéos
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
