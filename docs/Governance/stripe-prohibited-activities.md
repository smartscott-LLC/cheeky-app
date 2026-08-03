# Club Cheeky — Prohibited Activities Protocols

> Submission document for platform review. Each numbered section stands alone
> and may be pasted into the corresponding question. Every control described
> here is enforced in code (RLS, server-side RPCs, triggers, verification
> state) — not aspirational policy. Cross-references:
> `docs/Governance/aup-enforcement.md`, `community-safety.md`,
> `verification-age.md`, `privacy.md`, `data-retention-deletion.md`.

---

## The foundation — applies to all four below

Club Cheeky is a dating and matchmaking platform built on a verified-identity
foundation. Protocols are layered — prevent, detect, respond, monitor.

- **Verification-as-entry (the door):** every member passes a government ID +
  live selfie check via Stripe Identity before they can interact with other
  members. Guests are confined to the public street level — they cannot
  message, match, or attend events. The door enforces an 18+ gate.
- **Identity anchoring:** one account per verified identity; gender is
  declared at signup; a mutual-compatibility filter means members only see
  and are seen by people within their stated preference.
- **Automated tripwires:** honeypot traps flag and shut down bot accounts at
  the database level (no messages, likes, waves, or event entries). All
  interactions run through server-side functions enforcing rate limits,
  blocks, and account status under row-level security. The client is never
  trusted. Messaging has hard daily caps with no paid bypass.
- **An AI staff on every floor:** the club is staffed by AI characters — a
  bouncer, a DJ, a bartender, a waitress, a hostess, and a general manager —
  present on every floor and privy to real-time member context. They engage
  members proactively and are trained to recognize signals of coercion,
  distress, or prohibited conduct. When a member raises any safety concern,
  the AI immediately directs them to the in-app Report/Block tools and
  reassures them a human reviews every report. Anything beyond the AI's
  authority escalates to the human owner for review, from any floor.
- **Response is human:** reports are reviewed by humans; we do not auto-ban
  on word filters. Violations escalate warning → temporary timeout →
  permanent bounce, with serious or illegal content skipping to a permanent
  bounce. Escalations are private, every ban is appealable via a human desk,
  and a dedicated safety email (`date.safely@smartscott.online`) is a direct
  line for concerns.
- **Monitoring & minimization:** Sentry and PostHog provide runtime and
  product observability; an owner back door gives the operator direct review
  of flags and account states. Raw ID material is never stored (Stripe
  Identity returns only a result), PII is segregated behind row-level
  security, messages are retained 3–90 days at the member's choice, and
  accounts can be deleted in-app.

---

## 1. Protocols for identifying and preventing Human or Sex Trafficking

**Prevention.** The platform is structurally hostile to trafficking because
it cannot be used anonymously. Every member is a verified adult: a
government ID and live selfie checked through Stripe Identity, with an
enforced 18+ gate and one account per verified identity. A trafficker cannot
easily operate behind a real, checked identity, and a victim cannot be
trafficked through a platform where every account is tied to a government ID.

**Detection.** Beyond the door: honeypot traps remove bot/fraud accounts at
the database level; server-side rate limits and row-level security bound
abuse. The AI staff are present on every floor, privy to real-time member
context, and trained to recognize coercion indicators — a member expressing
they are being forced, controlled, surveilled, or unable to leave freely.
The AI responds by directing the member to the in-app Report/Block tools and
the safety desk, and escalates to the human owner.

**Response.** Reports involving possible trafficking or coercion are
prioritized and reviewed by a human. Where indicators warrant, we cooperate
with law enforcement per our law-enforcement protocol — including account
preservation on valid request and disclosure only under valid legal process.
The safety desk (`date.safely@smartscott.online`) provides a confidential,
direct line.

**Honest note.** We do not scan message content automatically. Detection is
behavioral (verification, honeypots, limits) plus human review of reports.
Our posture is that the platform makes trafficking structurally difficult —
not that it can detect it without member reporting or lawful process.

---

## 2. Protocols for identifying and preventing Illegal Acts

**Prevention.** Our Terms and Acceptable Use Policy prohibit illegal conduct
— harassment, threats, stalking, explicit content, hate, impersonation,
illegal solicitation, and spam — with enforcement backed in code. The only
payment rail is Stripe (memberships and in-app tokens); there is no
marketplace for illicit goods, no peer-to-peer payments, and tokens are a
server-side ledger only, never redeemable for cash.

**Detection.** Bot and fraud accounts are caught by honeypot traps and shut
down at the database level. Every interaction flows through server-side
functions enforcing rate limits, blocks, and account status under row-level
security. Sentry and PostHog provide observability, and the owner back door
gives the operator direct review of flags and account states. The AI staff
on every floor are privy to real-time member context and steer any disclosure
of illegal activity into the human reporting process.

