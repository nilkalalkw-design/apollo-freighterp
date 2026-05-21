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

3. Start the API:

```powershell
npm run dev
```

4. Test health:

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

5. After the database is created, run the SQL in `sql/001_init.sql` on the Render database

The `DATABASE_URL` value is provided by Render from the database connection string in `render.yaml`.

Live API URL:

```text
https://apollo-freighterp-f9kt.onrender.com
```

## Initial API routes

- `GET /api/health`
- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/consolidations`
- `GET /api/customers`
