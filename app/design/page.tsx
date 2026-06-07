import { DemoGridCard } from "@/components/design/demo-grid-card";
import { FeatureCardTabbed } from "@/components/design/feature-card-tabbed";
import { Footer } from "@/components/design/footer";
import { HeroBand } from "@/components/design/hero-band";
import { PricingTierCard } from "@/components/design/pricing-tier-card";
import { SignatureCoralCard } from "@/components/design/signature-coral-card";
import { TopNav } from "@/components/design/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const colorSwatches = [
  { name: "canvas", className: "bg-canvas border border-hairline" },
  { name: "primary", className: "bg-primary" },
  { name: "surface-card", className: "bg-surface-card" },
  { name: "surface-elevated", className: "bg-surface-elevated" },
  { name: "on-dark", className: "bg-on-dark" },
  { name: "muted", className: "bg-muted" },
  { name: "accent-emerald", className: "bg-accent-emerald" },
  { name: "accent-rose", className: "bg-accent-rose" },
];

const featureTabs = [
  {
    id: "programs",
    label: "Programmes",
    title: "Construisez des programmes sur mesure",
    description:
      "Templates, périodisation et suivi de charge — tout centralisé pour vos coachs.",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    title: "Plans alimentaires adaptés",
    description:
      "Recettes, macros et habitudes — synchronisés avec les objectifs de vos clients.",
  },
  {
    id: "assessments",
    label: "Bilans",
    title: "Mesurez la progression",
    description:
      "Formulaires, photos et métriques — un historique clair pour chaque client.",
  },
];

export default function DesignSandboxPage() {
  return (
    <div className="bg-canvas min-h-screen">
      <TopNav />

      <div className="border-b border-hairline bg-surface-soft px-6 py-3">
        <p className="text-body-sm text-primary mx-auto max-w-7xl">
          Sandbox design — référence visuelle P0.2. Retirer cette route avant prod.
        </p>
      </div>

      <HeroBand
        title="La plateforme coaching qui scale avec vous"
        subtitle="Programmes, nutrition, bilans et messagerie — un seul espace pour coachs et clients."
      />

      <section className="py-section mx-auto max-w-7xl px-6">
        <h2 className="text-display-sm mb-8">Tokens couleur</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorSwatches.map((swatch) => (
            <div key={swatch.name} className="space-y-2">
              <div className={swatch.className + " h-16 rounded-lg"} />
              <p className="text-body-sm text-muted font-mono">{swatch.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-section mx-auto max-w-7xl px-6">
        <h2 className="text-display-sm mb-8">Typographie</h2>
        <div className="space-y-4">
          <p className="text-display-xl text-on-dark">Display XL</p>
          <p className="text-display-lg text-on-dark">Display LG</p>
          <p className="text-display-md text-on-dark">Display MD</p>
          <p className="text-title-lg text-on-dark">Title LG</p>
          <p className="text-body-md text-body">Body MD — texte courant</p>
          <p className="text-caption-uppercase text-muted">Caption uppercase</p>
          <p className="text-stat-display">128+</p>
        </div>
      </section>

      <section className="py-section mx-auto max-w-7xl px-6">
        <h2 className="text-display-sm mb-8">Composants shadcn</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Badge>Nouveau</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Formulaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Email du client" />
              <Tabs defaultValue="tab1">
                <TabsList>
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="text-body-sm text-muted pt-2">
                  Contenu tab 1
                </TabsContent>
                <TabsContent value="tab2" className="text-body-sm text-muted pt-2">
                  Contenu tab 2
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Programme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Marie Dupont</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Actif</Badge>
                    </TableCell>
                    <TableCell>Force 12 sem.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Luc Martin</TableCell>
                    <TableCell>
                      <Badge variant="outline">Essai</Badge>
                    </TableCell>
                    <TableCell>Recomposition</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-section mx-auto max-w-7xl space-y-8 px-6">
        <h2 className="text-display-sm">Composants signature</h2>
        <SignatureCoralCard
          title="Conçu pour chaque défi coaching"
          description="De l'indépendant au studio multi-coachs — Helios s'adapte à votre modèle."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <DemoGridCard title="Dashboard" metric="47" metricLabel="clients actifs" />
          <DemoGridCard title="Séances" metric="128" metricLabel="cette semaine" />
          <DemoGridCard title="Rétention" metric="94%" metricLabel="à 90 jours" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <PricingTierCard
            name="Starter"
            price="29€"
            description="Pour démarrer en solo."
            features={["Jusqu'à 10 clients", "Programmes sport", "Support email"]}
          />
          <PricingTierCard
            name="Pro"
            price="59€"
            description="Pour coachs établis."
            features={["Clients illimités", "Nutrition + bilans", "Automations"]}
            featured
          />
          <PricingTierCard
            name="Business"
            price="99€"
            description="Pour studios."
            features={["Multi-coachs", "White-label", "API webhooks"]}
          />
        </div>
      </section>

      <FeatureCardTabbed tabs={featureTabs} />
      <Footer />
    </div>
  );
}
