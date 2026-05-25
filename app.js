const API_URL = (window.APOLLO_API_URL || "https://apollo-freighterp-f9kt.onrender.com").replace(/\/$/, "");
const STORAGE_KEY = "apollofreighterp-web-state-v2";
const SESSION_KEY = "apollofreighterp-session";

const modules = [
  ["Dashboard", "Live operational summary for land freight consolidation"],
  ["Shipments / Jobs", "Create, price, track, duplicate, and close cargo jobs"],
  ["Consolidation", "Build trips, manifests, and loading lists"],
  ["Customers", "Customer master data and account controls"],
  ["Suppliers / Transporters", "Supplier and transporter lane master"],
  ["Tariffs / Rate Master", "Customer, lane, service, vehicle, and surcharge rates"],
  ["Documents", "Document tags, shipment attachments, and missing file checks"],
  ["Additional Charges", "Charge capture, approval, and shipment profitability controls"],
  ["Billing / Invoices", "Invoice shipments, monitor unbilled jobs, and check margins"],
  ["POD / Delivery", "Delivery status, POD uploads, disputes, and pending lists"],
  ["Shipment Status", "Dedicated shipment status updates and history controls"],
  ["Reports", "Operational, billing, POD, and margin reports"],
  ["User Management / Settings", "Users, permissions, branches, and company settings"],
  ["Audit Log", "Entry create and update history"]
];

const state = loadState();
let activeModule = "Dashboard";
let editing = null;
let dialogState = null;
let lastPendingNotificationCount = 0;

const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const moduleNav = document.querySelector("#moduleNav");
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageTitle = document.querySelector("#pageTitle");
const pageSubtitle = document.querySelector("#pageSubtitle");
const userContextText = document.querySelector("#userContextText");
const moduleContent = document.querySelector("#moduleContent");
const apiBanner = document.querySelector("#apiBanner");
const globalSearch = document.querySelector("#globalSearch");
const fromDate = document.querySelector("#fromDate");
const toDate = document.querySelector("#toDate");
const applyFilters = document.querySelector("#applyFilters");
const dateFilterStatusText = document.querySelector("#dateFilterStatusText");
const resetFilters = document.querySelector("#resetFilters");
const newShipmentButton = document.querySelector("#newShipmentButton");
const logoutButton = document.querySelector("#logoutButton");
const resetEmail = document.querySelector("#resetEmail");
const resetPasswordButton = document.querySelector("#resetPasswordButton");
const resetMessage = document.querySelector("#resetMessage");
const recordDialog = document.querySelector("#recordDialog");
const dialogType = document.querySelector("#dialogType");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogBody = document.querySelector("#dialogBody");
const dialogSecondary = document.querySelector("#dialogSecondary");
const dialogSave = document.querySelector("#dialogSave");

function currentSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {}

  return {
    userName: raw,
    role: raw === "admin" ? "Admin" : "Operations",
    branchAccess: raw === "admin" ? "Both" : "Branch 1"
  };
}

function rememberSession(sessionOrUserName) {
  const session =
    typeof sessionOrUserName === "object" && sessionOrUserName
      ? sessionOrUserName
      : {
          userName: sessionOrUserName,
          role: sessionOrUserName === "admin" ? "Admin" : "Operations",
          branchAccess: sessionOrUserName === "admin" ? "Both" : "Branch 1"
        };

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userName: session.userName,
      role: session.role || "Operations",
      branchAccess: session.branchAccess || "Branch 1"
    })
  );
}

function seedState() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    shipments: [
      shipment("AFS-2605001", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Booked", 14, 820, 5.2, 1040, 485, 330, "Pending", "Unbilled", "2026-05-05", "AWB-2605001", "TAR-1001", 3, "Export", "AE", ""),
      shipment("AFS-2605002", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "In-Transit", 8, 410, 2.1, 420, 215, 150, "Pending", "Unbilled", "2026-05-05", "AWB-2605002", "TAR-1002", 2, "Import", "AI", ""),
      shipment("AFS-2605003", "Branch 1", "Al Noor Projects", "Ahmadi", "Doha", "Delivered", 22, 1250, 7.8, 1560, 780, 590, "Missing", "Unbilled", "2026-05-04", "AWB-2605003", "TAR-1001", 4, "Export", "LE", ""),
      shipment("AFS-2605004", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Invoiced", 4, 160, 0.9, 180, 95, 70, "Uploaded", "INV-260001", "2026-05-02", "AWB-2605004", "TAR-1001", 3, "WHC", "WHC Remark", "Warehouse handling and cross-docking")
    ],
    loads: [
      load("CON-260501", "2026-05-05", "Kuwait - Riyadh", "Al Dana Transport", "KWT-49217", "Dispatched", "AFS-2605001, AFS-2605004"),
      load("CON-260502", "2026-05-06", "Kuwait - Dammam", "Falcon Line Haul", "KWT-77320", "Planned", "AFS-2605002")
    ],
    customers: [
      party("CUS-001", "Gulf Retail Trading", "Kuwait City", "ops@gulf-retail.example", "30 days", "Active", false, "Branch 1"),
      party("CUS-002", "Desert Medical Supplies", "Shuwaikh", "logistics@desert-med.example", "15 days", "Active", true, "Branch 2"),
      party("CUS-003", "Al Noor Projects", "Ahmadi", "cargo@alnoor.example", "45 days", "Active", false, "Branch 1")
    ],
    suppliers: [
      party("TRN-001", "Al Dana Transport", "Kuwait - Riyadh", "dispatch@aldana.example", "20 days", "Active", false, "Branch 1"),
      party("TRN-002", "Falcon Line Haul", "Kuwait - Dammam", "ops@falconline.example", "30 days", "Active", false, "Branch 2")
    ],
    tariffs: [
      tariff("TAR-1001", "Gulf Retail Trading", "Kuwait City", "Riyadh", "FTL", "Minimum", "Per KG", 0.42, 35),
      tariff("TAR-1002", "Desert Medical Supplies", "Shuwaikh", "Dammam", "LTL", "Up to 300 KG", "Per CBM", 18, 55)
    ],
    documents: [
      documentRow("DOC-001", "AFS-2605001", "Waybill", "Issued", "2026-05-05", "operations"),
      documentRow("DOC-002", "AFS-2605003", "POD", "Missing", "2026-05-04", "delivery"),
      documentRow("DOC-003", "AFS-2605004", "Customer Invoice", "Stored", "2026-05-02", "billing")
    ],
    additionalCharges: [
      additionalCharge("CHG-001", "AFS-2605001", "2026-05-24", "Labour Charges", "1 ton", "ABC Labour", "LAB-5001", "INV-LAB-001", 50, 10, "KWD", "Labour support at warehouse dock.", "", "Approved", "admin", "admin", "Approved by admin"),
      additionalCharge("CHG-002", "AFS-2605001", "2026-05-24", "Delivery Charges", "3 ton", "Fast Van", "DLV-5001", "INV-DLV-001", 20, 10, "KWD", "Final-mile van delivery.", "", "Pending Approval", "operations", "", "")
    ],
    invoices: [
      invoice("INV-260001", "Gulf Retail Trading", "AFS-2605004", 95, 70, "Sent", "2026-05-02"),
      invoice("DRAFT-260006", "Al Noor Projects", "AFS-2605003", 780, 590, "Draft", "2026-05-05")
    ],
    users: [
      user("admin", "admin@apollofreightsolution.com", "Admin", "Active", "Both", true, true, true, true, "admin123", "System temporary admin"),
      user("ops-branch1", "operations.branch1@apollofreightsolution.com", "Operations", "Active", "Branch 1", true, false, false, false, "ops123", "Can create and track Branch 1 shipments"),
      user("billing-branch2", "billing.branch2@apollofreightsolution.com", "Billing", "Active", "Branch 2", true, false, true, true, "billing123", "Invoice and finance access for Branch 2")
    ],
    unblockRequests: [
      { requestNo: "REQ-2605001", customerName: "Desert Medical Supplies", requestedBy: "operations", reason: "Credit release requested", status: "Pending", date: today }
    ],
    adminRequests: [
      adminRequest("ADM-2605001", "Manifest Approval", "Consolidation", "CON-260502", "operations", "Pending", today, "Operations requested approval for consolidation edits before dispatch.", "Route: Kuwait - Dammam | Status: Planned | Jobs: AFS-2605002")
    ],
    audit: [
      audit("2026-05-05 09:15", "operations", "Created shipment", "AFS-2605001"),
      audit("2026-05-05 10:05", "billing", "Generated invoice", "INV-260001")
    ],
    settings: {
      companyName: "Apollo Freight Solutions",
      shipmentNumberFormat: "AFS-YY####",
      invoiceNumberFormat: "INV-YY####",
      defaultVolumetricDivisor: "5000",
      requirePodBeforeInvoice: "Yes",
      branches: "Branch 1, Branch 2"
    },
    api: {
      status: "Checking API",
      database: "Pending",
      mode: "local"
    },
    ui: {
      reportFormat: "PDF",
      reportType: "Daily shipments",
      reportPreview: null
    }
  };
}

function shipment(
  jobNo,
  branch,
  customer,
  origin,
  destination,
  status,
  pieces,
  actualKg,
  cbm,
  chargeableKg,
  sell,
  buyCost,
  podStatus,
  invoiceStatus,
  bookingDate,
  airwayBillNo = jobNo.replace("AFS", "AWB"),
  tariffNo = "TAR-1001",
  transitDays = 3,
  shipmentDirection = "Export",
  shipmentService = "AE",
  shipmentServiceOther = ""
) {
  return { jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate, airwayBillNo, tariffNo, transitDays, shipmentDirection, shipmentService, shipmentServiceOther };
}

function load(loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers) {
  return { loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers, pieces: 0, actualKg: 0, cbm: 0, chargeableKg: 0 };
}

function party(code, name, locationOrLane, email, terms, status, isAccountOverdue, branch) {
  return { code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, createdDate: new Date().toISOString().slice(0, 10) };
}

