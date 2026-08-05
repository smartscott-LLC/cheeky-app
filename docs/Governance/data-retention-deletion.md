# The Key Return — Data Retention & Deletion (Draft)

> **Draft — legal review required before public launch.**

## The framing

You hand the keys to the guy at the party; when you leave, you get them back.
Same with your data: we hold what the club needs to run, and you can take it
back whenever you want.

## Retention windows

| Data                        | Kept while                                                             | After that                                          |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| Profile (photos, bio, name) | Account active                                                         | Deleted on account deletion                         |
| Messages                    | **Member-chosen retention (3 days–3 months), set at profile creation** | Purged per the stricter participant's window (v1)   |
| Token ledger                | 7 years (financial records)                                            | Archived per law                                    |
| Verification result         | Account active                                                         | De-identified flag may remain for fraud/ban records |
| Raw ID docs / selfies       | Never stored by us                                                     | Provider processes and discards per their policy    |
| Reports / bans              | As needed for safety                                                   | Reviewed for purge                                  |

## Chat retention is your choice

Members pick their message retention at profile creation — anywhere from
**3 days to 3 months**. A purge job enforces it automatically.

In a shared conversation, the **stricter of the two participants' settings
applies** (v1). If members want fully independent windows later, we can move
from shared rows to per-participant copies.

## Account deletion (in-app)

- One tap from Account → confirm → deletion begins.
- Profile PII is wiped/de-identified immediately.
- Financial records (token ledger) are retained only as required by law.
- Deletion is irreversible. Grace: users are told clearly what disappears.

## Data export

- Members can request a copy of their personal data via support.
- Delivered in a portable format within a reasonable window.
  (Draft — exact window with counsel.)

## Notes

- We operate in multiple jurisdictions (e.g., GDPR, CCPA, BIPA awareness for
  biometric processing). The final retention schedule is set with counsel
  before public launch.
