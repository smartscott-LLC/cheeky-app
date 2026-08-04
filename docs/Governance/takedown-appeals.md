# Takedown Notice & Appeals — Content Moderation Policy

> **Status:** binding on the build (per the Governance README). Backs the
> Stripe takedown-notice submission and the member-facing Acceptable Use
> Policy. Where the code does not yet automate a step (content holds, banned
> registry), the process below is the spec — operable today by human staff,
> with automation to follow. Overclaims are the enemy: we describe what we
> do and what we will build, never fiction.

## 1. How people report a policy-violating profile or content

Reporting is available through multiple, always-visible channels:

- **In-app Report/Block button** — one tap from any chat. The report is
  logged to our reports queue with the reporter, the subject, the content,
  and the timestamp.
- **The AI staff** — the crew (Brutus, the DJ, Roxy, Trixie, Valentina,
  Chaz) are present on every floor and take reports in conversation: they
  log the member, the incident, and the time, and provide assistance and
  routing if escalation is needed. They handle intake and triage; they do
  not adjudicate.
- **Direct support and safety contacts** — public mailboxes fielded by
  humans:
  - `info@smartscott.online` — general
  - `helpdesk@smartscott.online` — help and appeals
  - `date.safely@smartscott.online` — safety and reporting
  - `report-anonymous@smartscott.online` — anonymous reporting *(created;
    surfaced on the Contact page)*

## 2. How a submitted report is reviewed

- **Who:** review is layered. **Automated first pass:** a report is piped
  immediately to our automated image-review model — an OpenRouter-hosted
  reviewer that sits idle until a report triggers it (near-zero cost,
  fail-safe). It returns a verdict on the reported image/content within
  minutes (target: under 5). Clear violations are held and routed for human
  confirmation; inconclusive results go straight to human review. **Every
  ban is confirmed by a human.** The AI staff perform intake and triage in
  conversation; adjudication is human-led.
- **Immediate hold:** reported images/content are **held** (removed from
  public view) as soon as a report lands, while a decision is made — the
  safety of everyone involved comes before anyone's convenience. A hold is
  an action, not a verdict.
- **Targets (SLA):** automated first pass within minutes (under 5, aiming
  for 3); initial human review begins within a few hours of the report;
  straightforward cases resolve within 24–48 hours; escalated cases resolve
  within the appeal window below. Speed matters, accuracy matters more — a
  wrongful hold is lifted the moment the review clears it.
- **Actions — severity ladder:**
  - **5-year ban:** harassment, non-consensual behavior, and serious but
    non-criminal conduct. A report of non-consensual involvement lands a
    5-year expulsion.
  - **Permanent expulsion:** sexually explicit behavior — unsolicited
    explicit imagery or exposure. Gone for good, no exceptions.
  - **Permanent + authorities:** anything that appears to violate state or
    federal law — reported to the local authorities, with evidence
    preserved for lawful request.

## 3. How a reported user appeals a removal or ban

- **Window:** the affected member has **14 days** from the notice to appeal.
  If no appeal is filed within the 14-day limit, the decision is assumed
  correct and the punishment stands.
- **Human review:** a timely appeal triggers an exhaustive review by human
  staff. Both sides may submit evidence to substantiate their claims within
  a 14-day evidence period.
- **Decision:** at the end of the evidence period, a decision is made on the
  supporting evidence, with an interview arranged by the support desk (by
  phone or video call) if needed — within 3 days. The full appeal completes
  within roughly one month: expedient and thorough.
- **Wrongful bans are made right:** if a verdict of not guilty overturns a
  hold or ban, the hold is lifted, the account is restored, and any time
  lost on the platform is compensated per the member's choice — membership
  credit of equal value, or a refund through our payment processor.
- **Notice:** every outcome is communicated by the support desk by email —
  the decision, the examination results, and, where applicable, a detailed
  reason for how the conclusion was reached.

## 4. Banned-account registry & retention

- **Registry:** expelled accounts are flagged and recorded in a banned-
  account registry, consulted at membership/signup so banned users cannot
  simply re-register. Repeat offenders returning after serving a ban are
  banned for the life of the user.
- **Retention:** for incidents that may violate state or federal law, the
  username and non-government information are retained, along with any
  evidence collected during the investigation, for the length of the ban
  (5 years) in the event authorities request it. Standard records follow
  the data-retention policy (`data-retention-deletion.md`).

## 5. Cross-references

| Doc | Relationship |
|---|---|
| `aup-enforcement.md` | Detection, escalation ladder, report/block mechanics |
| `community-safety.md` | Conduct rules and the human-review process |
| `terms.md` | Bouncing, conduct, liability |
| `data-retention-deletion.md` | Retention windows and deletion |
| `stripe-prohibited-activities.md` | The platform-level prohibited-activity submission |

---

## Submission answer (corrected, copy-paste)

**Reporting methods.** Members can report a policy-violating profile or
content multiple ways: an in-app Report/Block button in any chat (one tap,
logged with member, content, and time); the AI staff, who take reports in
conversation, log the incident, and route it to the human process; and
public support/safety contacts — info@smartscott.online, helpdesk@smartscott.online,
date.safely@smartscott.online, and report-anonymous@smartscott.online —
all fielded by humans.

**Review.** A takedown is immediate upon report until a decision is reached —
an image block is applied to the user's profile content in the database, and
the image/content is immediately reviewed by the AI staff (under a 5-minute
response). If the allegation is false, the block is removed and an apology
email explaining the incident and procedure is sent. If the image/content is
in violation, the user responsible is immediately expelled from the app, and
an email is issued explaining the incident, the examination results, and the
detailed reason the conclusion was reached — they are made aware of the ban.
Our system then flags the account, and it is placed in a banned-account area
of the database that is referenced when a user applies for membership. If the
incident violates any state or federal laws, the user's username and
non-government information are retained along with any evidence collected
during the investigation, kept on file for 5 years (the length of the ban)
in the event authorities request it. Repeat offenders who return after
serving a ban are banned for the life of the user.

**Appeals.** The accused user has 14 days to appeal any punishment. If the
decision is not appealed within the 14-day limit, the verdict is assumed
correct and the punishment is carried out. A timely appeal triggers an
exhaustive review by a human, and both sides may submit evidence within a
14-day period. At the end of that period, a decision is made on the
supporting evidence and an interview (conducted by video chat) within 3
days. This completes the appeal within a one-month time frame — expedient
and thorough. Any time lost on the platform due to an incorrect accusation
and a verdict of not guilty is compensated to the user at their choice: a
refund to the original credit/debit payment method, or membership of equal
value.
