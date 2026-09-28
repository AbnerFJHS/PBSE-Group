# Changelog
Set the version below according to the Session 2 compatibility policy.

## [1.1.0] — unreleased (additive, backward-compatible → minor bump)
### Added
- `POST /v1/check-ins/{checkInId}/check-out`. Reason: without it a membership
  could check in only once and `status=completed` was unreachable. Repeat calls
  answer 409. No existing operation changed.
- `GET /v1/check-ins/{checkInId}`: the target of `POST /v1/check-ins`'s `Location`
  header, and the read shape a created entity must match (A.5 §4).
- `409` on `POST /v1/check-ins` now also covers a membership that is not active.
- `Problem` now requires `detail` and `instance` (all five RFC 9457 members).
### Fixed
- Paths carry the `/v1` prefix and `servers` is `/`, so `/health` sits outside
  `/v1`. Reason: `servers: /v1` made `/health` resolve to `/v1/health`, which the
  service deliberately does not serve.
- `cursor` is `format: uuid`. Reason: the cursor is a row id and the service
  enforces that; the contract did not say so.

## [1.0.0]
- Initial contract: memberships, check-ins, health.
