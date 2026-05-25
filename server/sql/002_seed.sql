```sql id="yvjex4"
insert into shipments (
    job_no,
    branch,
    customer_name,
    origin,
    destination,
    status,
    pieces,
    actual_kg,
    cbm,
    chargeable_kg,
    sell,
    buy_cost,
    pod_status,
    invoice_status,
    booking_date,
    airway_bill_no,
    tariff_no,
    transit_days,
    shipment_direction,
    shipment_service,
    shipment_service_other,
    created_by
)
values
    ('AFS-2605001', 'Branch 1', 'Gulf Retail Trading', 'Kuwait City', 'Riyadh', 'Booked', 14, 820.000, 5.200, 1040.000, 485.000, 330.000, 'Pending', 'Unbilled', '2026-05-05', 'AWB-2605001', 'TAR-1001', 3, 'Export', 'AE', '', 'admin'),

    ('AFS-2605002', 'Branch 2', 'Desert Medical Supplies', 'Shuwaikh', 'Dammam', 'In-Transit', 8, 410.000, 2.100, 420.000, 215.000, 150.000, 'Pending', 'Unbilled', '2026-05-05', 'AWB-2605002', 'TAR-1002', 2, 'Import', 'AI', '', 'operations'),

    ('AFS-2605003', 'Branch 1', 'Al Noor Projects', 'Ahmadi', 'Doha', 'Delivered', 22, 1250.000, 7.800, 1560.000, 780.000, 590.000, 'Missing', 'Unbilled', '2026-05-04', 'AWB-2605003', 'TAR-1001', 4, 'Export', 'LE', '', 'operations'),

    ('AFS-2605004', 'Branch 1', 'Gulf Retail Trading', 'Kuwait City', 'Riyadh', 'Invoiced', 4, 160.000, 0.900, 180.000, 95.000, 70.000, 'Uploaded', 'INV-260001', '2026-05-02', 'AWB-2605004', 'TAR-1001', 3, 'Export', 'WHC', 'Warehouse handling and cross-docking', 'billing')

on conflict (job_no) do update set
    branch = excluded.branch,
    customer_name = excluded.customer_name,
    origin = excluded.origin,
    destination = excluded.destination,
    status = excluded.status,
    pieces = excluded.pieces,
    actual_kg = excluded.actual_kg,
    cbm = excluded.cbm,
    chargeable_kg = excluded.chargeable_kg,
    sell = excluded.sell,
    buy_cost = excluded.buy_cost,
    pod_status = excluded.pod_status,
    invoice_status = excluded.invoice_status,
    booking_date = excluded.booking_date,
    airway_bill_no = excluded.airway_bill_no,
    tariff_no = excluded.tariff_no,
    transit_days = excluded.transit_days,
    shipment_direction = excluded.shipment_direction,
    shipment_service = excluded.shipment_service,
    shipment_service_other = excluded.shipment_service_other,
    created_by = excluded.created_by;

insert into admin_requests (
    request_no,
    request_type,
    target_module,
    reference_no,
    requested_by,
    status,
    date,
    details,
    proposed_values
)
values
(
    'ADM-2605001',
    'Manifest Approval',
    'Consolidation',
    'CON-260502',
    'operations',
    'Pending',
    '2026-05-24',
    'Operations requested approval for consolidation edits before dispatch.',
    'Route: Kuwait - Dammam | Status: Planned | Jobs: AFS-2605002'
)
on conflict (request_no) do update set
    request_type = excluded.request_type,
    target_module = excluded.target_module,
    reference_no = excluded.reference_no,
    requested_by = excluded.requested_by,
    status = excluded.status,
    date = excluded.date,
    details = excluded.details,
    proposed_values = excluded.proposed_values;

insert into additional_charges (
    ref_no,
    shipment_no,
    charge_date,
    charge_type,
    charge_basis,
    supplier,
    reference_no,
    invoice_no,
    amount,
    tax_percent,
    currency,
    remarks,
    attachment_name,
    status,
    requested_by,
    approved_by,
    approval_notes
)
values
(
    'CHG-001',
    'AFS-2605001',
    '2026-05-24',
    'Labour Charges',
    '1 ton',
    'ABC Labour',
    'LAB-5001',
    'INV-LAB-001',
    50.000,
    10.000,
    'KWD',
    'Labour support at warehouse dock.',
    '',
    'Approved',
    'admin',
    'admin',
    'Approved by admin'
),
(
    'CHG-002',
    'AFS-2605001',
    '2026-05-24',
    'Delivery Charges',
    '3 ton',
    'Fast Van',
    'DLV-5001',
    'INV-DLV-001',
    20.000,
    10.000,
    'KWD',
    'Final-mile van delivery.',
    '',
    'Pending Approval',
    'operations',
    '',
    ''
)

on conflict (ref_no) do update set
    shipment_no = excluded.shipment_no,
    charge_date = excluded.charge_date,
    charge_type = excluded.charge_type,
    charge_basis = excluded.charge_basis,
    supplier = excluded.supplier,
    reference_no = excluded.reference_no,
    invoice_no = excluded.invoice_no,
    amount = excluded.amount,
    tax_percent = excluded.tax_percent,
    currency = excluded.currency,
    remarks = excluded.remarks,
    attachment_name = excluded.attachment_name,
    status = excluded.status,
    requested_by = excluded.requested_by,
    approved_by = excluded.approved_by,
    approval_notes = excluded.approval_notes;
```