function tariff(tariffNo, customer, origin, destination, mainSection, weightSection, rateType, rate, minCharge) {
  return { tariffNo, customer, origin, destination, mainSection, weightSection, rateType, rate, minCharge, volumetricDivisor: 5000, effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31" };
}

function documentRow(documentNo, linkedNo, type, status, date, owner) {
  return { documentNo, linkedNo, type, status, date, owner };
}

function additionalCharge(
  refNo,
  shipmentNo,
  chargeDate,
  chargeType,
  chargeBasis,
  supplier,
  referenceNo,
  invoiceNo,
  amount,
  taxPercent,
  currency,
  remarks,
  attachmentName,
  status,
  requestedBy,
  approvedBy,
  approvalNotes
) {
  const taxAmount = Number(amount || 0) * (Number(taxPercent || 0) / 100);
  const totalAmount = Number(amount || 0) + taxAmount;
  return {
    refNo,
    shipmentNo,
    chargeDate,
    chargeType,
    chargeBasis,
    supplier,
    referenceNo,
    invoiceNo,
    amount: Number(amount || 0),
    taxPercent: Number(taxPercent || 0),
    taxAmount,
    totalAmount,
    currency,
    remarks,
    attachmentName,
    status,
    requestedBy,
    approvedBy,
    approvalNotes
  };
}

function invoice(invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date) {
  return { invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, grossProfit: revenue - supplierCost };
}

function user(
  userName,
  email,
  role,
  accountStatus,
  branchAccess,
  canViewAllEntry,
  canViewOnlySelfEntry,
  canEditAllEntry,
  canViewUpdatedHistory,
  password = "",
  notes = "Web demo user",
  createdDate = today()
) {
  return { userName, email, role, accountStatus, branchAccess, canViewAllEntry, canViewOnlySelfEntry, canEditAllEntry, canViewUpdatedHistory, password, notes, createdDate };
}

function audit(dateTime, userName, action, reference) {
  return { dateTime, user: userName, action, reference };
}

function adminRequest(requestNo, requestType, targetModule, referenceNo, requestedBy, status, date, details, proposedValues, approvedBy = "", approvalNotes = "") {
  return { requestNo, requestType, targetModule, referenceNo, requestedBy, status, date, details, proposedValues, approvedBy, approvalNotes };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(stored);
  } catch {
    return normalizeState(null);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(stored) {
  const defaults = seedState();
  if (!stored || typeof stored !== "object") {
    return defaults;
  }

  return {
    ...defaults,
    ...stored,
    shipments: Array.isArray(stored.shipments) && stored.shipments.length ? stored.shipments : defaults.shipments,
    loads: Array.isArray(stored.loads) && stored.loads.length ? stored.loads : defaults.loads,
    customers: Array.isArray(stored.customers) && stored.customers.length ? stored.customers : defaults.customers,
    suppliers: Array.isArray(stored.suppliers) && stored.suppliers.length ? stored.suppliers : defaults.suppliers,
    tariffs: Array.isArray(stored.tariffs) && stored.tariffs.length ? stored.tariffs : defaults.tariffs,
    documents: Array.isArray(stored.documents) ? stored.documents : defaults.documents,
    additionalCharges: Array.isArray(stored.additionalCharges) ? stored.additionalCharges : defaults.additionalCharges,
    invoices: Array.isArray(stored.invoices) ? stored.invoices : defaults.invoices,
    users: Array.isArray(stored.users) && stored.users.length ? stored.users : defaults.users,
    unblockRequests: Array.isArray(stored.unblockRequests) ? stored.unblockRequests : defaults.unblockRequests,
    adminRequests: Array.isArray(stored.adminRequests) ? stored.adminRequests : defaults.adminRequests,
    audit: Array.isArray(stored.audit) ? stored.audit : defaults.audit,
    settings: {
      ...defaults.settings,
      ...(stored.settings || {})
    },
    api: {
      ...defaults.api,
      ...(stored.api || {})
    },
    ui: {
      ...defaults.ui,
      ...(stored.ui || {}),
      chargeFilters: {
        shipmentNo: "",
        chargeType: "All",
        supplier: "All",
        status: "All",
        fromDate: "",
        toDate: "",
        ...((stored.ui || {}).chargeFilters || {})
      }
    }
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextNumber(prefix, collection, field) {
  const max = collection
    .map((item) => String(item[field] || ""))
    .map((value) => Number(value.replace(/\D/g, "").slice(-4)) || 0)
    .reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefix}-${new Date().toISOString().slice(2, 7).replace("-", "")}${String(max + 1).padStart(4, "0")}`;
}

function recordDate(record) {
  return record.bookingDate || record.tripDate || record.date || record.createdDate || record.effectiveFrom || record.dateTime?.slice(0, 10) || "";
}

function filteredRows(rows) {
  const query = globalSearch.value.trim().toLowerCase();
  const from = fromDate.value;
  const to = toDate.value;
  return rows.filter((row) => {
    const date = recordDate(row);
    const textMatch = !query || Object.values(row).join(" ").toLowerCase().includes(query);
    const fromMatch = !from || !date || date >= from;
    const toMatch = !to || !date || date <= to;
    return textMatch && fromMatch && toMatch;
  });
}

function maybePlayAdminNotification() {
  const pending = pendingRequestCount();
  if (isAdminSession() && lastPendingNotificationCount > 0 && pending > lastPendingNotificationCount) {
    playBeep();
  }
  lastPendingNotificationCount = pending;
}

function playBeep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
    oscillator.onended = () => audioContext.close().catch(() => {});
  } catch {}
}

function addHistory(action, reference) {
  const record = audit(new Date().toISOString().slice(0, 16).replace("T", " "), "admin", action, reference);
  state.audit.unshift(record);
  postRecord("audit", record);
  saveState();
}

function recalculateLoad(loadItem) {
  const jobs = loadItem.jobNumbers.split(",").map((job) => job.trim()).filter(Boolean);
  const linked = state.shipments.filter((shipmentItem) => jobs.includes(shipmentItem.jobNo));
  loadItem.pieces = linked.reduce((sum, item) => sum + Number(item.pieces || 0), 0);
  loadItem.actualKg = linked.reduce((sum, item) => sum + Number(item.actualKg || 0), 0);
  loadItem.cbm = linked.reduce((sum, item) => sum + Number(item.cbm || 0), 0);
  loadItem.chargeableKg = linked.reduce((sum, item) => sum + Number(item.chargeableKg || 0), 0);
}

function boot() {
  moduleNav.innerHTML = modules
    .map(([name]) => `<button type="button" data-module="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");

  moduleNav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-module]");
    if (!button) return;
    activeModule = button.dataset.module;
    render();
  });

  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });
  globalSearch.addEventListener("input", render);
  applyFilters.addEventListener("click", render);
  resetFilters.addEventListener("click", () => {
    globalSearch.value = "";
    fromDate.value = "";
    toDate.value = "";
    render();
  });
  newShipmentButton.addEventListener("click", openShipmentWorkspace);
  resetPasswordButton.addEventListener("click", handlePasswordReset);
  moduleContent.addEventListener("click", handleModuleClick);
  moduleContent.addEventListener("submit", handleModuleSubmit);
  dialogSecondary.addEventListener("click", () => dialogState?.onSecondary?.());
  dialogSave.addEventListener("click", saveDialogRecord);
  recordDialog.addEventListener("close", resetDialogShell);

  if (currentSession()) {
    showApp();
  } else {
    showLogin();
  }
}

function isAdminSession() {
  return (currentSession()?.role || "").toLowerCase() === "admin";
}

function openShipmentWorkspace() {
  activeModule = "Shipments / Jobs";
  render();
  setTimeout(() => {
    openNewDialog("shipment");
  }, 0);
}

function handlePasswordReset() {
  const email = resetEmail.value.trim();
  if (!email) {
    resetMessage.textContent = "Enter an email address first.";
    return;
  }

  resetMessage.textContent = `Password reset is not configured yet for ${email}. Enable SMTP or Microsoft 365 on the API to activate this flow.`;
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(loginForm);
  const userName = String(form.get("userName") || "").trim();
  const password = String(form.get("password") || "");

  try {
    const session = await attemptApiLogin(userName, password);
    rememberSession(session);
    loginMessage.textContent = "";
    resetMessage.textContent = "";
    showApp();
    return;
  } catch (error) {
    loginMessage.textContent = error.message || "Invalid login. Check user name and password.";
  }
}

async function attemptApiLogin(userName, password) {
  if (!userName || !password) {
    throw new Error("User name and password are required.");
  }

  try {
    const result = await fetchJson("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, password })
    });
    return result.session;
  } catch (error) {
    if (userName === "admin" && password === "admin123") {
      return {
        userName: "admin",
        role: "Admin",
        branchAccess: "Both"
      };
    }
    throw error;
  }
}

function showLogin() {
  loginScreen.classList.remove("is-hidden");
  appShell.classList.add("is-hidden");
  resetMessage.textContent = "";
}

function showApp() {
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  updateUserContext();
  syncFromApi();
  render();
}

