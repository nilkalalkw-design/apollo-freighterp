# APOLLO FREIGHT SOLUTION - Cargo Shipments ERP

Tagline: We Bring Continents closer...

Brand mark: A F S in orange.

Web console and Render API for land freight shipment operations.

## Deployment

- Backend API: `server/` on Render
- Web console: `web/` on Vercel
- Database: a separate Render PostgreSQL database

Keep this project fully isolated from any older live project:

- do not reuse the old database
- do not reuse the old backend
- do not reuse old environment variables
- do not reuse old Vercel or Render projects

## Included Modules

- Dashboard
- Shipments / Jobs
- Consolidation
- Customers
- Suppliers / Transporters
- Tariffs / Rate Master
- Documents
- Billing / Invoices
- POD / Delivery
- Reports
- User Management / Settings
- Audit Log

## Current Version

This build uses the live Render API and PostgreSQL database for shipments, consolidations, customers, suppliers, tariffs, documents, invoices, additional charges, users, admin requests, settings, and audit data.

## Test Login

- User name: `admin`
- Password: `admin123`

## Render And Vercel

Render deploys the API and database from the root `render.yaml`.

Vercel deploys the static web console from `web/`.

Important: create the Render deployment from the repo-root Blueprint. If the API service is created manually, Render will not auto-create the PostgreSQL database or attach `DATABASE_URL`.

Recommended GitHub deployment settings:

```text
Render Blueprint: use render.yaml from the repo root
Vercel Root Directory: web
Vercel Framework Preset: Other
Vercel Build Command: empty
Vercel Output Directory: .
```

Live deployment URLs:

```text
GitHub: https://github.com/nilkalalkw-design/apollo-freighterp
Render API: https://apollo-freighterp-f9kt.onrender.com
Vercel Web: https://apollo-freighterp.vercel.app
```

The new backend is in `server/`, and the web console is in `web/`.

Database setup is now included:

- `server/sql/001_init.sql`
- `server/sql/002_seed.sql`
- `server/sql/003_views.sql`
- `npm run db:setup` from `server/`

See:

```text
ApolloFreightERP\server\README.md
ApolloFreightERP\web\README.md
```

It is prepared as a separate Node.js API service for Render with its own PostgreSQL connection and SQL starter schema.
