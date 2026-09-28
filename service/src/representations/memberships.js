export function toMembershipRepresentation(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    planName: row.plan_name,
    status: row.status,
    renewsOn: row.renews_on ? row.renews_on.toISOString().slice(0, 10) : null,
  };
}
