const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMembershipId(req) {
  const { membershipId } = req.params;
  if (!UUID_RE.test(membershipId)) {
    const err = new Error('membershipId must be a UUID');
    err.field = 'membershipId';
    throw err;
  }
  return membershipId;
}
