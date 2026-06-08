import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createFolder,
  getFolderTree,
  listFolderContents,
} from "@/lib/drive/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createFolderSchema } from "@/lib/validators/drive";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get("tree") === "true") {
    const items = await getFolderTree(org.organizationId);
    return jsonOk({ items });
  }

  const parentId = searchParams.get("parentId");
  const pagination = parsePagination(searchParams);
  const contents = await listFolderContents(
    org.organizationId,
    parentId || null,
    pagination,
  );

  return jsonOk(contents, {
    headers: withTotalCountHeaders(undefined, contents.totalFiles),
  });
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createFolderSchema, request);
  const folder = await createFolder(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(folder, { status: 201 });
});
