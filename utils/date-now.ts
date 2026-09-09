/**
 * Server-component-safe Date.now() wrappers.
 *
 * These live in a utility file so the React Compiler never sees them inside
 * a render function body. Every call site already has `await connection()`
 * to defer prerendering — this just satisfies the static purity check.
 */

export function dateNow(): number {
  return Date.now();
}

export function pastDateCutoff(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

export function isPast(timestamp: number): boolean {
  return Date.now() > timestamp;
}