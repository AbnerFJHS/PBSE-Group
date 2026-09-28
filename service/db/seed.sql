-- Synthetic data only (no real people; P3 provision 5). Idempotent enough for
-- a fresh database; run once after schema.sql.
INSERT INTO membership_plans (id, name, price_cents, billing_period) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Monthly', 30000, 'monthly'),
  ('22222222-2222-2222-2222-222222222222', 'Annual', 300000, 'annual');

INSERT INTO members (id, full_name, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Test Member One',   'member1@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Test Member Two',   'member2@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Test Member Three', 'member3@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Test Member Four',  'member4@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Test Member Five',  'member5@example.test');

-- Three ACTIVE memberships (A.7 needs three check-ins; only one active
-- check-in is allowed per membership), one FROZEN, one EXPIRED.
INSERT INTO memberships (id, member_id, plan_id, status, renews_on) VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'active',  '2026-11-01'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'active',  '2026-11-05'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '22222222-2222-2222-2222-222222222222', 'active',  '2027-01-01'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '11111111-1111-1111-1111-111111111111', 'frozen',  '2026-12-01'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '11111111-1111-1111-1111-111111111111', 'expired', NULL);