async function syncFromApi() {
  try {
    const [
      health,
      shipments,
      consolidations,
      customers,
      suppliers,
      tariffs,
      documents,
      additionalCharges,
      invoices,
      users,
      unblockRequests,
      adminRequests,
      auditLog,
      settings
    ] = await Promise.all([
      fetchJson("/api/health"),
      fetchJson("/api/shipments"),
      fetchJson("/api/consolidations"),
      fetchJson("/api/customers"),
      fetchJson("/api/suppliers"),
      fetchJson("/api/tariffs"),
      fetchJson("/api/documents"),
      fetchJson("/api/additional-charges"),
      fetchJson("/api/invoices"),
      fetchJson("/api/users"),
      fetchJson("/api/unblock-requests"),
      fetchJson("/api/admin-requests"),
      fetchJson("/api/audit"),
      fetchJson("/api/settings")
    ]);

    const apiMode = health.mode || (health.database === "connected" ? "database" : "demo");
    state.api = {
      status: health.database === "connected" ? "API connected" : "API demo mode",
      database: health.database || "unknown",
      mode: apiMode,
      error: health.error || ""
    };
    if (shipments.rows?.length) state.shipments = shipments.rows.map(apiShipment);
    if (consolidations.rows?.length) state.loads = consolidations.rows.map(apiLoad);
    if (customers.rows?.length) state.customers = customers.rows.map(apiCustomer);
    if (suppliers.rows?.length) state.suppliers = suppliers.rows.map(apiSupplier);
    if (tariffs.rows?.length) state.tariffs = tariffs.rows.map(apiTariff);
    if (documents.rows?.length) state.documents = documents.rows.map(apiDocument);
    if (additionalCharges.rows?.length) state.additionalCharges = additionalCharges.rows.map(apiAdditionalCharge);
    if (invoices.rows?.length) state.invoices = invoices.rows.map(apiInvoice);
    if (users.rows?.length) state.users = users.rows.map(apiUser);
    if (unblockRequests.rows?.length) state.unblockRequests = unblockRequests.rows.map(apiUnblockRequest);
    if (adminRequests.rows?.length) state.adminRequests = adminRequests.rows.map(apiAdminRequest);
    if (auditLog.rows?.length) state.audit = auditLog.rows.map(apiAudit);
    if (settings.rows?.length) state.settings = apiSettings(settings.rows[0]);
    saveState();
    maybePlayAdminNotification();
    render();
  } catch (error) {
    state.api = { status: "API offline", database: "local data", mode: "browser", error: error.message };
    render();
  }
}

async function fetchJson(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function apiShipment(row) {
  return shipment(
    row.job_no,
    row.branch,
    row.customer_name,
    row.origin,
    row.destination,
    row.status,
    row.pieces || 0,
    row.actual_kg || 0,
    row.cbm || 0,
    row.chargeable_kg || 0,
    row.sell || 0,
    row.buy_cost || 0,
    row.pod_status || "Pending",
    row.invoice_status || "Unbilled",
    String(row.booking_date || today()).slice(0, 10),
    row.airway_bill_no || row.job_no?.replace("AFS", "AWB"),
    row.tariff_no || "TAR-1001",
    Number(row.transit_days || 0),
    row.shipment_direction || "Export",
    row.shipment_service || "AE",
    row.shipment_service_other || ""
  );
}

function apiLoad(row) {
  const item = load(row.load_no, String(row.trip_date || today()).slice(0, 10), row.route, row.transporter, row.vehicle_no, row.status, row.job_numbers || "");
  recalculateLoad(item);
  return item;
}

function apiCustomer(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch);
}

function apiSupplier(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch);
}

function apiTariff(row) {
  const item = tariff(row.tariff_no, row.customer, row.origin, row.destination, row.main_section, row.weight_section, row.rate_type, Number(row.rate || 0), Number(row.min_charge || 0));
  item.volumetricDivisor = Number(row.volumetric_divisor || 5000);
  item.effectiveFrom = String(row.effective_from || today()).slice(0, 10);
  item.effectiveTo = String(row.effective_to || today()).slice(0, 10);
  item.status = row.status || "Active";
  return item;
}

function apiDocument(row) {
  const item = documentRow(row.document_no, row.linked_no, row.type, row.status, String(row.date || today()).slice(0, 10), row.owner);
  item.fileName = row.file_name || "";
  item.storageUrl = row.storage_url || "";
  return item;
}

function apiAdditionalCharge(row) {
  return additionalCharge(
    row.ref_no,
    row.shipment_no,
    String(row.charge_date || today()).slice(0, 10),
    row.charge_type,
    row.charge_basis || "1 ton",
    row.supplier,
    row.reference_no || "",
    row.invoice_no || "",
    Number(row.amount || 0),
    Number(row.tax_percent || 0),
    row.currency || "KWD",
    row.remarks || "",
    row.attachment_name || "",
    row.status || "Draft",
    row.requested_by || "",
    row.approved_by || "",
    row.approval_notes || ""
  );
}

function apiInvoice(row) {
  return invoice(row.invoice_no, row.customer, row.shipment_no, Number(row.revenue || 0), Number(row.supplier_cost || 0), row.status, String(row.date || today()).slice(0, 10));
}

function apiUser(row) {
  return user(
    row.user_name,
    row.email,
    row.role,
    row.account_status,
    row.branch_access,
    row.can_view_all_entry,
    row.can_view_only_self_entry,
    row.can_edit_all_entry,
    row.can_view_updated_history,
    "",
    row.notes || "",
    String(row.created_at || today()).slice(0, 10)
  );
}

function apiUnblockRequest(row) {
  return {
    requestNo: row.request_no,
    customerName: row.customer_name,
    requestedBy: row.requested_by,
    reason: row.reason,
    status: row.status,
    date: String(row.date || today()).slice(0, 10)
  };
}

function apiAdminRequest(row) {
  return adminRequest(
    row.request_no,
    row.request_type,
    row.target_module,
    row.reference_no,
    row.requested_by,
    row.status,
    String(row.date || today()).slice(0, 10),
    row.details || "",
    row.proposed_values || "",
    row.approved_by || "",
    row.approval_notes || ""
  );
}

function apiAudit(row) {
  return {
    dateTime: String(row.date_time || "").replace("T", " ").slice(0, 16),
    user: row.user_name,
    action: row.action,
    reference: row.reference
  };
}

function apiSettings(row) {
  return {
    companyName: row.company_name || state.settings.companyName,
    shipmentNumberFormat: row.shipment_number_format || state.settings.shipmentNumberFormat,
    invoiceNumberFormat: row.invoice_number_format || state.settings.invoiceNumberFormat,
    defaultVolumetricDivisor: row.default_volumetric_divisor || state.settings.defaultVolumetricDivisor,
    requirePodBeforeInvoice: row.require_pod_before_invoice || state.settings.requirePodBeforeInvoice,
    branches: row.branches || state.settings.branches
  };
}

function render() {
  const module = modules.find(([name]) => name === activeModule) || modules[0];
  pageEyebrow.textContent = module[0];
  pageTitle.textContent = module[0];
  pageSubtitle.textContent = module[1];
  updateUserContext();
  updateDateFilterStatus();
  moduleNav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.module === activeModule));
  if (apiBanner) {
    const apiHealthy = state.api.database === "connected";
    apiBanner.className = `api-banner ${apiHealthy ? "is-ok" : "is-warning"}`;
    const errorText = state.api.error ? ` | Detail: ${escapeHtml(state.api.error)}` : "";
    apiBanner.innerHTML = `<strong>${escapeHtml(state.api.status)}</strong><span>Render: ${escapeHtml(API_URL)} | Database: ${escapeHtml(state.api.database)} | Mode: ${escapeHtml(state.api.mode)}${errorText}</span>`;
  }

  const renderers = {
    Dashboard: renderDashboard,
    "Shipments / Jobs": renderShipments,
    Consolidation: renderConsolidation,
    Customers: () => renderParties("customers", "Customer"),
    "Suppliers / Transporters": () => renderParties("suppliers", "Supplier / Transporter"),
    "Tariffs / Rate Master": renderTariffs,
    Documents: renderDocuments,
    "Additional Charges": renderAdditionalCharges,
    "Billing / Invoices": renderInvoices,
    "POD / Delivery": renderPod,
    "Shipment Status": renderShipmentStatus,
    Reports: renderReports,
    "User Management / Settings": renderSettings,
    "Audit Log": renderAudit
  };
  moduleContent.innerHTML = (renderers[activeModule] || renderDashboard)();
}

function updateUserContext() {
  const session = currentSession() || { userName: "admin", branchAccess: "Both" };
  userContextText.textContent = `User: ${session.userName} | Branch: ${session.branchAccess}`;
}

function updateDateFilterStatus() {
  if (!fromDate.value && !toDate.value) {
    dateFilterStatusText.textContent = "Showing all records";
    return;
  }

  const fromLabel = fromDate.value || "start";
  const toLabel = toDate.value || "today";
  dateFilterStatusText.textContent = `Showing records from ${fromLabel} to ${toLabel}`;
}

function renderDashboard() {
  const rows = filteredRows(state.shipments);
  const open = rows.filter((row) => ["Draft", "Booked"].includes(row.status)).length;
  const transit = rows.filter((row) => row.status === "In-Transit").length;
  const pod = rows.filter((row) => row.podStatus !== "Uploaded").length;
  const unbilled = rows.filter((row) => ["Unbilled", "Missing rate"].includes(row.invoiceStatus)).length;
  const pendingRequests = pendingRequestCount();
  const pendingCharges = state.additionalCharges.filter((row) => row.status === "Pending Approval").length;
  return `
    <section class="kpi-grid">
      ${kpi("Open Shipments", open, "Draft and booked jobs")}
      ${kpi("In Transit", transit, "Currently moving")}
      ${kpi("Pending POD", pod, "Need delivery proof")}
      ${kpi("Unbilled", unbilled, "Ready for billing review")}
      ${kpi("Pending Requests", pendingRequests, "Need admin action")}
      ${kpi("Month Revenue", money(rows.reduce((sum, row) => sum + Number(row.sell || 0), 0)), "Sell total")}
      ${kpi("Gross Profit", money(rows.reduce((sum, row) => sum + Number(row.sell || 0) - Number(row.buyCost || 0), 0) - state.additionalCharges.reduce((sum, charge) => sum + Number(charge.totalAmount || 0), 0)), "Sell minus supplier and extra cost")}
    </section>
    <section class="split-grid">
      <article class="panel">${panelHeader("Operational Shipments", "Dashboard")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Exception Alerts", "Controls")}
        <div class="alert-list">
          ${alert("Jobs missing tariff/rate", "AFS-2605005 needs tariff selection before invoice.")}
          ${alert("Delivered but not invoiced", "AFS-2605003 is delivered and waiting for billing.")}
          ${alert("Pending POD", `${pod} shipments need POD upload or dispute update.`)}
          ${alert("Admin requests waiting", `${pendingRequests} pending request(s) need admin approval. Open User Management / Settings to review.`)}
          ${alert("Additional charges waiting", `${pendingCharges} additional charge entry/changes are waiting for approval.`)}
        </div>
      </article>
    </section>`;
}

