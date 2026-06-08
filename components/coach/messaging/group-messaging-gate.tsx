"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/billing/feature-gate";

function UpgradeFallback() {
  return (
    <Button type="button" variant="outline" asChild>
      <Link href="/tarifs">Groupe Pro+</Link>
    </Button>
  );
}

type GroupMessagingGateProps = {
  children: ReactNode;
};

export function GroupMessagingGate({ children }: GroupMessagingGateProps) {
  return (
    <FeatureGate feature="group_messaging" fallback={<UpgradeFallback />}>
      {children}
    </FeatureGate>
  );
}
