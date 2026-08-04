# Language Notes — Writing for External Review (Internal)

> Founder's lesson, 2026-08-03. **Internal only — never attach to submissions.**
> This is the playbook for how we write when the words go outside the club,
> plus the truthful record of what is and isn't built so we never overclaim —
> to reviewers or to ourselves.

## The rules

1. **Never label a statement "honest."** "Honest note:" tells the reader the
   rest might not be. The whole document is honest, or it isn't worth
   writing. If a note is needed, it's "Note."
2. **Highlight victories. Let them find the failures.** Never volunteer a
   limitation the reviewer didn't ask about — it hands them a question to
   write down that they may never have thought to ask.
3. **State the positive, once, and stop.** "We rely on Stripe Identity's
   document and liveness checks as the verification authority." Period. No
   "and we don't do X ourselves" — they already know we rely on Stripe;
   restating it from the negative angle just raises doubt.
4. **Know why you're using each word.** Language is the most powerful tool we
   have. Before a sentence ships, ask: what is this doing, and what are the
   ramifications? Inclusive not exclusive. Victories before hedges.
5. **Opposites of the honest-note trap:** no "we will not overclaim," no
   "this is a build not yet shipped" in submission text — those are internal
   truths, not external answers.

## The internal truth record (what is and isn't built — for us only)

- **Not built (yet):** automated content/image scanning of messages or
  photos; the DateSafe report pipeline (report button → vision-AI intake →
  automated first review) — design locked, build pending the founder's
  OpenRouter key + model; the automatic content-hold-on-report mechanism;
  the banned-account registry referenced at signup; the 14-day appeal timer;
  email-sending beyond Supabase auth emails; video-chat feature (appeal
  interviews are arranged by the support desk by phone/video call).
- **Built and real:** verification-as-entry via Stripe Identity (ID + live
  selfie, 18+ gate, result-only storage); honeypot bot traps + DB shutdown
  triggers; RLS on every table + server-enforced RPCs; daily messaging caps
  with no paid bypass; report/block from any chat with human review;
  escalation ladder; mutual-compatibility filtering; data minimization
  (PII split, 3–90-day message retention, in-app deletion).
- **Open question:** `report-anonymous@smartscott.online` — claimed in the
  takedown submission; confirm the mailbox exists and surface it on the
  Contact page, or remove it from the answer.
- **The process we describe is the spec.** Where automation isn't built, the
  human process is operable today (the founder is the escalation desk); the
  docs are binding and the code marches to them as we build.

## How to use this file

Before any external-facing answer: check rule 1–3 against every sentence.
Check the truth record so we never claim a build we haven't shipped. When a
build lands, move it from "not built" to "built and real."
