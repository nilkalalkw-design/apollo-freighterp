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
const toastStack = document.querySelector("#toastStack");

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
      branchAccess: session.branchAccess || "Branch 1",
      canViewAllEntry: Boolean(session.canViewAllEntry || (session.role || "").toLowerCase() === "admin"),
      canViewOnlySelfEntry: Boolean(session.canViewOnlySelfEntry),
      canEditAllEntry: Boolean(session.canEditAllEntry || (session.role || "").toLowerCase() === "admin"),
      canViewUpdatedHistory: Boolean(session.canViewUpdatedHistory)
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
      load("CON-260501", "2026-05-05", "Kuwait - Riyadh", "Al Dana Transport", "KWT-49217", "Dispatched", "AFS-2605001, AFS-2605004", "Not Generated", ""),
      load("CON-260502", "2026-05-06", "Kuwait - Dammam", "Falcon Line Haul", "KWT-77320", "Planned", "AFS-2605002", "Not Generated", "")
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
      settingsKey: "default",
      companyName: "APOLLO FREIGHT SOLUTIONS",
      shipmentNumberFormat: "AFS-SI###",
      invoiceNumberFormat: "INV-YY###",
      consolidationNumberFormat: "CON-YY###",
      customerNumberFormat: "CUS-###",
      additionalChargeNumberFormat: "CHG-YY###",
      supplierNumberFormat: "TRN-###",
      defaultVolumetricDivisor: "5000",
      requirePodBeforeInvoice: "Yes",
      branches: "Kuwait 1, Dubai 2"
    },
    api: {
      status: "Checking API",
      database: "Pending",
      mode: "local"
    },
    ui: {
      reportFormat: "PDF",
      reportType: "Daily shipments",
      reportPreview: null,
      selectedLoadNo: ""
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
  shipmentServiceOther = "",
  createdBy = currentUserName()
) {
  return { jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate, airwayBillNo, tariffNo, transitDays, shipmentDirection, shipmentService, shipmentServiceOther, createdBy };
}

function load(loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers, manifestStatus = "Not Generated", lastManifestRequestNo = "", createdBy = currentUserName()) {
  return { loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers, pieces: 0, actualKg: 0, cbm: 0, chargeableKg: 0, manifestStatus, lastManifestRequestNo, createdBy };
}

function party(code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, createdBy = currentUserName()) {
  return { code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, createdBy, createdDate: new Date().toISOString().slice(0, 10) };
}

function tariff(tariffNo, customer, origin, destination, mainSection, weightSection, rateType, rate, minCharge, createdBy = currentUserName()) {
  return { tariffNo, customer, origin, destination, mainSection, weightSection, rateType, rate, minCharge, volumetricDivisor: 5000, effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", createdBy };
}

function documentRow(documentNo, linkedNo, type, status, date, owner, fileName = "", createdBy = currentUserName()) {
  return { documentNo, linkedNo, type, status, date, owner, fileName, createdBy };
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
  approvalNotes,
  createdBy = currentUserName()
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
    approvalNotes,
    createdBy
  };
}

