# Helios

Plateforme SaaS de coaching sportif — déployée sur Vercel (`helios.lappom.fr`).

## Structure

```
app/                Next.js 16 App Router — marketing, coach, client, API
components/ui/      shadcn/ui (tokens DESIGN.md → CSS vars)
lib/db/             Drizzle ORM + schema + migrations
lib/validators/     Zod schemas
```

## Setup

```powershell
pnpm install
pnpm db:generate

# Auth CLIs
vercel login
gh auth login

# Link Vercel + Neon (Marketplace)
vercel link --yes
vercel integration add neon
pnpm env:sync

# Migrations
pnpm db:migrate

# Dev
pnpm dev
```

## Déploiement

```powershell
vercel domains add helios.lappom.fr
vercel deploy --prod
gh secret set DATABASE_URL
```

## Stack

Next.js 16 · Drizzle · Neon · shadcn/ui · Clerk (auth + billing)
