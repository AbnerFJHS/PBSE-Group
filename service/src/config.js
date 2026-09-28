const required = ['DATABASE_URL'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`required configuration missing: ${missing.join(', ')}`);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
};
