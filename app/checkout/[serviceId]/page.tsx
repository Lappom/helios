import { notFound } from "next/navigation";
import { CheckoutFlowClient } from "@/components/checkout/checkout-flow-client";
import { getPublicServiceById } from "@/lib/coach-profile/service";

type CheckoutPageProps = {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export async function generateMetadata({ params }: CheckoutPageProps) {
  const { serviceId } = await params;

  try {
    const { service, coachName } = await getPublicServiceById(serviceId);
    return {
      title: `Checkout — ${service.name} · ${coachName} | Helios`,
    };
  } catch {
    return { title: "Checkout — Helios" };
  }
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { serviceId } = await params;
  const { ref } = await searchParams;

  let checkoutData;
  try {
    checkoutData = await getPublicServiceById(serviceId);
  } catch {
    notFound();
  }

  const { service, coachName, coachSlug } = checkoutData;

  return (
    <CheckoutFlowClient
      coachSlug={coachSlug}
      coachName={coachName}
      service={service}
      backHref={`/find/coaches/${coachSlug}`}
      initialReferralCode={ref}
    />
  );
}
