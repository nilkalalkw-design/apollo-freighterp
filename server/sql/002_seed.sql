insert into customers (code, name, location_or_lane, email, terms, status, is_account_overdue, branch, credit_limit)
values
    ('CUS-001', 'Gulf Retail Trading', 'Kuwait City', 'ops@gulf-retail.example', '30 days', 'Active', false, 'Branch 1', 5000),
    ('CUS-002', 'Desert Medical Supplies', 'Shuwaikh', 'logistics@desert-med.example', '15 days', 'Active', true, 'Branch 2', 2500),
    ('CUS-003', 'Al Noor Projects', 'Ahmadi', 'cargo@alnoor.example', '45 days', 'Active', false, 'Branch 1', 7500)
on conflict (code) do update set
    name = excluded.name,
    location_or_lane = excluded.location_or_lane,
    email = excluded.email,
    terms = excluded.terms,
    status = excluded.status,
    is_account_overdue = excluded.is_account_overdue,
    branch = excluded.branch,
    credit_limit = excluded.credit_limit;

insert into suppliers (code, name, location_or_lane, email, terms, status, is_account_overdue, branch, service_type)
values
    ('TRN-001', 'Al Dana Transport', 'Kuwait - Riyadh', 'dispatch@aldana.example', '20 days', 'Active', false, 'Branch 1', 'Transporter'),
    ('TRN-002', 'Falcon Line Haul', 'Kuwait - Dammam', 'ops@falconline.example', '30 days', 'Active', false, 'Branch 2', 'Line Haul')
on conflict (code) do update set
    name = excluded.name,
    location_or_lane = excluded.location_or_lane,
    email = excluded.email,
    terms = excluded.terms,
    status = excluded.status,
    is_account_overdue = excluded.is_account_overdue,
    branch = excluded.branch,
    service_type = excluded.service_type;

insert into tariffs (
    tariff_no,
    customer,
    origin,
    destination,
    main_section,
    weight_section,
    rate_type,
    rate,
    min_charge,
    volumetric_divisor,
    effective_from,
    effective_to,
    status
)
values
    ('TAR-1001', 'Gulf Retail Trading', 'Kuwait City', 'Riyadh', 'FTL', 'Minimum', 'Per KG', 0.420, 35.000, 5000, '2026-01-01', '2026-12-31', 'Active'),
    ('TAR-1002', 'Desert Medical Supplies', 'Shuwaikh', 'Dammam', 'LTL', 'Up to 300 KG', 'Per CBM', 18.000, 55.000, 5000, '2026-01-01', '2026-12-31', 'Active')
on conflict (tariff_no) do update set
    customer = excluded.customer,
    origin = excluded.origin,
    destination = excluded.destination,
    main_section = excluded.main_section,
    weight_section = excluded.weight_section,
    rate_type = excluded.rate_type,
    rate = excluded.rate,
    min_charge = excluded.min_charge,
    volumetric_divisor = excluded.volumetric_divisor,
    effective_from = excluded.effective_from,
    effective_to = excluded.effective_to,
    status = excluded.status;

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
    created_by
)
values
    ('AFS-2605001', 'Branch 1', 'Gulf Retail Trading', 'Kuwait City', 'Riyadh', 'Booked', 14, 820.000, 5.200, 1040.000, 485.000, 330.000, 'Pending', 'Unbilled', '2026-05-05', 'AWB-2605001', 'TAR-1001', 3, 'admin'),
    ('AFS-2605002', 'Branch 2', 'Desert Medical Supplies', 'Shuwaikh', 'Dammam', 'In-Transit', 8, 410.000, 2.100, 420.000, 215.000, 150.000, 'Pending', 'Unbilled', '2026-05-05', 'AWB-2605002', 'TAR-1002', 2, 'operations'),
    ('AFS-2605003', 'Branch 1', 'Al Noor Projects', 'Ahmadi', 'Doha', 'Delivered', 22, 1250.000, 7.800, 1560.000, 780.000, 590.000, 'Missing', 'Unbilled', '2026-05-04', 'AWB-2605003', 'TAR-1001', 4, 'operations'),
    ('AFS-2605004', 'Branch 1', 'Gulf Retail Trading', 'Kuwait City', 'Riyadh', 'Invoiced', 4, 160.000, 0.900, 180.000, 95.000, 70.000, 'Uploaded', 'INV-260001', '2026-05-02', 'AWB-2605004', 'TAR-1001', 3, 'billing')
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
    transit_days = excluded.transit_days;

