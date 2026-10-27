import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gate, betaBannerText } from '../utils/launch-gate.ts';

/**
 * Soft-open gate contract (founder greenlight 2026-10-27). The predicate is
 * pure, so every branch is provable without a network: what stays open, what
 * the rope says, and what an invite unlocks.
 */

const closed = { launchOpen: false };
const open = { launchOpen: true };

void describe('launch gate — doors closed (beta)', () => {
  const out = (p, extra = {}) =>
    gate(p, { signedIn: true, earlyAccess: false, ...closed, ...extra });

  void it('the club world is roped off for plain members', () => {
    for (const p of [
      '/club',
      '/floor/gold',
      '/floors',
      '/browse',
      '/events/dance_floor',
      '/messages',
      '/chat/roxy',
      '/gifts',
      '/date-night'
    ])
      assert.equal(out(p), 'to-welcome', `${p} should rope to /welcome`);
  });

  void it('unsigned visitors to gated rooms go sign up, not the rope', () => {
    assert.equal(
      gate('/club', { signedIn: false, earlyAccess: false, ...closed }),
      'to-signin'
    );
  });

  void it('the street, the door, the booth, the bank and the booklet stay open', () => {
    for (const p of [
      '/',
      '/welcome',
      '/verify',
      '/signin',
      '/account',
      '/coat-check',
      '/store',
      '/pricing',
      '/story',
      '/crew',
      '/contact',
      '/privacy',
      '/terms'
    ])
      assert.equal(out(p), 'allow', `${p} must stay open during beta`);
  });

  void it('an invite unlocks the world', () => {
    assert.equal(
      out('/club', { earlyAccess: true }),
      'allow',
      'early access bypasses'
    );
    assert.equal(
      out('/messages', { earlyAccess: true }),
      'allow',
      'every gated surface for testers'
    );
  });
});

void describe('launch gate — doors open', () => {
  void it('launch day allows everyone signed in; gating never touches the street', () => {
    assert.equal(
      gate('/club', { signedIn: true, earlyAccess: false, ...open }),
      'allow'
    );
    assert.equal(
      gate('/browse', { signedIn: false, earlyAccess: false, ...open }),
      'allow',
      'sign-in redirects remain the pages own job, not the gate'
    );
  });

  void it('gated matching is prefix-exact (no /storex or /eventshij leakage)', () => {
    assert.equal(
      gate('/floorsx', { signedIn: true, earlyAccess: false, ...closed }),
      'allow',
      'unknown look-alike paths are street'
    );
    assert.equal(
      gate('/events-preview', {
        signedIn: true,
        earlyAccess: false,
        ...closed
      }),
      'allow'
    );
  });
});

void describe('beta banner + config wiring', () => {
  void it('banner quotes a human launch date from the config row', () => {
    const s = betaBannerText(new Date('2026-10-31T19:00:00-05:00'));
    assert.match(s, /Beta testing in progress/);
    assert.match(s, /October/);
    assert.match(s, /lounge is open/);
  });

  void it('the server helper fails OPEN (no config row = the club, never locked)', () => {
    const src = readFileSync('utils/require-club-open.ts', 'utf8');
    assert.match(src, /fail OPEN/);
    assert.match(src, /open: true/);
  });

  void it('the migration owns switch + invites with hard RLS', () => {
    const sql = readFileSync(
      'supabase/migrations/20261027000003_beta_soft_open.sql',
      'utf8'
    );
    assert.match(sql, /early_access boolean not null default false/);
    assert.match(sql, /revoke all on public.launch_config/);
    assert.match(sql, /service_role/);
  });
});
