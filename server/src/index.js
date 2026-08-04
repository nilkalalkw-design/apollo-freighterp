const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { allowedOrigins, autoMigrate, customerPortalSecret, databaseHost, databaseUrl, databaseUrlSource, isCloudSqlSocket, isNeonDatabase, port } = require("./config");
const { query, testConnection } = require("./db");
const { runMigrations } = require("./migrate");

const app = express();
app.set("trust proxy", 1);
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

// Simple in-memory rate limiter for auth-sensitive endpoints. Deliberately dependency-free and
// generous (won't interfere with normal usage/testing) - it only slows down rapid brute-force attempts.
function rateLimiter({ windowMs, max, keyFor }) {
  const hits = new Map();
  return (request, response, next) => {
    const key = (keyFor ? keyFor(request) : request.ip) || "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return response.status(429).json({ ok: false, error: "Too many attempts. Please wait a few minutes and try again." });
    }
    return next();
  };
}
const loginRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  keyFor: (request) => `${request.ip}:${String(request.body?.userName || request.body?.email || request.body?.customerCode || "").trim().toLowerCase()}`
});

const demoRows = {
  shipments: [
    {
      id: 1,
      job_no: "AFS-2605001",
      branch: "Kuwait HO",
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
      branch: "Kuwait HO",
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
      branch: "Kuwait HO",
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
      currency: "KD",
      weight_rates_json: JSON.stringify({ minimum: 0.42, upTo100: 0.42, upTo300: 0.42, upTo500: 0.42, upTo1000: 0.42, more: 0.42 }),
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
      branch_view_scope: "All Branches",
      section_access: "All",
      can_view_all_entry: true,
      can_view_only_self_entry: true,
      can_edit_all_entry: true,
      can_view_updated_history: true,
      notes: "Default test administrator"
    }
  ],
  "unblock-requests": [],
  "admin-requests": [],
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
  audit: [],
  employees: [
    {
      id: 1,
      user_name: "admin",
      employee_code: "EMP-0001",
      full_name: "System Administrator",
      department: "Management",
      designation: "Administrator",
      join_date: "2024-01-01",
      phone: "",
      personal_email: "",
      employment_status: "Active",
      reporting_manager: "",
      notes: "Demo employee record"
    }
  ],
  "leave-requests": [],
  payslips: [],
  "hr-announcements": [
    {
      id: 1,
      title: "Welcome to the HR Portal",
      body: "This is a demo announcement. Connect a database to start managing real employee records, leave requests, payslips, and announcements.",
      posted_by: "admin",
      audience: "All",
      pinned: true,
      posted_at: new Date().toISOString()
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
      branches: "Kuwait HO, Dubai",
      dropdown_options: "{}"
    }
  ]
};

const CUSTOMER_PORTAL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const APP_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function normalizePortalStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isPortalActive(value) {
  return normalizePortalStatus(value) === "active";
}

function hashCustomerPassword(password, salt = crypto.randomBytes(8).toString("hex")) {
  const derived = crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
  return "pbkdf2$120000$" + salt + "$" + derived;
}

function verifyCustomerPassword(password, storedHash) {
  const text = String(storedHash || "");
  if (!text) return false;
  if (!text.startsWith("pbkdf2$")) return String(password || "") === text;
  const parts = text.split("$");
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1] || 120000);
  const salt = parts[2] || "";
  const expected = parts[3] || "";
  const actual = crypto.pbkdf2Sync(String(password || ""), salt, iterations, expected.length / 2, "sha256").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return actual === expected;
  }
}

function signCustomerToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", customerPortalSecret).update(body).digest("base64url");
  return body + "." + signature;
}

function verifyCustomerToken(token) {
  const value = String(token || "").trim();
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const body = parts[0];
  const signature = parts[1];
  const expected = crypto.createHmac("sha256", customerPortalSecret).update(body).digest("base64url");
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload && payload.exp && Date.now() > Number(payload.exp)) return null;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function customerSessionFromRow(row) {
  const payload = {
    customerUserId: String(row.id || ""),
    customerCode: String(row.customer_code || "").trim(),
    customerName: String(row.customer_name || "").trim(),
    userName: String(row.username || "").trim(),
    email: String(row.email || "").trim(),
    role: "Customer",
    portal: "customer",
    branchAccess: String(row.customer_branch || row.branch || "Customer Portal").trim() || "Customer Portal",
    branchViewScope: "Assigned Branch Only",
    sectionAccess: "Dashboard, New Shipment, Shipments, Tracking, Profile, Notifications, Activity Logs",
    status: String(row.status || "ACTIVE").toUpperCase(),
    lastLogin: row.last_login || ""
  };

  return {
    ...payload,
    token: signCustomerToken({ ...payload, exp: Date.now() + CUSTOMER_PORTAL_TOKEN_TTL_MS })
  };
}

function customerPortalAuthFromRequest(request) {
  const bearer = String(request.headers.authorization || "").trim();
  const token = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : String(request.headers["x-customer-token"] || request.headers["x-portal-token"] || "").trim();
  return verifyCustomerToken(token);
}

function requireCustomerPortalAuth(request, response, next) {
  const session = customerPortalAuthFromRequest(request);
  if (!session) {
    return response.status(401).json({ ok: false, error: "Customer login required." });
  }

  request.customerSession = session;
  return next();
}

