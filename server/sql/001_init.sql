create table if not exists shipments (
    id bigserial primary key,
    job_no text not null unique,
    branch text not null default 'Branch 1',
    customer_name text not null,
    origin text not null default '',
    destination text not null default '',
    status text not null default 'Booked',
    booking_date date not null default current_date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists consolidations (
    id bigserial primary key,
    load_no text not null unique,
    trip_date date not null default current_date,
    route text not null default '',
    transporter text not null default '',
    vehicle_no text not null default '',
    status text not null default 'Planned',
    pieces integer not null default 0,
    actual_kg numeric(12, 3) not null default 0,
    cbm numeric(12, 3) not null default 0,
    chargeable_kg numeric(12, 3) not null default 0,
    job_numbers text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists customers (
    id bigserial primary key,
    code text not null unique,
    name text not null,
    location_or_lane text not null default '',
    email text not null default '',
    terms text not null default '30 days',
    status text not null default 'Active',
    is_account_overdue boolean not null default false,
    branch text not null default 'Branch 1',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_shipments_booking_date on shipments (booking_date desc);
create index if not exists idx_consolidations_trip_date on consolidations (trip_date desc);
create index if not exists idx_customers_created_at on customers (created_at desc);