function renderShipments() {
  const rows = filteredRows(state.shipments);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Register", "Editable records")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("Shipment Actions", "shipment", "Use separate desktop-style windows for new shipment entry and load/edit shipment details.", actionChecklist([
        "New button opens the shipment popup window.",
        "Load button opens a separate search/load popup.",
        "Shipment type controls service options: Import, Export, WHC."
      ]))}
    </section>`;
}

function renderConsolidation() {
  const rows = filteredRows(state.loads).map((row) => {
    recalculateLoad(row);
    return row;
  });
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Consolidation Board", "Loads / Trips")}
        <div class="load-board">${rows.map(loadCard).join("") || empty("No consolidations found.")}</div>
      </article>
      ${moduleActionPanel("Manifest Actions", "load", "Generate, load, and update consolidation manifests from separate popup windows.", actionChecklist([
        "Load button opens an existing manifest.",
        "New button opens a fresh manifest builder.",
        "Non-admin changes can be sent for approval."
      ]))}
    </section>`;
}

function renderParties(key, label) {
  const rows = filteredRows(state[key]);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader(`${label} Register`, "Master data")} ${table(key, rows, partyColumns())}</article>
      ${moduleActionPanel(`${label} Actions`, key, `Open separate New and Load windows for ${label.toLowerCase()} records.`, actionChecklist([
        "New creates a fresh master-data entry window.",
        "Load opens an existing record to review or update."
      ]))}
    </section>`;
}

function renderTariffs() {
  const rows = filteredRows(state.tariffs);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Rate Master", "Tariffs")} ${table("tariff", rows, tariffColumns())}</article>
      ${moduleActionPanel("Tariff Actions", "tariff", "Maintain tariff cards from separate New and Load popups just like the desktop layout.")}
    </section>`;
}

function renderDocuments() {
  const rows = filteredRows(state.documents);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Document Library", "Attachments")} ${table("document", rows, documentColumns())}</article>
      ${moduleActionPanel("Document Actions", "document", "Separate popup windows are available for new document tags and for loading stored shipment files.")}
    </section>`;
}

function renderAdditionalCharges() {
  const rows = filteredAdditionalCharges();
  const selectedShipmentNo = state.ui.chargeFilters?.shipmentNo || rows[0]?.shipmentNo || state.shipments[0]?.jobNo || "";
  const summary = chargeSummary(selectedShipmentNo);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Additional Charges", "Shipment cost control")}
        ${chargeFilterPanel()}
        ${table("charge", rows, additionalChargeColumns())}
      </article>
      <article class="panel">${panelHeader("Shipment Cost Summary", "Profitability")}
        ${summaryCard(summary)}
        <div class="action-stack">
          <div class="action-row">
            <button type="button" data-action="new-record" data-type="charge">New Charge</button>
            <button type="button" class="secondary-button" data-action="load-record" data-type="charge">Load Charge</button>
          </div>
          <p class="empty-state">Admins can approve or edit charges directly. Other users send change requests to admin.</p>
          ${actionChecklist(chargeTypeOptions())}
        </div>
      </article>
    </section>`;
}

function renderInvoices() {
  const rows = filteredRows(state.invoices);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Invoice Register", "Billing")} ${table("invoice", rows, invoiceColumns())}</article>
      ${moduleActionPanel("Invoice Actions", "invoice", "Keep invoice creation and load/update in separate popup windows.")}
    </section>`;
}

function renderPod() {
  const rows = filteredRows(state.shipments.filter((row) => row.podStatus !== "Uploaded" || row.status !== "Closed"));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("POD Pending / Delivery Board", "Delivery")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("POD Actions", "pod", "Load a shipment into a separate POD window or create a new delivery update popup.")}
    </section>`;
}

function renderShipmentStatus() {
  const rows = filteredRows(state.shipments);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Status Register", "Status board")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("Status Actions", "status", "Status updates now open in a separate popup window, and loading an existing shipment stays separate from creating a new status note.")}
    </section>`;
}

function renderReports() {
  const rows = filteredRows(state.shipments);
  const revenue = rows.reduce((sum, row) => sum + Number(row.sell || 0), 0);
  const cost = rows.reduce((sum, row) => sum + Number(row.buyCost || 0), 0);
  const preview = state.ui.reportPreview;
  return `
    <section class="kpi-grid">
      ${kpi("Filtered Shipments", rows.length, "Current report scope")}
      ${kpi("Revenue", money(revenue), "Sell total")}
      ${kpi("Supplier Cost", money(cost), "Buy total")}
      ${kpi("Margin", money(revenue - cost), "Revenue minus cost")}
    </section>
    <section class="panel">${panelHeader("Report Preview and Export", "Reports")}
      <div class="report-toolbar">
        ${select("reportType", "Report Type", reportTypeOptions(), state.ui.reportType || "Daily shipments")}
        ${select("reportFormat", "Preview As", ["PDF", "Excel CSV"], state.ui.reportFormat || "PDF")}
        <button type="button" data-action="preview-report">Preview Report</button>
        <button type="button" class="secondary-button" data-action="export-report" ${preview ? "" : "disabled"}>Export Report</button>
        <button type="button" class="secondary-button" data-action="margin-report">Margin Summary</button>
      </div>
      ${preview ? reportPreviewPanel(preview) : `<div class="report-preview-empty"><p class="empty-state">Preview the report first, then export once the page layout looks correct.</p></div>`}
    </section>`;
}

function renderSettings() {
  if (!isAdminSession()) {
    return `<section class="panel">${panelHeader("Access Denied", "Admin")}<p class="empty-state">Only admin users can access user management and settings.</p></section>`;
  }

  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("User Accounts", "Permissions")} ${table("user", filteredRows(state.users), userColumns())}</article>
      ${moduleActionPanel("User / Permission Actions", "user", "Admin users can open separate New and Load windows for staff accounts and permissions.")}
    </section>
    <section class="split-grid">
      <article class="panel">${panelHeader("Company Settings", "System")}
        <form class="stack-form" data-form="settings">
          ${input("companyName", "Company Name", state.settings.companyName)}
          ${input("shipmentNumberFormat", "Shipment Number Format", state.settings.shipmentNumberFormat)}
          ${input("invoiceNumberFormat", "Invoice Number Format", state.settings.invoiceNumberFormat)}
          ${input("defaultVolumetricDivisor", "Default Volumetric Divisor", state.settings.defaultVolumetricDivisor)}
          ${select("requirePodBeforeInvoice", "Require POD Before Invoice", ["Yes", "No"], state.settings.requirePodBeforeInvoice)}
          ${input("branches", "Branches", state.settings.branches)}
          <button type="submit">Save Company Settings</button>
        </form>
      </article>
      <article class="panel">${panelHeader("Pending Approvals", "Admin")}
        <div class="alert-list">
          ${alert("Pending admin requests", `${state.adminRequests.filter((row) => row.status === "Pending").length} request(s) waiting for approval.`)}
          ${alert("Pending unblock requests", `${state.unblockRequests.filter((row) => row.status === "Pending").length} request(s) waiting for approval.`)}
        </div>
      </article>
    </section>
    <section class="split-grid">
      <article class="panel">${panelHeader("Customer Unblock Requests", "Admin")} ${table("unblock", filteredRows(state.unblockRequests), unblockColumns())}</article>
      <article class="panel">${panelHeader("Admin Requests", "Approval")} ${table("adminRequest", filteredRows(state.adminRequests), adminRequestColumns())}</article>
    </section>`;
}

function renderAudit() {
  return `<section class="panel">${panelHeader("Audit Trail", "History")} ${table("audit", filteredRows(state.audit), auditColumns())}</section>`;
}

function moduleActionPanel(title, type, note, extra = "") {
  return `<article class="panel">${panelHeader(title, "New / Load")}
    <div class="action-stack">
      <p class="empty-state">${escapeHtml(note)}</p>
      <div class="action-row">
        <button type="button" data-action="new-record" data-type="${escapeHtml(type)}">New</button>
        <button type="button" class="secondary-button" data-action="load-record" data-type="${escapeHtml(type)}">Load</button>
      </div>
      ${extra}
    </div>
  </article>`;
}

function actionChecklist(items) {
  return `<div class="bullet-card">${items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`;
}

function chargeFilterPanel() {
  const filters = state.ui.chargeFilters || {};
  return `<div class="charge-filter-grid">
    ${input("chargeShipmentNo", "Shipment No", filters.shipmentNo || "", false, "text")}
    ${select("chargeTypeFilter", "Charge Type", ["All", ...chargeTypeOptions()], filters.chargeType || "All")}
    ${select("chargeSupplierFilter", "Supplier", ["All", ...uniqueOptions(state.additionalCharges.map((row) => row.supplier))], filters.supplier || "All")}
    ${select("chargeStatusFilter", "Status", ["All", ...chargeStatusOptions()], filters.status || "All")}
    ${input("chargeFromDate", "From Date", filters.fromDate || "", false, "date")}
    ${input("chargeToDate", "To Date", filters.toDate || "", false, "date")}
    <button type="button" data-action="filter-charges">Search</button>
    <button type="button" data-action="new-record" data-type="charge">New Charge</button>
    <button type="button" class="secondary-button" data-action="load-record" data-type="charge">Load Charge</button>
  </div>`;
}

function chargeSummary(shipmentNo) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === shipmentNo);
  const chargeRows = state.additionalCharges.filter((row) => row.shipmentNo === shipmentNo);
  const extraCost = chargeRows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const freightCost = Number(shipmentItem?.buyCost || 0);
  const sellAmount = Number(shipmentItem?.sell || 0);
  return {
    shipmentNo,
    freightCost,
    additionalCharges: extraCost,
    totalCost: freightCost + extraCost,
    sellAmount,
    netProfit: sellAmount - (freightCost + extraCost)
  };
}

function summaryCard(summary) {
  return `<div class="summary-card">
    <h3>${escapeHtml(summary.shipmentNo || "Shipment Summary")}</h3>
    <p><span>Freight Cost</span><strong>${money(summary.freightCost)}</strong></p>
    <p><span>Additional Charges</span><strong>${money(summary.additionalCharges)}</strong></p>
    <p><span>Total Cost</span><strong>${money(summary.totalCost)}</strong></p>
    <p><span>Sell Amount</span><strong>${money(summary.sellAmount)}</strong></p>
    <p><span>Net Profit</span><strong>${money(summary.netProfit)}</strong></p>
  </div>`;
}