function appAuthFromRequest(request) {
  const bearer = String(request.headers.authorization || "").trim();
  const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  if (!token) return null;
  const payload = verifyCustomerToken(token);
  return payload && payload.portal === "app" ? payload : null;
}

function requireAppAuth(request, response, next) {
  const session = appAuthFromRequest(request);
  if (!session) {
    return response.status(401).json({ ok: false, error: "Login required." });
  }

  request.appSession = session;
  return next();
}
async function getCustomerAccount(identifier) {
  const result = await query(
    `select cu.id, cu.customer_code, cu.username, cu.email, cu.password_hash, cu.status, cu.last_login,
            c.name as customer_name, c.branch as customer_branch, c.status as customer_status
     from customer_users cu
     left join customers c on lower(c.code) = lower(cu.customer_code)
     where lower(cu.username) = lower($1) or lower(cu.email) = lower($1) or lower(cu.customer_code) = lower($1)
     limit 1`,
    [identifier]
  );

  return result.rows[0] || null;
}

async function loginCustomer(identifier, password) {
  const account = await getCustomerAccount(identifier);
  if (!account) return null;
  if (!isPortalActive(account.status)) return null;
  const customerLinked = account.customer_status !== null && account.customer_status !== undefined;
  if (customerLinked && !isPortalActive(account.customer_status)) return null;
  if (!verifyCustomerPassword(password, account.password_hash)) return null;

  await query(
    `update customer_users
     set last_login = now()
     where id = $1`,
    [account.id]
  );

  return customerSessionFromRow(account);
}

