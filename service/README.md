# Gym Membership Service

Deployment URL: **TODO — fill in after deploying**

## Build from a clean checkout (A.7, A.10)

```bash
cp .env.example .env          # set DATABASE_URL (Neon string incl. ?sslmode=require)
npm ci
psql "$DATABASE_URL" -f db/schema.sql      # structure, from empty
psql "$DATABASE_URL" -f db/seed.sql        # synthetic sample data
npm start
```

## Operations (A.3) — keep this table current

| Operation | Served by | Remaining work |
|---|---|---|
| GET /v1/memberships/{id} | service | — |
| GET /v1/check-ins/{id} | service | — |
| GET /v1/check-ins | service | — |
| POST /v1/check-ins | service | — |
| POST /v1/check-ins/{id}/check-out | service | — |
| GET /health | service | — |
| *(add every other operation from your Session 2 openapi.yaml)* | mock | everything |

## Error mapping (A.6) — every row must also be on the operation in openapi.yaml

| Cause (in handler) | Status | Type URI slug | Operations |
|---|---|---|---|
| Path/query/body/header fails schema | 400 | `bad-request` | all |
| Malformed JSON body | 400 | `bad-request` | POST /v1/check-ins |
| Membership / check-in id not found | 404 | `not-found` | GET by id, check-out |
| Referenced membership does not exist | 422 | `unprocessable` | POST /v1/check-ins |
| Membership is frozen / expired / cancelled | 409 | `membership-not-active` | POST /v1/check-ins |
| Membership already has an active check-in | 409 | `already-checked-in` | POST /v1/check-ins |
| Idempotency-Key reused with a different body | 409 | `idempotency-key-reuse` | POST /v1/check-ins |
| Check-in already completed | 409 | `already-checked-out` | POST /v1/check-ins/{id}/check-out |
| Unhandled exception | 500 | `internal` | all (global handler; details go to the log only) |

Every failure carries `type`, `title`, `status`, `detail`, `instance`.
`instance` is `urn:request:<id>`, the same id that appears in the server log.

## Ownership rules (filled in during Session 4)

| Operation | Object named | Ownership rule |
|---|---|---|
| GET /v1/memberships/{id} | membership | — |
| GET /v1/check-ins/{id} | check-in | — |
| POST /v1/check-ins | membership (referenced) | — |
| POST /v1/check-ins/{id}/check-out | check-in | — |
| GET /v1/check-ins | collection | — |

## Design notes

- **Idempotency:** key + SHA-256 body hash live in the `idempotency_keys` table.
  Lock key → seen? → validate domain → insert entity → store key, all in one
  transaction, so concurrent retries replay instead of racing, and a crash cannot
  leave an entity without its key. `response_body` is `JSON` (not `JSONB`) so
  replays are byte-identical.
- **One active check-in per membership** is a partial unique index, not just code.
- **Contract test:** `npm run test:contract` (needs `pip install schemathesis`).

## Manual verification (the three demos)

```bash
BASE=https://<your-deployment>
# 1. read
curl -s $BASE/v1/memberships/cccccccc-cccc-cccc-cccc-ccccccccccc1
# 2. write, then find it with a read
KEY=$(uuidgen)
for i in 1 2; do
  curl -s -o /tmp/r$i.json -w "%{http_code}\n" -X POST $BASE/v1/check-ins \
    -H "Idempotency-Key: $KEY" -H 'Content-Type: application/json' \
    -d '{"membershipId":"cccccccc-cccc-cccc-cccc-ccccccccccc1"}'
done
diff /tmp/r1.json /tmp/r2.json && echo "identical responses"
curl -s "$BASE/v1/check-ins?memberId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
# 3. restart the service (Render dashboard -> Manual Deploy / Restart), repeat the GET
```
Seed memberships: `…ccc1`–`…ccc3` active, `…ccc4` frozen, `…ccc5` expired.
Only one *active* check-in per membership is allowed, so use a different active
membership for each additional demo write.
