import './config.js'; // throws immediately if required env vars are missing
import express from 'express';
import crypto from 'node:crypto';
import { membershipsRouter } from './routes/memberships.js';
import { checkInsRouter } from './routes/checkins.js';
import { globalErrorHandler } from './problem.js';
import { config } from './config.js';

export const app = express();

// Every request gets an id; it becomes the Problem `instance` and the log key.
app.use((req, _res, next) => { req.id = crypto.randomUUID(); next(); });

app.use(express.json());

// Deliberately public, and deliberately does NOT check the database —
// see A.10 §4.
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/v1', membershipsRouter);
app.use('/v1', checkInsRouter);

// Wraps every route so an unhandled rejection in an async handler still
// reaches the global error handler instead of hanging the request.
app.use((err, req, res, next) => globalErrorHandler(err, req, res, next));

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => console.log(`listening on :${config.port}`));
}
