const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseListQuery(req) {
  const { memberId, status, limit, cursor } = req.query;
  const errors = [];

  if (memberId !== undefined && !UUID_RE.test(memberId)) {
    errors.push({ field: 'memberId', message: 'must be a UUID' });
  }
  if (status !== undefined && !['active', 'completed'].includes(status)) {
    errors.push({ field: 'status', message: 'must be active or completed' });
  }
  if (cursor !== undefined && !UUID_RE.test(cursor)) {
    errors.push({ field: 'cursor', message: 'must be a cursor returned by a previous page' });
  }
  const parsedLimit = limit !== undefined ? Number(limit) : 20;
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    errors.push({ field: 'limit', message: 'must be an integer between 1 and 100' });
  }

  if (errors.length) {
    const err = new Error('invalid query');
    err.errors = errors;
    throw err;
  }

  return { memberId: memberId ?? null, status: status ?? null, limit: parsedLimit, cursor: cursor ?? null };
}

export function parseCheckInBody(req) {
  const { membershipId } = req.body ?? {};
  const errors = [];

  if (typeof membershipId !== 'string' || !UUID_RE.test(membershipId)) {
    errors.push({ field: 'membershipId', message: 'is required and must be a UUID' });
  }

  if (errors.length) {
    const err = new Error('invalid body');
    err.errors = errors;
    throw err;
  }

  return { membershipId };
}

export function parseIdempotencyKey(req) {
  const key = req.headers['idempotency-key'];
  if (!key || !UUID_RE.test(key)) {
    const err = new Error('Idempotency-Key header is required and must be a UUID');
    err.errors = [{ field: 'Idempotency-Key', message: 'required, must be a UUID' }];
    throw err;
  }
  return key;
}

export function parseCheckInId(req) {
  const { checkInId } = req.params;
  if (!UUID_RE.test(checkInId)) {
    const err = new Error('invalid id');
    err.errors = [{ field: 'checkInId', message: 'must be a UUID' }];
    throw err;
  }
  return checkInId;
}
