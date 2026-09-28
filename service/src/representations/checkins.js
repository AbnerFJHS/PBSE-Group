export function toCheckInRepresentation(row) {
  return {
    id: row.id,
    membershipId: row.membership_id,
    checkedInAt: row.checked_in_at.toISOString(),
    checkedOutAt: row.checked_out_at ? row.checked_out_at.toISOString() : null,
    status: row.status,
  };
}
