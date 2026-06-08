import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getVideoCategoryIdFromPath } from "@/lib/api/videos-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { deleteCategory, updateCategory } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { updateCategorySchema } from "@/lib/validators/videos";

export const PATCH = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const categoryId = getVideoCategoryIdFromPath(request);

    if (!categoryId) {
      throw problem({
        type: "validation-error",
        title: "Invalid category id",
        status: 400,
        detail: "Category id is required.",
      });
    }

    const body = await parseJsonBody(updateCategorySchema, request);
    const category = await updateCategory(
      org.organizationId,
      categoryId,
      body,
    );

    return jsonOk(category);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const categoryId = getVideoCategoryIdFromPath(request);

    if (!categoryId) {
      throw problem({
        type: "validation-error",
        title: "Invalid category id",
        status: 400,
        detail: "Category id is required.",
      });
    }

    await deleteCategory(org.organizationId, categoryId);
    return jsonOk({ deleted: true });
  },
);
