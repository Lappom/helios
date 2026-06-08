# Performance budgets (P6.2)

## Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API P95 | < 300 ms | Sentry span `api.route` on `withApiHandler` routes |
| Dashboard LCP P75 | < 2.5 s | Vercel Speed Insights |

## API endpoints (baseline)

Bench these routes in preview/production with authenticated sessions:

1. `GET /api/v1/me/schedule`
2. `GET /api/v1/me/nutrition`
3. `GET /api/v1/clients`
4. `GET /api/v1/exercises`
5. `GET /api/v1/programs/{id}`
6. `GET /api/v1/billing/usage`
7. `GET /api/v1/public/coaches`
8. `GET /api/v1/public/coaches/{slug}`
9. `GET /api/v1/clients/{id}/programs/active`
10. `GET /api/health`

Local debugging: responses include `Server-Timing: handler;dur=…` in development and preview.

## Dashboard pages (LCP)

1. `/client` — client home (schedule + optional widgets)
2. `/coach/clients` — coach client kanban
3. `/client/program` — active program tree
4. `/coach` — coach dashboard (reference “green” page)

## Upload multipart

Drive and VOD uploads use Vercel Blob client upload with `multipart: true` for files > 100 MB. Part-level retries run during the active upload; cross-session resume is not supported.