function invoice(invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, createdBy = currentUserName()) {
  return { invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, grossProfit: revenue - supplierCost, createdBy };
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

function audit(dateTime, userName, action, reference, id = "") {
  return { id, dateTime, user: userName, action, reference };
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
      selectedLoadNo: (stored.ui || {}).selectedLoadNo || "",
      chargeFilters: {
        shipmentNo: "",
        chargeType: "All",
        supplier: "All",
        status: "All",
        fromDate: "",
        toDate: "",
        ...((stored.ui || {}).chargeFilters || {})
      },
      auditFilters: {
        query: "",
        fromDate: "",
        toDate: "",
        ...((stored.ui || {}).auditFilters || {})
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function configuredNumber(format, collection, field, fallbackPrefix) {
  const normalizedFormat = String(format || "").trim();
  if (!normalizedFormat || !normalizedFormat.includes("#")) {
    return nextNumber(fallbackPrefix, collection, field);
  }

  const fullYear = new Date().getFullYear().toString();
  const year = new Date().getFullYear().toString().slice(-2);
  const resolvedFormat = normalizedFormat.replaceAll("YYYY", fullYear).replaceAll("YY", year);
  const hashPattern = resolvedFormat.match(/#+/);
  if (!hashPattern) return nextNumber(fallbackPrefix, collection, field);

  const digits = hashPattern[0].length;
  const prefix = resolvedFormat.slice(0, hashPattern.index);
  const suffix = resolvedFormat.slice(hashPattern.index + digits);
  const numberPattern = new RegExp(`^${escapeRegex(prefix)}(\\d{${digits},})${escapeRegex(suffix)}$`, "i");
  const max = collection
    .map((item) => String(item[field] || ""))
    .map((value) => {
      const match = value.match(numberPattern);
      return match ? Number(match[1]) || 0 : 0;
    })
    .reduce((highest, value) => Math.max(highest, value), 0);

  return resolvedFormat
    .replace(/#+/, String(max + 1).padStart(digits, "0"));
}

function nextShipmentNumber() {
  return configuredNumber(state.settings.shipmentNumberFormat, state.shipments, "jobNo", "AFS");
}

function nextInvoiceNumber() {
  return configuredNumber(state.settings.invoiceNumberFormat, state.invoices, "invoiceNo", "INV");
}

function nextConsolidationNumber() {
  return configuredNumber(state.settings.consolidationNumberFormat, state.loads, "loadNo", "CON");
}

function nextCustomerNumber() {
  return configuredNumber(state.settings.customerNumberFormat, state.customers, "code", "CUS");
}

function nextSupplierNumber() {
  return configuredNumber(state.settings.supplierNumberFormat, state.suppliers, "code", "TRN");
}

function nextAdditionalChargeNumber() {
  return configuredNumber(state.settings.additionalChargeNumberFormat, state.additionalCharges, "refNo", "CHG");
}

function branchOptions() {
  const branches = String(state.settings.branches || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return branches.length ? branches : ["Branch 1", "Branch 2"];
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
  const record = audit(new Date().toISOString().slice(0, 16).replace("T", " "), currentUserName(), action, reference);
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
  renderModuleNav();

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
  newShipmentButton?.addEventListener("click", openShipmentWorkspace);
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

function visibleModules() {
  if (isAdminSession()) return modules;
  const allowed = new Set([
    "Dashboard",
    "Shipments / Jobs",
    "Consolidation",
    "Customers",
    "Suppliers / Transporters",
    "Documents",
    "Tariffs / Rate Master",
    "Additional Charges",
    "Reports"
  ]);
  return modules.filter(([name]) => allowed.has(name));
}

function renderModuleNav() {
  moduleNav.innerHTML = visibleModules()
    .map(([name]) => `<button type="button" data-module="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
}

function currentUserName() {
  return currentSession()?.userName || "operations";
}

function canViewAllData() {
  const session = currentSession();
  return isAdminSession() || Boolean(session?.canViewAllEntry);
}

function ownedByCurrentUser(row) {
  if (canViewAllData()) return true;
  const userName = currentUserName().toLowerCase();
  const owners = [
    row.createdBy,
    row.created_by,
    row.requestedBy,
    row.requested_by,
    row.owner,
    row.user,
    row.userName
  ].map((value) => String(value || "").toLowerCase());
  return owners.includes(userName);
}

function visibleRows(rows) {
  return rows.filter(ownedByCurrentUser);
}

function notify(status, title, detail = "") {
  if (!toastStack) {
    if (detail) window.alert(`${title}\n${detail}`);
    else window.alert(title);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${status}`;
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}`;
  toastStack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function notifySuccess(title, detail = "") {
  notify("success", title, detail);
}

function notifyDenied(title, detail = "") {
  notify("denied", title, detail);
}

function notifyFailed(title, detail = "") {
  notify("failed", title, detail);
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
  renderModuleNav();
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
    const databaseReady = health.database === "connected" && apiMode === "database";
    state.api = {
      status: databaseReady ? "API connected" : "API setup required",
      database: health.database || "unknown",
      mode: apiMode,
      error: health.error || health.startupError || ""
    };
    if (databaseReady) {
      state.shipments = (shipments.rows || []).map(apiShipment);
      state.loads = (consolidations.rows || []).map(apiLoad);
      state.customers = (customers.rows || []).map(apiCustomer);
      state.suppliers = (suppliers.rows || []).map(apiSupplier);
      state.tariffs = (tariffs.rows || []).map(apiTariff);
      state.documents = (documents.rows || []).map(apiDocument);
      state.additionalCharges = (additionalCharges.rows || []).map(apiAdditionalCharge);
      state.invoices = (invoices.rows || []).map(apiInvoice);
      state.users = (users.rows || []).map(apiUser);
      state.unblockRequests = (unblockRequests.rows || []).map(apiUnblockRequest);
      state.adminRequests = (adminRequests.rows || []).map(apiAdminRequest);
      state.audit = (auditLog.rows || []).map(apiAudit);
      if (settings.rows?.length) state.settings = apiSettings(settings.rows[0]);
    }
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
    row.shipment_service_other || "",
    row.created_by || "admin"
  );
}

function apiLoad(row) {
  const item = load(
    row.load_no,
    String(row.trip_date || today()).slice(0, 10),
    row.route,
    row.transporter,
    row.vehicle_no,
    row.status,
    row.job_numbers || "",
    row.manifest_status || "Not Generated",
    row.last_manifest_request_no || "",
    row.created_by || "admin"
  );
  recalculateLoad(item);
  return item;
}

function apiCustomer(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch, row.created_by || "admin");
}

function apiSupplier(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch, row.created_by || "admin");
}

function apiTariff(row) {
  const item = tariff(row.tariff_no, row.customer, row.origin, row.destination, row.main_section, row.weight_section, row.rate_type, Number(row.rate || 0), Number(row.min_charge || 0), row.created_by || "admin");
  item.volumetricDivisor = Number(row.volumetric_divisor || 5000);
  item.effectiveFrom = String(row.effective_from || today()).slice(0, 10);
  item.effectiveTo = String(row.effective_to || today()).slice(0, 10);
  item.status = row.status || "Active";
  return item;
}

function apiDocument(row) {
  const item = documentRow(row.document_no, row.linked_no, row.type, row.status, String(row.date || today()).slice(0, 10), row.owner, row.file_name || "", row.owner || "admin");
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
    row.approval_notes || "",
    row.created_by || row.requested_by || "admin"
  );
}

function apiInvoice(row) {
  return invoice(row.invoice_no, row.customer, row.shipment_no, Number(row.revenue || 0), Number(row.supplier_cost || 0), row.status, String(row.date || today()).slice(0, 10), row.created_by || "admin");
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
    id: row.id,
    dateTime: String(row.date_time || "").replace("T", " ").slice(0, 16),
    user: row.user_name,
    action: row.action,
    reference: row.reference
  };
}

function apiSettings(row) {
  return {
    settingsKey: row.settings_key || state.settings.settingsKey || "default",
    companyName: row.company_name || state.settings.companyName,
    shipmentNumberFormat: row.shipment_number_format || state.settings.shipmentNumberFormat,
    invoiceNumberFormat: row.invoice_number_format || state.settings.invoiceNumberFormat,
    consolidationNumberFormat: row.consolidation_number_format || state.settings.consolidationNumberFormat,
    customerNumberFormat: row.customer_number_format || state.settings.customerNumberFormat,
    additionalChargeNumberFormat: row.additional_charge_number_format || state.settings.additionalChargeNumberFormat,
    supplierNumberFormat: row.supplier_number_format || state.settings.supplierNumberFormat,
    defaultVolumetricDivisor: row.default_volumetric_divisor || state.settings.defaultVolumetricDivisor,
    requirePodBeforeInvoice: row.require_pod_before_invoice || state.settings.requirePodBeforeInvoice,
    branches: row.branches || state.settings.branches
  };
}

function render() {
  if (!visibleModules().some(([name]) => name === activeModule)) {
    activeModule = "Dashboard";
  }
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
  const rows = filteredRows(visibleRows(state.shipments));
  const open = rows.filter((row) => ["Draft", "Booked"].includes(row.status)).length;
  const transit = rows.filter((row) => row.status === "In-Transit").length;
  const pod = rows.filter((row) => row.podStatus !== "Uploaded").length;
  const unbilled = rows.filter((row) => ["Unbilled", "Missing rate"].includes(row.invoiceStatus)).length;
  const pendingRequests = pendingRequestCount();
  const pendingCharges = state.additionalCharges.filter((row) => row.status === "Pending Approval").length;
  if (!isAdminSession()) {
    return `
      <section class="kpi-grid">
        ${kpi("Open Shipments", open, "Your draft and booked jobs")}
        ${kpi("In Transit", transit, "Your shipments moving")}
        ${kpi("Pending POD", pod, "Need delivery proof")}
        ${kpi("Unbilled", unbilled, "Your jobs ready for billing")}
        ${kpi("Pending Requests", pendingRequests, "Your pending approvals")}
      </section>
      <section class="panel">${panelHeader("My Shipments", "Limited Dashboard")} ${table("shipment", rows, shipmentColumns())}</section>`;
  }
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

function adminTopRequestsPanel() {
  if (!isAdminSession()) return "";
  return `<section class="split-grid admin-request-strip">
    <article class="panel">${panelHeader("Customer Block / Unblock Requests", "Admin")}
      ${table("unblock", filteredRows(state.unblockRequests), unblockColumns())}
    </article>
    <article class="panel">${panelHeader("Admin Requests", "Approval")}
      ${table("adminRequest", filteredRows(state.adminRequests), adminRequestColumns())}
    </article>
  </section>`;
}

function adminDeletePanel(type, label, note = "") {
  if (!isAdminSession()) return "";
  return `<section class="panel admin-delete-panel">${panelHeader(`Delete ${label}`, "Admin Only")}
    ${deleteSelectorMarkup(type, `${label} To Delete`)}
    <div class="action-row">
      <button type="button" class="danger-button" data-action="delete-record" data-type="${escapeHtml(type)}">Delete ${escapeHtml(label)}</button>
    </div>
    ${note ? `<p class="empty-state">${escapeHtml(note)}</p>` : ""}
  </section>`;
}

function renderShipments() {
  const rows = filteredRows(visibleRows(state.shipments));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Register", "Editable records")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("Shipment Actions", "shipment", "Use separate desktop-style windows for new shipment entry and load/edit shipment details.", actionChecklist([
        "New button opens the shipment popup window.",
        "Load uses the selected saved shipment from the list.",
        "Shipment type controls service options: Import, Export, WHC, and Consolidation service."
      ]))}
    </section>
    ${adminDeletePanel("shipment", "Shipment", "Deleting a shipment also removes linked consolidation references, documents, invoices, and additional charges.")}`;
}

function renderConsolidation() {
  const rows = filteredRows(visibleRows(state.loads)).map((row) => {
    recalculateLoad(row);
    return row;
  });
  const selectedLoad = rows.find((row) => row.loadNo === state.ui.selectedLoadNo) || null;
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Consolidation Register", "Loads / Trips")}
        ${table("load", rows, loadColumns())}
        ${selectedLoad ? consolidationJobsPanel(selectedLoad) : `<div class="report-preview-empty"><p class="empty-state">Select a consolidation from the list to open the related job numbers below.</p></div>`}
      </article>
      ${moduleActionPanel("Manifest Actions", "load", "Generate, load, and update consolidation manifests from separate popup windows.", actionChecklist([
        "Select a consolidation, then load it to review or edit.",
        "New button opens a fresh manifest builder.",
        "Click any job below the consolidation list to open that shipment.",
        "Non-admin manifest changes go to admin approval first."
      ]))}
    </section>
    ${adminDeletePanel("load", "Consolidation", "Deleting a consolidation removes the trip/manifest only. Shipments stay available.")}`;
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
    </section>
    ${adminDeletePanel(key, label)}`;
}

function renderTariffs() {
  const rows = filteredRows(visibleRows(state.tariffs));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Rate Master", "Tariffs")} ${table("tariff", rows, tariffColumns())}</article>
      ${moduleActionPanel("Tariff Actions", "tariff", "Maintain tariff cards from separate New and Load popups just like the desktop layout.")}
    </section>
    ${adminDeletePanel("tariff", "Tariff")}`;
}

function renderDocuments() {
  const rows = filteredRows(visibleRows(state.documents));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Document Library", "Attachments")} ${table("document", rows, documentColumns())}</article>
      ${moduleActionPanel("Document Actions", "document", "Separate popup windows are available for new document tags and for loading stored shipment files.")}
    </section>
    ${adminDeletePanel("document", "Document")}`;
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
        ${chargeReceiptPanel(selectedShipmentNo)}
        <div class="action-stack">
          ${newRecordSelectorMarkup("charge")}
          <div class="action-row">
            <button type="button" data-action="new-record" data-type="charge">New Charge</button>
          </div>
          ${loadSelectorMarkup("charge", "Saved Charges")}
          <div class="action-row">
            <button type="button" class="secondary-button" data-action="load-record" data-type="charge">Load Charge</button>
          </div>
          <p class="empty-state">Admins can approve or edit charges directly. Other users send change requests to admin.</p>
          ${actionChecklist(chargeTypeOptions())}
        </div>
      </article>
    </section>
    ${adminDeletePanel("charge", "Additional Charge")}`;
}

function renderInvoices() {
  const rows = filteredRows(visibleRows(state.invoices));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Invoice Register", "Billing")} ${table("invoice", rows, invoiceColumns())}</article>
      ${moduleActionPanel("Invoice Actions", "invoice", "Keep invoice creation and load/update in separate popup windows.")}
    </section>
    ${adminDeletePanel("invoice", "Invoice")}`;
}

function renderPod() {
  const rows = filteredRows(visibleRows(state.shipments).filter((row) => row.podStatus !== "Uploaded" || row.status !== "Closed"));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("POD Pending / Delivery Board", "Delivery")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("POD Actions", "pod", "Load a shipment into a separate POD window or create a new delivery update popup.")}
    </section>
    ${adminDeletePanel("shipment", "Shipment", "Admin deletion is available here for POD-related shipment cleanup.")}`;
}

function chargeReceiptPanel(shipmentNo) {
  const charges = state.additionalCharges.filter((row) => row.shipmentNo === shipmentNo);
  if (!shipmentNo) return `<p class="empty-state">Select a shipment to view charge receipt lines.</p>`;
  const invoiceNo = charges.find((row) => row.invoiceNo)?.invoiceNo || "Not assigned";
  const total = charges.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const rows = charges.length
    ? charges
        .map(
          (row) => `<div class="receipt-line">
            <span>${escapeHtml(row.chargeType)}</span>
            <strong>${money(row.totalAmount)}</strong>
            <button type="button" class="ghost-button" data-action="open" data-type="charge" data-id="${escapeHtml(row.refNo)}">Edit</button>
            ${isAdminSession() ? `<button type="button" class="danger-button" data-action="delete-record-direct" data-type="charge" data-id="${escapeHtml(row.refNo)}">Delete</button>` : ""}
          </div>`
        )
        .join("")
    : `<p class="empty-state">No charge lines added for this shipment yet.</p>`;
  return `<section class="receipt-box">
    <div class="panel-header"><div><p class="eyebrow">One Shipment / One Invoice</p><h2>${escapeHtml(invoiceNo)}</h2></div></div>
    ${rows}
    <div class="receipt-total"><span>Total Receipt Amount</span><strong>${money(total)}</strong></div>
  </section>`;
}

function renderShipmentStatus() {
  const rows = filteredRows(visibleRows(state.shipments));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Status Register", "Status board")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Status Actions", "Update / Email")}
        <div class="action-stack">
          <p class="empty-state">Select a shipment, load its status window, or send the latest update through Outlook to the related customer.</p>
          ${newRecordSelectorMarkup("status")}
          <div class="action-row">
            <button type="button" data-action="new-record" data-type="status">New</button>
          </div>
          ${loadSelectorMarkup("status", "Shipment To Load")}
          <div class="action-row">
            <button type="button" data-action="load-record" data-type="status">Load</button>
            <button type="button" class="secondary-button" data-action="send-status-email" data-type="status">Send Update</button>
          </div>
        </div>
      </article>
    </section>
    ${adminDeletePanel("shipment", "Shipment", "Admin deletion is available here for status-board shipment cleanup.")}`;
}

function renderReports() {
  const rows = filteredRows(visibleRows(state.shipments));
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

  const settingsOpen = Boolean(state.ui.showSettingsForm);
  return `
    ${adminTopRequestsPanel()}
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("User Accounts", "Permissions")} ${table("user", filteredRows(state.users), userColumns())}</article>
      ${moduleActionPanel("User / Permission Actions", "user", "Admin users can open separate New and Load windows for staff accounts and permissions.")}
    </section>
    ${adminDeletePanel("user", "User Account", "Deleting a user removes the login from the live database. The current logged-in admin cannot delete itself.")}
    <section class="split-grid">
      <article class="panel">${panelHeader("Company Settings", "System")}
        <div class="action-row">
          <button type="button" data-action="toggle-settings">${settingsOpen ? "Close Settings" : "Open / Update Settings"}</button>
        </div>
        ${settingsOpen ? `<form class="stack-form" data-form="settings">
          ${input("companyName", "Company Name", state.settings.companyName)}
          ${input("shipmentNumberFormat", "Shipment Number Format", state.settings.shipmentNumberFormat)}
          ${input("invoiceNumberFormat", "Invoice Number Format", state.settings.invoiceNumberFormat)}
          ${input("consolidationNumberFormat", "Consolidation Number Format", state.settings.consolidationNumberFormat)}
          ${input("customerNumberFormat", "New Customer Number Format", state.settings.customerNumberFormat)}
          ${input("additionalChargeNumberFormat", "Additional Charges Number Format", state.settings.additionalChargeNumberFormat)}
          ${input("supplierNumberFormat", "Supplier / Transporter Number Format", state.settings.supplierNumberFormat)}
          ${input("defaultVolumetricDivisor", "Default Volumetric Divisor", state.settings.defaultVolumetricDivisor)}
          ${select("requirePodBeforeInvoice", "Require POD Before Invoice", ["Yes", "No"], state.settings.requirePodBeforeInvoice)}
          ${input("branches", "Branches", state.settings.branches)}
          <p class="empty-state">Next shipment: ${escapeHtml(nextShipmentNumber())} | invoice: ${escapeHtml(nextInvoiceNumber())} | consolidation: ${escapeHtml(nextConsolidationNumber())} | customer: ${escapeHtml(nextCustomerNumber())} | charge: ${escapeHtml(nextAdditionalChargeNumber())} | supplier: ${escapeHtml(nextSupplierNumber())}</p>
          <button type="submit">Save Company Settings</button>
        </form>` : `<p class="empty-state">Open settings to update number formats, branches, and invoice/POD controls.</p>`}
      </article>
      <article class="panel">${panelHeader("Pending Approvals", "Admin")}
        <div class="alert-list">
          ${alert("Pending admin requests", `${state.adminRequests.filter((row) => row.status === "Pending").length} request(s) waiting for approval.`)}
          ${alert("Pending unblock requests", `${state.unblockRequests.filter((row) => row.status === "Pending").length} request(s) waiting for approval.`)}
        </div>
      </article>
    </section>`;
}

function renderAudit() {
  if (!isAdminSession()) {
    return `<section class="panel">${panelHeader("Access Denied", "Admin")}<p class="empty-state">Only admin users can access audit log.</p></section>`;
  }
  const rows = filteredAuditRows();
  return `<section class="panel">${panelHeader("Audit Trail", "History")}
    <div class="report-toolbar">
      ${input("auditQuery", "Search Log", state.ui.auditFilters?.query || "")}
      ${input("auditFromDate", "From", state.ui.auditFilters?.fromDate || "", false, "date")}
      ${input("auditToDate", "To", state.ui.auditFilters?.toDate || "", false, "date")}
      <button type="button" data-action="filter-audit">Filter</button>
      ${deleteSelectorMarkup("audit", "Log To Delete")}
      <button type="button" class="danger-button" data-action="delete-audit-log">Delete Log</button>
    </div>
    <div class="audit-scroll">${table("audit", rows, auditColumns())}</div>
  </section>`;
}

function moduleActionPanel(title, type, note, extra = "") {
  return `<article class="panel">${panelHeader(title, "New / Load")}
    <div class="action-stack">
      <p class="empty-state">${escapeHtml(note)}</p>
      ${newRecordSelectorMarkup(type)}
      <div class="action-row">
        <button type="button" data-action="new-record" data-type="${escapeHtml(type)}">New</button>
      </div>
      ${loadSelectorMarkup(type)}
      <div class="action-row">
        <button type="button" class="secondary-button" data-action="load-record" data-type="${escapeHtml(type)}">Load</button>
      </div>
      ${extra}
    </div>
  </article>`;
}

function newRecordSelectorMarkup(type, label = "New Entry Option") {
  const options = newRecordOptions(type);
  return `<label>${escapeHtml(label)}
    <select data-new-select="${escapeHtml(type)}">
      ${options.map((option) => `<option value="${escapeHtml(option.type)}">${escapeHtml(option.label)}</option>`).join("")}
    </select>
  </label>`;
}

function newRecordOptions(type) {
  const labels = {
    shipment: "New Shipment",
    load: "New Consolidation",
    customers: "New Customer",
    suppliers: "New Supplier / Transporter",
    tariff: "New Tariff",
    document: "New Document Tag",
    charge: "New Additional Charge",
    invoice: "New Invoice",
    pod: "New POD / Delivery",
    status: "New Shipment Status",
    user: "New User Account"
  };
  return [{ type, label: labels[type] || `New ${type}` }];
}

function loadSelectorMarkup(type, label = "Saved Records") {
  const rows = collectionFor(type);
  if (!rows.length) {
    return `<p class="empty-state">No saved ${escapeHtml(type)} records available.</p>`;
  }

  return `<label>${escapeHtml(label)}
    <select data-load-select="${escapeHtml(type)}">
      ${rows.map((row) => `<option value="${escapeHtml(rowId(type, row))}">${escapeHtml(loadOptionLabel(type, row))}</option>`).join("")}
    </select>
  </label>`;
}

function deleteSelectorMarkup(type, label = "Record To Delete") {
  const rows = collectionFor(type);
  if (!rows.length) {
    return `<p class="empty-state">No saved ${escapeHtml(type)} records available.</p>`;
  }

  return `<label>${escapeHtml(label)}
    <select data-delete-select="${escapeHtml(type)}">
      ${rows.map((row) => `<option value="${escapeHtml(rowId(type, row))}">${escapeHtml(loadOptionLabel(type, row))}</option>`).join("")}
    </select>
  </label>`;
}

function loadOptionLabel(type, row) {
  if (type === "shipment" || type === "status" || type === "pod") {
    return `${row.jobNo} | ${row.customer} | ${row.status}`;
  }

  if (type === "load") {
    return `${row.loadNo} | ${row.route} | ${row.status}`;
  }

  if (type === "user") {
    return `${row.userName} | ${row.role}`;
  }

  if (type === "charge") {
    return `${row.refNo} | ${row.shipmentNo} | ${row.chargeType}`;
  }

  if (type === "customers" || type === "suppliers") {
    return `${row.code} | ${row.name}`;
  }

  return rowId(type, row);
}

function consolidationJobsPanel(loadItem) {
  const jobs = String(loadItem.jobNumbers || "")
    .split(",")
    .map((jobNo) => jobNo.trim())
    .filter(Boolean);

  return `<section class="consolidation-jobs">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Selected Consolidation</p>
        <h2>${escapeHtml(loadItem.loadNo)}</h2>
        <p class="empty-state">Manifest: ${escapeHtml(loadItem.manifestStatus || "Not Generated")}${loadItem.lastManifestRequestNo ? ` | Request: ${escapeHtml(loadItem.lastManifestRequestNo)}` : ""}</p>
      </div>
      <div class="action-row">
        ${isAdminSession()
          ? `<button type="button" class="secondary-button" data-action="approve-load-manifest" data-id="${escapeHtml(loadItem.loadNo)}">Generate / Approve Manifest</button>`
          : `<button type="button" class="secondary-button" data-action="request-load-manifest" data-id="${escapeHtml(loadItem.loadNo)}">Send Manifest Request</button>`}
        <button type="button" class="secondary-button" data-action="open" data-type="load" data-id="${escapeHtml(loadItem.loadNo)}">Edit Consolidation</button>
      </div>
    </div>
    ${jobs.length ? `<div class="job-list-table">${jobs.map((jobNo) => consolidationJobRow(loadItem.loadNo, jobNo)).join("")}</div>` : `<p class="empty-state">No job numbers linked to this consolidation.</p>`}
  </section>`;
}

function consolidationJobRow(loadNo, jobNo) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo);
  const removeButton = isAdminSession()
    ? `<button type="button" class="danger-button" data-action="remove-load-job" data-load-id="${escapeHtml(loadNo)}" data-job-id="${escapeHtml(jobNo)}">Remove</button>`
    : "";
  if (!shipmentItem) {
    return `<div class="job-list-row"><strong>${escapeHtml(jobNo)}</strong><span class="empty-state">Shipment not found.</span>${removeButton}</div>`;
  }

  return `<div class="job-list-row">
    <button type="button" class="ghost-button inline-link" data-action="open" data-type="shipment" data-id="${escapeHtml(jobNo)}">${escapeHtml(jobNo)}</button>
    <span>${escapeHtml(shipmentItem.customer)} | ${escapeHtml(shipmentItem.status)} | ${escapeHtml(shipmentItem.destination)}</span>
    ${removeButton}
  </div>`;
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
    ${newRecordSelectorMarkup("charge", "New Entry")}
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
  const actionCell = showLoad ? `<td>${tableActionButton(type, id)}</td>` : "";
  return `<tr>${columns.map(([key]) => `<td>${cellHtml(type, key, row)}</td>`).join("")}${actionCell}</tr>`;
}

function tableActionButton(type, id) {
  if (type === "load") {
    return `<button class="ghost-button" data-action="view-load" data-id="${escapeHtml(id)}">View Jobs</button>`;
  }

  return `<button class="ghost-button" data-action="open" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Load</button>`;
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
    return ["SI", "AI", "LI", "Consolidation", "Other"];
  }

  if (direction === "WHC") {
    return ["WHC Remark", "Consolidation"];
  }

  return ["SE", "AE", "LE", "Consolidation", "Other"];
}

function isConsolidationShipment(row) {
  return String(row?.shipmentService || "").toLowerCase() === "consolidation";
}

function assignedConsolidationJobs(exceptLoadNo = "") {
  const jobs = new Set();
  state.loads
    .filter((loadItem) => !exceptLoadNo || loadItem.loadNo !== exceptLoadNo)
    .forEach((loadItem) => {
      String(loadItem.jobNumbers || "")
        .split(",")
        .map((jobNo) => jobNo.trim())
        .filter(Boolean)
        .forEach((jobNo) => jobs.add(jobNo));
    });
  return jobs;
}

function availableConsolidationShipmentOptions(initialJobs = "", currentLoadNo = "") {
  const selected = new Set(
    String(initialJobs || "")
      .split(",")
      .map((jobNo) => jobNo.trim())
      .filter(Boolean)
  );
  const assigned = assignedConsolidationJobs(currentLoadNo);
  return state.shipments
    .filter((row) => isConsolidationShipment(row))
    .filter((row) => selected.has(row.jobNo) || !assigned.has(row.jobNo))
    .map((row) => row.jobNo);
}

function normalizeConsolidationJobs(jobNumbers, currentLoadNo = "") {
  const assigned = assignedConsolidationJobs(currentLoadNo);
  const valid = new Set(state.shipments.filter(isConsolidationShipment).map((row) => row.jobNo));
  return [
    ...new Set(
      String(jobNumbers || "")
        .split(",")
        .map((jobNo) => jobNo.trim())
        .filter((jobNo) => jobNo && valid.has(jobNo) && !assigned.has(jobNo))
    )
  ];
}

function filteredAdditionalCharges() {
  const filters = state.ui.chargeFilters || {};
  return filteredRows(visibleRows(state.additionalCharges)).filter((row) => {
    const shipmentMatch = !filters.shipmentNo || row.shipmentNo.toLowerCase().includes(String(filters.shipmentNo).toLowerCase());
    const typeMatch = !filters.chargeType || filters.chargeType === "All" || row.chargeType === filters.chargeType;
    const supplierMatch = !filters.supplier || filters.supplier === "All" || row.supplier === filters.supplier;
    const statusMatch = !filters.status || filters.status === "All" || row.status === filters.status;
    const fromMatch = !filters.fromDate || row.chargeDate >= filters.fromDate;
    const toMatch = !filters.toDate || row.chargeDate <= filters.toDate;
    return shipmentMatch && typeMatch && supplierMatch && statusMatch && fromMatch && toMatch;
  });
}

function filteredAuditRows() {
  const filters = state.ui.auditFilters || {};
  return filteredRows(state.audit).filter((row) => {
    const query = String(filters.query || "").trim().toLowerCase();
    const textMatch = !query || Object.values(row).join(" ").toLowerCase().includes(query);
    const date = recordDate(row);
    const fromMatch = !filters.fromDate || !date || date >= filters.fromDate;
    const toMatch = !filters.toDate || !date || date <= filters.toDate;
    return textMatch && fromMatch && toMatch;
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
  if (["status", "podStatus", "invoiceStatus", "accountStatus", "manifestStatus"].includes(key)) {
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

function selectFrom(name, label, options, value = options[0] || "") {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" list="${escapeHtml(name)}Options" value="${escapeHtml(value)}" /><datalist id="${escapeHtml(name)}Options">${options.map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist></label>`;
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
  return [...branchOptions(), "Both"];
}

function shipmentColumns() {
  return [["jobNo", "Job No"], ["customer", "Customer"], ["shipmentDirection", "Type"], ["shipmentService", "Service"], ["status", "Status"], ["bookingDate", "Date"], ["invoiceStatus", "Invoice"]];
}

function loadColumns() {
  return [["loadNo", "Consolidation"], ["tripDate", "Trip Date"], ["route", "Route"], ["transporter", "Transporter"], ["status", "Status"], ["manifestStatus", "Manifest"], ["jobNumbers", "Job Numbers"]];
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
    pod: "jobNo",
    status: "jobNo",
    customers: "code",
    suppliers: "code",
    tariff: "tariffNo",
    document: "documentNo",
    charge: "refNo",
    invoice: "invoiceNo",
    user: "userName",
    settings: "settingsKey",
    unblock: "requestNo",
    adminRequest: "requestNo",
    audit: "id"
  };
  return row[keys[type]] || "";
}

function collectionFor(type) {
  const collections = {
    shipment: visibleRows(state.shipments),
    load: visibleRows(state.loads),
    pod: visibleRows(state.shipments),
    status: visibleRows(state.shipments),
    customers: state.customers,
    suppliers: state.suppliers,
    tariff: visibleRows(state.tariffs),
    document: visibleRows(state.documents),
    charge: visibleRows(state.additionalCharges),
    invoice: visibleRows(state.invoices),
    user: state.users,
    settings: [state.settings],
    unblock: state.unblockRequests,
    adminRequest: state.adminRequests,
    audit: state.audit
  };
  return collections[type] || [];
}

async function handleModuleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, type, id } = button.dataset;

  if (action === "open") {
    openRecord(type, id);
    return;
  }

  if (action === "new-record") {
    openNewDialog(selectedNewRecordType(type));
    return;
  }

  if (action === "load-record") {
    handleLoadRecord(type);
    return;
  }

  if (action === "view-load") {
    state.ui.selectedLoadNo = id;
    saveState();
    render();
    return;
  }

  if (action === "remove-load-job") {
    await removeJobFromLoad(button.dataset.loadId, button.dataset.jobId);
    return;
  }

  if (action === "delete-record") {
    await deleteSelectedRecord(type);
    return;
  }

  if (action === "delete-record-direct") {
    await deleteRecordById(type, id);
    return;
  }

  if (action === "request-load-manifest") {
    await requestLoadManifest(id);
    return;
  }

  if (action === "approve-load-manifest") {
    await approveLoadManifest(id);
    return;
  }

  if (action === "send-status-email") {
    sendShipmentStatusEmail(selectedRecordId("status"));
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
    const margin = filteredRows(visibleRows(state.shipments)).reduce((sum, row) => sum + Number(row.sell || 0) - Number(row.buyCost || 0), 0);
    window.alert(`Current margin: ${money(margin)}`);
    return;
  }

  if (action === "filter-charges") {
    applyChargeFilters();
    return;
  }

  if (action === "toggle-settings") {
    state.ui.showSettingsForm = !state.ui.showSettingsForm;
    saveState();
    render();
    return;
  }

  if (action === "filter-audit") {
    applyAuditFilters();
    return;
  }

  if (action === "delete-audit-log") {
    await deleteAuditLog();
    return;
  }
}

function selectedRecordId(type) {
  return moduleContent.querySelector(`[data-load-select='${type}']`)?.value || "";
}

function selectedNewRecordType(type) {
  return moduleContent.querySelector(`[data-new-select='${type}']`)?.value || type;
}

function handleLoadRecord(type) {
  const selectedId = selectedRecordId(type);

  if (type === "load") {
    if (!selectedId) {
      window.alert("Select a consolidation first.");
      return;
    }
    state.ui.selectedLoadNo = selectedId;
    saveState();
    render();
    return;
  }

  if (type === "status") {
    openStatusDialog(selectedId);
    return;
  }

  if (type === "pod") {
    openPodDialog(selectedId);
    return;
  }

  if (selectedId) {
    openRecord(type, selectedId);
    return;
  }

  openLoadDialog(type);
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
    .map(([key, value]) => detailFieldControl(type, key, value, record))
    .join("");
  if (type === "shipment") bindShipmentDirectionDialog();
  if (type === "load") bindConsolidationJobPicker();
  recordDialog.showModal();
}

function detailFieldControl(type, key, value, record) {
  const readonlyKeys = new Set(["jobNo", "loadNo", "code", "tariffNo", "documentNo", "invoiceNo", "refNo", "userName", "requestNo"]);
  const options = detailFieldOptions(type, key, record);
  if (type === "load" && key === "jobNumbers") {
    return consolidationShipmentPicker(value, record.loadNo);
  }
  if (typeof value === "boolean") {
    return checkbox(key, labelize(key), value);
  }

  if (options.length) {
    return select(key, labelize(key), options, String(value ?? ""));
  }

  const inputType = key.toLowerCase().includes("date") ? "date" : typeof value === "number" ? "number" : "text";
  const readonly = readonlyKeys.has(key);
  return input(key, labelize(key), value ?? "", readonly, inputType);
}

function detailFieldOptions(type, key, record) {
  const common = {
    branch: branchOptions(),
    status: statusOptions(),
    podStatus: ["Pending", "Uploaded", "Missing", "Disputed", "Approved"],
    invoiceStatus: ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue", ...state.invoices.map((row) => row.invoiceNo)],
    shipmentDirection: shipmentDirectionOptions(),
    shipmentService: shipmentServiceOptions(record.shipmentDirection || "Export"),
    manifestStatus: ["Not Generated", "Pending Approval", "Approved", "Rejected"],
    chargeType: chargeTypeOptions(),
    chargeBasis: chargeBasisOptions(),
    currency: ["KWD", "USD", "SAR"],
    accountStatus: accountStatusOptions(),
    role: roleOptions(),
    branchAccess: branchAccessOptions()
  };

  if (key === "customer") return state.customers.map((row) => row.name);
  if (key === "tariffNo") return visibleRows(state.tariffs).map((row) => row.tariffNo);
  if (key === "supplier") return state.suppliers.map((row) => row.name);
  if (key === "shipmentNo" || key === "linkedNo") return visibleRows(state.shipments).map((row) => row.jobNo);
  if (type === "load" && key === "jobNumbers") return [];
  return common[key] || [];
}

function labelize(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

async function saveDialogRecord() {
  if (dialogState?.onSave) {
    await dialogState.onSave();
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
  if (editing.type === "load") {
    const jobs = normalizeConsolidationJobs(updatedRecord.jobNumbers, editing.id);
    if (!jobs.length) {
      notifyDenied("Consolidation not saved", "Add at least one unassigned shipment with service type Consolidation.");
      return;
    }
    updatedRecord.jobNumbers = jobs.join(", ");
    recalculateLoad(updatedRecord);
  }

  if (editing.type === "charge" && !isAdminSession()) {
    await submitAdminRequest(
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
    notifySuccess("Request submitted", `${editing.id} was sent to admin approval.`);
    render();
    return;
  }

  if (editing.type === "load" && !isAdminSession()) {
    const request = await submitAdminRequest(
      "Consolidation",
      editing.id,
      "Consolidation change request submitted by non-admin user.",
      summarizeChanges(editing.record, updatedRecord),
      "Manifest Approval"
    );
    editing.record.manifestStatus = "Pending Approval";
    editing.record.lastManifestRequestNo = request.requestNo;
    await persistRecord("load", editing.record);
    addHistory("Submitted consolidation change request", editing.id);
    saveState();
    resetDialogShell();
    recordDialog.close();
    notifySuccess("Request submitted", `${editing.id} was sent to admin approval.`);
    render();
    return;
  }

  Object.assign(editing.record, updatedRecord);
  const editedType = editing.type;
  const editedId = editing.id;
  addHistory(`Updated ${editing.type}`, editing.id);
  await persistRecord(editing.type, editing.record);
  saveState();
  resetDialogShell();
  recordDialog.close();
  if (editedType === "user") {
    notifySuccess("User updated", `${editedId} was saved successfully.`);
    setTimeout(() => syncFromApi(), 300);
  } else {
    notifySuccess("Record updated", `${editedId} was saved successfully.`);
  }
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
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      const saved = await config.onSave(data);
      if (saved === false) {
        return;
      }
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

function openStatusDialog(jobNo = "") {
  const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo) || state.shipments[0];
  openDialog({
    title: jobNo ? `Shipment Status - ${jobNo}` : "Shipment Status Update",
    typeLabel: "Status",
    body: `
      ${selectFrom("jobNo", "Job No", visibleRows(state.shipments).map((row) => row.jobNo), shipmentItem?.jobNo || "")}
      ${select("status", "Shipment Status", statusOptions(), shipmentItem?.status || "Booked")}
      ${select("podStatus", "POD Status", ["Pending", "Uploaded", "Missing", "Disputed", "Approved"], shipmentItem?.podStatus || "Pending")}
      ${select("invoiceStatus", "Invoice Status", ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue"], shipmentItem?.invoiceStatus || "Unbilled")}
      ${input("notes", "Notes", "Status update")}
    `,
    saveLabel: "Update Shipment Status",
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      await updateStatus(data);
      saveState();
      recordDialog.close();
      render();
    }
  });
}

function openPodDialog(jobNo = "") {
  openDialog({
    title: jobNo ? `POD / Delivery - ${jobNo}` : "Delivery Update",
    typeLabel: "POD",
    body: `
      ${selectFrom("jobNo", "Shipment No", visibleRows(state.shipments).map((row) => row.jobNo), jobNo || visibleRows(state.shipments)[0]?.jobNo || "")}
      ${input("receiver", "Receiver", "Receiver Name")}
    `,
    saveLabel: "Mark Delivered + Upload POD",
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      await updatePod(data);
      saveState();
      recordDialog.close();
      render();
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
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      await approveAdminRequest(record, data.approvalNotes || "");
      recordDialog.close();
      render();
    },
    async onSecondary() {
      const data = collectFormValues(dialogBody.closest("form"));
      await rejectAdminRequest(record, data.approvalNotes || "");
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
        ${input("loadNo", "Consolidation No", nextConsolidationNumber(), true)}
        ${input("tripDate", "Trip Date", today(), false, "date")}
        ${input("route", "Route", "Kuwait - Riyadh")}
        ${input("transporter", "Transporter", "Al Dana Transport")}
        ${input("vehicleNo", "Vehicle No", "KWT-00000")}
        ${select("status", "Status", ["Planned", "Loading", "Dispatched", "Delivered", "Closed"])}
        ${select("manifestStatus", "Manifest Status", ["Not Generated", "Pending Approval", "Approved", "Rejected"])}
        ${input("lastManifestRequestNo", "Last Manifest Request No", "")}
        ${consolidationShipmentPicker()}
      `,
      onSave: createLoad,
      afterOpen: bindConsolidationJobPicker
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
        ${selectFrom("linkedNo", "Attach To", visibleRows(state.shipments).map((row) => row.jobNo))}
        ${select("type", "Document Type", ["Waybill", "LR", "CMR", "Commercial Invoice", "Packing List", "POD", "Supplier Invoice"])}
        ${select("status", "Status", ["Uploaded", "Attached", "Missing", "Issued", "Stored", "Replaced"])}
        ${input("date", "Date", today(), false, "date")}
        ${input("owner", "Owner", currentUserName())}
        <label>Upload File<input name="fileUpload" type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" /></label>
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
        ${input("invoiceNo", "Invoice No", nextInvoiceNumber(), true)}
        ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
        ${selectFrom("shipmentNo", "Shipment", visibleRows(state.shipments).map((row) => row.jobNo))}
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
        ${selectFrom("jobNo", "Shipment No", visibleRows(state.shipments).map((row) => row.jobNo))}
        ${input("receiver", "Receiver", "Receiver Name")}
      `,
      onSave: updatePod
    },
    status: {
      title: "Shipment Status Update",
      typeLabel: "Status",
      saveLabel: "Update Shipment Status",
      body: `
        ${selectFrom("jobNo", "Job No", visibleRows(state.shipments).map((row) => row.jobNo))}
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
      ${input("code", `${label} Code`, key === "customers" ? nextCustomerNumber() : nextSupplierNumber(), true)}
      ${input("name", "Name", "")}
      ${input("locationOrLane", "Lane / Location", "")}
      ${input("email", "Contact Email", "", false, "email")}
      ${select("terms", "Credit Limit Days", ["15 days", "30 days", "45 days"])}
      ${select("status", "Status", ["Active", "Inactive", "Blocked"])}
      ${select("branch", "Branch", [...branchOptions(), "Both"])}
    `,
    onSave: (data) => createParty(key, data)
  };
}

function shipmentDialogBody() {
  return `
    ${input("jobNo", "Job Number", nextShipmentNumber(), true)}
    ${input("airwayBillNo", "Airway Bill Number", nextNumber("AWB", state.shipments, "jobNo"))}
    ${select("branch", "Branch", branchOptions())}
    ${select("shipmentDirection", "Shipment Type", shipmentDirectionOptions(), "Export")}
    ${select("shipmentService", "Shipment Service", shipmentServiceOptions("Export"), "AE")}
    ${input("shipmentServiceOther", "Other Service / WHC Remark", "")}
    ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
    ${selectFrom("tariffNo", "Applied Tariff", visibleRows(state.tariffs).map((row) => row.tariffNo))}
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
    ${select("branchAccess", "Branch Access", branchAccessOptions(), branchOptions()[0])}
    ${checkbox("canViewAllEntry", "User can view all entry")}
    ${checkbox("canViewOnlySelfEntry", "User can view only self entry", true)}
    ${checkbox("canEditAllEntry", "User can edit all entry")}
    ${checkbox("canViewUpdatedHistory", "User can view updated history", true)}
    ${input("notes", "Notes", "Created from admin panel")}
  `;
}

function chargeDialogBody() {
  const invoiceOptions = ["", ...state.invoices.map((row) => row.invoiceNo)];
  return `
    ${input("refNo", "Receipt / Reference No", nextAdditionalChargeNumber(), true)}
    ${selectFrom("shipmentNo", "Shipment No", visibleRows(state.shipments).map((row) => row.jobNo))}
    ${input("chargeDate", "Charge Date", today(), false, "date")}
    ${select("chargeType", "Charge Type", chargeTypeOptions())}
    ${select("chargeBasis", "Charge Basis", chargeBasisOptions())}
    ${selectFrom("supplier", "Supplier / Vendor", state.suppliers.map((row) => row.name))}
    ${input("referenceNo", "Reference No", "")}
    ${select("invoiceNo", "Invoice No", invoiceOptions, "")}
    ${input("amount", "Amount", "0.000", false, "number")}
    ${input("taxPercent", "Tax %", "0", false, "number")}
    ${select("currency", "Currency", ["KWD", "USD", "SAR"], "KWD")}
    ${input("attachmentName", "Attachment Upload", "")}
    ${select("status", "Status", chargeStatusOptions(), isAdminSession() ? "Approved" : "Pending Approval")}
    ${textarea("remarks", "Remarks", "")}
  `;
}

function consolidationShipmentPicker(initialJobs = "", currentLoadNo = "") {
  const shipmentOptions = availableConsolidationShipmentOptions(initialJobs, currentLoadNo);
  return `<div class="dialog-picker" data-consolidation-picker>
    <input type="hidden" name="jobNumbers" value="${escapeHtml(initialJobs)}" />
    <label>Add Shipment To Consolidation
      <select data-consolidation-job-select>
        ${shipmentOptions.map((jobNo) => `<option value="${escapeHtml(jobNo)}">${escapeHtml(jobNo)}</option>`).join("")}
      </select>
    </label>
    <div class="action-row">
      <button type="button" class="secondary-button" data-dialog-action="add-consolidation-job">Add Shipment</button>
    </div>
    <div class="selected-job-list" data-consolidation-jobs-list></div>
    <p class="empty-state">${shipmentOptions.length ? "Only shipments saved with service type Consolidation are available. Already assigned shipments are hidden." : "No unassigned Consolidation service shipments are available."}</p>
  </div>`;
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

function bindConsolidationJobPicker() {
  const picker = dialogBody.querySelector("[data-consolidation-picker]");
  if (!picker) return;

  const selectField = picker.querySelector("[data-consolidation-job-select]");
  const hiddenField = picker.querySelector("input[name='jobNumbers']");
  const list = picker.querySelector("[data-consolidation-jobs-list]");
  const selectedJobs = new Set(
    String(hiddenField.value || "")
      .split(",")
      .map((jobNo) => jobNo.trim())
      .filter(Boolean)
  );

  const syncSelectedJobs = () => {
    hiddenField.value = [...selectedJobs].join(", ");
    list.innerHTML = selectedJobs.size
      ? [...selectedJobs].map((jobNo) => `<span class="job-chip selected-job-chip"><strong>${escapeHtml(jobNo)}</strong><button type="button" class="ghost-button" data-remove-consolidation-job="${escapeHtml(jobNo)}">Remove</button></span>`).join("")
      : `<p class="empty-state">No shipments added yet.</p>`;
  };

  picker.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-dialog-action='add-consolidation-job']");
    if (addButton) {
      const jobNo = selectField?.value || "";
      if (jobNo) selectedJobs.add(jobNo);
      else notifyDenied("No shipment selected", "Create a shipment with service type Consolidation first.");
      syncSelectedJobs();
      return;
    }

    const removeButton = event.target.closest("[data-remove-consolidation-job]");
    if (removeButton) {
      selectedJobs.delete(removeButton.dataset.removeConsolidationJob);
      syncSelectedJobs();
    }
  });

  syncSelectedJobs();
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

function applyAuditFilters() {
  state.ui.auditFilters = {
    query: dialogSafeValue("auditQuery"),
    fromDate: dialogSafeValue("auditFromDate"),
    toDate: dialogSafeValue("auditToDate")
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
  const rows = filteredRows(visibleRows(state.shipments));
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

async function submitAdminRequest(targetModule, referenceNo, details, proposedValues, requestType = "Change Request") {
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
  await postRecord("adminRequest", request);
  return request;
}

async function approveAdminRequest(request, approvalNotes = "") {
  request.status = "Approved";
  request.approvedBy = currentSession()?.userName || "admin";
  request.approvalNotes = approvalNotes;
  await persistRecord("adminRequest", request);

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
      await persistRecord("charge", charge);
    }
  }

  if (request.targetModule === "Consolidation") {
    const loadItem = state.loads.find((row) => row.loadNo === request.referenceNo);
    if (loadItem) {
      loadItem.manifestStatus = "Approved";
      loadItem.lastManifestRequestNo = request.requestNo;
      await persistRecord("load", loadItem);
    }
  }

  addHistory("Approved admin request", request.requestNo);
  saveState();
}

async function rejectAdminRequest(request, approvalNotes = "") {
  request.status = "Rejected";
  request.approvedBy = currentSession()?.userName || "admin";
  request.approvalNotes = approvalNotes;
  await persistRecord("adminRequest", request);

  if (request.targetModule === "Additional Charges") {
    const charge = state.additionalCharges.find((row) => row.refNo === request.referenceNo && row.status === "Pending Approval");
    if (charge) {
      charge.status = "Rejected";
      charge.approvedBy = request.approvedBy;
      charge.approvalNotes = approvalNotes;
      await persistRecord("charge", charge);
    }
  }

  if (request.targetModule === "Consolidation") {
    const loadItem = state.loads.find((row) => row.loadNo === request.referenceNo);
    if (loadItem) {
      loadItem.manifestStatus = "Rejected";
      loadItem.lastManifestRequestNo = request.requestNo;
      await persistRecord("load", loadItem);
    }
  }

  addHistory("Rejected admin request", request.requestNo);
  saveState();
}

function manifestChangeSummary(loadItem) {
  return [
    `route: ${loadItem.route}`,
    `transporter: ${loadItem.transporter}`,
    `vehicleNo: ${loadItem.vehicleNo}`,
    `tripDate: ${loadItem.tripDate}`,
    `status: ${loadItem.status}`,
    `jobNumbers: ${loadItem.jobNumbers}`
  ].join(" | ");
}

async function requestLoadManifest(loadNo) {
  const loadItem = state.loads.find((row) => row.loadNo === loadNo);
  if (!loadItem) return;
  const request = await submitAdminRequest(
    "Consolidation",
    loadNo,
    "Generate loading list / manifest",
    manifestChangeSummary(loadItem),
    "Manifest Approval"
  );
  loadItem.manifestStatus = "Pending Approval";
  loadItem.lastManifestRequestNo = request.requestNo;
  await persistRecord("load", loadItem);
  addHistory("Submitted manifest approval request", `${loadNo} - ${request.requestNo}`);
  saveState();
  render();
}

async function approveLoadManifest(loadNo) {
  if (!isAdminSession()) {
    window.alert("Only admin users can approve consolidation manifests.");
    return;
  }
  const loadItem = state.loads.find((row) => row.loadNo === loadNo);
  if (!loadItem) return;
  loadItem.manifestStatus = "Approved";
  await persistRecord("load", loadItem);
  addHistory("Generated and approved manifest", loadNo);
  saveState();
  render();
}

async function handleModuleSubmit(event) {
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
  const saved = await handlers[type]?.();
  if (saved === false) {
    return;
  }
  saveState();
  render();
}

async function createShipment(data) {
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
  await postRecord("shipment", record);
  addHistory("Created shipment", data.jobNo);
  notifySuccess("Shipment created", `${data.jobNo} was saved successfully.`);
  return true;
}

async function createLoad(data) {
  const jobs = normalizeConsolidationJobs(data.jobNumbers);
  if (!jobs.length) {
    notifyDenied("Consolidation not created", "Add at least one unassigned shipment with service type Consolidation.");
    return false;
  }
  const item = load(data.loadNo, data.tripDate, data.route, data.transporter, data.vehicleNo, data.status, jobs.join(", "), data.manifestStatus || "Not Generated", data.lastManifestRequestNo || "");
  recalculateLoad(item);
  state.loads.unshift(item);
  await postRecord("load", item);
  addHistory("Created consolidation", data.loadNo);
  notifySuccess("Consolidation created", `${data.loadNo} was saved successfully.`);
  return true;
}

async function createParty(key, data) {
  const record = party(data.code, data.name, data.locationOrLane, data.email, data.terms, data.status, false, data.branch);
  state[key].unshift(record);
  await postRecord(key, record);
  addHistory(`Created ${key}`, data.code);
  notifySuccess("Record created", `${data.code} was saved successfully.`);
  return true;
}

async function createUser(data) {
  const userName = String(data.userName || "").trim();
  const password = String(data.password || "");
  const email = String(data.email || "").trim();

  if (!userName || !password || !email) {
    window.alert("User name, password, and email are required.");
    return false;
  }

  if (state.users.some((record) => record.userName.toLowerCase() === userName.toLowerCase())) {
    window.alert("User name already used or duplicate entry.");
    return false;
  }

  if (state.users.some((record) => record.email.toLowerCase() === email.toLowerCase())) {
    window.alert("Email already used or duplicate entry.");
    return false;
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
  const apiSaved = await postRecord("user", record);
  addHistory("Created user account", `${userName} - ${data.branchAccess}`);
  notifySuccess("User created", `${userName} was saved successfully.`);
  if (apiSaved) setTimeout(() => syncFromApi(), 300);
  return true;
}

async function createTariff(data) {
  const record = tariff(data.tariffNo, data.customer, data.origin, data.destination, data.mainSection, data.weightSection, data.rateType, Number(data.rate), Number(data.minCharge));
  state.tariffs.unshift(record);
  await postRecord("tariff", record);
  addHistory("Created tariff", data.tariffNo);
  notifySuccess("Tariff created", `${data.tariffNo} was saved successfully.`);
  return true;
}

async function createDocument(data) {
  const uploadedName = data.fileUpload && typeof data.fileUpload === "object" ? data.fileUpload.name || "" : "";
  const record = documentRow(data.documentNo, data.linkedNo, data.type, data.status, data.date, data.owner || currentUserName(), uploadedName, currentUserName());
  state.documents.unshift(record);
  await postRecord("document", record);
  addHistory("Tagged document", data.documentNo);
  notifySuccess("Document saved", `${data.documentNo} was saved successfully.`);
  return true;
}

async function createCharge(data) {
  const sessionUser = currentSession()?.userName || "operations";
  const isAdmin = isAdminSession();
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.shipmentNo);
  if (!shipmentItem) {
    notifyFailed("Charge failed", "Select a valid shipment first.");
    return false;
  }
  const existingCharges = state.additionalCharges.filter((row) => row.shipmentNo === data.shipmentNo);
  const existingInvoiceNo = existingCharges.find((row) => row.invoiceNo)?.invoiceNo || "";
  if (existingInvoiceNo && data.invoiceNo && data.invoiceNo !== existingInvoiceNo) {
    notifyDenied("Charge denied", `Shipment ${data.shipmentNo} already uses invoice ${existingInvoiceNo}.`);
    return false;
  }
  const invoiceNo = existingInvoiceNo || data.invoiceNo || "";
  const amount = Number(data.amount || 0);
  const taxPercent = Number(data.taxPercent || 0);
  const newTotal = amount + amount * (taxPercent / 100);
  const existingTotal = existingCharges.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const projectedProfit = Number(shipmentItem.sell || 0) - Number(shipmentItem.buyCost || 0) - existingTotal - newTotal;
  if (projectedProfit < 0) {
    notifyDenied("Charge denied", `This charge puts shipment ${data.shipmentNo} in loss (${money(projectedProfit)}).`);
    return false;
  }
  const request = !isAdmin
    ? await submitAdminRequest(
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
    invoiceNo,
    amount,
    taxPercent,
    data.currency || "KWD",
    data.remarks || "",
    data.attachmentName || "",
    isAdmin ? data.status || "Approved" : "Pending Approval",
    sessionUser,
    isAdmin ? sessionUser : "",
    request?.requestNo || "",
    sessionUser
  );

  state.additionalCharges.unshift(record);
  await postRecord("charge", record);
  addHistory(isAdmin ? "Created additional charge" : "Submitted additional charge", data.refNo);
  notifySuccess(isAdmin ? "Charge saved" : "Charge submitted", `${data.refNo} was ${isAdmin ? "saved" : "sent for approval"}.`);
  return true;
}

async function createInvoice(data) {
  const record = invoice(data.invoiceNo, data.customer, data.shipmentNo, Number(data.revenue), Number(data.supplierCost), data.status, data.date);
  state.invoices.unshift(record);
  await postRecord("invoice", record);
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.shipmentNo);
  if (shipmentItem) shipmentItem.invoiceStatus = data.invoiceNo;
  addHistory("Generated invoice", data.invoiceNo);
  notifySuccess("Invoice saved", `${data.invoiceNo} was saved successfully.`);
  return true;
}

async function updatePod(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return false;
  shipmentItem.status = "Delivered";
  shipmentItem.podStatus = "Uploaded";
  await persistRecord("shipment", shipmentItem);
  const documentRecord = documentRow(nextNumber("DOC", state.documents, "documentNo"), data.jobNo, "POD", "Uploaded", today(), "delivery");
  state.documents.unshift(documentRecord);
  await postRecord("document", documentRecord);
  addHistory("Marked delivered and uploaded POD", `${data.jobNo} - ${data.receiver}`);
  notifySuccess("POD updated", `${data.jobNo} was marked delivered.`);
  return true;
}

async function updateStatus(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return false;
  shipmentItem.status = data.status;
  shipmentItem.podStatus = data.podStatus;
  shipmentItem.invoiceStatus = data.invoiceStatus;
  await persistRecord("shipment", shipmentItem);
  addHistory("Updated shipment status", `${data.jobNo} - ${data.notes}`);
  notifySuccess("Status updated", `${data.jobNo} was saved successfully.`);
  return true;
}

async function updateSettings(data) {
  state.settings = { ...state.settings, ...data, settingsKey: state.settings.settingsKey || "default" };
  const apiSaved = await persistRecord("settings", state.settings);
  addHistory("Saved company settings", data.companyName);
  notifySuccess("Settings saved", "Company settings were updated successfully.");
  if (apiSaved) setTimeout(() => syncFromApi(), 300);
  return true;
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
  if (!endpoint) return false;
  try {
    const result = await fetchJson(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
    if (result.mode === "demo") throw new Error("Database tables are not ready yet.");
    return true;
  } catch (error) {
    markApiWriteError(error);
    return false;
  }
}

async function persistRecord(type, record) {
  const endpoint = endpointFor(type);
  const id = rowId(type, record);
  if (!endpoint || !id || type === "audit") return false;
  try {
    const result = await fetchJson(`/api/${endpoint}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
    if (result.mode === "demo") throw new Error("Database tables are not ready yet.");
    return true;
  } catch (error) {
    markApiWriteError(error);
    return false;
  }
}

async function deleteRecord(type, id) {
  const endpoint = endpointFor(type);
  if (!endpoint || !id) return false;
  try {
    const result = await fetchJson(`/api/${endpoint}/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    if (result.mode === "demo") throw new Error("Database tables are not ready yet.");
    return true;
  } catch (error) {
    markApiWriteError(error);
    return false;
  }
}

function markApiWriteError(error) {
  state.api = {
    ...state.api,
    status: "API save warning",
    database: state.api.database || "unknown",
    mode: "browser",
    error: error?.message || "Live database save failed."
  };
  notifyFailed("Live database save failed", state.api.error);
}

function selectedDeleteId(type) {
  return moduleContent.querySelector(`[data-delete-select='${type}']`)?.value || "";
}

function typeLabel(type) {
  return {
    shipment: "shipment",
    load: "consolidation",
    customers: "customer",
    suppliers: "supplier / transporter",
    tariff: "tariff",
    document: "document",
    charge: "additional charge",
    invoice: "invoice",
    user: "user account"
  }[type] || type;
}

async function deleteSelectedRecord(type) {
  if (!isAdminSession()) {
    notifyDenied("Delete denied", "Only admin users can delete records.");
    return;
  }

  const id = selectedDeleteId(type);
  if (!id) {
    notifyDenied("Delete denied", `Select a ${typeLabel(type)} to delete.`);
    return;
  }

  const record = collectionFor(type).find((row) => rowId(type, row) === id);
  if (!record) {
    notifyFailed("Delete failed", `${typeLabel(type)} not found.`);
    return;
  }

  if (type === "user" && id === currentSession()?.userName) {
    notifyDenied("Delete denied", "You cannot delete the user account you are currently using.");
    return;
  }

  const message = type === "shipment"
    ? `Delete shipment ${id} and its linked records?`
    : `Delete ${typeLabel(type)} ${id}?`;
  if (!window.confirm(message)) return;

  if (type === "shipment") {
    await deleteShipmentById(id);
    return;
  }

  const affectedShipments = type === "invoice"
    ? state.shipments.filter((shipmentItem) => shipmentItem.invoiceStatus === id)
    : [];
  const deleted = await deleteRecord(type, id);
  if (!deleted) return;
  removeLocalRecord(type, id);
  await Promise.all(affectedShipments.map((shipmentItem) => persistRecord("shipment", shipmentItem)));
  addHistory(`Deleted ${typeLabel(type)}`, id);
  saveState();
  notifySuccess("Record deleted", `${id} was deleted successfully.`);
  render();
}

async function deleteRecordById(type, id) {
  if (!isAdminSession()) {
    notifyDenied("Delete denied", "Only admin users can delete records.");
    return;
  }
  if (!id) {
    notifyDenied("Delete denied", `Select a ${typeLabel(type)} to delete.`);
    return;
  }
  if (!window.confirm(`Delete ${typeLabel(type)} ${id}?`)) return;
  const deleted = await deleteRecord(type, id);
  if (!deleted) return;
  removeLocalRecord(type, id);
  addHistory(`Deleted ${typeLabel(type)}`, id);
  saveState();
  notifySuccess("Record deleted", `${id} was deleted successfully.`);
  render();
}

async function deleteAuditLog() {
  if (!isAdminSession()) {
    notifyDenied("Delete denied", "Only admin users can delete audit logs.");
    return;
  }
  const id = selectedDeleteId("audit");
  if (!id) {
    notifyDenied("Delete denied", "Select a log entry to delete.");
    return;
  }
  if (!window.confirm(`Delete audit log ${id}?`)) return;
  const deleted = await deleteRecord("audit", id);
  if (!deleted) return;
  state.audit = state.audit.filter((row) => String(rowId("audit", row)) !== String(id));
  saveState();
  notifySuccess("Audit log deleted", `Log ${id} was deleted successfully.`);
  render();
}

function removeLocalRecord(type, id) {
  const keep = (row) => rowId(type, row) !== id;
  if (type === "load") {
    state.loads = state.loads.filter(keep);
    if (state.ui.selectedLoadNo === id) state.ui.selectedLoadNo = "";
    return;
  }
  if (type === "customers") state.customers = state.customers.filter(keep);
  if (type === "suppliers") state.suppliers = state.suppliers.filter(keep);
  if (type === "tariff") state.tariffs = state.tariffs.filter(keep);
  if (type === "document") state.documents = state.documents.filter(keep);
  if (type === "charge") state.additionalCharges = state.additionalCharges.filter(keep);
  if (type === "invoice") {
    state.invoices = state.invoices.filter(keep);
    state.shipments.forEach((shipmentItem) => {
      if (shipmentItem.invoiceStatus === id) shipmentItem.invoiceStatus = "Unbilled";
    });
  }
  if (type === "user") state.users = state.users.filter(keep);
}

async function deleteShipmentById(jobNo) {
  const linkedDocuments = state.documents.filter((row) => row.linkedNo === jobNo);
  const linkedInvoices = state.invoices.filter((row) => row.shipmentNo === jobNo);
  const linkedCharges = state.additionalCharges.filter((row) => row.shipmentNo === jobNo);

  const shipmentDeleted = await deleteRecord("shipment", jobNo);
  if (!shipmentDeleted) return;
  await Promise.all([
    ...linkedDocuments.map((row) => deleteRecord("document", row.documentNo)),
    ...linkedInvoices.map((row) => deleteRecord("invoice", row.invoiceNo)),
    ...linkedCharges.map((row) => deleteRecord("charge", row.refNo))
  ]);

  state.shipments = state.shipments.filter((row) => row.jobNo !== jobNo);
  state.documents = state.documents.filter((row) => row.linkedNo !== jobNo);
  state.invoices = state.invoices.filter((row) => row.shipmentNo !== jobNo);
  state.additionalCharges = state.additionalCharges.filter((row) => row.shipmentNo !== jobNo);

  for (const loadItem of state.loads) {
    const jobs = String(loadItem.jobNumbers || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== jobNo);
    loadItem.jobNumbers = jobs.join(", ");
    recalculateLoad(loadItem);
    await persistRecord("load", loadItem);
  }

  addHistory("Deleted shipment", jobNo);
  saveState();
  notifySuccess("Shipment deleted", `${jobNo} and linked records were deleted successfully.`);
  render();
}

async function removeJobFromLoad(loadNo, jobNo) {
  if (!isAdminSession()) {
    notifyDenied("Remove denied", "Only admin users can remove shipments from a consolidation.");
    return;
  }

  const loadItem = state.loads.find((row) => row.loadNo === loadNo);
  if (!loadItem) return;

  loadItem.jobNumbers = String(loadItem.jobNumbers || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== jobNo)
    .join(", ");

  recalculateLoad(loadItem);
  await persistRecord("load", loadItem);
  addHistory("Removed shipment from consolidation", `${loadNo} - ${jobNo}`);
  saveState();
  notifySuccess("Shipment removed", `${jobNo} was removed from ${loadNo}.`);
  render();
}

function sendShipmentStatusEmail(jobNo) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo);
  if (!shipmentItem) {
    window.alert("Select a shipment first.");
    return;
  }

  const customer = state.customers.find((row) => row.name === shipmentItem.customer);
  if (!customer?.email) {
    window.alert("No customer email is stored for this shipment.");
    return;
  }

  const subject = encodeURIComponent(`Shipment Update ${shipmentItem.jobNo}`);
  const body = encodeURIComponent(
    [
      `Dear ${shipmentItem.customer},`,
      "",
      `Shipment No: ${shipmentItem.jobNo}`,
      `Origin: ${shipmentItem.origin}`,
      `Destination: ${shipmentItem.destination}`,
      `Status: ${shipmentItem.status}`,
      `POD Status: ${shipmentItem.podStatus}`,
      `Invoice Status: ${shipmentItem.invoiceStatus}`,
      "",
      "Regards,",
      "Apollo Freight Solutions"
    ].join("\n")
  );

  window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${subject}&body=${body}`;
}

boot();
