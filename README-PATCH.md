# Deploy Patch — file-for-file replacement

This zip contains only the 4 files that changed. Copy each one into your existing
deployment at the same relative path, overwriting what's there:

- `web/app-runtime.js`      → replace
- `web/styles.css`          → replace
- `server/src/index.js`     → replace
- `server/sql/023_customer_supplier_blocked_branches.sql` → add (new file, don't overwrite anything)

Nothing else in your deployed project needs to change.

## After copying the files

1. **Run the new migration.** This project auto-applies any `.sql` file in
   `server/sql/` it hasn't seen yet on server startup (see `autoMigrate` in your
   server config/env). If your environment does that automatically, a normal
   restart/redeploy of the server is enough. If migrations are applied manually in
   your environment, run `023_customer_supplier_blocked_branches.sql` against the
   database yourself before starting the new server code — it just adds one
   nullable `blocked_branches` text column to `customers` and `suppliers`
   (`alter table ... add column if not exists ...`), so it's safe to run even if
   it's accidentally run twice.
2. **Restart/redeploy the server** so `server/src/index.js` takes effect.
3. **Redeploy/refresh the frontend** so `web/app-runtime.js` and `web/styles.css`
   take effect (clear any CDN/browser cache if your setup caches these files).

See `CHANGELOG-erp-fixes.md` (from the full project zip) for a detailed
requirement-by-requirement list of what changed and why.
