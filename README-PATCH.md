# Deploy Patch — Branch-wise customer block fix (corrected)

Only 2 files changed for this fix. Copy each into your existing deployment at
the same relative path, overwriting what's there:

- `web/app-runtime.js`   → replace
- `server/src/index.js`  → replace

No database migration needed — it reuses the `blocked_branches` column added
previously.

## What this fixes

The block check was comparing against the wrong "branch": the shipment
record's own branch field (which wasn't reliably reflecting the real
transaction context). It's now compared against the **branch of the staff
user account creating the shipment** (their `branchAccess`, set on their user
account) instead:

- A Kuwait HO staff user creating a shipment for a customer blocked only in
  Kuwait HO → still correctly blocked.
- A Dubai staff user creating a shipment for that same customer → no longer
  blocked, since the block was never applied to Dubai.
- A "Both"-access user (e.g. admin) → falls back to whichever branch they
  explicitly select on the shipment itself, since their account isn't tied to
  one branch.

Enforced both in the browser and on the server (server reads the branch from
the logged-in user's session token, not from the request body, so it can't be
spoofed by calling the API directly).

## After copying the files

1. **Restart/redeploy the server** so `server/src/index.js` takes effect.
2. **Redeploy/refresh the frontend** so `web/app-runtime.js` takes effect
   (clear any CDN/browser cache if your setup caches this file).
3. Existing customers blocked before this branch feature existed (no branch
   selected) stay blocked in every branch, exactly as before — this won't
   unblock anyone unexpectedly.