**Response.** Reports are reviewed by humans. Illegal content results in a
permanent bounce (no warnings for threats or illegal material), private
escalation, and appeal through a human desk. Where lawful process demands,
we cooperate with law enforcement per our law-enforcement protocol and
preserve accounts on valid request.

**Honest note.** We do not run automated content scanning of messages or
photos. Detection is behavioral plus human review, and enforcement is
escalation + lawful cooperation — we do not overclaim automated content
understanding.

---

## 3. Protocols for identifying and preventing Impersonation

**Prevention.** Impersonation is structurally prevented by verification:
every account is bound to a government ID + live selfie checked through
Stripe Identity (which includes face-matching the selfie to the ID). One
account per person, one identity per account — fake profiles are a bouncing
offense under our Terms, and anonymous sock-puppeting is not possible past
the door.

**The platform's own AI never impersonates.** The crew (Brutus, the DJ,
Roxy, Trixie, Valentina, Chaz) are AI characters, clearly labeled as AI on
every surface where they appear. Their house rules explicitly forbid
claiming to be human or a real member. The platform itself does not engage
in impersonation.

**Detection & response.** Any report of impersonation — using someone else's
photos, name, or identity — is reviewed by a human and results in a
permanent bounce when confirmed. Blocked accounts cannot pair, message, or
join events. Appeals are handled by a human desk.

**Honest note.** Profile photos are not continuously re-verified after the
door; impersonation via photos is caught by member reporting and human
review, then removed permanently.

---

## 4. Protocols for identifying and preventing Child Sexual Abuse Material (CSAM)

**Prevention — the strongest layer.** Club Cheeky is structurally adults-only:
every member must present a government ID and live selfie through Stripe
Identity, which enforces an 18+ gate that minors cannot pass. There is no
anonymous or unverified route to the platform's interactive features.
Explicit content of any kind is prohibited by our Terms and Acceptable Use
Policy.

**Detection.** Members can report from any chat in one tap. Reports are
reviewed by humans — we do not auto-adjudicate on word filters. The AI staff,
present on every floor and privy to member context, are instructed that any
disclosure involving a minor or exploitative content goes immediately to the
human process.

**Response — zero tolerance.** Any CSAM report or discovery results in:
immediate permanent account bounce; retention of relevant records in
accordance with legal obligations; and mandatory reporting to the National
Center for Missing & Exploited Children (NCMEC CyberTipline) and law
enforcement, in line with our law-enforcement protocol. We cooperate fully
with valid legal process and preserve accounts on request.

**Honest note.** We do not yet run automated perceptual hash scanning (for
example, PhotoDNA-style matching) of uploaded images, and we will not
overclaim that we do. Our CSAM posture is: minors cannot join (enforced ID
verification), explicit content is prohibited and human-reviewed, and any
report is a zero-tolerance permanent bounce with mandatory reporting to
NCMEC and law enforcement.

---

## 5. Controls around profile verification during registration

Club Cheeky uses Stripe Identity itself to verify every member during
registration — the platform's verification control is Stripe's own
verification product.

- **Verification is a prerequisite, not a checkbox.** Registration creates a
  Guest confined to the public street level — no messaging, no matching, no
  events. Before any interactive feature, the member must pass the Door
  Check.
- **The Door Check requires a government-issued ID and a live selfie,**
  submitted through Stripe Identity, which validates the document, checks
  liveness, and face-matches the selfie to the ID. The check enforces our
  18+ gate at the door.
- **We store only the result** — `verified_at`, provider reference, and
  outcome. We never store the ID document, the selfie, or the ID number;
  raw verification material is not retained by us.
- **Consent is explicit and separate:** members consent to identity
  verification and biometric processing before the check runs, recorded in
  our `consents` table — never buried in the Terms.
- **Identity is anchored:** one account per verified identity; gender is
  declared at signup; the verification result powers the VIP badge, the free
  Silver card, and the welcome token grant.
- **In-product framing:** the Door Check is Brutus the bouncer's job — the
  AI staff direct members to the door and never bypass it.
- **Failed checks grant nothing.** Bot-flagged accounts cannot verify through
  to interactive features, and the operator can review verification state at
  any time through the owner back door.
- **Minimization:** account deletion wipes the verification state per our
  retention and deletion policy; a de-identified fraud flag may remain.

**Honest note.** We rely on Stripe Identity's document/liveness checks as the
verification authority; we do not run our own document-fraud analysis beyond
what Stripe Identity provides.

---

*Living document — refined as the club grows. Backed by the policy layer in
`docs/Governance/`. If automated content scanning is required by a platform
or jurisdiction, it is a defined build we will ship and document here.*
