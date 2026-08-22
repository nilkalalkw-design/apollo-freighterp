# Deploy Patch — Manifest bulk status update false-block fix

2 files changed. Replace both in your deployment:

- `web/app-runtime.js`   → replace
- `server/src/index.js`  → replace

No database changes needed.

## What this fixes

The previous fix compared a customer's block against the branch of the
CURRENT LOGGED-IN STAFF USER's own account. That works for someone creating
one new shipment, but breaks bulk operations like "Update Manifest Status" -
which saves many shipments (potentially across different branches) in one go,
under one person's session. That person's own branch has nothing to do with
which branch each individual shipment actually belongs to, so shipments could
get falsely rejected as "customer blocked" even though the customer was
correctly unblocked and Active.

Now the check uses the actual shipment's own stored branch instead of the
operator's account branch. And when the branch genuinely can't be determined
for an older record, it no longer defaults to blocking - it lets the
operation through (a full block with no branch recorded, from before
per-branch tracking existed, still blocks everywhere as before - this only
changes the "we can't tell which branch" case).

## After copying the files

1. Restart/redeploy the server so `server/src/index.js` takes effect.
2. Redeploy/refresh the frontend so `web/app-runtime.js` takes effect (clear
   any CDN/browser cache if your setup caches this file).