function reportPreviewPanel(preview) {
  return `<div class="report-preview-shell">
    <div class="report-preview-page ${preview.format === "PDF" ? "pdf" : "excel"}">
      <div class="report-preview-heading">
        <h3>${escapeHtml(preview.reportType)}</h3>
        <p>${escapeHtml(preview.summary)}</p>
      </div>
      ${table("shipment", preview.rows, shipmentColumns(), false)}
    </div>
  </div>`;
}

function kpi(title, value, caption) {
  return `<article class="kpi"><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(caption)}</small></article>`;
}

function alert(title, detail) {
  return `<article class="alert"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></article>`;
}

function panelHeader(title, label) {
  return `<div class="panel-header"><div><p class="eyebrow">${escapeHtml(label)}</p><h2>${escapeHtml(title)}</h2></div></div>`;
}

function empty(text) {
  return `<p class="empty-state">${escapeHtml(text)}</p>`;
}

function table(type, rows, columns, showLoad = true) {
  const header = showLoad ? `<th>Load</th>` : "";
  const colSpan = columns.length + (showLoad ? 1 : 0);
  const body = rows.length
    ? rows.map((row, index) => tableRow(type, row, index, columns, showLoad)).join("")
    : `<tr><td colspan="${colSpan}">${empty("No records found.")}</td></tr>`;
  return `<div class="table-wrap"><table><thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function tableRow(type, row, index, columns, showLoad = true) {
  const id = rowId(type, row);
  const actionCell = showLoad ? `<td><button class="ghost-button" data-action="open" data-type="${type}" data-id="${escapeHtml(id)}">Load</button></td>` : "";
  return `<tr>${columns.map(([key]) => `<td>${cellHtml(type, key, row)}</td>`).join("")}${actionCell}</tr>`;
}

function display(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : money(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ?? "";
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function chargeTypeOptions() {
  return [
    "Labour Charges",
    "Delivery Charges",
    "Loading Charges",
    "Unloading Charges",
    "Fuel Charges",
    "Toll Charges",
    "Handling Charges",
    "Customs Charges",
    "Warehouse Charges",
    "Documentation Charges",
    "Crane Charges",
    "Local Transport",
    "Miscellaneous"
  ];
}

function chargeBasisOptions() {
  return ["1 ton", "3 ton", "5 ton", "10 ton", "Flat", "Per Shipment"];
}

function chargeStatusOptions() {
  return ["Draft", "Pending Approval", "Approved", "Rejected", "Posted to Invoice"];
}

function reportTypeOptions() {
  return ["Daily shipments", "Open / in-transit / delivered", "Pending POD / invoice", "Revenue by customer / route", "Margin and cost vs sell"];
}

function shipmentDirectionOptions() {
  return ["Import", "Export", "WHC"];
}

function shipmentServiceOptions(direction) {
  if (direction === "Import") {
    return ["SI", "AI", "LI", "Other"];
  }

  if (direction === "WHC") {
    return ["WHC Remark"];
  }

  return ["SE", "AE", "LE", "Other"];
}

function filteredAdditionalCharges() {
  const filters = state.ui.chargeFilters || {};
  return filteredRows(state.additionalCharges).filter((row) => {
    const shipmentMatch = !filters.shipmentNo || row.shipmentNo.toLowerCase().includes(String(filters.shipmentNo).toLowerCase());
    const typeMatch = !filters.chargeType || filters.chargeType === "All" || row.chargeType === filters.chargeType;
    const supplierMatch = !filters.supplier || filters.supplier === "All" || row.supplier === filters.supplier;
    const statusMatch = !filters.status || filters.status === "All" || row.status === filters.status;
    const fromMatch = !filters.fromDate || row.chargeDate >= filters.fromDate;
    const toMatch = !filters.toDate || row.chargeDate <= filters.toDate;
    return shipmentMatch && typeMatch && supplierMatch && statusMatch && fromMatch && toMatch;
  });
}

function pendingRequestCount() {
  return state.adminRequests.filter((row) => row.status === "Pending").length + state.unblockRequests.filter((row) => row.status === "Pending").length;
}

function badge(value) {
  const tone =
    value === "Approved" || value === "Paid" || value === "Uploaded"
      ? "ok"
      : value === "Pending" || value === "Pending Approval" || value === "In-Transit"
        ? "warn"
        : value === "Rejected" || value === "Declined" || value === "Blocked" || value === "Missing"
          ? "bad"
          : "neutral";
  return `<span class="status-badge ${tone}">${escapeHtml(value)}</span>`;
}

function cellHtml(type, key, row) {
  if (["status", "podStatus", "invoiceStatus", "accountStatus"].includes(key)) {
    return badge(display(row[key]));
  }

  if (type === "charge" && ["amount", "taxAmount", "totalAmount"].includes(key)) {
    return money(row[key]);
  }

  if (type === "charge" && key === "taxPercent") {
    return `${escapeHtml(row[key])}%`;
  }

  if (type === "invoice" && ["revenue", "supplierCost"].includes(key)) {
    return money(row[key]);
  }

  return escapeHtml(display(row[key]));
}

function loadCard(loadItem) {
  const jobs = loadItem.jobNumbers.split(",").map((job) => job.trim()).filter(Boolean);
  return `<article class="load-card">
    <button class="load-title" data-action="open" data-type="load" data-id="${escapeHtml(loadItem.loadNo)}">${escapeHtml(loadItem.loadNo)}</button>
    <div class="load-meta">${escapeHtml(loadItem.tripDate)} | ${escapeHtml(loadItem.route)} | ${escapeHtml(loadItem.status)} | ${escapeHtml(loadItem.vehicleNo)}</div>
    <div class="job-list">${jobs.map((jobNo) => jobBadge(jobNo)).join("") || empty("No jobs linked yet.")}</div>
  </article>`;
}

function jobBadge(jobNo) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo);
  if (!shipmentItem) return `<button class="job-chip warning">${escapeHtml(jobNo)}</button>`;
  return `<button class="job-chip" data-action="open" data-type="shipment" data-id="${escapeHtml(jobNo)}"><strong>${escapeHtml(jobNo)}</strong><span>${escapeHtml(shipmentItem.customer)} | Pieces ${escapeHtml(shipmentItem.pieces)} | ${escapeHtml(shipmentItem.status)}</span></button>`;
}

function input(name, label, value = "", readonly = false, type = "text") {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}" ${readonly ? "readonly" : ""} /></label>`;
}

function textarea(name, label, value = "", readonly = false, rows = 4) {
  return `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}" ${readonly ? "readonly" : ""}>${escapeHtml(value)}</textarea></label>`;
}

function checkbox(name, label, checked = false) {
  return `<label class="checkbox-field"><input name="${escapeHtml(name)}" type="checkbox" ${checked ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function select(name, label, options, selected = options[0]) {
  return `<label>${escapeHtml(label)}<select name="${escapeHtml(name)}">${options.map((option) => `<option ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
}

function selectFrom(name, label, options) {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" list="${escapeHtml(name)}Options" value="${escapeHtml(options[0] || "")}" /><datalist id="${escapeHtml(name)}Options">${options.map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist></label>`;
}

function statusOptions() {
  return ["Draft", "Booked", "In-Transit", "Delivered", "Invoiced", "Closed", "Blocked"];
}

function roleOptions() {
  return ["Admin", "Operations", "Billing", "Management", "Read-only"];
}

function accountStatusOptions() {
  return ["Active", "Inactive", "Locked"];
}

function branchAccessOptions() {
  return ["Branch 1", "Branch 2", "Both"];
}

function shipmentColumns() {
  return [["jobNo", "Job No"], ["customer", "Customer"], ["shipmentDirection", "Type"], ["shipmentService", "Service"], ["status", "Status"], ["bookingDate", "Date"], ["invoiceStatus", "Invoice"]];
}

function partyColumns() {
  return [["code", "Code"], ["name", "Name"], ["locationOrLane", "Lane / Location"], ["email", "Email"], ["terms", "Terms"], ["status", "Status"], ["branch", "Branch"]];
}

function tariffColumns() {
  return [["tariffNo", "Tariff"], ["customer", "Customer"], ["origin", "Origin"], ["destination", "Destination"], ["mainSection", "Section"], ["rateType", "Type"], ["rate", "Rate"]];
}

function documentColumns() {
  return [["documentNo", "Document"], ["linkedNo", "Linked No"], ["type", "Type"], ["status", "Status"], ["date", "Date"], ["owner", "Owner"]];
}

function invoiceColumns() {
  return [["invoiceNo", "Invoice"], ["customer", "Customer"], ["shipmentNo", "Shipment"], ["revenue", "Revenue"], ["supplierCost", "Cost"], ["status", "Status"], ["date", "Date"]];
}

function additionalChargeColumns() {
  return [["refNo", "Ref No"], ["shipmentNo", "Shipment No"], ["chargeType", "Charge Type"], ["supplier", "Supplier"], ["amount", "Amount"], ["taxAmount", "Tax"], ["totalAmount", "Total"], ["status", "Status"]];
}

function userColumns() {
  return [["userName", "User"], ["email", "Email"], ["role", "Role"], ["accountStatus", "Status"], ["branchAccess", "Branch"]];
}

function unblockColumns() {
  return [["requestNo", "Request"], ["customerName", "Customer"], ["requestedBy", "Requested By"], ["reason", "Reason"], ["status", "Status"], ["date", "Date"]];
}

function adminRequestColumns() {
  return [["requestNo", "Request"], ["requestType", "Type"], ["targetModule", "Module"], ["referenceNo", "Reference"], ["requestedBy", "Requested By"], ["status", "Status"], ["date", "Date"]];
}

function auditColumns() {
  return [["dateTime", "Date Time"], ["user", "User"], ["action", "Action"], ["reference", "Reference"]];
}

function rowId(type, row) {
  const keys = {
    shipment: "jobNo",
    load: "loadNo",
    customers: "code",
    suppliers: "code",
    tariff: "tariffNo",
    document: "documentNo",
    charge: "refNo",
    invoice: "invoiceNo",
    user: "userName",
    unblock: "requestNo",
    adminRequest: "requestNo",
    audit: "reference"
  };
  return row[keys[type]] || "";
}

function collectionFor(type) {
  const collections = {
    shipment: state.shipments,
    load: state.loads,
    customers: state.customers,
    suppliers: state.suppliers,
    tariff: state.tariffs,
    document: state.documents,
    charge: state.additionalCharges,
    invoice: state.invoices,
    user: state.users,
    unblock: state.unblockRequests,
    adminRequest: state.adminRequests,
    audit: state.audit
  };
  return collections[type] || [];
}

function handleModuleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, type, id } = button.dataset;

  if (action === "open") {
    openRecord(type, id);
    return;
  }

  if (action === "new-record") {
    openNewDialog(type);
    return;
  }

  if (action === "load-record") {
    openLoadDialog(type);
    return;
  }

  if (action === "preview-report") {
    previewReport();
    return;
  }

  if (action === "export-report") {
    exportReport();
    return;
  }

  if (action === "margin-report") {
    const margin = filteredRows(state.shipments).reduce((sum, row) => sum + Number(row.sell || 0) - Number(row.buyCost || 0), 0);
    window.alert(`Current margin: ${money(margin)}`);
    return;
  }

  if (action === "filter-charges") {
    applyChargeFilters();
    return;
  }
}

