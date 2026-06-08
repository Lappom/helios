"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ScheduledSession } from "@/lib/programs/types";
import {
  DAY_DROP_PREFIX,
  formatDayKey,
  isSameDay,
  isSameMonth,
  SESSION_DRAG_PREFIX,
  WEEKDAY_LABELS,
} from "@/lib/programs/calendar-utils";
import { cn } from "@/lib/utils";

type ProgramCalendarGridProps = {
  view: "week" | "month";
  anchorDate: Date;
  days: Date[];
  sessions: ScheduledSession[];
  onSessionClick?: (session: ScheduledSession) => void;
};

export function ProgramCalendarGrid({
  view,
  anchorDate,
  days,
  sessions,
}: ProgramCalendarGridProps) {
  const sessionsByDay = new Map<string, ScheduledSession[]>();

  for (const session of sessions) {
    const key = formatDayKey(new Date(session.scheduledDate));
    const bucket = sessionsByDay.get(key) ?? [];
    bucket.push(session);
    sessionsByDay.set(key, bucket);
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        view === "week" ? "grid-cols-7" : "grid-cols-7",
      )}
    >
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="text-caption-uppercase text-muted px-1 py-2 text-center tracking-widest uppercase"
        >
          {label}
        </div>
      ))}

      {days.map((day) => {
        const key = formatDayKey(day);
        const daySessions = sessionsByDay.get(key) ?? [];
        const isToday = isSameDay(day, new Date());
        const inMonth = view === "week" || isSameMonth(day, anchorDate);

        return (
          <CalendarDayColumn
            key={key}
            day={day}
            sessions={daySessions}
            isToday={isToday}
            inMonth={inMonth}
            compact={view === "month"}
          />
        );
      })}
    </div>
  );
}

function CalendarDayColumn({
  day,
  sessions,
  isToday,
  inMonth,
  compact,
}: {
  day: Date;
  sessions: ScheduledSession[];
  isToday: boolean;
  inMonth: boolean;
  compact: boolean;
}) {
  const dayKey = formatDayKey(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `${DAY_DROP_PREFIX}${dayKey}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-hairline bg-surface-card min-h-28 rounded-lg border p-2 transition-colors",
        compact && "min-h-24",
        !inMonth && "opacity-40",
        isOver && "border-primary/50 bg-primary/5",
        isToday && "ring-primary/30 ring-1",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-semibold",
            isToday ? "text-primary" : "text-on-dark",
          )}
        >
          {day.getDate()}
        </span>
      </div>
      <div className="space-y-1.5">
        {sessions.map((session) => (
          <DraggableSessionCard
            key={session.programSessionId}
            session={session}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableSessionCard({
  session,
  compact,
}: {
  session: ScheduledSession;
  compact: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${SESSION_DRAG_PREFIX}${session.programSessionId}`,
      data: { session },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "border-hairline bg-surface-elevated cursor-grab rounded-md border px-2 py-1.5 active:cursor-grabbing",
        isDragging && "opacity-60",
        compact && "px-1.5 py-1",
      )}
    >
      <p className="text-on-dark truncate text-xs font-medium">{session.name}</p>
      {!compact ? (
        <p className="text-muted truncate text-[10px]">
          {session.microcycleName
            ? `${session.microcycleName} · ${session.weekLabel}`
            : session.weekLabel}
        </p>
      ) : null}
    </div>
  );
}
