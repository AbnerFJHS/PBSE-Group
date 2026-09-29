# Gym Desk — web client

Deployed URL: **TODO — fill in after deploying**

## Workflows (A.1) — required in the README, checked by the grader

| Workflow | Screen | Address | Role permitted | Operation |
|---|---|---|---|---|
| Front desk checks a member in | Membership lookup | `/check-in` | staff¹ | — (client-side only: validates the ID shape, then navigates) |
| | Membership detail | `/memberships/{id}` | staff¹ | `GET /v1/memberships/{id}` |
| | Check-in action | `/memberships/{id}` | staff¹ | `POST /v1/check-ins` |
| Front desk sees who's in the gym | Active/completed list | `/check-ins` | staff¹ | `GET /v1/check-ins?status=` |
| Front desk checks a member out | Check-out action (from the list) | `/check-ins` | staff¹ | `POST /v1/check-ins/{id}/check-out` |

Calls per screen: 1 each, except the membership detail screen, which makes a
second call only when the person submits the check-in form.

¹ **Known gap:** the service has no authentication yet (that's Session 4/P4,
not yet implemented against this deployment). "staff" here records the
*intended* role — right now every screen and every operation above is reachable
anonymously. This table must be revisited once P4 lands: re-verify each row
against what the service actually enforces, not what the client assumes (A.1
check #2). Until then, A.3's `401`/`403`/`404` handling below is unused.

## Session and identity (A.3 §5)

**No session exists yet.** There is no login, no token, and `src/api.js` has
an `authHeaders()` function that returns `{}` — a single, deliberate
placeholder so that attaching a real token later touches exactly one place
per A.2 §3. Once P4 issues tokens: store the access token in memory (a module
variable, not `localStorage` — a token there is readable by any script on the
page); store the refresh token in an HttpOnly cookie if the auth server
supports setting one for this origin, otherwise in memory with the
consequence that a page reload requires signing in again. Record whichever
you actually choose here, with the reason, once P4 exists.

## Local development

```bash
cd web
python3 -m http.server 8080     # or any static file server; no build step needed
```

In another terminal, run the API (see `service/README.md`) with:
```bash
ALLOWED_ORIGINS=http://localhost:8080 npm start
```
`config.json` in this folder already points at `http://localhost:3000` for
local dev. It gets overwritten at deploy time — see below.

## How the API URL is configured (A.2 §4)

There's no bundler, so `scripts/generate-config.mjs` runs as Render's
**build** command and writes `config.json` from the `API_BASE_URL` env var.
`src/api.js` fetches that file once at startup. Nothing hardcodes a URL.

## CORS (A.4)

Configured on the **service**, not here: `service/src/middleware/cors.js`
reads an explicit allowlist from `ALLOWED_ORIGINS` (comma-separated) — never
a reflected `Origin` header. When you deploy `gym-web`, add its `.onrender.com`
URL to the API's `ALLOWED_ORIGINS` and redeploy the API.

## What's built, and what's still open (A.5–A.9)

- ✅ All three workflows run end to end, with loading/empty/error/content
  states (A.5) and field-level 400 errors, a disabled submit button, and an
  idempotency key on the one write that needs one (A.6).
- ⬜ **Conditional reads (A.7):** the service doesn't send `ETag` yet, so
  `check-ins` list has no polling/`If-None-Match`/304 handling. Add
  server-side ETags first, then wire `If-None-Match` into `api.js`.
- ⬜ **Conditional writes (A.8):** check-out has no `If-Match`/412 handling
  yet, for the same reason — the service doesn't issue ETags on individual
  check-ins yet. Two staff checking the same person out concurrently
  currently both succeed-or-409 based on row state, not a precondition.
- ⬜ **A.9 console attack:** meaningless until P4 adds real access control to
  attack. Once it does, re-run this from the browser console against a role
  that shouldn't have some operation, and confirm the service (not just the
  hidden UI control) refuses it.
