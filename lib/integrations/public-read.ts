import { getClientDetail, listClients } from "@/lib/clients/service";
import { listPayments } from "@/lib/revenue/service";
import { getProgramTree, listPrograms } from "@/lib/programs/service";
import type { ListSessionLogsQuery } from "@/lib/validators/integrations";
import type { parseListPaymentsQuery } from "@/lib/validators/payments";
import type { parseListProgramsQuery } from "@/lib/validators/programs";
import { getSessionLog, listSessionLogs } from "./session-logs";

export type PublicClientItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; color: string | null }[];
};

export type PublicClientDetail = PublicClientItem;

function sanitizeClient(client: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; color: string | null }[];
}): PublicClientDetail {
  return {
    id: client.id,
    email: client.email,
    firstName: client.firstName,
    lastName: client.lastName,
    status: client.status,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    tags: client.tags,
  };
}

export async function listPublicClients(
  organizationId: string,
  options: Parameters<typeof listClients>[1],
) {
  const { items, total } = await listClients(organizationId, options);
  return {
    items: items.map((item) => ({
      id: item.id,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      tags: item.tags,
    })),
    total,
  };
}

export async function getPublicClient(
  organizationId: string,
  clientId: string,
) {
  const client = await getClientDetail(organizationId, clientId);
  return sanitizeClient(client);
}

export async function listPublicPrograms(
  organizationId: string,
  query: ReturnType<typeof parseListProgramsQuery>,
) {
  const { items, total } = await listPrograms(organizationId, query);
  return {
    items: items.map((program) => ({
      id: program.id,
      name: program.name,
      description: program.description,
      status: program.status,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    })),
    total,
  };
}

export async function getPublicProgram(
  organizationId: string,
  programId: string,
) {
  const program = await getProgramTree(organizationId, programId);
  return {
    id: program.id,
    name: program.name,
    description: program.description,
    status: program.status,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
    weeks: program.weeks.map((week) => ({
      id: week.id,
      label: week.label,
      sortOrder: week.sortOrder,
      sessions: week.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        sortOrder: session.sortOrder,
      })),
    })),
  };
}

export async function listPublicPayments(
  organizationId: string,
  query: ReturnType<typeof parseListPaymentsQuery>,
) {
  const { items, total } = await listPayments(organizationId, query);
  return {
    items: items.map((payment) => ({
      id: payment.id,
      clientId: payment.clientId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      type: payment.type,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
    total,
  };
}

export {
  listSessionLogs as listPublicSessionLogs,
  getSessionLog as getPublicSessionLog,
};

export type { PublicSessionLogItem } from "./session-logs";
export type { ListSessionLogsQuery };