insert into consolidations (
    load_no,
    trip_date,
    route,
    transporter,
    vehicle_no,
    status,
    pieces,
    actual_kg,
    cbm,
    chargeable_kg,
    job_numbers,
    created_by
)
values
    ('CON-260501', '2026-05-05', 'Kuwait - Riyadh', 'Al Dana Transport', 'KWT-49217', 'Dispatched', 18, 980.000, 6.100, 1220.000, 'AFS-2605001, AFS-2605004', 'admin'),
    ('CON-260502', '2026-05-06', 'Kuwait - Dammam', 'Falcon Line Haul', 'KWT-77320', 'Planned', 8, 410.000, 2.100, 420.000, 'AFS-2605002', 'operations')
on conflict (load_no) do update set
    trip_date = excluded.trip_date,
    route = excluded.route,
    transporter = excluded.transporter,
    vehicle_no = excluded.vehicle_no,
    status = excluded.status,
    pieces = excluded.pieces,
    actual_kg = excluded.actual_kg,
    cbm = excluded.cbm,
    chargeable_kg = excluded.chargeable_kg,
    job_numbers = excluded.job_numbers;

insert into documents (document_no, linked_no, type, status, date, owner, file_name)
values
    ('DOC-001', 'AFS-2605001', 'Waybill', 'Issued', '2026-05-05', 'operations', 'AFS-2605001-waybill.pdf'),
    ('DOC-002', 'AFS-2605003', 'POD', 'Missing', '2026-05-04', 'delivery', ''),
    ('DOC-003', 'AFS-2605004', 'Customer Invoice', 'Stored', '2026-05-02', 'billing', 'INV-260001.pdf')
on conflict (document_no) do update set
    linked_no = excluded.linked_no,
    type = excluded.type,
    status = excluded.status,
    date = excluded.date,
    owner = excluded.owner,
    file_name = excluded.file_name;

insert into invoices (invoice_no, customer, shipment_no, revenue, supplier_cost, status, date)
values
    ('INV-260001', 'Gulf Retail Trading', 'AFS-2605004', 95.000, 70.000, 'Sent', '2026-05-02'),
    ('DRAFT-260006', 'Al Noor Projects', 'AFS-2605003', 780.000, 590.000, 'Draft', '2026-05-05')
on conflict (invoice_no) do update set
    customer = excluded.customer,
    shipment_no = excluded.shipment_no,
    revenue = excluded.revenue,
    supplier_cost = excluded.supplier_cost,
    status = excluded.status,
    date = excluded.date;

insert into app_users (
    user_name,
    email,
    role,
    account_status,
    branch_access,
    password,
    can_view_all_entry,
    can_view_only_self_entry,
    can_edit_all_entry,
    can_view_updated_history,
    notes
)
values
    ('admin', 'admin@apollofreightsolution.com', 'Admin', 'Active', 'Both', 'admin123', true, true, true, true, 'Default test administrator'),
    ('operations', 'ops@apollofreightsolution.com', 'Operations', 'Active', 'Branch 1', 'ops123', true, true, false, true, 'Operations user')
on conflict (user_name) do update set
    email = excluded.email,
    role = excluded.role,
    account_status = excluded.account_status,
    branch_access = excluded.branch_access,
    password = excluded.password,
    can_view_all_entry = excluded.can_view_all_entry,
    can_view_only_self_entry = excluded.can_view_only_self_entry,
    can_edit_all_entry = excluded.can_edit_all_entry,
    can_view_updated_history = excluded.can_view_updated_history,
    notes = excluded.notes;

insert into unblock_requests (request_no, customer_name, requested_by, reason, status, date)
values
    ('REQ-2605001', 'Desert Medical Supplies', 'operations', 'Credit release requested', 'Pending', '2026-05-05')
on conflict (request_no) do update set
    customer_name = excluded.customer_name,
    requested_by = excluded.requested_by,
    reason = excluded.reason,
    status = excluded.status,
    date = excluded.date;

insert into app_settings (
    settings_key,
    company_name,
    shipment_number_format,
    invoice_number_format,
    default_volumetric_divisor,
    require_pod_before_invoice,
    branches
)
values
    ('default', 'Apollo Freight Solutions', 'AFS-YY####', 'INV-YY####', '5000', 'Yes', 'Branch 1, Branch 2')
on conflict (settings_key) do update set
    company_name = excluded.company_name,
    shipment_number_format = excluded.shipment_number_format,
    invoice_number_format = excluded.invoice_number_format,
    default_volumetric_divisor = excluded.default_volumetric_divisor,
    require_pod_before_invoice = excluded.require_pod_before_invoice,
    branches = excluded.branches;

insert into audit_log (date_time, user_name, action, reference, details)
values
    ('2026-05-05 09:15:00+03', 'operations', 'Created shipment', 'AFS-2605001', '{"source":"seed"}'),
    ('2026-05-05 10:05:00+03', 'billing', 'Generated invoice', 'INV-260001', '{"source":"seed"}')
on conflict do nothing;
