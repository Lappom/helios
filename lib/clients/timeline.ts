import type { ClientDetail, TimelineEntry } from "./types";

export function buildClientTimeline(detail: ClientDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...detail.notes.map((note) => ({
      type: "note" as const,
      id: note.id,
      createdAt: note.createdAt,
      body: note.body,
      authorClerkUserId: note.authorClerkUserId,
    })),
    ...detail.statusEvents.map((event) => ({
      type: "status" as const,
      id: event.id,
      createdAt: event.createdAt,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      changedByClerkUserId: event.changedByClerkUserId,
    })),
  ];

  return entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
