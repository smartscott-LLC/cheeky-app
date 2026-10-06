import 'server-only';

/**
 * Didit session creation (docs/PRD-onboarding.md — the door check).
 * Server-side only; the API key never touches the browser.
 *
 * WORKFLOW_ID is per-session CONFIG, not a secret (Didit's own guidance).
 * The truth of the verification outcome arrives ONLY via the signed
 * webhook — the callback redirect is signage.
 */
const DIDIT_API = 'https://verification.didit.me/v3/session/';
// 2026-10-06: "Fast ID check" (e53ce2d4) — the founder rebuilt the flow for
// two-state compliance + the 50% ruling; the earlier "Compliance workflow"
// (75dba526) and the prompt's phantom id (a816e112) are both retired.
// Env wins so retuning needs no redeploy; the verified id is the fallback.
const WORKFLOW_ID =
  process.env.DIDIT_WORKFLOW_ID || 'e53ce2d4-42e5-48da-a6ad-61c44897c4e0';

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