function openRecord(type, id) {
  const collection = collectionFor(type);
  const record = collection.find((row) => rowId(type, row) === id);
  if (!record) return;

  if (type === "adminRequest") {
    openAdminRequestDialog(record);
    return;
  }

  editing = { type, id, record };
  dialogState = null;
  dialogType.textContent = `${type} record`;
  dialogTitle.textContent = id;
  dialogSave.textContent = type === "charge" && !isAdminSession() ? "Send Change Request" : "Save Changes";
  dialogSecondary.classList.add("is-hidden");
  dialogBody.innerHTML = Object.entries(record)
    .map(([key, value]) => {
      if (typeof value === "boolean") {
        return checkbox(key, key, value);
      }
      return `<label>${escapeHtml(key)}<input name="${escapeHtml(key)}" value="${escapeHtml(value)}" /></label>`;
    })
    .join("");
  recordDialog.showModal();
}

function saveDialogRecord() {
  if (dialogState?.onSave) {
    dialogState.onSave();
    return;
  }

  if (!editing) return;
  const data = collectFormValues(dialogBody.closest("form"));
  const updatedRecord = { ...editing.record };
  Object.keys(updatedRecord).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      updatedRecord[key] = coerceValue(updatedRecord[key], data[key]);
    }
  });
  if (editing.type === "load") recalculateLoad(updatedRecord);

  if (editing.type === "charge" && !isAdminSession()) {
    submitAdminRequest(
      "Additional Charges",
      editing.id,
      "Charge change request submitted by non-admin user.",
      summarizeChanges(editing.record, updatedRecord),
      "Charge Change Request"
    );
    addHistory("Submitted charge change request", editing.id);
    saveState();
    resetDialogShell();
    recordDialog.close();
    render();
    return;
  }

  Object.assign(editing.record, updatedRecord);
  addHistory(`Updated ${editing.type}`, editing.id);
  persistRecord(editing.type, editing.record);
  saveState();
  resetDialogShell();
  recordDialog.close();
  render();
}

function resetDialogShell() {
  editing = null;
  dialogState = null;
  dialogSecondary.classList.add("is-hidden");
  dialogSecondary.textContent = "Secondary";
  dialogSave.textContent = "Save Changes";
}

function openDialog({ title, typeLabel, body, saveLabel, secondaryLabel = "", onSave = null, onSecondary = null, afterOpen = null }) {
  resetDialogShell();
  dialogType.textContent = typeLabel;
  dialogTitle.textContent = title;
  dialogBody.innerHTML = body;
  dialogSave.textContent = saveLabel || "Save Changes";
  dialogState = { onSave, onSecondary };
  if (secondaryLabel && onSecondary) {
    dialogSecondary.textContent = secondaryLabel;
    dialogSecondary.classList.remove("is-hidden");
  }
  recordDialog.showModal();
  afterOpen?.();
}

function openNewDialog(type) {
  const config = dialogConfigFor(type);
  if (!config) return;
  openDialog({
    title: config.title,
    typeLabel: config.typeLabel,
    body: config.body,
    saveLabel: config.saveLabel,
    onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      config.onSave(data);
      saveState();
      recordDialog.close();
      render();
    },
    afterOpen: config.afterOpen
  });
}

function openLoadDialog(type) {
  const collection = collectionFor(type);
  if (!collection.length) {
    window.alert(`No ${type} records available yet.`);
    return;
  }
  const firstId = rowId(type, collection[0] || {});
  openDialog({
    title: `Load ${type}`,
    typeLabel: "Load",
    body: `<label>Select existing record<select name="selectedId">${collection.map((row) => `<option value="${escapeHtml(rowId(type, row))}">${escapeHtml(rowId(type, row))}</option>`).join("")}</select></label>`,
    saveLabel: `Load ${type}`,
    onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      const selectedId = data.selectedId || firstId;
      recordDialog.close();
      openRecord(type, selectedId);
    }
  });
}

function openAdminRequestDialog(record) {
  openDialog({
    title: record.requestNo,
    typeLabel: "Approval Request",
    body: `
      <label>Request Type<input value="${escapeHtml(record.requestType)}" readonly /></label>
      <label>Module<input value="${escapeHtml(record.targetModule)}" readonly /></label>
      <label>Reference No<input value="${escapeHtml(record.referenceNo)}" readonly /></label>
      <label>Requested By<input value="${escapeHtml(record.requestedBy)}" readonly /></label>
      <label>Status<input value="${escapeHtml(record.status)}" readonly /></label>
      <label>Details<textarea name="details" rows="4" readonly>${escapeHtml(record.details)}</textarea></label>
      <label>Proposed Values<textarea name="proposedValues" rows="5" readonly>${escapeHtml(record.proposedValues)}</textarea></label>
      <label>Approval Notes<textarea name="approvalNotes" rows="4">${escapeHtml(record.approvalNotes || "")}</textarea></label>
    `,
    saveLabel: "Approve Request",
    secondaryLabel: "Reject Request",
    onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      approveAdminRequest(record, data.approvalNotes || "");
      recordDialog.close();
      render();
    },
    onSecondary() {
      const data = collectFormValues(dialogBody.closest("form"));
      rejectAdminRequest(record, data.approvalNotes || "");
      recordDialog.close();
      render();
    }
  });
}

function dialogConfigFor(type) {
  const configs = {
    shipment: {
      title: "New Shipment",
      typeLabel: "Shipment",
      saveLabel: "Create Shipment",
      body: shipmentDialogBody(),
      onSave: createShipment,
      afterOpen: bindShipmentDirectionDialog
    },
    load: {
      title: "New Consolidation",
      typeLabel: "Consolidation",
      saveLabel: "Create Consolidation",
      body: `
        ${input("loadNo", "Consolidation No", nextNumber("CON", state.loads, "loadNo"), true)}
        ${input("tripDate", "Trip Date", today(), false, "date")}
        ${input("route", "Route", "Kuwait - Riyadh")}
        ${input("transporter", "Transporter", "Al Dana Transport")}
        ${input("vehicleNo", "Vehicle No", "KWT-00000")}
        ${select("status", "Status", ["Planned", "Loading", "Dispatched", "Delivered", "Closed"])}
        ${selectFrom("jobNumbers", "Job Numbers", state.shipments.map((row) => row.jobNo))}
      `,
      onSave: createLoad
    },
    customers: partyDialogConfig("customers", "Customer"),
    suppliers: partyDialogConfig("suppliers", "Supplier / Transporter"),
    tariff: {
      title: "New Tariff",
      typeLabel: "Tariff",
      saveLabel: "Create Tariff",
      body: `
        ${input("tariffNo", "Tariff Number", nextNumber("TAR", state.tariffs, "tariffNo"), true)}
        ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
        ${input("origin", "Origin", "Kuwait City")}
        ${input("destination", "Destination", "Riyadh")}
        ${select("mainSection", "Main Section", ["FTL", "LTL"])}
        ${select("weightSection", "Weight Section", ["Minimum", "Up to 100 KG", "300 KG", "500 KG", "1000 KG", "More"])}
        ${select("rateType", "Rate Type", ["Per KG", "Per CBM", "Per Pallet", "Per Trip"])}
        ${input("rate", "Rate", "0.420", false, "number")}
        ${input("minCharge", "Minimum Charge", "35.000", false, "number")}
      `,
      onSave: createTariff
    },
    document: {
      title: "New Document Tag",
      typeLabel: "Document",
      saveLabel: "Save Document Tag",
      body: `
        ${input("documentNo", "Document No", nextNumber("DOC", state.documents, "documentNo"), true)}
        ${selectFrom("linkedNo", "Attach To", state.shipments.map((row) => row.jobNo))}
        ${select("type", "Document Type", ["Waybill", "LR", "CMR", "Commercial Invoice", "Packing List", "POD", "Supplier Invoice"])}
        ${select("status", "Status", ["Uploaded", "Attached", "Missing", "Issued", "Stored", "Replaced"])}
        ${input("date", "Date", today(), false, "date")}
        ${input("owner", "Owner", currentSession()?.userName || "operations")}
      `,
      onSave: createDocument
    },
    charge: {
      title: "New Additional Charge",
      typeLabel: "Additional Charges",
      saveLabel: isAdminSession() ? "Save Charge" : "Send for Approval",
      body: chargeDialogBody(),
      onSave: createCharge
    },
    invoice: {
      title: "New Invoice",
      typeLabel: "Invoice",
      saveLabel: "Generate Invoice",
      body: `
        ${input("invoiceNo", "Invoice No", nextNumber("INV", state.invoices, "invoiceNo"), true)}
        ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
        ${selectFrom("shipmentNo", "Shipment", state.shipments.map((row) => row.jobNo))}
        ${input("revenue", "Revenue", "100.000", false, "number")}
        ${input("supplierCost", "Supplier Cost", "70.000", false, "number")}
        ${select("status", "Status", ["Draft", "Approved", "Sent", "Paid", "Overdue"])}
        ${input("date", "Date", today(), false, "date")}
      `,
      onSave: createInvoice
    },
    pod: {
      title: "Delivery Update",
      typeLabel: "POD",
      saveLabel: "Mark Delivered + Upload POD",
      body: `
        ${selectFrom("jobNo", "Shipment No", state.shipments.map((row) => row.jobNo))}
        ${input("receiver", "Receiver", "Receiver Name")}
      `,
      onSave: updatePod
    },
    status: {
      title: "Shipment Status Update",
      typeLabel: "Status",
      saveLabel: "Update Shipment Status",
      body: `
        ${selectFrom("jobNo", "Job No", state.shipments.map((row) => row.jobNo))}
        ${select("status", "Shipment Status", statusOptions())}
        ${select("podStatus", "POD Status", ["Pending", "Uploaded", "Missing", "Disputed", "Approved"])}
        ${select("invoiceStatus", "Invoice Status", ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue"])}
        ${input("notes", "Notes", "Status update")}
      `,
      onSave: updateStatus
    },
    user: {
      title: "Create User / Permissions",
      typeLabel: "User",
      saveLabel: "Create User",
      body: userDialogBody(),
      onSave: createUser
    }
  };

  return configs[type];
}

