import { ClientHabitsHomeWidget } from "@/components/client/habits/client-habits-home-widget";
import { hasFeature } from "@/lib/billing/access";
import { getClientHabitsSummary } from "@/lib/habits/service";

type ClientHabitsSectionProps = {
  organizationId: string;
  clientId: string;
};

export async function ClientHabitsSection({
  organizationId,
  clientId,
}: ClientHabitsSectionProps) {
  const habitsEnabled = await hasFeature("habits");
  if (!habitsEnabled) {
    return null;
  }

  const habitsSummary = await getClientHabitsSummary(organizationId, clientId);
  if (!habitsSummary) {
    return null;
  }

  return <ClientHabitsHomeWidget summary={habitsSummary} />;
}
