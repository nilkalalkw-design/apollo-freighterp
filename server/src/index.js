const express = require("express");
const cors = require("cors");
const fs = require("fs");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { allowedOrigins, autoMigrate, databaseHost, databaseUrl, databaseUrlSource, isNeonDatabase, port } = require("./config");
const { query, testConnection } = require("./db");
const { runMigrations } = require("./migrate");

const app = express();
const webDirCandidates = [path.resolve(__dirname, "..", "web"), path.resolve(__dirname, "..", "..", "web")];
const webDir = webDirCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) || webDirCandidates[0];
const webIndex = path.join(webDir, "index.html");
const runtimeStatus = {
  autoMigrate,
  databaseConfigured: Boolean(databaseUrl),
  databaseUrlSource: databaseUrlSource || "missing",
  migration: autoMigrate ? "pending" : "disabled",
  startupError: databaseUrl
    ? ""
    : "No database connection string was found. Set DATABASE_URL or one of the supported PostgreSQL aliases."
};

const demoRows = {
  shipments: [
    {
      id: 1,
      job_no: "AFS-2605001",
      branch: "Branch 1",
      customer_name: "Gulf Retail Trading",
      origin: "Kuwait City",
      destination: "Riyadh",
      status: "Booked",
      pieces: 14,
      actual_kg: 820,
      cbm: 5.2,
      chargeable_kg: 1040,
      sell: 485,
      buy_cost: 330,
      pod_status: "Pending",
      invoice_status: "Unbilled",
      booking_date: "2026-05-05",
      airway_bill_no: "AWB-2605001",
      tariff_no: "TAR-1001",
      transit_days: 3,
      shipment_direction: "Export",
      shipment_service: "AE",
      shipment_service_other: "",
      volume_category: "Land",
      chargeable_divisor: 250,
      created_at: new Date().toISOString()
    }
  ],
  consolidations: [
    {
      id: 1,
      load_no: "CON-260501",
      trip_date: "2026-05-05",
      route: "Kuwait - Riyadh",
      transporter: "Al Dana Transport",
      vehicle_no: "KWT-49217",
      status: "Dispatched",
      pieces: 14,
      actual_kg: 820,
      cbm: 5.2,
      chargeable_kg: 1040,
      job_numbers: "AFS-2605001",
      manifest_status: "Not Generated",
      last_manifest_request_no: "",
      created_at: new Date().toISOString()
    }
  ],
  customers: [
    {
      id: 1,
      code: "CUS-001",
      name: "Gulf Retail Trading",
      location_or_lane: "Kuwait City",
      full_address: "Kuwait City, Kuwait",
      email: "ops@gulf-retail.example",
      terms: "30 days",
      status: "Active",
      is_account_overdue: false,
      branch: "Branch 1",
      created_at: new Date().toISOString()
    }
  ],
  suppliers: [
    {
      id: 1,
      code: "TRN-001",
      name: "Al Dana Transport",
      location_or_lane: "Kuwait - Riyadh",
      full_address: "Kuwait - Riyadh lane office",
      email: "dispatch@aldana.example",
      terms: "20 days",
      status: "Active",
      is_account_overdue: false,
      branch: "Branch 1",
      service_type: "Transporter",
      created_at: new Date().toISOString()
    }
  ],
  tariffs: [
    {
      id: 1,
      tariff_no: "TAR-1001",
      customer: "Gulf Retail Trading",
      origin: "Kuwait City",
      destination: "Riyadh",
      main_section: "FTL",
      weight_section: "Minimum",
      min_up_to: "100 KG",
      rate_type: "Per KG",
      rate: 0.42,
      min_charge: 35,
      additional_charges_json: "[]",
      additional_charges_total: 0,
      grand_total: 35,
      volumetric_divisor: 5000,
      effective_from: "2026-01-01",
      effective_to: "2026-12-31",
      status: "Active"
    }
  ],
  documents: [
    {
      id: 1,
      document_no: "DOC-001",
      linked_no: "AFS-2605001",
      type: "Waybill",
      status: "Issued",
      date: "2026-05-05",
      owner: "operations",
      file_name: "AFS-2605001-waybill.pdf"
    }
  ],
  invoices: [
    {
      id: 1,
      invoice_no: "INV-260001",
      customer: "Gulf Retail Trading",
      shipment_no: "AFS-2605004",
      revenue: 95,
      supplier_cost: 70,
      gross_profit: 25,
      status: "Sent",
      date: "2026-05-02"
    }
  ],
  users: [
    {
      id: 1,
      user_name: "admin",
      email: "admin@apollofreightsolution.com",
      role: "Admin",
      account_status: "Active",
      branch_access: "Both",
      section_access: "All",
      password: "admin123",
      can_view_all_entry: true,
      can_view_only_self_entry: true,
      can_edit_all_entry: true,
      can_view_updated_history: true,
      notes: "Default test administrator"
    }
  ],
  "unblock-requests": [
    {
      id: 1,
      request_no: "REQ-2605001",
      request_type: "Unblock",
      target_type: "Customer",
      reference_no: "CUS-002",
      customer_name: "Desert Medical Supplies",
      requested_by: "operations",
      reason: "Credit release requested",
      status: "Pending",
      date: "2026-05-05"
    }
  ],
  "admin-requests": [
    {
      id: 1,
      request_no: "ADM-2605001",
      request_type: "Manifest Approval",
      target_module: "Consolidation",
      reference_no: "CON-260502",
      requested_by: "operations",
      status: "Pending",
      date: "2026-05-24",
      details: "Operations requested approval for consolidation edits before dispatch.",
      proposed_values: "Route: Kuwait - Dammam | Status: Planned | Jobs: AFS-2605002",
      approved_by: "",
      approval_notes: ""
    }
  ],
  "additional-charges": [
    {
      id: 1,
      ref_no: "CHG-001",
      shipment_no: "AFS-2605001",
      charge_date: "2026-05-24",
      charge_type: "Labour Charges",
      charge_basis: "1 ton",
      supplier: "ABC Labour",
      reference_no: "LAB-5001",
      invoice_no: "INV-LAB-001",
      amount: 50,
      tax_percent: 10,
      tax_amount: 5,
      total_amount: 55,
      currency: "KWD",
      remarks: "Labour support at warehouse dock.",
      attachment_name: "",
      status: "Approved",
      requested_by: "admin",
      approved_by: "admin",
      approval_notes: "Approved by admin"
    }
  ],
  audit: [
    {
      id: 1,
      date_time: "2026-05-05 09:15",
      user_name: "operations",
      action: "Created shipment",
      reference: "AFS-2605001",
      details: {}
    }
  ],
  settings: [
    {
      id: 1,
      settings_key: "default",
      company_name: "APOLLO FREIGHT SOLUTIONS",
      company_logo_url: "",
      shipment_number_format: "AFS-SI###",
      invoice_number_format: "INV-YY###",
      default_volumetric_divisor: "5000",
      require_pod_before_invoice: "Yes",
      branches: "Kuwait 1, Dubai 2",
      dropdown_options: "{}"
    }
  ]
};

