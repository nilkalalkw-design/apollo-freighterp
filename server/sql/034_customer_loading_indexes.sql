-- Speed up customer portal bootstrap queries that compare customer names
-- case-insensitively and sort the newest shipments first.
create index if not exists idx_shipments_customer_lower_booking_date
  on shipments (lower(customer_name), booking_date desc, created_at desc);
