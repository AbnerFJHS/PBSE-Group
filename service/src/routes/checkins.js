import { Router } from 'express';
import {
  parseListQuery, parseCheckInBody, parseIdempotencyKey, parseCheckInId,
} from '../schemas/checkins.js';
import * as checkIns from '../store/checkins.js';
import { hashBody } from '../store/idempotency.js';
import { toCheckInRepresentation } from '../representations/checkins.js';
import { problem } from '../problem.js';

export const checkInsRouter = Router();

const badRequest = (res, err) => problem(res, 400, 'bad-request', { errors: err.errors });

checkInsRouter.get('/check-ins/:checkInId', async (req, res) => {
  let id;
  try { id = parseCheckInId(req); } catch (err) { return badRequest(res, err); }

  const row = await checkIns.findById(id);
  if (!row) return problem(res, 404, 'not-found');
  res.json(toCheckInRepresentation(row));
});

checkInsRouter.get('/check-ins', async (req, res) => {
  let query;
  try { query = parseListQuery(req); } catch (err) { return badRequest(res, err); }

  const rows = await checkIns.list(query);
  const nextCursor = rows.length === query.limit ? rows[rows.length - 1].id : null;
  res.json({ data: rows.map(toCheckInRepresentation), nextCursor }); // empty stays 200
});

checkInsRouter.post('/check-ins', async (req, res) => {
  let key, body;
  try {
    key = parseIdempotencyKey(req); // missing/malformed -> 400 before any work
    body = parseCheckInBody(req);
  } catch (err) { return badRequest(res, err); }

  const result = await checkIns.createIdempotent({
    key,
    bodyHash: hashBody(body),
    membershipId: body.membershipId,
    represent: toCheckInRepresentation,
  });

  switch (result.kind) {
    case 'replay':
      res.status(result.status).set('Location', `/v1/check-ins/${result.body.id}`);
      return res.json(result.body);
    case 'created':
      res.status(201).set('Location', `/v1/check-ins/${result.body.id}`);
      return res.json(result.body);
    case 'mismatch':           return problem(res, 409, 'idempotency-key-reuse');
    case 'no-membership':      return problem(res, 422, 'unprocessable');
    case 'not-active':         return problem(res, 409, 'membership-not-active');
    case 'already-checked-in': return problem(res, 409, 'already-checked-in');
    default: throw new Error(`unhandled result ${result.kind}`);
  }
});

checkInsRouter.post('/check-ins/:checkInId/check-out', async (req, res) => {
  let id;
  try { id = parseCheckInId(req); } catch (err) { return badRequest(res, err); }

  const result = await checkIns.checkOut(id);
  switch (result.kind) {
    case 'ok':                return res.json(toCheckInRepresentation(result.row));
    case 'not-found':         return problem(res, 404, 'not-found');
    case 'already-completed': return problem(res, 409, 'already-checked-out');
    default: throw new Error(`unhandled result ${result.kind}`);
  }
});
