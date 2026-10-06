import 'server-only';

/**
 * Didit session creation (docs/PRD-onboarding.md — the door check).
 * Server-side only; the API key never touches the browser.
 *
 * WORKFLOW_ID is per-session CONFIG, not a secret (Didit's own guidance):
 * "Compliance workflow" — OCR + passive liveness + face match, the ID +
 * face-scan flow the founder configured. The truth of the outcome arrives
 * ONLY via the signed webhook — the callback redirect is signage.
 */
const DIDIT_API = 'https://verification.didit.me/v3/session/';
// Verified against GET /v3/workflows/ on 2026-10-05: "Compliance workflow"
// (kyc) is 75dba526-… — the integration prompt's a816e112 id was a stale
// template placeholder and does not exist on the account. Env wins so the
// founder can retune without a redeploy; the verified id is the fallback.
const WORKFLOW_ID =
  process.env.DIDIT_WORKFLOW_ID || '75dba526-b2a1-4cc4-8a04-34faa174a005';

export async function createDiditSession(
  userId: string
): Promise<{ url?: string; error?: string }> {
  const res = await fetch(DIDIT_API, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.DIDIT_API_KEY ?? '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflow_id: WORKFLOW_ID,
      vendor_data: userId, // the join key: our uuid comes back on the webhook
      callback: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.smartscott.online'}/verify?checked=1`
    })
  });
  if (!res.ok) {
    console.error('didit session create failed:', res.status);
    return { error: 'verification unavailable' };
  }
  const session = (await res.json()) as { url?: string };
  return session.url ? { url: session.url } : { error: 'no session url' };
}
