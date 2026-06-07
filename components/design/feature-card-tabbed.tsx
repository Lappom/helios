"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: string;
  title: string;
  description: string;
};

type FeatureCardTabbedProps = {
  tabs: TabItem[];
  className?: string;
};

export function FeatureCardTabbed({ tabs, className }: FeatureCardTabbedProps) {
  return (
    <section className={cn("py-section bg-canvas", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="mb-8 h-auto gap-2 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-md border border-transparent px-3.5 py-2 text-sm font-medium text-muted data-[state=active]:border-hairline data-[state=active]:bg-surface-card data-[state=active]:text-on-dark"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <article className="rounded-lg border border-hairline bg-surface-card p-8">
                <h3 className="text-title-lg text-on-dark mb-3">{tab.title}</h3>
                <p className="text-body-md text-body max-w-2xl">{tab.description}</p>
              </article>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