function partyDialogConfig(key, label) {
  return {
    title: `New ${label}`,
    typeLabel: label,
    saveLabel: `Create ${label}`,
    body: `
      ${input("code", `${label} Code`, key === "customers" ? nextNumber("CUS", state.customers, "code") : nextNumber("TRN", state.suppliers, "code"), true)}
      ${input("name", "Name", "")}
      ${input("locationOrLane", "Lane / Location", "")}
      ${input("email", "Contact Email", "", false, "email")}
      ${select("terms", "Credit Limit Days", ["15 days", "30 days", "45 days"])}
      ${select("status", "Status", ["Active", "Inactive", "Blocked"])}
      ${select("branch", "Branch", ["Branch 1", "Branch 2", "Both"])}
    `,
    onSave: (data) => createParty(key, data)
  };
}

function shipmentDialogBody() {
  return `
    ${input("jobNo", "Job Number", nextNumber("AFS", state.shipments, "jobNo"), true)}
    ${input("airwayBillNo", "Airway Bill Number", nextNumber("AWB", state.shipments, "jobNo"))}
    ${select("branch", "Branch", ["Branch 1", "Branch 2"])}
    ${select("shipmentDirection", "Shipment Type", shipmentDirectionOptions(), "Export")}
    ${select("shipmentService", "Shipment Service", shipmentServiceOptions("Export"), "AE")}
    ${input("shipmentServiceOther", "Other Service / WHC Remark", "")}
    ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
    ${selectFrom("tariffNo", "Applied Tariff", state.tariffs.map((row) => row.tariffNo))}
    ${input("origin", "Origin", "Kuwait City")}
    ${input("destination", "Destination", "Riyadh")}
    ${input("pieces", "Pieces / Pallets", "1", false, "number")}
    ${input("actualKg", "Actual Weight KG", "100", false, "number")}
    ${input("cbm", "Volume CBM", "1.0", false, "number")}
    ${input("chargeableKg", "Chargeable Weight KG", "200", false, "number")}
    ${select("transitDays", "Transit Time in Days", Array.from({ length: 30 }, (_, index) => String(index + 1)), "3")}
    ${input("sell", "Sell Price", "100.000", false, "number")}
    ${input("buyCost", "Supplier Cost", "70.000", false, "number")}
    ${checkbox("invoiceAttached", "Invoice attached")}
    ${checkbox("packingListAttached", "PL attached")}
  `;
}

function userDialogBody() {
  return `
    ${input("userName", "User Name", "")}
    ${input("password", "Password", "", false, "password")}
    ${input("email", "Email", "", false, "email")}
    ${select("role", "User Role", roleOptions(), "Operations")}
    ${select("accountStatus", "User Account", accountStatusOptions(), "Active")}
    ${select("branchAccess", "Branch Access", branchAccessOptions(), "Branch 1")}
    ${checkbox("canViewAllEntry", "User can view all entry")}
    ${checkbox("canViewOnlySelfEntry", "User can view only self entry", true)}
    ${checkbox("canEditAllEntry", "User can edit all entry")}
    ${checkbox("canViewUpdatedHistory", "User can view updated history", true)}
    ${input("notes", "Notes", "Created from admin panel")}
  `;
}

function chargeDialogBody() {
  return `
    ${input("refNo", "Ref No", nextNumber("CHG", state.additionalCharges, "refNo"), true)}
    ${selectFrom("shipmentNo", "Shipment No", state.shipments.map((row) => row.jobNo))}
    ${input("chargeDate", "Charge Date", today(), false, "date")}
    ${select("chargeType", "Charge Type", chargeTypeOptions())}
    ${select("chargeBasis", "Charge Basis", chargeBasisOptions())}
    ${selectFrom("supplier", "Supplier / Vendor", state.suppliers.map((row) => row.name))}
    ${input("referenceNo", "Reference No", "")}
    ${input("invoiceNo", "Invoice No", "")}
    ${input("amount", "Amount", "0.000", false, "number")}
    ${input("taxPercent", "Tax %", "0", false, "number")}
    ${select("currency", "Currency", ["KWD", "USD", "SAR"], "KWD")}
    ${input("attachmentName", "Attachment Upload", "")}
    ${select("status", "Status", chargeStatusOptions(), isAdminSession() ? "Approved" : "Pending Approval")}
    ${textarea("remarks", "Remarks", "")}
  `;
}

function bindShipmentDirectionDialog() {
  const directionSelect = dialogBody.querySelector("select[name='shipmentDirection']");
  const serviceSelect = dialogBody.querySelector("select[name='shipmentService']");
  const otherField = dialogBody.querySelector("input[name='shipmentServiceOther']");
  if (!directionSelect || !serviceSelect) return;

  const syncOptions = () => {
    const options = shipmentServiceOptions(directionSelect.value);
    serviceSelect.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
    if (directionSelect.value === "WHC") {
      serviceSelect.value = "WHC Remark";
      otherField.placeholder = "Manual warehouse remark";
    } else {
      serviceSelect.value = options[0];
      otherField.placeholder = "Optional other service";
    }
  };

  directionSelect.addEventListener("change", syncOptions);
  syncOptions();
}

