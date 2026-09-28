import { pool, withTransaction } from './db.js';
import * as idempotency from './idempotency.js';

const COLUMNS = 'c.id, c.membership_id, c.checked_in_at, c.checked_out_at, c.status';

export async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM check_ins c WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function list({ memberId, status, limit, cursor }) {
  const conditions = [];
  const params = [];
  if (memberId) { params.push(memberId); conditions.push(`m.member_id = $${params.length}`); }
  if (status)   { params.push(status);   conditions.push(`c.status = $${params.length}`); }
  if (cursor)   { params.push(cursor);   conditions.push(`c.id > $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT ${COLUMNS}
       FROM check_ins c
       JOIN memberships m ON m.id = c.membership_id
       ${where}
      ORDER BY c.id
      LIMIT $${params.length}`,
    params,
  );
  return rows;
}

/**
 * The whole idempotent create, in ONE transaction:
 *   lock key -> key seen? -> membership exists? -> active? -> insert -> store key.
 * The advisory lock makes two concurrent requests with the same key line up,
 * so the second one replays the first one's stored response instead of
 * racing it. `represent` is supplied by the caller (representations/ owns the
 * response shape; this layer only runs SQL).
 *
 * Returns { kind: 'replay'|'mismatch'|'no-membership'|'not-active'|
 *                 'already-checked-in'|'created', ... }
 */
export function createIdempotent({ key, bodyHash, membershipId, represent }) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);

    const seen = await idempotency.find(client, key);
    if (seen) {
      return seen.body_hash === bodyHash
        ? { kind: 'replay', status: seen.response_status, body: seen.response_body }
        : { kind: 'mismatch' };
    }

    const m = await client.query(
      'SELECT status FROM memberships WHERE id = $1 AND deleted_at IS NULL',
      [membershipId],
    );
    if (!m.rows[0]) return { kind: 'no-membership' };
    if (m.rows[0].status !== 'active') return { kind: 'not-active' };

    await client.query('SAVEPOINT insert_checkin');
    let row;
    try {
      ({ rows: [row] } = await client.query(
        `INSERT INTO check_ins (membership_id, status) VALUES ($1, 'active')
         RETURNING id, membership_id, checked_in_at, checked_out_at, status`,
        [membershipId],
      ));
    } catch (err) {
      if (err.code === '23505') { // partial unique index: one active check-in per membership
        await client.query('ROLLBACK TO SAVEPOINT insert_checkin');
        return { kind: 'already-checked-in' };
      }
      throw err;
    }

    const body = represent(row);
    await idempotency.record(client, key, bodyHash, 201, body);
    return { kind: 'created', body };
  });
}

/**
 * active -> completed in ONE statement, so two simultaneous check-outs cannot
 * both succeed. If nothing was updated, a second query tells 404 from 409.
 */
export async function checkOut(id) {
  const { rows } = await pool.query(
    `UPDATE check_ins
        SET status = 'completed', checked_out_at = now()
      WHERE id = $1 AND status = 'active'
      RETURNING id, membership_id, checked_in_at, checked_out_at, status`,
    [id],
  );
  if (rows[0]) return { kind: 'ok', row: rows[0] };
  const existing = await findById(id);
  return existing ? { kind: 'already-completed' } : { kind: 'not-found' };
}
