# Helios — Conformité & sécurité des données

Document technique de référence (P6.1). Dernière mise à jour : juin 2026.

## Hébergement

| Composant | Région | Fournisseur |
|-----------|--------|-------------|
| Application & API | `fra1` (Paris) | Vercel |
| Base de données | EU | Neon Postgres |
| Fichiers (photos, drive, médias) | `fra1` | Vercel Blob |
| Cache | EU (config projet) | Upstash Redis |

## Chiffrement

| Couche | Mécanisme |
|--------|-----------|
| Transit | TLS 1.3 (HTTPS) |
| Postgres (at-rest) | AES-256 — [Neon security](https://neon.tech/docs/security/security-overview) |
| Vercel Blob (at-rest) | AES-256 — [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| Secrets applicatifs | Variables d'environnement Vercel (chiffrées au repos) |

## Isolation multi-tenant

- Colonne `organizationId` sur chaque entité métier.
- Filtrage applicatif dans les services et route handlers.
- Row Level Security (RLS) Postgres avec `FORCE ROW LEVEL SECURITY` sur les tables tenant.
- Scope transactionnel via `runWithDbScope` + `set_config('app.organization_id')`.

## RGPD — droits des personnes

| Droit | Implémentation |
|-------|----------------|
| Portabilité | `GET /api/v1/clients/:id/export` (coach), `GET /api/v1/me/data-export` (client) |
| Effacement | `DELETE /api/v1/clients/:id` (coach), `DELETE /api/v1/me/account` (client), webhook Clerk `user.deleted` |
| Audit | Table `audit_logs`, rétention 90 jours, cron `/api/cron/audit-log-purge` |

## Sous-traitants & DPA

| Fournisseur | Usage | DPA |
|-------------|-------|-----|
| [Clerk](https://clerk.com) | Auth, orgs, billing B2B | [Clerk DPA](https://clerk.com/legal/dpa) |
| [Neon](https://neon.tech) | Postgres EU | [Neon DPA](https://neon.tech/dpa) |
| [Vercel](https://vercel.com) | Hébergement, Blob, Cron | [Vercel DPA](https://vercel.com/legal/dpa) |
| [Resend](https://resend.com) | Emails transactionnels | [Resend DPA](https://resend.com/legal/dpa) |
| [Ably](https://ably.com) | Temps réel | [Ably DPA](https://ably.com/legal/dpa) |
| [Upstash](https://upstash.com) | Redis | [Upstash DPA](https://upstash.com/trust/dpa) |

## Audit des actions sensibles

Actions journalisées : export/effacement client, invitation, paiement manuel, création/révocation clé API.

Consultation : `GET /api/v1/audit-logs` (rôles `org_owner`, `org_admin`).

## Contact

Pour toute demande relative aux données personnelles : via le coach responsable du traitement (client) ou l'administrateur de l'organisation Helios (coach/business).
