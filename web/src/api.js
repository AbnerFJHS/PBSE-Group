let baseUrl = null;

async function getBaseUrl() {
  if (baseUrl) return baseUrl;
  const res = await fetch('/config.json');
  const config = await res.json();
  baseUrl = config.apiBaseUrl;
  return baseUrl;
}

// A distinguishable failure to represent "the network never answered" —
// timeouts, DNS failures, offline — as opposed to a Problem the server sent.
export class NetworkError extends Error {}

// TODO (Session 4): attach the bearer token here, in this one place, once
// authentication exists. Nothing else in the app should read a token.
function authHeaders() {
  return {};
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const url = `${await getBaseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new NetworkError(err.message);
  }

  if (res.status === 204) return { ok: true, status: res.status, body: null, res };

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('json') ? await res.json() : await res.text();

  if (!res.ok) {
    // Problem Details (RFC 9457) — read as structured data, never as text
    // (A.6 §1). A non-Problem error body still surfaces as best-effort.
    const problem = contentType.includes('problem+json')
      ? payload
      : { title: 'Request failed', status: res.status, detail: String(payload).slice(0, 200) };
    const error = new Error(problem.title);
    error.problem = problem;
    error.status = res.status;
    throw error;
  }

  return { ok: true, status: res.status, body: payload, res };
}

// ---- domain functions -------------------------------------------------

export async function getMembership(membershipId) {
  const { body } = await request(`/v1/memberships/${membershipId}`);
  return body;
}

export async function listCheckIns({ status, memberId, cursor } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (memberId) params.set('memberId', memberId);
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  const { body } = await request(`/v1/check-ins${qs ? `?${qs}` : ''}`);
  return body; // { data, nextCursor }
}

export async function createCheckIn(membershipId, idempotencyKey) {
  const { body } = await request('/v1/check-ins', {
    method: 'POST',
    body: { membershipId },
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return body;
}

export async function checkOut(checkInId) {
  const { body } = await request(`/v1/check-ins/${checkInId}/check-out`, { method: 'POST' });
  return body;
}

// A field-level view of a 400's invalid-params, for forms (A.6 §1).
export function fieldErrors(problem) {
  const out = {};
  for (const e of problem?.errors ?? []) out[e.field] = e.message;
  return out;
}
