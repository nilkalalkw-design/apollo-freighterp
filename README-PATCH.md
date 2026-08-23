# Deploy Patch — Split-POD critical bug fixes (SUPERSEDES the two previous POD patches)

This replaces both the "Split / Partial POD generation" patch and the "POD
print layout fixes" patch sent earlier - it contains everything from both
PLUS three critical fixes found on re-inspection. Use this one instead of
the earlier two.

3 files - replace/add each at the same relative path:

- `web/app-runtime.js`   → replace
- `server/src/index.js`  → replace
- `server/sql/024_shipment_pod_splits.sql` → add (if you haven't already -
  harmless to re-run if you have)

## Bugs found and fixed in this pass

1. **`pod_splits_json` was wired to the wrong resource on the server** - it
   had accidentally been registered under `quotations` instead of
   `shipments`. This meant delivery splits would never actually reach the
   database (silently dropped on save), and saving a quotation could throw a
   database error. Fixed: it's now correctly registered on `shipments` only.

2. **Delivery details weren't being saved at all** - this app stores many
   shipment fields (including all delivery/POD details) inside one JSON
   blob column (`notes`), and every save path needs to rebuild that blob
   before saving. The new POD save function was missing this step, so the
   "latest delivery" info would silently revert to old data after a page
   reload. Fixed.

3. **Delivery history would vanish after every page reload** - even after
   fix #1, the app never read the saved split data back out of the database
   when loading shipments. The data was safe in the database the whole
   time, but the app wouldn't display it after a refresh. Fixed.

None of these would have been obvious from just using the feature once in a
single session (everything looks fine until you reload the page or check the
database) - caught by a full save → reload → re-display trace.

## Also included (from the earlier two patches, unchanged)

- Split/partial POD generation: record a shipment's delivery in multiple
  parts (e.g. 10 of 26 pallets to one location, 16 to another), each with
  its own signed POD PDF, its own file, and the shipment only becomes fully
  "Delivered" once every piece is accounted for.
- Receiver Remarks box (2 blank lines) added to the printed POD.
- Signature block made smaller with tighter spacing, on screen and in print.
- "Delivery Sequence" (e.g. "Delivery 2 of 2") shown on every printed POD.
- Delivery Address confirmed correct per-split, now also shown in the
  in-app delivery history list for easy visual verification.

## After copying the files

1. Restart/redeploy the server (runs the migration if not already applied).
2. Redeploy/refresh the frontend (clear any CDN/browser cache).
