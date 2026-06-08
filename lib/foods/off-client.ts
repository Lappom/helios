import type { OffFoodInput } from "./types";
import { hasCompleteMacros } from "./macros";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const OFF_TIMEOUT_MS = 5000;
const OFF_PAGE_SIZE = 20;

type OffNutriments = {
  "energy-kcal_100g"?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
};

type OffSearchResponse = {
  products?: OffProduct[];
};

type OffProductResponse = {
  status?: number;
  product?: OffProduct;
};

export async function searchOffFoods(query: string): Promise<OffFoodInput[]> {
  const params = new URLSearchParams({
    search_terms: query.trim(),
    page_size: String(OFF_PAGE_SIZE),
    json: "1",
    fields:
      "code,product_name,brands,serving_size,serving_quantity,nutriments",
  });

  const response = await fetchWithTimeout(`${OFF_SEARCH_URL}?${params}`);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as OffSearchResponse;
  return mapOffProducts(payload.products ?? []);
}

export async function fetchOffFoodByBarcode(
  barcode: string,
): Promise<OffFoodInput | null> {
  const normalized = barcode.trim();
  if (!normalized) {
    return null;
  }

  const response = await fetchWithTimeout(
    `${OFF_PRODUCT_URL}/${encodeURIComponent(normalized)}.json`,
  );
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OffProductResponse;
  if (payload.status !== 1 || !payload.product) {
    return null;
  }

  const mapped = mapOffProduct(payload.product);
  return mapped;
}

export async function fetchOffFoodByExternalId(
  externalId: string,
): Promise<OffFoodInput | null> {
  return fetchOffFoodByBarcode(externalId);
}

function mapOffProducts(products: OffProduct[]): OffFoodInput[] {
  const results: OffFoodInput[] = [];

  for (const product of products) {
    const mapped = mapOffProduct(product);
    if (mapped) {
      results.push(mapped);
    }
  }

  return results;
}

function mapOffProduct(product: OffProduct): OffFoodInput | null {
  const externalId = product.code?.trim();
  const name = product.product_name?.trim();
  if (!externalId || !name) {
    return null;
  }

  const per100g = extractMacros(product.nutriments);
  if (!hasCompleteMacros(per100g)) {
    return null;
  }

  const { servingSize, servingUnit } = parseServing(
    product.serving_size,
    product.serving_quantity,
  );

  return {
    externalId,
    name,
    brand: product.brands?.trim() || null,
    barcode: externalId,
    servingSize,
    servingUnit,
    per100g,
  };
}

function extractMacros(nutriments?: OffNutriments) {
  const calories =
    nutriments?.["energy-kcal_100g"] ??
    (nutriments?.energy_100g != null
      ? Math.round(nutriments.energy_100g / 4.184)
      : 0);

  return {
    calories: toNumber(calories),
    proteinG: toNumber(nutriments?.proteins_100g),
    carbsG: toNumber(nutriments?.carbohydrates_100g),
    fatG: toNumber(nutriments?.fat_100g),
    fiberG: toOptionalNumber(nutriments?.fiber_100g),
    sugarG: toOptionalNumber(nutriments?.sugars_100g),
  };
}

function parseServing(
  servingSize?: string,
  servingQuantity?: number | string,
): { servingSize: number; servingUnit: string } {
  if (typeof servingQuantity === "number" && servingQuantity > 0) {
    return { servingSize: servingQuantity, servingUnit: "g" };
  }

  if (typeof servingQuantity === "string") {
    const parsed = Number.parseFloat(servingQuantity);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return { servingSize: parsed, servingUnit: "g" };
    }
  }

  if (servingSize) {
    const match = servingSize.match(/([\d.,]+)\s*([a-zA-Z]+)?/);
    if (match?.[1]) {
      const size = Number.parseFloat(match[1].replace(",", "."));
      const unit = match[2]?.toLowerCase() || "g";
      if (!Number.isNaN(size) && size > 0) {
        return { servingSize: size, servingUnit: unit };
      }
    }
  }

  return { servingSize: 100, servingUnit: "g" };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Helios/1.0 (fitness coaching SaaS)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
