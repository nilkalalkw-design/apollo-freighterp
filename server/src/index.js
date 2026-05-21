const express = require("express");
const cors = require("cors");
const fs = require("fs");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { port, allowedOrigin } = require("./config");
const { query, testConnection } = require("./db");

const app = express();
const webDir = path.resolve(__dirname, "..", "web");
const webIndex = path.join(webDir, "index.html");

const demoShipments = [
  {
    id: 1,
    job_no: "AFS-DEMO-001",
    branch: "Branch 1",
    customer_name: "Gulf Retail Trading",
    origin: "Kuwait City",
    destination: "Riyadh",
    status: "Booked",
    booking_date: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

const demoConsolidations = [
  {
    id: 1,
    load_no: "CON-DEMO-001",
    trip_date: new Date().toISOString(),
    route: "Kuwait - Riyadh",
    transporter: "Al Dana Transport",
    vehicle_no: "KWT-DEMO",
    status: "Planned",
    pieces: 14,
    actual_kg: 820,
    cbm: 5.2,
    chargeable_kg: 1040,
    job_numbers: "AFS-DEMO-001",
    created_at: new Date().toISOString()
  }
];

const demoCustomers = [
  {
    id: 1,
    code: "CUS-DEMO-001",
    name: "Gulf Retail Trading",
    location_or_lane: "Kuwait City",
    email: "ops@example.com",
    terms: "30 days",
    status: "Active",
    is_account_overdue: false,
    branch: "Branch 1",
    created_at: new Date().toISOString()
  }
];

function isDatabaseSetupError(error) {
  return Boolean(
    error?.code === "42P01" ||
      error?.message?.includes("DATABASE_URL is required") ||
      error?.message?.includes("connect ECONNREFUSED") ||
      error?.message?.includes("does not exist")
  );
}

app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

if (fs.existsSync(webIndex)) {
  app.use(express.static(webDir));
}

app.get("/", (_request, response) => {
  if (fs.existsSync(webIndex)) {
    return response.sendFile(webIndex);
  }

  return response.json({
    ok: true,
    service: "apollofreighterp-server",
    web: "https://apollo-freighterp.vercel.app",
    health: "/api/health"
  });
});

app.get("/api/health", async (_request, response) => {
  try {
    const db = await testConnection();
    response.json({
      ok: true,
      service: "apollofreighterp-server",
      database: "connected",
      serverTime: db.server_time
    });
  } catch (error) {
    response.json({
      ok: true,
      service: "apollofreighterp-server",
      database: "disconnected",
      mode: "demo",
      error: error.message
    });
  }
});

app.get("/api/shipments", async (_request, response) => {
  try {
    const result = await query(
      `
        select
          id,
          job_no,
          branch,
          customer_name,
          origin,
          destination,
          status,
          booking_date,
          created_at
        from shipments
        order by created_at desc
        limit 100
      `
    );

    response.json({
      ok: true,
      rows: result.rows
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        rows: demoShipments
      });
    }

    response.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/shipments", async (request, response) => {
  const {
    jobNo,
    branch,
    customerName,
    origin,
    destination,
    status,
    bookingDate
  } = request.body || {};

  if (!jobNo || !customerName) {
    return response.status(400).json({
      ok: false,
      error: "jobNo and customerName are required."
    });
  }

  try {
    const result = await query(
      `
        insert into shipments
          (job_no, branch, customer_name, origin, destination, status, booking_date)
        values
          ($1, $2, $3, $4, $5, $6, coalesce($7, current_date))
        returning *
      `,
      [
        jobNo,
        branch || "Branch 1",
        customerName,
        origin || "",
        destination || "",
        status || "Booked",
        bookingDate || null
      ]
    );

    return response.status(201).json({
      ok: true,
      row: result.rows[0]
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.status(201).json({
        ok: true,
        mode: "demo",
        row: {
          id: Date.now(),
          job_no: jobNo,
          branch: branch || "Branch 1",
          customer_name: customerName,
          origin: origin || "",
          destination: destination || "",
          status: status || "Booked",
          booking_date: bookingDate || new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      });
    }

    return response.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/consolidations", async (_request, response) => {
  try {
    const result = await query(
      `
        select
          id,
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
          created_at
        from consolidations
        order by trip_date desc, created_at desc
        limit 100
      `
    );

    response.json({
      ok: true,
      rows: result.rows
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        rows: demoConsolidations
      });
    }

    response.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/customers", async (_request, response) => {
  try {
    const result = await query(
      `
        select
          id,
          code,
          name,
          location_or_lane,
          email,
          terms,
          status,
          is_account_overdue,
          branch,
          created_at
        from customers
        order by created_at desc
        limit 100
      `
    );

    response.json({
      ok: true,
      rows: result.rows
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        rows: demoCustomers
      });
    }

    response.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    ok: false,
    error: error.message || "Unexpected server error."
  });
});

app.listen(port, () => {
  console.log(`ApolloFreightERP server running on port ${port}`);
});