async function nextShipmentRequestNo() {
  const result = await query(
    `select request_no
     from shipment_requests
     order by id desc
     limit 1`
  );
  const last = String(result.rows[0]?.request_no || "");
  const match = last.match(/(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  const year = String(new Date().getFullYear()).slice(-2);
  return "SRQ-" + year + String(nextNumber).padStart(4, "0");
}

async function customerPortalSnapshot(customerSession) {
  const customerCode = String(customerSession?.customerCode || "").trim();
  const customerName = String(customerSession?.customerName || "").trim();
  const [shipments, requests, notifications, activityLogs, hsCodes, settings] = await Promise.all([
    customerName ? query(`select * from shipments where lower(customer_name) = lower($1) order by booking_date desc, created_at desc limit 500`, [customerName]) : Promise.resolve({ rows: [] }),
    query(
      `select * from shipment_requests
       where lower(customer_code) = lower($1) or lower(customer_name) = lower($2)
       order by created_at desc, id desc
       limit 500`,
      [customerCode, customerName]
    ),
    query(
      `select * from notifications
       where lower(user_type) = 'customer'
         and (lower(customer_code) = lower($1) or lower(user_id) = lower($2))
       order by created_at desc, id desc
       limit 200`,
      [customerCode, String(customerSession?.userName || "")]
    ),
    query(
      `select * from customer_activity_logs
       where lower(customer_code) = lower($1) or lower(customer_user_id) = lower($2)
       order by created_at desc, id desc
       limit 200`,
      [customerCode, String(customerSession?.customerUserId || "")]
    ),
    query(`select * from hs_code_master where lower(status) = 'active' order by item_name asc, item_code asc limit 500`),
    query(`select * from app_settings where settings_key = 'default' limit 1`)
  ]);

  return {
    shipments: shipments.rows,
    shipmentRequests: requests.rows,
    notifications: notifications.rows,
    activityLogs: activityLogs.rows,
    hsCodeMaster: hsCodes.rows,
    settings: settings.rows[0] || null
  };
}

async function createCustomerNotification(data) {
  await query(
    `insert into notifications (user_id, user_type, customer_code, type, title, message, read_status)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [String(data.userId || ""), String(data.userType || "customer"), String(data.customerCode || ""), String(data.type || ""), String(data.title || ""), String(data.message || ""), String(data.readStatus || "UNREAD")]
  );
}

async function createCustomerActivity(data) {
  await query(
    `insert into customer_activity_logs (customer_user_id, customer_code, action, description, ip_address)
     values ($1, $2, $3, $4, $5)`,
    [String(data.customerUserId || ""), String(data.customerCode || ""), String(data.action || ""), String(data.description || ""), String(data.ipAddress || "")]
  );
}

async function evaluateShipmentRequestStatus(data, customerAccount) {
  const settings = await query(`select enable_auto_approval from app_settings where settings_key = 'default' limit 1`);
  const autoApprovalEnabled = settings.rows[0]?.enable_auto_approval !== false;
  const customerActive = isPortalActive(customerAccount?.status) && isPortalActive(customerAccount?.customer_status);
  const requiredFieldsComplete = Boolean(String(data.shipmentType || "").trim() && String(data.origin || "").trim() && String(data.destination || "").trim() && String(data.consignee || "").trim() && String(data.itemName || "").trim() && Number(data.quantity || 0) > 0 && Number(data.weight || 0) > 0);
  const hsCodeMatched = Boolean(String(data.hsCode || "").trim() && String(data.itemCode || "").trim());

  if (!customerActive || !requiredFieldsComplete) {
    return "PENDING_REVIEW";
  }

  if (autoApprovalEnabled && hsCodeMatched) {
    return "AUTO_APPROVED";
  }

  return "PENDING_REVIEW";
}

async function demoCustomerPortalSnapshot(identifier) {
  return {
    session: {
      customerUserId: "1",
      customerCode: "CUS-001",
      customerName: "Gulf Retail Trading",
      userName: identifier || "gulf.retail",
      email: "portal@gulf-retail.example",
      role: "Customer",
      portal: "customer",
      branchAccess: "Customer Portal",
      branchViewScope: "Assigned Branch Only",
      sectionAccess: "Dashboard, New Shipment, Shipments, Tracking, Profile, Notifications, Activity Logs",
      status: "ACTIVE",
      lastLogin: ""
    },
    data: {
      shipments: [
        { job_no: "AFS-2605001", customer_name: "Gulf Retail Trading", origin: "Kuwait City", destination: "Riyadh", status: "Booked", pieces: 14, actual_kg: 820, cbm: 5.2, chargeable_kg: 1040, sell: 485, buy_cost: 330, pod_status: "Pending", invoice_status: "Unbilled", booking_date: "2026-05-05", airway_bill_no: "AWB-2605001", created_by: "admin" }
      ],
      shipmentRequests: [
        { request_no: "SRQ-260001", customer_code: "CUS-001", customer_name: "Gulf Retail Trading", shipment_type: "Export", origin: "Kuwait City", destination: "Riyadh", consignee: "Gulf Retail Trading", item_name: "Laptop Charger", hs_code: "8504.40", item_code: "ITEM-1001", quantity: 10, weight: 25, invoice_value: 420, remarks: "Demo request", status: "AUTO_APPROVED", created_by: "gulf.retail", created_at: new Date().toISOString() }
      ],
      notifications: [
        { id: 1, user_id: "gulf.retail", user_type: "customer", customer_code: "CUS-001", type: "Shipment Submitted", title: "Shipment request received", message: "Your request SRQ-260001 was submitted successfully.", read_status: "UNREAD", created_at: new Date().toISOString() }
      ],
      activityLogs: [
        { id: 1, customer_user_id: "1", customer_code: "CUS-001", action: "Login", description: "Customer portal login", ip_address: "127.0.0.1", created_at: new Date().toISOString() }
      ],
      hsCodeMaster: [
        { id: 1, item_name: "Laptop Charger", alternate_name: "Notebook Charger", hs_code: "8504.40", item_code: "ITEM-1001", status: "ACTIVE", created_at: new Date().toISOString() }
      ],
      settings: { enable_auto_approval: true }
    }
  };
}
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
      field("transporter"),
      field("transporter_code", ["transporterCode", "transporter_code"]),
      field("vehicle_no", ["vehicleNo", "vehicle_no"]),
      field("driver_name", ["driverName", "driver_name"]),
      field("driver_number", ["driverNumber", "driver_number"]),
      field("driver_mobile", ["driverMobile", "driver_mobile"]),
      field("notes"),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  "shipment-status-history": {
    table: "shipment_status_history",
    order: "updated_at desc",
    metaFields: [],
    fields: [
      field("job_no", ["jobNo", "job_no"], true),
      field("status", ["status"], true),
      field("pod_status", ["podStatus", "pod_status"]),
      field("invoice_status", ["invoiceStatus", "invoice_status"]),
      field("notes", ["notes", "remark", "manualRemark"]),
      field("updated_by", ["updatedBy", "updated_by"]),
      field("updated_at", ["updatedAt", "updated_at", "date"])
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
      field("currency"),
      field("weight_rates_json", ["weightRatesJson", "weight_rates_json"]),
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
  quotations: {
    table: "quotations",
    key: "quotation_no",
    order: "created_at desc",
    fields: [
      field("quotation_no", ["quotationNo", "quotation_no"], true),
      field("branch"),
      field("date"),
      field("customer_name", ["customerName", "customer_name"]),
      field("customer_contact_person", ["customerContactPerson", "customer_contact_person"]),
      field("customer_mobile", ["customerMobile", "customer_mobile"]),
      field("customer_email", ["customerEmail", "customer_email"]),
      field("cargo_items_json", ["cargoItemsJson", "cargo_items_json"]),
      field("nature_of_goods", ["natureOfGoods", "nature_of_goods"]),
      field("volume_category", ["volumeCategory", "volume_category"]),
      field("cbm"),
      field("actual_kg", ["actualKg", "actual_kg"]),
      field("status"),
      field("converted_job_no", ["convertedJobNo", "converted_job_no"]),
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
      field("customer_code", ["customerCode", "customer_code"]),
      field("shipment_no", ["shipmentNo", "shipment_no"]),
      field("tariff_no", ["tariffNo", "tariff_no"]),
      field("tariff_name", ["tariffName", "tariff_name"]),
      field("chargeable_weight", ["chargeableWeight", "chargeable_weight"]),
      field("revenue"),
      field("supplier_cost", ["supplierCost", "supplier_cost"]),
      field("total_cost", ["totalCost", "total_cost"]),
      field("tax_percent", ["taxPercent", "tax_percent"]),
      field("tax_amount", ["taxAmount", "tax_amount"]),
      field("grand_total", ["grandTotal", "grand_total"]),
      field("profit_percent", ["profitPercent", "profit_percent"]),
      field("invoice_lines_json", ["invoiceLinesJson", "invoice_lines_json"]),
      field("tariff_snapshot_json", ["tariffSnapshotJson", "tariff_snapshot_json"]),
      field("invoice_snapshot_json", ["invoiceSnapshotJson", "invoice_snapshot_json"]),
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
      field("branch_view_scope", ["branchViewScope", "branch_view_scope"]),
      field("section_access", ["sectionAccess", "section_access"]),
      field("password"),
      field("can_view_all_entry", ["canViewAllEntry", "can_view_all_entry"]),
      field("can_view_only_self_entry", ["canViewOnlySelfEntry", "can_view_only_self_entry"]),
      field("can_edit_all_entry", ["canEditAllEntry", "can_edit_all_entry"]),
      field("can_view_updated_history", ["canViewUpdatedHistory", "can_view_updated_history"]),
      field("hr_portal_access", ["hrPortalAccess", "hr_portal_access"]),
      field("notes")
    ]
  },
  "customer-users": {
    table: "customer_users",
    key: "username",
    order: "created_at desc",
    hiddenFields: ["password_hash"],
    fields: [
      field("customer_code", ["customerCode", "customer_code"], true),
      field("username", ["username"], true),
      field("email", ["email"]),
      field("password_hash", ["passwordHash", "password", "password_hash"]),
      field("status"),
      field("last_login", ["lastLogin", "last_login"])
    ]
  },
  "hs-code-master": {
    table: "hs_code_master",
    key: "item_code",
    order: "created_at desc",
    fields: [
      field("item_name", ["itemName", "item_name"], true),
      field("alternate_name", ["alternateName", "alternate_name"]),
      field("hs_code", ["hsCode", "hs_code"]),
      field("item_code", ["itemCode", "item_code"], true),
      field("status")
    ]
  },
  "shipment-requests": {
    table: "shipment_requests",
    key: "request_no",
    order: "created_at desc",
    fields: [
      field("request_no", ["requestNo", "request_no"]),
      field("customer_code", ["customerCode", "customer_code"], true),
      field("customer_name", ["customerName", "customer_name"], true),
      field("shipment_type", ["shipmentType", "shipment_type"], true),
      field("origin", ["origin"], true),
      field("destination", ["destination"], true),
      field("consignee", ["consignee"], true),
      field("item_name", ["itemName", "item_name"], true),
      field("hs_code", ["hsCode", "hs_code"]),
      field("item_code", ["itemCode", "item_code"]),
      field("quantity", ["quantity"], true),
      field("weight", ["weight"], true),
      field("invoice_value", ["invoiceValue", "invoice_value"]),
      field("remarks", ["remarks"]),
      field("attachments_json", ["attachmentsJson", "attachments_json"]),
      field("status", ["status"]),
      field("approval_notes", ["approvalNotes", "approval_notes"]),
      field("auto_approved", ["autoApproved", "auto_approved"]),
      field("converted_job_no", ["convertedJobNo", "converted_job_no"]),
      field("created_by", ["createdBy", "created_by"])
    ]
  },
  notifications: {
    table: "notifications",
    key: "id",
    order: "created_at desc",
    fields: [
      field("user_id", ["userId", "user_id"], true),
      field("user_type", ["userType", "user_type"], true),
      field("customer_code", ["customerCode", "customer_code"]),
      field("type"),
      field("title"),
      field("message"),
      field("read_status", ["readStatus", "read_status"])
    ]
  },
  "customer-activity-logs": {
    table: "customer_activity_logs",
    key: "id",
    order: "created_at desc",
    fields: [
      field("customer_user_id", ["customerUserId", "customer_user_id"]),
      field("customer_code", ["customerCode", "customer_code"]),
      field("action"),
      field("description"),
      field("ip_address", ["ipAddress", "ip_address"])
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
  "shipment-cargo-items": {
    table: "shipment_cargo_items",
    key: "id",
    order: "id asc",
    fields: [
      field("job_no", ["jobNo", "job_no"], true),
      field("package_type", ["packageType", "package_type"]),
      field("quantity"),
      field("length"),
      field("width"),
      field("height"),
      field("dimension_unit", ["dimensionUnit", "dimension_unit"]),
      field("weight"),
      field("weight_unit", ["weightUnit", "weight_unit"]),
      field("volume_weight", ["volumeWeight", "volume_weight"]),
      field("remarks")
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
      field("tcn_number_format", ["tcnNumberFormat", "tcn_number_format"]),
      field("delivery_note_number_format", ["deliveryNoteNumberFormat", "delivery_note_number_format"]),
      field("document_number_format", ["documentNumberFormat", "document_number_format"]),
      field("tariff_number_format", ["tariffNumberFormat", "tariff_number_format"]),
      field("customer_number_format", ["customerNumberFormat", "customer_number_format"]),
      field("additional_charge_number_format", ["additionalChargeNumberFormat", "additional_charge_number_format"]),
      field("supplier_number_format", ["supplierNumberFormat", "supplier_number_format"]),
      field("quotation_number_format", ["quotationNumberFormat", "quotation_number_format"]),
      field("awb_number_format", ["awbNumberFormat", "awb_number_format"]),
      field("default_volumetric_divisor", ["defaultVolumetricDivisor", "default_volumetric_divisor"]),
      field("require_pod_before_invoice", ["requirePodBeforeInvoice", "require_pod_before_invoice"]),
      field("allow_global_shipment_quick_search", ["allowGlobalShipmentQuickSearch", "allow_global_shipment_quick_search"]),
      field("enable_auto_approval", ["enableAutoApproval", "enable_auto_approval"]),
      field("branches"),
      field("column_layout_json", ["columnLayoutJson", "column_layout_json"]),
      field("dropdown_options", ["dropdownOptionsJson", "dropdown_options"])
    ]
  },
  employees: {
    table: "employees",
    key: "user_name",
    order: "created_at desc",
    fields: [
      field("user_name", ["userName", "user_name"], true),
      field("employee_code", ["employeeCode", "employee_code"]),
      field("full_name", ["fullName", "full_name"], true),
      field("department"),
      field("designation"),
      field("join_date", ["joinDate", "join_date"]),
      field("phone"),
      field("personal_email", ["personalEmail", "personal_email"]),
      field("employment_status", ["employmentStatus", "employment_status"]),
      field("reporting_manager", ["reportingManager", "reporting_manager"]),
      field("notes")
    ]
  },
  "leave-requests": {
    table: "leave_requests",
    key: "request_no",
    order: "applied_at desc",
    fields: [
      field("request_no", ["requestNo", "request_no"], true),
      field("user_name", ["userName", "user_name"], true),
      field("employee_name", ["employeeName", "employee_name"]),
      field("leave_type", ["leaveType", "leave_type"]),
      field("start_date", ["startDate", "start_date"], true),
      field("end_date", ["endDate", "end_date"], true),
      field("total_days", ["totalDays", "total_days"]),
      field("reason"),
      field("status"),
      field("approved_by", ["approvedBy", "approved_by"]),
      field("approved_at", ["approvedAt", "approved_at"]),
      field("applied_at", ["appliedAt", "applied_at"])
    ]
  },
  payslips: {
    table: "payslips",
    key: "payslip_no",
    order: "created_at desc",
    fields: [
      field("payslip_no", ["payslipNo", "payslip_no"], true),
      field("user_name", ["userName", "user_name"], true),
      field("employee_name", ["employeeName", "employee_name"]),
      field("period"),
      field("gross_pay", ["grossPay", "gross_pay"]),
      field("deductions"),
      field("net_pay", ["netPay", "net_pay"]),
      field("status"),
      field("issued_date", ["issuedDate", "issued_date"]),
      field("storage_url", ["storageUrl", "storage_url"])
    ]
  },
  "hr-announcements": {
    table: "hr_announcements",
    key: "id",
    order: "pinned desc, posted_at desc",
    fields: [
      field("title", ["title"], true),
      field("body"),
      field("posted_by", ["postedBy", "posted_by"]),
      field("audience"),
      field("pinned"),
      field("posted_at", ["postedAt", "posted_at"])
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
      field("mobile"),
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
      error?.code === "42703" ||
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
  let result;
  try {
    result = await query(
      `select user_name, email, role, account_status, branch_access, branch_view_scope, section_access,
              can_view_all_entry, can_view_only_self_entry, can_edit_all_entry, can_view_updated_history,
              hr_portal_access, password
       from app_users
       where lower(user_name) = lower($1) or lower(email) = lower($1)
       limit 1`,
      [identifier]
    );
  } catch (error) {
    // Allow existing live databases to keep signing in while the optional HR
    // migration is still being applied by the deployment service.
    if (error?.code !== "42703") throw error;
    result = await query(
      `select user_name, email, role, account_status, branch_access, branch_view_scope, section_access,
              can_view_all_entry, can_view_only_self_entry, can_edit_all_entry, can_view_updated_history,
              password
       from app_users
       where lower(user_name) = lower($1) or lower(email) = lower($1)
       limit 1`,
      [identifier]
    );
    if (result.rows[0]) result.rows[0].hr_portal_access = false;
  }

  const row = result.rows[0];
  if (!row || !verifyCustomerPassword(password, row.password)) {
    return null;
  }

  delete row.password;
  return row;
}

async function prepareRecordForConfig(config, body) {
  const prepared = { ...(body || {}) };

  if (config.table === "customer_users") {
    const password = String(prepared.password || "").trim();
    const passwordHash = String(prepared.password_hash || prepared.passwordHash || "").trim();
    if (password) {
      prepared.password_hash = password.startsWith("pbkdf2$") ? password : hashCustomerPassword(password);
    } else if (passwordHash && !passwordHash.startsWith("pbkdf2$") && passwordHash.length > 0) {
      prepared.password_hash = hashCustomerPassword(passwordHash);
    }
    if (!String(prepared.status || "").trim()) {
      prepared.status = "ACTIVE";
    }
    delete prepared.password;
    delete prepared.passwordHash;
  }

  if (config.table === "app_users") {
    const password = String(prepared.password || "").trim();
    if (password && !password.startsWith("pbkdf2$")) {
      prepared.password = hashCustomerPassword(password);
    }
  }

  if (config.table === "shipment_requests") {
    if (!String(prepared.request_no || "").trim()) {
      prepared.request_no = await nextShipmentRequestNo();
    }
    if (!String(prepared.status || "").trim()) {
      prepared.status = "SUBMITTED";
    }
    const attachments = prepared.attachments_json || prepared.attachmentsJson || prepared.attachments;
    if (Array.isArray(attachments)) {
      prepared.attachments_json = JSON.stringify(attachments);
    } else if (attachments && typeof attachments === "object") {
      prepared.attachments_json = JSON.stringify(attachments);
    } else if (typeof attachments === "string" && attachments.trim()) {
      prepared.attachments_json = attachments;
    }
    if (!String(prepared.customer_name || "").trim() && String(prepared.customer_code || "").trim()) {
      const customerByCode = await query(`select name from customers where lower(code) = lower($1) limit 1`, [prepared.customer_code]);
      prepared.customer_name = customerByCode.rows[0]?.name || prepared.customer_name || "";
    }
    if (!String(prepared.customer_code || "").trim() && String(prepared.customer_name || "").trim()) {
      const customerByName = await query(`select code from customers where lower(name) = lower($1) limit 1`, [prepared.customer_name]);
      prepared.customer_code = customerByName.rows[0]?.code || prepared.customer_code || "";
    }
    prepared.auto_approved = String(prepared.status || "").toUpperCase() === "AUTO_APPROVED";
  }

  if (config.table === "invoices") {
    const stringify = (value, fallback) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") return JSON.stringify(value);
      return fallback;
    };
    prepared.customer_code = String(prepared.customer_code || prepared.customerCode || "").trim();
    prepared.tariff_no = String(prepared.tariff_no || prepared.tariffNo || "").trim();
    prepared.tariff_name = String(prepared.tariff_name || prepared.tariffName || "").trim();
    prepared.chargeable_weight = Number(prepared.chargeable_weight || prepared.chargeableWeight || 0);
    prepared.revenue = Number(prepared.revenue || 0);
    prepared.supplier_cost = Number(prepared.supplier_cost || prepared.supplierCost || 0);
    prepared.total_cost = Number(prepared.total_cost || prepared.totalCost || prepared.supplier_cost || 0);
    prepared.tax_percent = Number(prepared.tax_percent || prepared.taxPercent || 0);
    prepared.tax_amount = Number(prepared.tax_amount || prepared.taxAmount || 0);
    prepared.grand_total = Number(prepared.grand_total || prepared.grandTotal || prepared.revenue + prepared.tax_amount);
    prepared.profit_percent = Number(
      prepared.profit_percent ||
        prepared.profitPercent ||
        (prepared.revenue ? (((prepared.revenue - prepared.total_cost) / prepared.revenue) * 100) : 0)
    );
    prepared.invoice_lines_json = stringify(prepared.invoice_lines_json || prepared.invoiceLinesJson, "[]");
    prepared.tariff_snapshot_json = stringify(prepared.tariff_snapshot_json || prepared.tariffSnapshotJson, "{}");
    prepared.invoice_snapshot_json = stringify(prepared.invoice_snapshot_json || prepared.invoiceSnapshotJson, "{}");
  }

  if (config.table === "notifications" && !String(prepared.read_status || "").trim()) {
    prepared.read_status = "UNREAD";
  }

  return prepared;
}
async function insertRow(config, body) {
  body = await prepareRecordForConfig(config, body);
  const { columns, values } = collectValues(config, body);
  requireFields(config, columns);

  if (!columns.length) {
    const error = new Error("No values supplied.");
    error.status = 400;
    throw error;
  }

  const placeholders = values.map((_, index) => `$${index + 1}`);

  try {
    const result = await query(
      `insert into ${config.table} (${columns.join(", ")})
       values (${placeholders.join(", ")})
       returning ${columnsFor(config)}`,
      values
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const keyIndex = config.key ? columns.indexOf(config.key) : -1;
      const keyValue = keyIndex >= 0 ? values[keyIndex] : "";
      const duplicateError = new Error(
        keyValue
          ? `${keyValue} already exists. Choose a different number and try again.`
          : "A record with this value already exists. Choose a different number and try again."
      );
      duplicateError.status = 409;
      throw duplicateError;
    }
    throw error;
  }
}

async function updateRow(config, id, body) {
  if (!config.key) {
    const error = new Error("This resource does not support direct updates.");
    error.status = 400;
    throw error;
  }

  body = await prepareRecordForConfig(config, body);
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

  if (config.table === "shipment_requests") {
    const row = result.rows[0];
    const status = String(row.status || "").toUpperCase();
    if (status === "APPROVED" || status === "SENT_BACK") {
      try {
        await createCustomerNotification({
          userType: "customer",
          customerCode: row.customer_code || "",
          type: status === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_SENT_BACK",
          title: status === "APPROVED" ? `Shipment request ${row.request_no} approved` : `Shipment request ${row.request_no} needs your attention`,
          message: status === "APPROVED"
            ? `Your shipment request ${row.request_no} (${row.origin} to ${row.destination}) has been approved.${row.approval_notes ? ` Note: ${row.approval_notes}` : ""}`
            : `Your shipment request ${row.request_no} (${row.origin} to ${row.destination}) was sent back for review.${row.approval_notes ? ` Details: ${row.approval_notes}` : ""}`
        });
      } catch (notificationError) {
        console.error("Failed to create customer notification for shipment request update:", notificationError);
      }
    }
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
    "shipment_cargo_items",
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
  const config = resources[resourceName];
  const hidden = new Set(config?.hiddenFields || []);
  const rows = (demoRows[resourceName] || []).map((row) => {
    if (!hidden.size) return row;
    const clone = { ...row };
    hidden.forEach((field) => delete clone[field]);
    return clone;
  });

  return {
    ok: true,
    mode: "demo",
    rows
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

app.get(["/customer", "/customer/*"], (_request, response) => {
  if (fs.existsSync(webIndex)) {
    return response.sendFile(webIndex);
  }

  return response.redirect(302, "/");
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
      isCloudSqlSocket,
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
      isCloudSqlSocket,
      allowedOrigins,
      autoMigrate: runtimeStatus.autoMigrate,
      migration: runtimeStatus.migration,
      startupError: runtimeStatus.startupError,
      error: error.message
    });
  }
});

app.post("/api/login", loginRateLimiter, async (request, response, next) => {
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
        branchViewScope: row.branch_view_scope || "Assigned Branch Only",
        sectionAccess: row.section_access,
        canViewAllEntry: row.can_view_all_entry,
        canViewOnlySelfEntry: row.can_view_only_self_entry,
        canEditAllEntry: row.can_edit_all_entry,
        canViewUpdatedHistory: row.can_view_updated_history,
        hrPortalAccess: Boolean(row.hr_portal_access),
        token: signCustomerToken({ userName: row.user_name, role: row.role, portal: "app", exp: Date.now() + APP_TOKEN_TTL_MS })
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
            branchViewScope: "All Branches",
            sectionAccess: "All",
            hrPortalAccess: true,
            token: signCustomerToken({ userName: "admin", role: "Admin", portal: "app", exp: Date.now() + APP_TOKEN_TTL_MS })
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

app.post("/api/change-password", loginRateLimiter, async (request, response, next) => {
  const userName = String(request.body?.userName || "").trim();
  const currentPassword = String(request.body?.currentPassword || "");
  const newPassword = String(request.body?.newPassword || "");

  if (!userName || !currentPassword || !newPassword) {
    return response.status(400).json({
      ok: false,
      error: "User name, current password, and new password are required."
    });
  }

  try {
    const row = await loginUser(userName, currentPassword);

    if (!row) {
      return response.status(401).json({
        ok: false,
        error: "The current password is incorrect."
      });
    }

    await query("update app_users set password = $1 where user_name = $2", [hashCustomerPassword(newPassword), row.user_name]);

    return response.json({ ok: true });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.status(503).json({
        ok: false,
        error: "Password changes require a connected database."
      });
    }

    return next(error);
  }
});

app.post("/api/customer-login", loginRateLimiter, async (request, response, next) => {
  const identifier = String(request.body?.userName || request.body?.email || request.body?.customerCode || "").trim();
  const password = String(request.body?.password || "");

  if (!identifier || !password) {
    return response.status(400).json({
      ok: false,
      error: "Customer user name and password are required."
    });
  }

  try {
    const session = await loginCustomer(identifier, password);
    if (!session) {
      return response.status(401).json({
        ok: false,
        error: "Invalid customer login credentials."
      });
    }

    await createCustomerActivity({
      customerUserId: session.customerUserId,
      customerCode: session.customerCode,
      action: "Login",
      description: "Customer portal login",
      ipAddress: request.ip || ""
    });

    const snapshot = await customerPortalSnapshot(session);
    return response.json({
      ok: true,
      session,
      data: snapshot
    });
  } catch (error) {
    if (isDatabaseSetupError(error) && String(password || "") === "customer123") {
      const demo = await demoCustomerPortalSnapshot(identifier);
      return response.json({
        ok: true,
        mode: "demo",
        session: demo.session,
        data: demo.data
      });
    }

    return next(error);
  }
});

app.get("/api/customer/bootstrap", requireCustomerPortalAuth, async (request, response, next) => {
  try {
    const data = await customerPortalSnapshot(request.customerSession);
    response.json({
      ok: true,
      session: request.customerSession,
      data
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      const demo = await demoCustomerPortalSnapshot(request.customerSession?.userName || "gulf.retail");
      return response.json({
        ok: true,
        mode: "demo",
        session: demo.session,
        data: demo.data
      });
    }

    return next(error);
  }
});

app.post("/api/customer/shipment-requests", requireCustomerPortalAuth, async (request, response, next) => {
  const data = request.body || {};

  try {
    const account = await getCustomerAccount(request.customerSession.customerCode || request.customerSession.userName);
    if (!account) {
      return response.status(404).json({ ok: false, error: "Customer account not found." });
    }

    const hsCodeResult = await query(
      `select item_name, alternate_name, hs_code, item_code
       from hs_code_master
       where lower(item_name) = lower($1)
          or lower(alternate_name) = lower($1)
          or lower(item_code) = lower($1)
       limit 1`,
      [String(data.itemName || data.item_code || data.itemCode || "").trim()]
    );
    const hsCode = hsCodeResult.rows[0] || null;
    const status = await evaluateShipmentRequestStatus({
      ...data,
      hsCode: data.hsCode || hsCode?.hs_code || "",
      itemCode: data.itemCode || hsCode?.item_code || ""
    }, account);
    const requestNo = await nextShipmentRequestNo();
    const attachments = Array.isArray(data.attachments) ? data.attachments : Array.isArray(data.attachmentsJson) ? data.attachmentsJson : [];
    const row = {
      request_no: requestNo,
      customer_code: account.customer_code,
      customer_name: account.customer_name || request.customerSession.customerName || account.customer_code,
      shipment_type: String(data.shipmentType || data.shipment_type || "").trim(),
      origin: String(data.origin || "").trim(),
      destination: String(data.destination || "").trim(),
      consignee: String(data.consignee || "").trim(),
      item_name: String(data.itemName || data.item_name || "").trim(),
      hs_code: String(data.hsCode || hsCode?.hs_code || "").trim(),
      item_code: String(data.itemCode || hsCode?.item_code || "").trim(),
      quantity: Number(data.quantity || 0),
      weight: Number(data.weight || 0),
      invoice_value: Number(data.invoiceValue || data.invoice_value || 0),
      remarks: String(data.remarks || "").trim(),
      attachments_json: JSON.stringify(attachments),
      status,
      approval_notes: status === "AUTO_APPROVED" ? "Auto approved by portal rules." : "",
      auto_approved: status === "AUTO_APPROVED",
      created_by: request.customerSession.userName
    };

    const saved = await insertRow(resources["shipment-requests"], row);

    await Promise.all([
      createCustomerNotification({
        userId: request.customerSession.userName,
        customerCode: account.customer_code,
        userType: "customer",
        type: status === "AUTO_APPROVED" ? "Shipment Auto Approved" : "Shipment Pending Review",
        title: "Shipment request " + requestNo,
        message: "Your shipment request " + requestNo + " was submitted with " + status.toLowerCase().replace(/_/g, " ") + "."
      }),
      createCustomerNotification({
        userId: "admin",
        customerCode: account.customer_code,
        userType: "company",
        type: "Shipment Submitted",
        title: "New customer request " + requestNo,
        message: (account.customer_name || account.customer_code) + " submitted a shipment request."
      }),
      createCustomerActivity({
        customerUserId: request.customerSession.customerUserId,
        customerCode: account.customer_code,
        action: "Shipment Submission",
        description: "Submitted " + requestNo + " for " + row.item_name,
        ipAddress: request.ip || ""
      })
    ]);

    return response.status(201).json({
      ok: true,
      row: saved,
      status
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.status(201).json({
        ok: true,
        mode: "demo",
        row: { ...data, requestNo: "SRQ-260002" },
        status: "AUTO_APPROVED"
      });
    }

    return next(error);
  }
});

app.get("/api/customer/profile", requireCustomerPortalAuth, async (request, response, next) => {
  try {
    const account = await getCustomerAccount(request.customerSession.customerCode || request.customerSession.userName);
    if (!account) {
      return response.status(404).json({ ok: false, error: "Customer account not found." });
    }

    response.json({
      ok: true,
      profile: {
        customerUserId: String(account.id || ""),
        customerCode: account.customer_code || "",
        customerName: account.customer_name || "",
        username: account.username || "",
        email: account.email || "",
        status: account.status || "ACTIVE",
        lastLogin: account.last_login || "",
        branch: account.customer_branch || ""
      }
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({
        ok: true,
        mode: "demo",
        profile: {
          customerUserId: "1",
          customerCode: "CUS-001",
          customerName: "Gulf Retail Trading",
          username: "gulf.retail",
          email: "portal@gulf-retail.example",
          status: "ACTIVE",
          lastLogin: "",
          branch: "Kuwait HO"
        }
      });
    }

    return next(error);
  }
});

app.put("/api/customer/profile", requireCustomerPortalAuth, async (request, response, next) => {
  const data = request.body || {};
  try {
    const account = await getCustomerAccount(request.customerSession.customerCode || request.customerSession.userName);
    if (!account) {
      return response.status(404).json({ ok: false, error: "Customer account not found." });
    }

    const userSets = [];
    const userValues = [];
    const customerSets = [];
    const customerValues = [];

    if (String(data.email || "").trim()) {
      userValues.push(String(data.email).trim());
      userSets.push("email = $" + userValues.length);
      customerValues.push(String(data.email).trim());
      customerSets.push("email = $" + customerValues.length);
    }

    if (String(data.password || "").trim()) {
      userValues.push(hashCustomerPassword(String(data.password).trim()));
      userSets.push("password_hash = $" + userValues.length);
    }

    if (String(data.mobile || "").trim()) {
      customerValues.push(String(data.mobile).trim());
      customerSets.push("mobile = $" + customerValues.length);
    }

    if (String(data.fullAddress || data.full_address || "").trim()) {
      customerValues.push(String(data.fullAddress || data.full_address).trim());
      customerSets.push("full_address = $" + customerValues.length);
    }

    if (!userSets.length && !customerSets.length) {
      return response.status(400).json({ ok: false, error: "No profile changes were provided." });
    }

    if (userSets.length) {
      userValues.push(account.id);
      await query("update customer_users set " + userSets.join(", ") + " where id = $" + userValues.length, userValues);
    }

    if (customerSets.length) {
      customerValues.push(account.customer_code);
      await query("update customers set " + customerSets.join(", ") + " where code = $" + customerValues.length, customerValues);
    }

    await createCustomerActivity({
      customerUserId: request.customerSession.customerUserId,
      customerCode: account.customer_code,
      action: "Profile Update",
      description: "Updated customer profile details",
      ipAddress: request.ip || ""
    });

    return response.json({ ok: true });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return response.json({ ok: true, mode: "demo" });
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

app.post("/api/:resource", requireAppAuth, async (request, response, next) => {
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

app.put("/api/:resource/:id", requireAppAuth, async (request, response, next) => {
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

app.delete("/api/audit", requireAppAuth, async (_request, response, next) => {
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

app.delete("/api/:resource/:id", requireAppAuth, async (request, response, next) => {
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
