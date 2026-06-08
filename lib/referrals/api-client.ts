import type {
  ReferralCodeListItem,
  ReferralConversionListItem,
  ReferralDashboard,
  ReferralProgramDto,
} from "@/lib/referrals/types";
import type { PatchReferralProgramInput } from "@/lib/validators/referrals";

async function parseApiError(response: Response): Promise<never> {
  let detail = "Request failed.";
  try {
    const payload = (await response.json()) as {
      detail?: string;
      title?: string;
    };
    detail = payload.detail ?? payload.title ?? detail;
  } catch {
    // ignore
  }
  throw new Error(detail);
}

export async function fetchReferralProgram(): Promise<ReferralProgramDto> {
  const response = await fetch("/api/v1/referrals/program");
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as ReferralProgramDto;
}

export async function patchReferralProgram(
  input: PatchReferralProgramInput,
): Promise<ReferralProgramDto> {
  const response = await fetch("/api/v1/referrals/program", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as ReferralProgramDto;
}

export async function fetchReferralDashboard(): Promise<ReferralDashboard> {
  const response = await fetch("/api/v1/referrals/dashboard");
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as ReferralDashboard;
}

export async function fetchReferralCodes(): Promise<ReferralCodeListItem[]> {
  const response = await fetch("/api/v1/referrals/codes?limit=100");
  if (!response.ok) await parseApiError(response);
  const payload = (await response.json()) as { items: ReferralCodeListItem[] };
  return payload.items;
}

export async function fetchReferralConversions(): Promise<
  ReferralConversionListItem[]
> {
  const response = await fetch("/api/v1/referrals/conversions?limit=100");
  if (!response.ok) await parseApiError(response);
  const payload = (await response.json()) as {
    items: ReferralConversionListItem[];
  };
  return payload.items;
}

export async function regenerateReferralCode(
  clientId: string,
): Promise<ReferralCodeListItem> {
  const response = await fetch(
    `/api/v1/referrals/codes/${clientId}/regenerate`,
    { method: "POST" },
  );
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as ReferralCodeListItem;
}