const resources = {
  shipments: {
    table: "shipments",
    key: "job_no",
    order: "created_at desc",
    fields: [
      field("job_no", ["jobNo", "job_no"], true),
      field("branch"),
      field("customer_name", ["customerName", "customer", "customer_name"], true),
      field("origin"),
      field("destination"),
      field("status"),
      field("pieces"),
      field("actual_kg", ["actualKg", "actual_kg"]),
      field("cbm"),
      field("chargeable_kg", ["chargeableKg", "chargeable_kg"]),
      field("sell"),
      field("buy_cost", ["buyCost", "buy_cost"]),
      field("pod_status", ["podStatus", "pod_status"]),
      field("invoice_status", ["invoiceStatus", "invoice_status"]),
      field("booking_date", ["bookingDate", "booking_date"]),
      field("airway_bill_no", ["airwayBillNo", "airway_bill_no"]),
      field("tariff_no", ["tariffNo", "tariff_no"]),
      field("transit_days", ["transitDays", "transit_days"]),
      field("shipment_direction", ["shipmentDirection", "shipment_direction"]),
      field("shipment_service", ["shipmentService", "shipment_service"]),
      field("shipment_service_other", ["shipmentServiceOther", "shipment_service_other"]),
      field("volume_category", ["volumeCategory", "volume_category"]),
      field("chargeable_divisor", ["chargeableDivisor", "chargeable_divisor"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  consolidations: {
    table: "consolidations",
    key: "load_no",
    order: "trip_date desc, created_at desc",
    fields: [
      field("load_no", ["loadNo", "load_no"], true),
      field("trip_date", ["tripDate", "trip_date"]),
      field("route"),
      field("transporter"),
      field("vehicle_no", ["vehicleNo", "vehicle_no"]),
      field("status"),
      field("pieces"),
      field("actual_kg", ["actualKg", "actual_kg"]),
      field("cbm"),
      field("chargeable_kg", ["chargeableKg", "chargeable_kg"]),
      field("job_numbers", ["jobNumbers", "job_numbers"]),
      field("manifest_status", ["manifestStatus", "manifest_status"]),
      field("last_manifest_request_no", ["lastManifestRequestNo", "last_manifest_request_no"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  customers: partyResource("customers"),
  suppliers: partyResource("suppliers"),
  tariffs: {
    table: "tariffs",
    key: "tariff_no",
    order: "created_at desc",
    fields: [
      field("tariff_no", ["tariffNo", "tariff_no"], true),
      field("customer"),
      field("origin"),
      field("destination"),
      field("main_section", ["mainSection", "main_section"]),
      field("weight_section", ["weightSection", "weight_section"]),
      field("min_up_to", ["minUpTo", "min_up_to"]),
      field("rate_type", ["rateType", "rate_type"]),
      field("rate"),
      field("min_charge", ["minCharge", "min_charge"]),
      field("additional_charges_json", ["additionalChargesJson", "additional_charges_json"]),
      field("additional_charges_total", ["additionalChargesTotal", "additional_charges_total"]),
      field("grand_total", ["grandTotal", "grand_total"]),
      field("volumetric_divisor", ["volumetricDivisor", "volumetric_divisor"]),
      field("effective_from", ["effectiveFrom", "effective_from"]),
      field("effective_to", ["effectiveTo", "effective_to"]),
      field("status"),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  documents: {
    table: "documents",
    key: "document_no",
    order: "date desc, created_at desc",
    fields: [
      field("document_no", ["documentNo", "document_no"], true),
      field("linked_no", ["linkedNo", "linked_no"]),
      field("type"),
      field("status"),
      field("date"),
      field("owner"),
      field("file_name", ["fileName", "file_name"]),
      field("storage_url", ["storageUrl", "storage_url"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  invoices: {
    table: "invoices",
    key: "invoice_no",
    order: "date desc, created_at desc",
    fields: [
      field("invoice_no", ["invoiceNo", "invoice_no"], true),
      field("customer"),
      field("shipment_no", ["shipmentNo", "shipment_no"]),
      field("revenue"),
      field("supplier_cost", ["supplierCost", "supplier_cost"]),
      field("status"),
      field("date"),
      field("due_date", ["dueDate", "due_date"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ],
    readonlyFields: ["gross_profit"]
  },
  users: {
    table: "app_users",
    key: "user_name",
    order: "created_at desc",
    hiddenFields: ["password"],
    fields: [
      field("user_name", ["userName", "user_name"], true),
      field("email"),
      field("role"),
      field("account_status", ["accountStatus", "account_status"]),
      field("branch_access", ["branchAccess", "branch_access"]),
      field("section_access", ["sectionAccess", "section_access"]),
      field("password"),
      field("can_view_all_entry", ["canViewAllEntry", "can_view_all_entry"]),
      field("can_view_only_self_entry", ["canViewOnlySelfEntry", "can_view_only_self_entry"]),
      field("can_edit_all_entry", ["canEditAllEntry", "can_edit_all_entry"]),
      field("can_view_updated_history", ["canViewUpdatedHistory", "can_view_updated_history"]),
      field("notes")
    ]
  },
  "unblock-requests": {
    table: "unblock_requests",
    key: "request_no",
    order: "date desc, created_at desc",
    fields: [
      field("request_no", ["requestNo", "request_no"], true),
      field("request_type", ["requestType", "request_type"]),
      field("target_type", ["targetType", "target_type"]),
      field("reference_no", ["referenceNo", "reference_no"]),
      field("customer_name", ["customerName", "customer_name"]),
      field("requested_by", ["requestedBy", "requested_by"]),
      field("reason"),
      field("status"),
      field("date"),
      field("approved_by", ["approvedBy", "approved_by"]),
      field("notes")
    ]
  },
  "admin-requests": {
    table: "admin_requests",
    key: "request_no",
    order: "date desc, created_at desc",
    fields: [
      field("request_no", ["requestNo", "request_no"], true),
      field("request_type", ["requestType", "request_type"]),
      field("target_module", ["targetModule", "target_module"]),
      field("reference_no", ["referenceNo", "reference_no"]),
      field("requested_by", ["requestedBy", "requested_by"]),
      field("status"),
      field("date"),
      field("details"),
      field("proposed_values", ["proposedValues", "proposed_values"]),
      field("approved_by", ["approvedBy", "approved_by"]),
      field("approval_notes", ["approvalNotes", "approval_notes"]),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  "additional-charges": {
    table: "additional_charges",
    key: "ref_no",
    order: "charge_date desc, created_at desc",
    readonlyFields: ["tax_amount", "total_amount"],
    fields: [
      field("ref_no", ["refNo", "ref_no"], true),
      field("shipment_no", ["shipmentNo", "shipment_no"], true),
      field("charge_date", ["chargeDate", "charge_date"]),
      field("charge_type", ["chargeType", "charge_type"]),
      field("charge_basis", ["chargeBasis", "charge_basis"]),
      field("supplier"),
      field("reference_no", ["referenceNo", "reference_no"]),
      field("invoice_no", ["invoiceNo", "invoice_no"]),
      field("amount"),
      field("tax_percent", ["taxPercent", "tax_percent"]),
      field("currency"),
      field("remarks"),
      field("attachment_name", ["attachmentName", "attachment_name"]),
      field("status"),
      field("requested_by", ["requestedBy", "requested_by"]),
      field("approved_by", ["approvedBy", "approved_by"]),
      field("approval_notes", ["approvalNotes", "approval_notes"])
    ]
  },
  audit: {
    table: "audit_log",
    key: "id",
    order: "date_time desc",
    metaFields: [],
    fields: [
      field("date_time", ["dateTime", "date_time"]),
      field("user_name", ["userName", "user", "user_name"]),
      field("action"),
      field("reference"),
      field("details")
    ]
  },
  settings: {
    table: "app_settings",
    key: "settings_key",
    order: "id asc",
    metaFields: ["updated_at"],
    fields: [
      field("settings_key", ["settingsKey", "settings_key"]),
      field("company_name", ["companyName", "company_name"]),
      field("company_logo_url", ["companyLogoUrl", "company_logo_url"]),
      field("shipment_number_format", ["shipmentNumberFormat", "shipment_number_format"]),
      field("invoice_number_format", ["invoiceNumberFormat", "invoice_number_format"]),
      field("consolidation_number_format", ["consolidationNumberFormat", "consolidation_number_format"]),
      field("customer_number_format", ["customerNumberFormat", "customer_number_format"]),
      field("additional_charge_number_format", ["additionalChargeNumberFormat", "additional_charge_number_format"]),
      field("supplier_number_format", ["supplierNumberFormat", "supplier_number_format"]),
      field("default_volumetric_divisor", ["defaultVolumetricDivisor", "default_volumetric_divisor"]),
      field("require_pod_before_invoice", ["requirePodBeforeInvoice", "require_pod_before_invoice"]),
      field("branches"),
      field("dropdown_options", ["dropdownOptionsJson", "dropdown_options"])
    ]
  }
};

function field(column, names = [column], required = false) {
  return { column, names, required };
}

function partyResource(table) {
  return {
    table,
    key: "code",
    order: "created_at desc",
    fields: [
      field("code", ["code"], true),
      field("name", ["name"], true),
      field("location_or_lane", ["locationOrLane", "location_or_lane"]),
      field("full_address", ["fullAddress", "full_address"]),
      field("email"),
      field("terms"),
      field("status"),
      field("is_account_overdue", ["isAccountOverdue", "is_account_overdue"]),
      field("branch"),
      field("credit_limit", ["creditLimit", "credit_limit"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ]
  };
}

function isDatabaseSetupError(error) {
  return Boolean(
    error?.code === "42P01" ||
      error?.message?.includes("DATABASE_URL is required") ||
      error?.message?.includes("connect ECONNREFUSED") ||
      error?.message?.includes("does not exist")
  );
}

function columnsFor(config) {
  const metaFields = config.metaFields || ["created_at", "updated_at"];
  const hiddenFields = new Set(config.hiddenFields || []);
  const names = [
    "id",
    ...config.fields.map((item) => item.column).filter((column) => !hiddenFields.has(column)),
    ...(config.readonlyFields || []),
    ...metaFields
  ];
  return [...new Set(names)].join(", ");
}

function valueFromBody(body, item) {
  for (const name of item.names) {
    if (Object.prototype.hasOwnProperty.call(body, name)) {
      return body[name];
    }
  }

  return undefined;
}

function collectValues(config, body, includeKey = true) {
  const columns = [];
  const values = [];

  for (const item of config.fields) {
    if (!includeKey && item.column === config.key) {
      continue;
    }

    const value = valueFromBody(body, item);
    if (value === undefined || value === "") {
      continue;
    }

    columns.push(item.column);
    values.push(value);
  }

  return { columns, values };
}

function requireFields(config, columns) {
  const missing = config.fields
    .filter((item) => item.required)
    .filter((item) => !columns.includes(item.column))
    .map((item) => item.names[0]);

  if (missing.length) {
    const error = new Error(`${missing.join(", ")} required.`);
    error.status = 400;
    throw error;
  }
}

async function getRows(resourceName, config) {
  const result = await query(
    `select ${columnsFor(config)}
     from ${config.table}
     order by ${config.order}
     limit 500`
  );
  return {
    ok: true,
    rows: result.rows
  };
}

async function loginUser(identifier, password) {
  const result = await query(
    `select user_name, email, role, account_status, branch_access, section_access,
            can_view_all_entry, can_view_only_self_entry, can_edit_all_entry, can_view_updated_history
     from app_users
     where (lower(user_name) = lower($1) or lower(email) = lower($1))
       and password = $2
     limit 1`,
    [identifier, password]
  );

  return result.rows[0] || null;
}

async function insertRow(config, body) {
  const { columns, values } = collectValues(config, body);
  requireFields(config, columns);

  if (!columns.length) {
    const error = new Error("No values supplied.");
    error.status = 400;
    throw error;
  }

  const placeholders = values.map((_, index) => `$${index + 1}`);
  const updateColumns = columns.filter((column) => column !== config.key);
  const conflict = config.key
    ? updateColumns.length
      ? `on conflict (${config.key}) do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}`
      : `on conflict (${config.key}) do nothing`
    : "";
  const result = await query(
    `insert into ${config.table} (${columns.join(", ")})
     values (${placeholders.join(", ")})
     ${conflict}
     returning ${columnsFor(config)}`,
    values
  );
  return result.rows[0];
}

async function updateRow(config, id, body) {
  if (!config.key) {
    const error = new Error("This resource does not support direct updates.");
    error.status = 400;
    throw error;
  }

  const { columns, values } = collectValues(config, body, false);
  if (!columns.length) {
    const error = new Error("No values supplied.");
    error.status = 400;
    throw error;
  }

  const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
  values.push(id);
  const result = await query(
    `update ${config.table}
     set ${assignments.join(", ")}
     where ${config.key} = $${values.length}
     returning ${columnsFor(config)}`,
    values
  );

  if (!result.rows[0]) {
    const error = new Error("Record not found.");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function deleteRow(config, id) {
  if (!config.key) {
    const error = new Error("This resource does not support direct deletion.");
    error.status = 400;
    throw error;
  }

  const result = await query(
    `delete from ${config.table}
     where ${config.key} = $1
     returning ${columnsFor(config)}`,
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error("Record not found.");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function checkDatabaseReady() {
  const requiredTables = [
    "shipments",
    "consolidations",
    "customers",
    "suppliers",
    "tariffs",
    "documents",
    "invoices",
    "app_users",
    "unblock_requests",
    "admin_requests",
    "additional_charges",
    "app_settings"
  ];
  const result = await query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [requiredTables]
  );
  const existingTables = new Set(result.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));
  return {
    ready: missingTables.length === 0,
    missingTables
  };
}

function demoResponse(resourceName) {
  return {
    ok: true,
    mode: "demo",
    rows: demoRows[resourceName] || []
  };
}

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed.`));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

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
    const readiness = await checkDatabaseReady();
    const ready = readiness.ready;
    response.json({
      ok: true,
      service: "apollofreighterp-server",
      database: ready ? "connected" : "not-ready",
      mode: ready ? "database" : "setup",
      databaseConfigured: runtimeStatus.databaseConfigured,
      databaseUrlSource: runtimeStatus.databaseUrlSource,
      databaseHost,
      isNeonDatabase,
      allowedOrigins,
      autoMigrate: runtimeStatus.autoMigrate,
      migration: runtimeStatus.migration,
      missingTables: readiness.missingTables,
      startupError: ready ? runtimeStatus.startupError : runtimeStatus.startupError || `Missing tables: ${readiness.missingTables.join(", ")}`,
      error: ready ? "" : runtimeStatus.startupError || `Missing tables: ${readiness.missingTables.join(", ")}`,
      serverTime: db.server_time
    });
  } catch (error) {
    response.json({
      ok: true,
      service: "apollofreighterp-server",
      database: "disconnected",
      mode: "demo",
      databaseConfigured: runtimeStatus.databaseConfigured,
      databaseUrlSource: runtimeStatus.databaseUrlSource,
      databaseHost,
      isNeonDatabase,
      allowedOrigins,
      autoMigrate: runtimeStatus.autoMigrate,
      migration: runtimeStatus.migration,
      startupError: runtimeStatus.startupError,
      error: error.message
    });
  }
});

app.post("/api/login", async (request, response, next) => {
  const identifier = String(request.body?.userName || request.body?.email || "").trim();
  const password = String(request.body?.password || "");

  if (!identifier || !password) {
    return response.status(400).json({
      ok: false,
      error: "User name and password are required."
    });
  }

  try {
    const row = await loginUser(identifier, password);

    if (!row) {
      return response.status(401).json({
        ok: false,
        error: "Invalid login credentials."
      });
    }

    if (String(row.account_status || "Active").toLowerCase() !== "active") {
      return response.status(403).json({
        ok: false,
        error: "This user account is not active."
      });
    }

    return response.json({
      ok: true,
      session: {
        userName: row.user_name,
        email: row.email,
        role: row.role,
        branchAccess: row.branch_access,
        sectionAccess: row.section_access,
        canViewAllEntry: row.can_view_all_entry,
        canViewOnlySelfEntry: row.can_view_only_self_entry,
        canEditAllEntry: row.can_edit_all_entry,
        canViewUpdatedHistory: row.can_view_updated_history
      }
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      if ((identifier.toLowerCase() === "admin" || identifier.toLowerCase() === "admin@apollofreightsolution.com") && password === "admin123") {
        return response.json({
          ok: true,
          session: {
            userName: "admin",
            email: "admin@apollofreightsolution.com",
            role: "Admin",
            branchAccess: "Both",
            sectionAccess: "All"
          }
        });
      }

      return response.status(401).json({
        ok: false,
        error: "Invalid login credentials."
      });
    }

    return next(error);
  }
});

app.get("/api/:resource", async (request, response, next) => {
  const resourceName = request.params.resource;
  const config = resources[resourceName];

  if (!config) {
    return next();
  }

  try {
    response.json(await getRows(resourceName, config));
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json(demoResponse(resourceName));
    }

    return next(error);
  }
});

app.post("/api/:resource", async (request, response, next) => {
  const resourceName = request.params.resource;
  const config = resources[resourceName];

  if (!config) {
    return next();
  }

  try {
    const row = await insertRow(config, request.body || {});
    response.status(201).json({
      ok: true,
      row
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.status(201).json({
        ok: true,
        mode: "demo",
        row: request.body || {}
      });
    }

    return next(error);
  }
});

app.put("/api/:resource/:id", async (request, response, next) => {
  const resourceName = request.params.resource;
  const config = resources[resourceName];

  if (!config) {
    return next();
  }

  try {
    const row = await updateRow(config, decodeURIComponent(request.params.id), request.body || {});
    response.json({
      ok: true,
      row
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        row: request.body || {}
      });
    }

    return next(error);
  }
});

app.delete("/api/audit", async (_request, response, next) => {
  try {
    const result = await query("delete from audit_log returning id");
    response.json({
      ok: true,
      deleted: result.rowCount
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        deleted: 0
      });
    }

    return next(error);
  }
});

app.delete("/api/:resource/:id", async (request, response, next) => {
  const resourceName = request.params.resource;
  const config = resources[resourceName];

  if (!config) {
    return next();
  }

  try {
    const row = await deleteRow(config, decodeURIComponent(request.params.id));
    response.json({
      ok: true,
      row
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        row: {}
      });
    }

    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.status || 500).json({
    ok: false,
    error: error.message || "Unexpected server error."
  });
});

async function start() {
  if (autoMigrate) {
    try {
      await runMigrations();
      runtimeStatus.migration = "applied";
      runtimeStatus.startupError = "";
    } catch (error) {
      runtimeStatus.migration = "skipped";
      runtimeStatus.startupError = error.message;
      console.warn(`Database migration skipped: ${error.message}`);
    }
  }

  app.listen(port, () => {
    console.log(`ApolloFreightERP server running on port ${port}`);
  });
}

start();
