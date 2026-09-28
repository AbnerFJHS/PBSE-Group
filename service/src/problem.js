// Every failure response goes through here so the error shape can never
// diverge between operations. RFC 9457 (Problem Details): type, title,
// status, detail, instance (+ extension members such as `errors`).

const TYPE_BASE = 'https://gym-membership.example/problems';

const CATALOGUE = {
  'bad-request': ['The request did not match the contract.', 'One or more parameters are invalid.'],
  'not-found': ['The requested object does not exist.', 'No such object.'],
  'unprocessable': ['The request references data that does not exist.', 'A referenced object was not found.'],
  'already-checked-in': ['This membership already has an active check-in.', 'Check out before checking in again.'],
  'already-checked-out': ['This check-in is already completed.', 'It was checked out earlier.'],
  'membership-not-active': ['This membership cannot be used to check in.', 'The membership is not active.'],
  'idempotency-key-reuse': ['This idempotency key was already used with a different request body.', 'Use a new Idempotency-Key for a different request.'],
  'internal': ['An unexpected error occurred.', 'Quote the instance value when reporting this.'],
};

export function problem(res, status, slug, extra = {}) {
  const [title, detail] = CATALOGUE[slug] ?? ['An error occurred.', 'See title.'];
  res.status(status);
  res.set('Content-Type', 'application/problem+json');
  res.json({
    type: `${TYPE_BASE}/${slug}`,
    title,
    status,
    detail,
    instance: `urn:request:${res.req?.id ?? 'unknown'}`, // links a report to the log line
    ...extra,
  });
}

// The ONE place an uncaught exception becomes a response. Details go to the
// log (keyed by request id); nothing internal reaches the client.
export function globalErrorHandler(err, req, res, _next) {
  // Malformed JSON is the client's fault (400), not a service failure (500).
  if (err.type === 'entity.parse.failed') {
    return problem(res, 400, 'bad-request', {
      errors: [{ field: 'body', message: 'malformed JSON' }],
    });
  }
  console.error(JSON.stringify({
    level: 'error', requestId: req.id, method: req.method, path: req.path,
    message: err.message, stack: err.stack,
  }));
  problem(res, 500, 'internal');
}
