// The Swag Shop hook for the AI cast. Characters with a shelf can hand out
// small gift codes mid-conversation by writing a marker inline where the
// code should appear ([[SWAG:slug|optional reason]]). This transform converts
// the marker into a real code via the rule-set RPC — or, for owner-only
// items, flags the request so the owner sees why the cast asked (the flag
// job). The DB rule set is the hard backstop; this is the soft constraint.

import { generateSwagCode, flagSwagRequest } from '@/utils/swag';

// Which cast members have a swag shelf, and which items they may offer.
// Tune here; the DB enforces the weekly caps regardless.
export const CAST_SWAG: Record<string, string[]> = {
  chaz: ['teddy', 'golden_roses'],
  trixie: ['teddy', 'golden_roses']
};

export function hasSwagAccess(slug: string): boolean {
  return slug in CAST_SWAG;
}

/** Appended to the character's system prompt when they have a shelf. */
export function swagSystemNote(slug: string): string {
  const items = CAST_SWAG[slug] ?? [];
  if (items.length === 0) return '';
  return `
===== SWAG SHOP (you have a small shelf) =====
You may occasionally hand a member a free gift code when it genuinely helps (a struggling member, a kind moment). Never pressure, never push, never promise a specific item — the shelf can be empty or the item may need the owner.
To offer one, write EXACTLY [[SWAG:slug]] where the code should appear — slug is one of: ${items.join(', ')}. The front desk converts it into a real code the member redeems in the Swag Shop.
If the member deserves a bigger gesture (champagne, a gift basket, a membership), write [[SWAG:champagne|reason in a few words]] — the front desk notifies the owner, but DO NOT promise the item.`;
}

const MARKER = /\[\[SWAG:([a-z0-9_]+)(?:\|([^\]]{0,140}))?\]\]/;

async function handleMarker(
  actorSlug: string,
  memberUserId: string,
  slug: string,
  reason: string | null,
  allowed: string[]
): Promise<string> {
  if (allowed.includes(slug)) {
    const { code, error } = await generateSwagCode({
      benefitType: 'gift',
      benefitValue: slug,
      actorType: 'character',
      actorRef: actorSlug,
      notes: reason ?? null
    });
    if (code) return code;
    if (error === 'weekly_limit_reached') {
      return '*checks the shelf* ... empty this week, hon. Check back soon.';
    }
    console.error(`swag marker failed (${slug}):`, error);
    return '*checks the shelf* ... the front desk is restocking, hon.';
  }
  // Owner-only item — log the flag so the owner sees the why.
  await flagSwagRequest({
    userId: memberUserId,
    actorRef: actorSlug,
    benefitType: 'gift',
    benefitValue: slug,
    reason: reason ?? null
  });
  return '*The front desk has put in a word with the owner for you.*';
}

/**
 * Pipes a stream through marker replacement, preserving streaming order
 * (each marker is resolved before the text after it is emitted).
 */
export function swagMarkerTransform(
  actorSlug: string,
  memberUserId: string
): TransformStream<Uint8Array, Uint8Array> {
  const allowed = CAST_SWAG[actorSlug] ?? [];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBuffer = async (
    controller: TransformStreamDefaultController<Uint8Array>
  ) => {
    let m = MARKER.exec(buffer);
    while (m) {
      const before = buffer.slice(0, m.index);
      const after = buffer.slice(m.index + m[0].length);
      buffer = after;
      if (before) controller.enqueue(encoder.encode(before));
      const replacement = await handleMarker(
        actorSlug,
        memberUserId,
        m[1],
        m[2] ?? null,
        allowed
      );
      controller.enqueue(encoder.encode(replacement));
      m = MARKER.exec(buffer);
    }
    // Hold back any tail that could be a partially-streamed marker.
    const start = buffer.lastIndexOf('[[SWAG');
    if (start > 0) {
      controller.enqueue(encoder.encode(buffer.slice(0, start)));
      buffer = buffer.slice(start);
    } else if (start < 0) {
      controller.enqueue(encoder.encode(buffer));
      buffer = '';
    }
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      await processBuffer(controller);
    },
    async flush(controller) {
      buffer += decoder.decode();
      await processBuffer(controller);
    }
  });
}
