-- Ensure the branch-specific job serial columns always exist and the shared settings row exists.
alter table app_settings add column if not exists kuwait_shipment_serial_start integer not null default 1;
alter table app_settings add column if not exists dubai_shipment_serial_start integer not null default 1;

insert into app_settings (
  settings_key,
  company_name,
  company_logo_url,
  shipment_number_format,
  kuwait_shipment_number_format,
  dubai_shipment_number_format,
  kuwait_shipment_serial_start,
  dubai_shipment_serial_start,
  invoice_number_format,
  consolidation_number_format,
  tcn_number_format,
  delivery_note_number_format,
  document_number_format,
  tariff_number_format,
  customer_number_format,
  additional_charge_number_format,
  supplier_number_format,
  quotation_number_format,
  awb_number_format,
  default_volumetric_divisor,
  require_pod_before_invoice,
  branches,
  dropdown_options
)
values (
  'default',
  'APOLLO FREIGHT SOLUTIONS',
  '',
  'AFS-SI###',
  'AFS-#####/MM/KWI/{SERVICE}',
  'AFS-#####/MM/DBX/{SERVICE}',
  1,
  1,
  'INV-YY###',
  'CON-YY###',
  'TCN-YY###',
  'POD-YY###',
  'DOC-YY###',
  'TAR-###',
  'CUS-###',
  'CHG-YY###',
  'TRN-###',
  'QUO-YY###',
  'AWB-YY###',
  '5000',
  'Yes',
  'Kuwait HO, Dubai',
  '{}'
)
on conflict (settings_key) do nothing;

-- The web client may briefly hold an older settings snapshot. Do not let that stale snapshot
-- silently reset an already configured branch serial back to the default value of 1.
create or replace function protect_branch_shipment_serial_start()
returns trigger as $$
begin
  if old.kuwait_shipment_serial_start > 1 and new.kuwait_shipment_serial_start = 1 then
    new.kuwait_shipment_serial_start := old.kuwait_shipment_serial_start;
  end if;

  if old.dubai_shipment_serial_start > 1 and new.dubai_shipment_serial_start = 1 then
    new.dubai_shipment_serial_start := old.dubai_shipment_serial_start;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_branch_shipment_serial_start on app_settings;
create trigger trg_protect_branch_shipment_serial_start
before update on app_settings
for each row
execute function protect_branch_shipment_serial_start();
