import { Router } from 'express';
import { parseMembershipId } from '../schemas/memberships.js';
import * as memberships from '../store/memberships.js';
import { toMembershipRepresentation } from '../representations/memberships.js';
import { problem } from '../problem.js';

export const membershipsRouter = Router();

membershipsRouter.get('/memberships/:membershipId', async (req, res) => {
  let membershipId;
  try {
    membershipId = parseMembershipId(req); // 1+2. route + validate → 400
  } catch (err) {
    return problem(res, 400, 'bad-request', {
      errors: [{ field: err.field, message: err.message }],
    });
  }

  const row = await memberships.findById(membershipId); // 3. work
  if (!row) return problem(res, 404, 'not-found'); // absent → 404

  res.json(toMembershipRepresentation(row)); // 4+5. represent + respond
});
