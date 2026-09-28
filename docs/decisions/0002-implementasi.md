# 0002 — Implementation choices (Session 3)

## Context
The service must be publicly reachable, keep data across restarts, and be
rebuildable from a clean checkout (A.7, A.10). Free tiers are the budget.

## Decision
- **Hosting:** Render web service (free) for the API. *(confirm before tagging l3)*
- **Database:** Neon Postgres (free, persistent) — kept separate from the compute
  host so the data outlives any one web service.
- **Idempotency keys:** `idempotency_keys` table with a SHA-256 body hash;
  `response_body` is `JSON`, not `JSONB`, so replays are byte-identical.
- **Atomic idempotent create:** one transaction with a per-key advisory lock;
  verified with 5 simultaneous same-key requests → five 201s, one row.
- **Membership must be `active` to check in:** otherwise 409 `membership-not-active`.
- **One active check-in per membership:** enforced by a partial unique index,
  not only application code, so concurrent requests cannot both succeed.
- **Contract testing:** Schemathesis in CI with `positive_data_acceptance` and
  `unsupported_method` excluded and the coverage phase off (see below).
- **Deviation from A.1:** `store/db.js` (shared pool) added; no other deviation.

## Alternatives considered
- Render Postgres: free instances expire after 30 days — rejected.
- Railway: no permanent free tier. Fly.io: requires a Dockerfile and CLI.
- Excluding no checks: `positive_data_acceptance` flags 422/409 on well-formed
  bodies, which are documented domain rules; `unsupported_method` expects 405
  where the framework answers 404; the coverage phase sends undeclared query
  parameters and expects 400, which the contract does not require.

## Consequences
- Free web instances sleep when idle: use a paid instance (or a health-check
  ping) for demo days.
- Excluded checks are a deliberate, recorded narrowing — the contract itself was
  not loosened to make them pass.
