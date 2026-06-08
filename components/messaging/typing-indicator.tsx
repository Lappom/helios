"use client";

export function TypingIndicator({ label }: { label: string }) {
  return (
    <p className="text-muted text-body-sm px-1 py-2">
      {label}
      <span className="inline-flex w-6 animate-pulse">...</span>
    </p>
  );
}
