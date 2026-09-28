import { pool } from './db.js';

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT m.id, m.member_id, m.status, m.renews_on, p.name AS plan_name
       FROM memberships m
       JOIN membership_plans p ON p.id = m.plan_id
      WHERE m.id = $1 AND m.deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}
