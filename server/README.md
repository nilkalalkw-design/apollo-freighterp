# ApolloFreightERP Server

This is a separate backend service for the new `ApolloFreightERP` project only.

It is intended to run independently from any older live project, with:

- a separate Render service
- a separate PostgreSQL database
- separate environment variables
- separate deployment credentials

## Local setup

1. Copy `.env.example` to `.env`
2. Install packages:

```powershell
npm install
```

3. Create/update the database tables and seed data:

```powershell
npm run db:setup
```

4. Start the API:

```powershell
npm run dev
```

5. Test health:

```text
GET http://localhost:4000/api/health
```

## Render setup

1. Create a new Render Blueprint from this repo
2. Render reads the root `render.yaml`
3. Render creates a separate Node web service and PostgreSQL database
4. During setup, set `ALLOWED_ORIGIN` to your Vercel web URL

```text
https://apollo-freighterp.vercel.app
```

5. Render runs the SQL files automatically on startup when `AUTO_MIGRATE=true`

The `DATABASE_URL` value is provided by Render from the database connection string in `render.yaml`.

## Database files

- `sql/001_init.sql` creates the full ERP schema, indexes, triggers, and upgrade-safe columns.
- `sql/002_seed.sql` inserts starter customers, suppliers, jobs, consolidations, tariffs, invoices, users, settings, and audit rows.
- `sql/003_views.sql` creates reporting views for financials, pending POD, unbilled shipments, and consolidation manifests.
- `npm run db:setup` applies all SQL files in order.

Live API URL:

```text
https://apollo-freighterp-f9kt.onrender.com
```

## API routes

- `GET /api/health`
- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/consolidations`
- `POST /api/consolidations`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/tariffs`
- `POST /api/tariffs`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/users`
- `POST /api/users`
- `GET /api/unblock-requests`
- `POST /api/unblock-requests`
- `GET /api/audit`
- `POST /api/audit`
- `GET /api/settings`
- `POST /api/settings`
- `PUT /api/:resource/:id`
