import { randomUUID } from 'node:crypto';

// Accept an inbound correlation id only when it is short and made of safe
// characters — this prevents log injection / header abuse while still letting a
// caller (or upstream proxy) correlate its own id.
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Assigns every request a correlation id, echoes it on the response, and stores
// it on `req.id` so logs and error responses can be tied together.
export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}
