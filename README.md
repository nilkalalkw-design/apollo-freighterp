# APOLLO FREIGHT SOLUTION - Cargo Shipments ERP

Tagline: We Bring Continents closer...

Brand mark: A F S in orange.

Native Windows WPF starter application for land freight shipment operations.

## Separate Deployment Plan

This repo now supports a separate backend path for this new project only.

- Desktop app: this WPF project
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

This first build is a professional clickable MVP shell with sample operational data, tables, forms, alerts, login, password reset screen, admin user setup, permissions, update history, and a working chargeable-weight calculator. It is ready to extend with a database, document storage, invoice printing, SMTP email, authentication security, and real CRUD persistence.

## Test Login

- User name: `admin`
- Password: `admin123`

## Logo

Attach/copy your logo into:

```text
ApolloFreightERP\Assets\company-logo.png
```

Accepted names:

- `logo.png`
- `logo.jpg`
- `logo.jpeg`
- `company-logo.png`
- `company-logo.jpg`
- `company-logo.jpeg`

After adding the logo, run publish again so the logo is copied into the test setup folder.

## Run

Build:

```powershell
dotnet build .\ApolloFreightERP.csproj
```

Run the generated Windows executable:

```powershell
.\bin\Debug\net8.0-windows\Apollo Freight ERP.exe
```

## Test Release Build

Publish a clean Windows test build:

```powershell
dotnet publish .\ApolloFreightERP.csproj -c Release -r win-x64 --self-contained false -o .\publish\win-x64-test
```

Run:

```powershell
.\publish\win-x64-test\Apollo Freight ERP.exe
```

## Self-Contained Test Setup

This package is best for quick testing on Windows:

```powershell
dotnet publish .\ApolloFreightERP.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o .\publish\win-x64-self-contained-test
```

Run:

```powershell
.\publish\win-x64-self-contained-test\Apollo Freight ERP.exe
```

## Render And Vercel

Render deploys the API and database from the root `render.yaml`.

Vercel deploys the static web console from `web/`.

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

See:

```text
ApolloFreightERP\server\README.md
ApolloFreightERP\web\README.md
```

It is prepared as a separate Node.js API service for Render with its own PostgreSQL connection and SQL starter schema.