function collectFormValues(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  form.querySelectorAll("input[type='checkbox'][name]").forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

function applyChargeFilters() {
  state.ui.chargeFilters = {
    shipmentNo: dialogSafeValue("chargeShipmentNo"),
    chargeType: dialogSafeValue("chargeTypeFilter", "All"),
    supplier: dialogSafeValue("chargeSupplierFilter", "All"),
    status: dialogSafeValue("chargeStatusFilter", "All"),
    fromDate: dialogSafeValue("chargeFromDate"),
    toDate: dialogSafeValue("chargeToDate")
  };
  saveState();
  render();
}

function dialogSafeValue(name, fallback = "") {
  return moduleContent.querySelector(`[name='${name}']`)?.value || fallback;
}

function summarizeChanges(previous, next) {
  return Object.keys(next)
    .filter((key) => String(previous[key] ?? "") !== String(next[key] ?? ""))
    .map((key) => `${key}: ${previous[key] ?? ""} -> ${next[key] ?? ""}`)
    .join(" | ");
}

function coerceValue(previous, next) {
  if (typeof previous === "number") return Number(next) || 0;
  if (typeof previous === "boolean") return next === "true" || next === "Yes";
  return next;
}

function isChecked(value) {
  return value === true || value === "true" || value === "on" || value === "Yes";
}

function parseChangeSummary(summary) {
  return String(summary || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((patch, item) => {
      const [keyPart, valuePart] = item.split(":");
      if (!keyPart || !valuePart || !valuePart.includes("->")) return patch;
      const nextValue = valuePart.split("->").slice(1).join("->").trim();
      patch[keyPart.trim()] = nextValue;
      return patch;
    }, {});
}

function previewReport() {
  const reportType = moduleContent.querySelector("[name='reportType']")?.value || state.ui.reportType || "Daily shipments";
  const reportFormat = moduleContent.querySelector("[name='reportFormat']")?.value || state.ui.reportFormat || "PDF";
  const rows = reportRows(reportType);
  const revenue = rows.reduce((sum, row) => sum + Number(row.sell || 0), 0);
  const cost = rows.reduce((sum, row) => sum + Number(row.buyCost || 0), 0);
  state.ui.reportType = reportType;
  state.ui.reportFormat = reportFormat;
  state.ui.reportPreview = {
    reportType,
    format: reportFormat,
    rows,
    summary: `${rows.length} shipment(s) | Revenue ${money(revenue)} | Cost ${money(cost)} | Margin ${money(revenue - cost)}`
  };
  saveState();
  render();
}

function reportRows(reportType) {
  const rows = filteredRows(state.shipments);
  if (reportType === "Open / in-transit / delivered") {
    return rows.filter((row) => ["Booked", "In-Transit", "Delivered"].includes(row.status));
  }

  if (reportType === "Pending POD / invoice") {
    return rows.filter((row) => row.podStatus !== "Uploaded" || ["Unbilled", "Draft", "Overdue"].includes(row.invoiceStatus));
  }

  return rows;
}

function exportReport() {
  const preview = state.ui.reportPreview;
  if (!preview) {
    window.alert("Preview the report first.");
    return;
  }

  if (preview.format === "Excel CSV") {
    downloadCsv(preview);
    return;
  }

  const printWindow = window.open("", "_blank", "width=1080,height=760");
  if (!printWindow) {
    window.alert("Allow popups to print the PDF preview.");
    return;
  }

  const tableHtml = table("shipment", preview.rows, shipmentColumns(), false);
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(preview.reportType)}</title>
        <style>
          body { font-family: "Segoe UI", sans-serif; padding: 24px; color: #16202a; }
          h1 { margin: 0 0 6px; font-size: 26px; }
          p { margin: 0 0 18px; color: #50606f; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #dbe3ea; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f5f8fb; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(preview.reportType)}</h1>
        <p>${escapeHtml(preview.summary)}</p>
        ${tableHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 150);
}

function downloadCsv(preview) {
  const columns = shipmentColumns();
  const header = columns.map(([, label]) => `"${label.replace(/"/g, '""')}"`).join(",");
  const lines = preview.rows.map((row) =>
    columns
      .map(([key]) => `"${String(display(row[key])).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${preview.reportType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function submitAdminRequest(targetModule, referenceNo, details, proposedValues, requestType = "Change Request") {
  const request = adminRequest(
    nextNumber("ADM", state.adminRequests, "requestNo"),
    requestType,
    targetModule,
    referenceNo,
    currentSession()?.userName || "operations",
    "Pending",
    today(),
    details,
    proposedValues
  );
  state.adminRequests.unshift(request);
  postRecord("adminRequest", request);
  return request;
}

function approveAdminRequest(request, approvalNotes = "") {
  request.status = "Approved";
  request.approvedBy = currentSession()?.userName || "admin";
  request.approvalNotes = approvalNotes;
  persistRecord("adminRequest", request);

  if (request.targetModule === "Additional Charges") {
    const charge = state.additionalCharges.find((row) => row.refNo === request.referenceNo);
    if (charge) {
      const changes = parseChangeSummary(request.proposedValues);
      Object.entries(changes).forEach(([key, value]) => {
        if (["amount", "taxPercent", "taxAmount", "totalAmount"].includes(key)) {
          charge[key] = Number(value) || 0;
        } else {
          charge[key] = value;
        }
      });
      const refreshed = additionalCharge(
        charge.refNo,
        charge.shipmentNo,
        charge.chargeDate,
        charge.chargeType,
        charge.chargeBasis,
        charge.supplier,
        charge.referenceNo,
        charge.invoiceNo,
        charge.amount,
        charge.taxPercent,
        charge.currency,
        charge.remarks,
        charge.attachmentName,
        "Approved",
        charge.requestedBy || request.requestedBy,
        request.approvedBy,
        approvalNotes
      );
      Object.assign(charge, refreshed);
      persistRecord("charge", charge);
    }
  }

  addHistory("Approved admin request", request.requestNo);
  saveState();
}

function rejectAdminRequest(request, approvalNotes = "") {
  request.status = "Rejected";
  request.approvedBy = currentSession()?.userName || "admin";
  request.approvalNotes = approvalNotes;
  persistRecord("adminRequest", request);

  if (request.targetModule === "Additional Charges") {
    const charge = state.additionalCharges.find((row) => row.refNo === request.referenceNo && row.status === "Pending Approval");
    if (charge) {
      charge.status = "Rejected";
      charge.approvedBy = request.approvedBy;
      charge.approvalNotes = approvalNotes;
      persistRecord("charge", charge);
    }
  }

  addHistory("Rejected admin request", request.requestNo);
  saveState();
}

function handleModuleSubmit(event) {
  event.preventDefault();
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.form;
  const handlers = {
    shipment: () => createShipment(data),
    load: () => createLoad(data),
    customers: () => createParty("customers", data),
    suppliers: () => createParty("suppliers", data),
    user: () => createUser(data),
    tariff: () => createTariff(data),
    document: () => createDocument(data),
    invoice: () => createInvoice(data),
    pod: () => updatePod(data),
    status: () => updateStatus(data),
    settings: () => updateSettings(data)
  };
  handlers[type]?.();
  saveState();
  render();
}

function createShipment(data) {
  const record = shipment(
    data.jobNo,
    data.branch,
    data.customer,
    data.origin,
    data.destination,
    "Booked",
    Number(data.pieces),
    Number(data.actualKg),
    Number(data.cbm),
    Number(data.chargeableKg),
    Number(data.sell),
    Number(data.buyCost),
    "Pending",
    "Unbilled",
    today(),
    data.airwayBillNo || data.jobNo?.replace("AFS", "AWB"),
    data.tariffNo || "TAR-1001",
    Number(data.transitDays || 0),
    data.shipmentDirection || "Export",
    data.shipmentService || "AE",
    data.shipmentServiceOther || ""
  );
  state.shipments.unshift(record);
  postRecord("shipment", record);
  addHistory("Created shipment", data.jobNo);
}

function createLoad(data) {
  const item = load(data.loadNo, data.tripDate, data.route, data.transporter, data.vehicleNo, data.status, data.jobNumbers);
  recalculateLoad(item);
  state.loads.unshift(item);
  postRecord("load", item);
  addHistory("Created consolidation", data.loadNo);
}

function createParty(key, data) {
  const record = party(data.code, data.name, data.locationOrLane, data.email, data.terms, data.status, false, data.branch);
  state[key].unshift(record);
  postRecord(key, record);
  addHistory(`Created ${key}`, data.code);
}

function createUser(data) {
  const userName = String(data.userName || "").trim();
  const password = String(data.password || "");
  const email = String(data.email || "").trim();

  if (!userName || !password || !email) {
    window.alert("User name, password, and email are required.");
    return;
  }

  if (state.users.some((record) => record.userName.toLowerCase() === userName.toLowerCase())) {
    window.alert("User name already used or duplicate entry.");
    return;
  }

  if (state.users.some((record) => record.email.toLowerCase() === email.toLowerCase())) {
    window.alert("Email already used or duplicate entry.");
    return;
  }

  const record = user(
    userName,
    email,
    data.role,
    data.accountStatus,
    data.branchAccess,
    isChecked(data.canViewAllEntry),
    isChecked(data.canViewOnlySelfEntry),
    isChecked(data.canEditAllEntry),
    isChecked(data.canViewUpdatedHistory),
    password,
    data.notes || "Created from admin panel"
  );

  state.users.unshift(record);
  postRecord("user", record);
  addHistory("Created user account", `${userName} - ${data.branchAccess}`);
}

function createTariff(data) {
  const record = tariff(data.tariffNo, data.customer, data.origin, data.destination, data.mainSection, data.weightSection, data.rateType, Number(data.rate), Number(data.minCharge));
  state.tariffs.unshift(record);
  postRecord("tariff", record);
  addHistory("Created tariff", data.tariffNo);
}

function createDocument(data) {
  const record = documentRow(data.documentNo, data.linkedNo, data.type, data.status, data.date, data.owner);
  state.documents.unshift(record);
  postRecord("document", record);
  addHistory("Tagged document", data.documentNo);
}

function createCharge(data) {
  const sessionUser = currentSession()?.userName || "operations";
  const isAdmin = isAdminSession();
  const request = !isAdmin
    ? submitAdminRequest(
        "Additional Charges",
        data.refNo,
        "New additional charge submitted for approval.",
        `chargeType: -> ${data.chargeType} | amount: -> ${data.amount} | taxPercent: -> ${data.taxPercent} | shipmentNo: -> ${data.shipmentNo}`,
        "Additional Charge Approval"
      )
    : null;

  const record = additionalCharge(
    data.refNo,
    data.shipmentNo,
    data.chargeDate || today(),
    data.chargeType,
    data.chargeBasis,
    data.supplier,
    data.referenceNo || "",
    data.invoiceNo || "",
    Number(data.amount || 0),
    Number(data.taxPercent || 0),
    data.currency || "KWD",
    data.remarks || "",
    data.attachmentName || "",
    isAdmin ? data.status || "Approved" : "Pending Approval",
    sessionUser,
    isAdmin ? sessionUser : "",
    request?.requestNo || ""
  );

  state.additionalCharges.unshift(record);
  postRecord("charge", record);
  addHistory(isAdmin ? "Created additional charge" : "Submitted additional charge", data.refNo);
}

function createInvoice(data) {
  const record = invoice(data.invoiceNo, data.customer, data.shipmentNo, Number(data.revenue), Number(data.supplierCost), data.status, data.date);
  state.invoices.unshift(record);
  postRecord("invoice", record);
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.shipmentNo);
  if (shipmentItem) shipmentItem.invoiceStatus = data.invoiceNo;
  addHistory("Generated invoice", data.invoiceNo);
}

function updatePod(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return;
  shipmentItem.status = "Delivered";
  shipmentItem.podStatus = "Uploaded";
  persistRecord("shipment", shipmentItem);
  const documentRecord = documentRow(nextNumber("DOC", state.documents, "documentNo"), data.jobNo, "POD", "Uploaded", today(), "delivery");
  state.documents.unshift(documentRecord);
  postRecord("document", documentRecord);
  addHistory("Marked delivered and uploaded POD", `${data.jobNo} - ${data.receiver}`);
}

function updateStatus(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return;
  shipmentItem.status = data.status;
  shipmentItem.podStatus = data.podStatus;
  shipmentItem.invoiceStatus = data.invoiceStatus;
  persistRecord("shipment", shipmentItem);
  addHistory("Updated shipment status", `${data.jobNo} - ${data.notes}`);
}

function updateSettings(data) {
  state.settings = { ...state.settings, ...data };
  postRecord("settings", state.settings);
  addHistory("Saved company settings", data.companyName);
}

function endpointFor(type) {
  return {
    shipment: "shipments",
    load: "consolidations",
    customers: "customers",
    suppliers: "suppliers",
    tariff: "tariffs",
    document: "documents",
    charge: "additional-charges",
    invoice: "invoices",
    user: "users",
    unblock: "unblock-requests",
    adminRequest: "admin-requests",
    audit: "audit",
    settings: "settings"
  }[type];
}

async function postRecord(type, record) {
  const endpoint = endpointFor(type);
  if (!endpoint) return;
  try {
    await fetchJson(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
  } catch {
    state.api.mode = "browser";
  }
}

async function persistRecord(type, record) {
  const endpoint = endpointFor(type);
  const id = rowId(type, record);
  if (!endpoint || !id || type === "audit") return;
  try {
    await fetchJson(`/api/${endpoint}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
  } catch {
    state.api.mode = "browser";
  }
}

boot();
