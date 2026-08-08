# Lighthouse — score timeline

A running record of Lighthouse runs on `smartscott.online`, so we can see
what shipping features did to the scores over time and catch regressions
before they reach users.

## Convention

- One folder entry per run, named `YYYY-MM-DD_smartscott.online_<kind>.<ext>`:
  - `report.json` — the full machine-readable Lighthouse output (source of
    truth; new runs should always archive this)
  - `expanded.pdf` — printable expanded report
  - `download.pdf` — PageSpeed Insights / Chrome download
- Every run gets a row in the timeline below: date, scores, and what shipped
  since the previous run.
- Re-run before major launches and whenever perf work ships.

## Timeline

| Date | Perf | A11y | Best Practices | SEO | Notes |
|---|---|---|---|---|---|
| 2026-08-06 | 98 | 96 | 100 | 100 | Post-regression baseline — the 85–92 perf dip (next/image optimizer era) is fixed with static `<img>` + `fetchPriority="high"` on the LCP. Lighthouse 13.4.0, run 22:57 UTC. |
