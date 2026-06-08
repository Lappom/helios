# Helios — API publique & intégrations

**Plans :** Business+ (`api_access`)  
**Base URL :** `https://helios.lappom.fr/api/v1/integrations/public`

## Authentification

Envoyez votre clé API dans l'en-tête :

```http
Authorization: Bearer hls_xxxxxxxxxxxxxxxx
```

Les clés se créent dans **Coach → Paramètres → Intégrations**. La valeur complète n'est affichée qu'une seule fois à la création.

## Rate limits (Business / Team)

| Fenêtre | Limite |
|---------|--------|
| Seconde | 20 req |
| Minute | 120 req |
| Heure | 1 200 req |
| Jour | 2 000 req |
| Crédits API / mois | 10 000 |

Les dépassements renvoient `429 Too Many Requests` (RFC 7807).

## Endpoints

### Clients

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/clients` | Liste paginée (`?page&limit&status&search`) |
| GET | `/clients/:id` | Détail client |
| POST | `/clients` | Créer un client |

```bash
curl -X POST "https://helios.lappom.fr/api/v1/integrations/public/clients" \
  -H "Authorization: Bearer hls_..." \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","firstName":"Jean","lastName":"Dupont","status":"PROSPECT"}'
```

### Programmes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/programs` | Liste (`?page&limit&status&search`) |
| GET | `/programs/:id` | Arbre programme (semaines + séances) |
| POST | `/programs/:id/assign` | Assigner à un client |

```bash
curl -X POST "https://helios.lappom.fr/api/v1/integrations/public/programs/PROGRAM_ID/assign" \
  -H "Authorization: Bearer hls_..." \
  -H "Content-Type: application/json" \
  -d '{"clientId":"CLIENT_ID","startDate":"2026-06-08T00:00:00.000Z"}'
```

### Séances (session logs)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/sessions` | Liste (`?clientId&status&from&to`) |
| GET | `/sessions/:id` | Détail séance |

### Paiements

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/payments` | Liste (`?page&limit&clientId&type&status&from&to`) |

Toutes les listes renvoient le header `X-Total-Count`.

## Webhooks sortants

Configurez des endpoints HTTPS dans **Paramètres → Intégrations → Webhooks**.

### Événements

- `client.created`
- `payment.received`
- `session.completed`
- `assessment.submitted`

### Format de livraison

```http
POST https://votre-url.com/webhook
Content-Type: application/json
Helios-Event: client.created
Helios-Signature: t=1717843200,v1=abc123...
```

Corps :

```json
{
  "id": "delivery_id",
  "event": "client.created",
  "createdAt": "2026-06-08T12:00:00.000Z",
  "data": {
    "organizationId": "...",
    "clientId": "...",
    "source": "manual"
  }
}
```

### Vérification HMAC

1. Lire l'en-tête `Helios-Signature` (`t=timestamp,v1=hex`)
2. Calculer `HMAC-SHA256(secret, "${t}.${rawBody}")`
3. Comparer avec `v1` (timing-safe)

Les livraisons échouées sont retentées 3 fois (1 min, 5 min, 30 min).

## Recettes Zapier

### Trigger — Nouveau client (webhook)

1. Zapier → **Webhooks by Zapier** → Catch Hook
2. Copier l'URL dans Helios → Webhooks → événement `client.created`
3. Mapper les champs `data.clientId`, `data.organizationId`

### Action — Créer un client

1. Zapier → **Webhooks by Zapier** → POST
2. URL : `https://helios.lappom.fr/api/v1/integrations/public/clients`
3. Headers : `Authorization: Bearer hls_...`, `Content-Type: application/json`
4. Body : `email`, `firstName`, `lastName`, `status` (optionnel)

### Action — Assigner un programme

1. POST `https://helios.lappom.fr/api/v1/integrations/public/programs/{programId}/assign`
2. Body JSON : `{ "clientId": "...", "startDate": "..." }`

## Recettes Make (Integromat)

Même schéma que Zapier :

- Module **Webhooks > Custom webhook** pour les triggers sortants Helios
- Module **HTTP > Make a request** pour les actions API (Bearer auth)

## Gestion (session coach)

Routes internes (cookie Clerk, feature `api_access`) :

- `GET/POST /api/v1/integrations/api-keys`
- `DELETE /api/v1/integrations/api-keys/:id`
- `GET/POST /api/v1/integrations/webhooks`
- `GET/PATCH/DELETE /api/v1/integrations/webhooks/:id`
- `POST /api/v1/integrations/webhooks/:id/test`
- `GET /api/v1/integrations/webhooks/:id/deliveries`
