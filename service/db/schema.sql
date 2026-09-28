-- Runnable from an empty database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual'))
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'expired', 'cancelled')),
  renews_on DATE,
  -- internal-only fields; never exposed by the representation layer
  stripe_customer_id TEXT,
  grace_period_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_memberships_member_id ON memberships(member_id);

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed'))
);

CREATE INDEX idx_checkins_membership_id ON check_ins(membership_id);

-- A membership can have at most one ACTIVE check-in at a time. This is
-- enforced at the database level (not just in application code) so a race
-- between two near-simultaneous requests can't both succeed.
CREATE UNIQUE INDEX uq_checkins_membership_active
  ON check_ins(membership_id) WHERE status = 'active';

-- Idempotency keys live in a table, not memory, so they survive a restart —
-- required by A.8.
CREATE TABLE idempotency_keys (
  key UUID PRIMARY KEY,
  body_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  -- JSON (not JSONB) deliberately: it preserves key order as stored, so a
  -- replayed response is byte-identical to the original, which is what the
  -- A.8 verification's `diff` check requires.
  response_body JSON NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
