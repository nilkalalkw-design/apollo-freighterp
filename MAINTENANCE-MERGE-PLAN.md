# Maintenance Portal Merge – Safe Working Branch

Working branch: `maintenance-portal-merge`

## Objective

Keep `apollo-freighterp` as the master web application and integrate the existing web functionality from `apollo-freight` as a Maintenance Portal without changing the live `main` branch.

## Existing Maintenance functionality to preserve

- Login / session restore
- 30-minute inactivity logout
- User management and permissions
- Vehicle list and vehicle history
- Add/edit vehicle
- Expense entry
- Paid/unpaid expense status
- Expense history
- Vehicle/driver/search filters
- Date-range reports
- Vehicle and expense-type filters
- KWD/AED totals
- Excel export
- PDF export
- Password reset flow

## Target architecture

`apollo-freighterp` remains the master repository.

- One web application
- Existing ERP Portal remains unchanged
- Existing HR Portal remains unchanged
- Existing Customer Portal remains unchanged
- New Maintenance Portal uses the main ERP deployment
- One backend/API
- One PostgreSQL database
- Existing maintenance data is migrated only after a database backup and schema verification

## Safety rule

No changes are made to the live `main` branch by this work. All integration work is performed on `maintenance-portal-merge` until local/new deployment testing is complete.

## Migration order

1. Preserve the existing ERP code.
2. Recreate the Maintenance client functionality inside the ERP web application.
3. Add Maintenance API endpoints to the ERP backend.
4. Add Maintenance database migration tables.
5. Migrate existing maintenance users, vehicles and expenses into the main database after backup.
6. Verify record counts, totals, permissions and reports.
7. Deploy this branch as a new Vercel/Render test environment.
8. Only after successful testing, merge to `main` and switch production configuration.

## Important

Do not delete either existing Vercel project, Render service, or database until the new deployment has been fully tested and the migrated data has been verified.
