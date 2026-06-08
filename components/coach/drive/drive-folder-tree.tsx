"use client";

import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DriveFolderTreeNode } from "@/lib/drive/types";
import { cn } from "@/lib/utils";

type DriveFolderTreeProps = {
  tree: DriveFolderTreeNode[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
};

function TreeNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
}: {
  node: DriveFolderTreeNode;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  return (
    <div>
      <div
        className="flex items-center"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </Button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "flex min-h-9 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            isSelected
              ? "bg-sidebar-accent text-sidebar-primary font-medium"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          <Folder className="size-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {expanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export function DriveFolderTree({
  tree,
  selectedFolderId,
  onSelect,
}: DriveFolderTreeProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          selectedFolderId === null
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
      >
        <Folder className="size-4 shrink-0" />
        Racine
      </button>
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
