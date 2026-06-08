import type { ClientStatus } from "@/lib/validators/clients";

export type ClientListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ClientStatus;
  clerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; color: string | null }[];
};

export type ClientDetail = ClientListItem & {
  notes: {
    id: string;
    body: string;
    authorClerkUserId: string;
    createdAt: Date;
  }[];
  statusEvents: {
    id: string;
    fromStatus: ClientStatus;
    toStatus: ClientStatus;
    changedByClerkUserId: string;
    createdAt: Date;
  }[];
};

export type TimelineEntry =
  | {
      type: "note";
      id: string;
      createdAt: Date | string;
      body: string;
      authorClerkUserId: string;
    }
  | {
      type: "status";
      id: string;
      createdAt: Date | string;
      fromStatus: ClientStatus;
      toStatus: ClientStatus;
      changedByClerkUserId: string;
    };
