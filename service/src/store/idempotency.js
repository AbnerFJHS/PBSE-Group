import crypto from 'node:crypto';

export function hashBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

// Both functions take a transaction client so the key row and the entity it
// protects commit (or roll back) together.
export async function find(client, key) {
  const { rows } = await client.query(
    'SELECT body_hash, response_status, response_body FROM idempotency_keys WHERE key = $1',
    [key],
  );
  return rows[0] ?? null;
}

export async function record(client, key, bodyHash, status, body) {
  await client.query(
    `INSERT INTO idempotency_keys (key, body_hash, response_status, response_body)
     VALUES ($1, $2, $3, $4)`,
    [key, bodyHash, status, JSON.stringify(body)], // JSON text keeps key order → byte-identical replays
  );
}
