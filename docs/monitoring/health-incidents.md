# Health incidents

The health verdict and the GitHub workflow conclusion serve different purposes.
The report retains ROT for a technical finding. A workflow failure means a NEW
operator escalation or a broken checker/delivery/storage operation, rather than
every repetition of an already reported incident.

- Explicit cause keys survive changing timings, sample URLs and messages.
- HTTP failures, security failures and broken critical checks escalate immediately.
- Other technical causes escalate on their third observed run. Two independent
  slow fresh Atlas samples also escalate immediately. The counterprobe visits
  different URLs and districts; HIT/STALE never clear a slow fresh build.
- Missing evidence preserves the prior incident. Measured recovery is recorded;
  recurrence starts a new incident and can escalate again.
- Technical escalations use GitHub notifications. Actual operator decisions use
  `/api/alert`; they are not also turned into GitHub failures.
- The `health-incidents` artifact holds state and the full measured report for
  90 days. Only main-branch reports from this repository are trusted; same-name
  artifacts from forks are excluded. Every run refreshes it, including escalation runs. State is saved only
  after successful alert handling, and uploaded before deliberate escalation.
- The workflow serializes runs. Missing/corrupt history fails loudly. First
  installation requires an explicit manual `bootstrap=true` run; do not reset
  an established history to clear an alert.
- Autofix reads the report regardless of the workflow conclusion. A broken
  checker without a report also requests repair. The daily budget counts actual
  model steps, including failed/in-progress analyses, not gate/skipped runs.
- Social expiry checks return observed account state on every run; there is no
  pre-delivery database acknowledgement. Read errors are unknown, not recovery.
- Placement snapshot validation brackets its reads with active-generation checks
  and retries once on generation changes, avoiding a mixed-generation alarm.
  Matching counts and a timestamp after the source data-as-of date are necessary
  checks, not a full content comparison or proof of the latest refresh run.

Operational limits: GitHub artifacts must remain available. Deleting all of them
or suspending monitoring beyond retention requires an explicit bootstrap and
loses deduplication history. Alert delivery and artifact persistence cannot form
one atomic transaction: a storage failure after successful mail delivery can
cause a retry. Such infrastructure failures remain visible, not silently green.
