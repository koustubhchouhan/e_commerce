import { env } from '../config/env.js';

// Transactional email via Resend's HTTP API. We call it with the platform fetch
// instead of pulling in an SDK — one dependency less for a single POST. When
// RESEND_API_KEY is unset the mailer is a no-op so local dev and tests never
// need credentials; callers treat email as best-effort.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sends one email. Throws on a transport/API failure so the caller can log it;
// callers must not let that failure affect the order flow.
export async function sendMail({ to, subject, html, text }) {
  if (!env.mailConfigured) return { skipped: true };
  if (!to) return { skipped: true };

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.resend.from, to, subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend request failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  return { sent: true };
}
