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

const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const moduleNav = document.querySelector("#moduleNav");
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageTitle = document.querySelector("#pageTitle");
const pageSubtitle = document.querySelector("#pageSubtitle");
const moduleContent = document.querySelector("#moduleContent");
const apiBanner = document.querySelector("#apiBanner");
const globalSearch = document.querySelector("#globalSearch");
const fromDate = document.querySelector("#fromDate");
const toDate = document.querySelector("#toDate");
const resetFilters = document.querySelector("#resetFilters");
const logoutButton = document.querySelector("#logoutButton");
const recordDialog = document.querySelector("#recordDialog");
const dialogType = document.querySelector("#dialogType");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogBody = document.querySelector("#dialogBody");
const dialogSave = document.querySelector("#dialogSave");

function seedState() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    shipments: [
      shipment("AFS-2605001", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Booked", 14, 820, 5.2, 1040, 485, 330, "Pending", "Unbilled", "2026-05-05"),
      shipment("AFS-2605002", "Branch 2", "Desert Medical Supplies", "Shuwaikh", "Dammam", "In-Transit", 8, 410, 2.1, 420, 215, 150, "Pending", "Unbilled", "2026-05-05"),
      shipment("AFS-2605003", "Branch 1", "Al Noor Projects", "Ahmadi", "Doha", "Delivered", 22, 1250, 7.8, 1560, 780, 590, "Missing", "Unbilled", "2026-05-04"),
      shipment("AFS-2605004", "Branch 1", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Invoiced", 4, 160, 0.9, 180, 95, 70, "Uploaded", "INV-260001", "2026-05-02")
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
    invoices: [
      invoice("INV-260001", "Gulf Retail Trading", "AFS-2605004", 95, 70, "Sent", "2026-05-02"),
      invoice("DRAFT-260006", "Al Noor Projects", "AFS-2605003", 780, 590, "Draft", "2026-05-05")
    ],
    users: [
      user("admin", "admin@apollofreightsolution.com", "Admin", "Active", "Both", true, true, true, true),
      user("operations", "ops@apollofreightsolution.com", "Operations", "Active", "Branch 1", true, true, false, true)
    ],
    unblockRequests: [
      { requestNo: "REQ-2605001", customerName: "Desert Medical Supplies", requestedBy: "operations", reason: "Credit release requested", status: "Pending", date: today }
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
    }
  };
}

function shipment(jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate) {
  return { jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate, airwayBillNo: jobNo.replace("AFS", "AWB"), tariffNo: "TAR-1001", transitDays: 3 };
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

function invoice(invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date) {
  return { invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, grossProfit: revenue - supplierCost };
}

function user(userName, email, role, accountStatus, branchAccess, canViewAllEntry, canViewOnlySelfEntry, canEditAllEntry, canViewUpdatedHistory) {
  return { userName, email, role, accountStatus, branchAccess, canViewAllEntry, canViewOnlySelfEntry, canEditAllEntry, canViewUpdatedHistory, notes: "Web demo user" };
}

function audit(dateTime, userName, action, reference) {
  return { dateTime, user: userName, action, reference };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedState();
  } catch {
    return seedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function addHistory(action, reference) {
  state.audit.unshift(audit(new Date().toISOString().slice(0, 16).replace("T", " "), "admin", action, reference));
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
  [globalSearch, fromDate, toDate].forEach((input) => input.addEventListener("input", render));
  resetFilters.addEventListener("click", () => {
    globalSearch.value = "";
    fromDate.value = "";
    toDate.value = "";
    render();
  });
  moduleContent.addEventListener("click", handleModuleClick);
  moduleContent.addEventListener("submit", handleModuleSubmit);
  dialogSave.addEventListener("click", saveDialogRecord);

  if (sessionStorage.getItem(SESSION_KEY)) {
    showApp();
  } else {
    showLogin();
  }
}

function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(loginForm);
  if (form.get("userName") === "admin" && form.get("password") === "admin123") {
    sessionStorage.setItem(SESSION_KEY, "admin");
    loginMessage.textContent = "";
    showApp();
    return;
  }
  loginMessage.textContent = "Invalid login. Use admin / admin123 for test access.";
}

function showLogin() {
  loginScreen.classList.remove("is-hidden");
  appShell.classList.add("is-hidden");
}

function showApp() {
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  syncFromApi();
  render();
}

async function syncFromApi() {
  try {
    const [health, shipments, consolidations, customers] = await Promise.all([
      fetchJson("/api/health"),
      fetchJson("/api/shipments"),
      fetchJson("/api/consolidations"),
      fetchJson("/api/customers")
    ]);

    state.api = { status: "API connected", database: health.database || "unknown", mode: health.mode || "database" };
    if (shipments.rows?.length) state.shipments = shipments.rows.map(apiShipment);
    if (consolidations.rows?.length) state.loads = consolidations.rows.map(apiLoad);
    if (customers.rows?.length) state.customers = customers.rows.map(apiCustomer);
    saveState();
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
  return shipment(row.job_no, row.branch, row.customer_name, row.origin, row.destination, row.status, row.pieces || 0, row.actual_kg || 0, row.cbm || 0, row.chargeable_kg || 0, row.sell || 0, row.buy_cost || 0, row.pod_status || "Pending", row.invoice_status || "Unbilled", String(row.booking_date || today()).slice(0, 10));
}

function apiLoad(row) {
  const item = load(row.load_no, String(row.trip_date || today()).slice(0, 10), row.route, row.transporter, row.vehicle_no, row.status, row.job_numbers || "");
  recalculateLoad(item);
  return item;
}

function apiCustomer(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch);
}

function render() {
  const module = modules.find(([name]) => name === activeModule) || modules[0];
  pageEyebrow.textContent = module[0];
  pageTitle.textContent = module[0];
  pageSubtitle.textContent = module[1];
  moduleNav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.module === activeModule));
  apiBanner.innerHTML = `<strong>${escapeHtml(state.api.status)}</strong><span>Render: ${escapeHtml(API_URL)} | Database: ${escapeHtml(state.api.database)} | Mode: ${escapeHtml(state.api.mode)}</span>`;

  const renderers = {
    Dashboard: renderDashboard,
    "Shipments / Jobs": renderShipments,
    Consolidation: renderConsolidation,
    Customers: () => renderParties("customers", "Customer"),
    "Suppliers / Transporters": () => renderParties("suppliers", "Supplier / Transporter"),
    "Tariffs / Rate Master": renderTariffs,
    Documents: renderDocuments,
    "Billing / Invoices": renderInvoices,
    "POD / Delivery": renderPod,
    "Shipment Status": renderShipmentStatus,
    Reports: renderReports,
    "User Management / Settings": renderSettings,
    "Audit Log": renderAudit
  };
  moduleContent.innerHTML = (renderers[activeModule] || renderDashboard)();
}

function renderDashboard() {
  const rows = filteredRows(state.shipments);
  const open = rows.filter((row) => ["Draft", "Booked"].includes(row.status)).length;
  const transit = rows.filter((row) => row.status === "In-Transit").length;
  const pod = rows.filter((row) => row.podStatus !== "Uploaded").length;
  const unbilled = rows.filter((row) => ["Unbilled", "Missing rate"].includes(row.invoiceStatus)).length;
  return `
    <section class="kpi-grid">
      ${kpi("Open Shipments", open, "Draft and booked jobs")}
      ${kpi("In Transit", transit, "Currently moving")}
      ${kpi("Pending POD", pod, "Need delivery proof")}
      ${kpi("Unbilled", unbilled, "Ready for billing review")}
      ${kpi("Month Revenue", money(rows.reduce((sum, row) => sum + Number(row.sell || 0), 0)), "Sell total")}
      ${kpi("Gross Profit", money(rows.reduce((sum, row) => sum + Number(row.sell || 0) - Number(row.buyCost || 0), 0)), "Sell minus supplier cost")}
    </section>
    <section class="split-grid">
      <article class="panel">${panelHeader("Operational Shipments", "Dashboard")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Exception Alerts", "Controls")}
        <div class="alert-list">
          ${alert("Jobs missing tariff/rate", "AFS-2605005 needs tariff selection before invoice.")}
          ${alert("Delivered but not invoiced", "AFS-2605003 is delivered and waiting for billing.")}
          ${alert("Pending POD", `${pod} shipments need POD upload or dispute update.`)}
        </div>
      </article>
    </section>`;
}

function renderShipments() {
  const rows = filteredRows(state.shipments);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Register", "Editable records")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Create Shipment", "Job number")}
        <form class="stack-form" data-form="shipment">
          ${input("jobNo", "Job Number", nextNumber("AFS", state.shipments, "jobNo"), true)}
          ${select("branch", "Branch", ["Branch 1", "Branch 2"])}
          ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
          ${input("origin", "Origin", "Kuwait City")}
          ${input("destination", "Destination", "Riyadh")}
          ${input("pieces", "Pieces / Pallets", "1", false, "number")}
          ${input("actualKg", "Actual Weight KG", "100", false, "number")}
          ${input("cbm", "Volume CBM", "1.0", false, "number")}
          ${input("chargeableKg", "Chargeable Weight KG", "200", false, "number")}
          ${input("sell", "Sell Price", "100.000", false, "number")}
          ${input("buyCost", "Supplier Cost", "70.000", false, "number")}
          ${select("status", "Status", statusOptions())}
          <button type="submit">Create Shipment</button>
        </form>
      </article>
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
      <article class="panel">${panelHeader("Create Batch / Manifest", "Job grouping")}
        <form class="stack-form" data-form="load">
          ${input("loadNo", "Consolidation No", nextNumber("CON", state.loads, "loadNo"), true)}
          ${input("tripDate", "Trip Date", today(), false, "date")}
          ${input("route", "Route", "Kuwait - Riyadh")}
          ${input("transporter", "Transporter", "Al Dana Transport")}
          ${input("vehicleNo", "Vehicle No", "KWT-00000")}
          ${select("status", "Status", ["Planned", "Loading", "Dispatched", "Delivered", "Closed"])}
          ${selectFrom("jobNumbers", "Job Numbers", state.shipments.map((row) => row.jobNo))}
          <button type="submit">Create Consolidation</button>
        </form>
      </article>
    </section>`;
}

function renderParties(key, label) {
  const rows = filteredRows(state[key]);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader(`${label} Register`, "Master data")} ${table(key, rows, partyColumns())}</article>
      <article class="panel">${panelHeader(`Create ${label}`, "Account details")}
        <form class="stack-form" data-form="${key}">
          ${input("code", `${label} Code`, key === "customers" ? nextNumber("CUS", state.customers, "code") : nextNumber("TRN", state.suppliers, "code"), true)}
          ${input("name", "Name", "")}
          ${input("locationOrLane", "Lane / Location", "")}
          ${input("email", "Contact Email", "", false, "email")}
          ${select("terms", "Credit Limit Days", ["15 days", "30 days", "45 days"])}
          ${select("status", "Status", ["Active", "Inactive", "Blocked"])}
          ${select("branch", "Branch", ["Branch 1", "Branch 2", "Both"])}
          <button type="submit">Create ${label}</button>
        </form>
      </article>
    </section>`;
}

function renderTariffs() {
  const rows = filteredRows(state.tariffs);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Rate Master", "Tariffs")} ${table("tariff", rows, tariffColumns())}</article>
      <article class="panel">${panelHeader("Tariff Editor", "Pricing")}
        <form class="stack-form" data-form="tariff">
          ${input("tariffNo", "Tariff Number", nextNumber("TAR", state.tariffs, "tariffNo"), true)}
          ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
          ${input("origin", "Origin", "Kuwait City")}
          ${input("destination", "Destination", "Riyadh")}
          ${select("mainSection", "Main Section", ["FTL", "LTL"])}
          ${select("weightSection", "Weight Section", ["Minimum", "Up to 100 KG", "300 KG", "500 KG", "1000 KG", "More"])}
          ${select("rateType", "Rate Type", ["Per KG", "Per CBM", "Per Pallet", "Per Trip"])}
          ${input("rate", "Rate", "0.420", false, "number")}
          ${input("minCharge", "Minimum Charge", "35.000", false, "number")}
          <button type="submit">Create Tariff</button>
        </form>
      </article>
    </section>`;
}

function renderDocuments() {
  const rows = filteredRows(state.documents);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Document Library", "Attachments")} ${table("document", rows, documentColumns())}</article>
      <article class="panel">${panelHeader("Upload and Tag", "Document control")}
        <form class="stack-form" data-form="document">
          ${input("documentNo", "Document No", nextNumber("DOC", state.documents, "documentNo"), true)}
          ${selectFrom("linkedNo", "Attach To", state.shipments.map((row) => row.jobNo))}
          ${select("type", "Document Type", ["Waybill", "LR", "CMR", "Commercial Invoice", "Packing List", "POD", "Supplier Invoice"])}
          ${select("status", "Status", ["Uploaded", "Attached", "Missing", "Issued", "Stored", "Replaced"])}
          ${input("date", "Date", today(), false, "date")}
          ${input("owner", "Owner", "operations")}
          <button type="submit">Save Document Tag</button>
        </form>
      </article>
    </section>`;
}

function renderInvoices() {
  const rows = filteredRows(state.invoices);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Invoice Register", "Billing")} ${table("invoice", rows, invoiceColumns())}</article>
      <article class="panel">${panelHeader("Create Invoice", "Finance")}
        <form class="stack-form" data-form="invoice">
          ${input("invoiceNo", "Invoice No", nextNumber("INV", state.invoices, "invoiceNo"), true)}
          ${selectFrom("customer", "Customer", state.customers.map((row) => row.name))}
          ${selectFrom("shipmentNo", "Shipment", state.shipments.map((row) => row.jobNo))}
          ${input("revenue", "Revenue", "100.000", false, "number")}
          ${input("supplierCost", "Supplier Cost", "70.000", false, "number")}
          ${select("status", "Status", ["Draft", "Approved", "Sent", "Paid", "Overdue"])}
          ${input("date", "Date", today(), false, "date")}
          <button type="submit">Generate Invoice</button>
        </form>
      </article>
    </section>`;
}

function renderPod() {
  const rows = filteredRows(state.shipments.filter((row) => row.podStatus !== "Uploaded" || row.status !== "Closed"));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("POD Pending / Delivery Board", "Delivery")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Delivery Update", "POD")}
        <form class="stack-form" data-form="pod">
          ${selectFrom("jobNo", "Shipment No", state.shipments.map((row) => row.jobNo))}
          ${input("receiver", "Receiver", "Receiver Name")}
          <button type="submit">Mark Delivered + Upload POD</button>
        </form>
      </article>
    </section>`;
}

function renderShipmentStatus() {
  const rows = filteredRows(state.shipments);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Shipment Status Register", "Status board")} ${table("shipment", rows, shipmentColumns())}</article>
      <article class="panel">${panelHeader("Status Update", "Shipment controls")}
        <form class="stack-form" data-form="status">
          ${selectFrom("jobNo", "Job No", state.shipments.map((row) => row.jobNo))}
          ${select("status", "Shipment Status", statusOptions())}
          ${select("podStatus", "POD Status", ["Pending", "Uploaded", "Missing", "Disputed", "Approved"])}
          ${select("invoiceStatus", "Invoice Status", ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue"])}
          ${input("notes", "Notes", "Status update")}
          <button type="submit">Update Shipment Status</button>
        </form>
      </article>
    </section>`;
}

function renderReports() {
  const rows = filteredRows(state.shipments);
  const revenue = rows.reduce((sum, row) => sum + Number(row.sell || 0), 0);
  const cost = rows.reduce((sum, row) => sum + Number(row.buyCost || 0), 0);
  return `
    <section class="kpi-grid">
      ${kpi("Filtered Shipments", rows.length, "Current report scope")}
      ${kpi("Revenue", money(revenue), "Sell total")}
      ${kpi("Supplier Cost", money(cost), "Buy total")}
      ${kpi("Margin", money(revenue - cost), "Revenue minus cost")}
    </section>
    <section class="panel">${panelHeader("Report Catalogue", "Exports")}
      ${table("report", [
        { report: "Daily shipments", scope: "Operations", export: "Excel / PDF" },
        { report: "Open / in-transit / delivered", scope: "Operations", export: "Excel / PDF" },
        { report: "Pending POD / invoice", scope: "Delivery and Billing", export: "Excel / PDF" },
        { report: "Revenue by customer / route", scope: "Management", export: "Excel / PDF" },
        { report: "Margin and cost vs sell", scope: "Finance", export: "Excel / PDF" }
      ], [["report", "Report"], ["scope", "Scope"], ["export", "Export"]])}
    </section>`;
}

function renderSettings() {
  return `
    <section class="split-grid">
      <article class="panel">${panelHeader("User Accounts", "Permissions")} ${table("user", filteredRows(state.users), userColumns())}</article>
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
    </section>
    <section class="panel">${panelHeader("Customer Unblock Requests", "Admin")} ${table("unblock", filteredRows(state.unblockRequests), unblockColumns())}</section>`;
}

function renderAudit() {
  return `<section class="panel">${panelHeader("Audit Trail", "History")} ${table("audit", filteredRows(state.audit), auditColumns())}</section>`;
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

function table(type, rows, columns) {
  return `<div class="table-wrap"><table><thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}<th>Open</th></tr></thead><tbody>${rows.length ? rows.map((row, index) => tableRow(type, row, index, columns)).join("") : `<tr><td colspan="${columns.length + 1}">${empty("No records found.")}</td></tr>`}</tbody></table></div>`;
}

function tableRow(type, row, index, columns) {
  const id = rowId(type, row);
  return `<tr>${columns.map(([key]) => `<td>${escapeHtml(display(row[key]))}</td>`).join("")}<td><button class="ghost-button" data-action="open" data-type="${type}" data-id="${escapeHtml(id)}">Open</button></td></tr>`;
}

function display(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : money(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ?? "";
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

function select(name, label, options, selected = options[0]) {
  return `<label>${escapeHtml(label)}<select name="${escapeHtml(name)}">${options.map((option) => `<option ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
}

function selectFrom(name, label, options) {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" list="${escapeHtml(name)}Options" value="${escapeHtml(options[0] || "")}" /><datalist id="${escapeHtml(name)}Options">${options.map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist></label>`;
}

function statusOptions() {
  return ["Draft", "Booked", "In-Transit", "Delivered", "Invoiced", "Closed", "Blocked"];
}

function shipmentColumns() {
  return [["jobNo", "Job No"], ["customer", "Customer"], ["origin", "Origin"], ["destination", "Destination"], ["status", "Status"], ["bookingDate", "Date"], ["invoiceStatus", "Invoice"]];
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

function userColumns() {
  return [["userName", "User"], ["email", "Email"], ["role", "Role"], ["accountStatus", "Status"], ["branchAccess", "Branch"]];
}

function unblockColumns() {
  return [["requestNo", "Request"], ["customerName", "Customer"], ["requestedBy", "Requested By"], ["reason", "Reason"], ["status", "Status"], ["date", "Date"]];
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
    invoice: "invoiceNo",
    user: "userName",
    unblock: "requestNo",
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
    invoice: state.invoices,
    user: state.users,
    unblock: state.unblockRequests,
    audit: state.audit
  };
  return collections[type] || [];
}

function handleModuleClick(event) {
  const button = event.target.closest("[data-action='open']");
  if (!button) return;
  openRecord(button.dataset.type, button.dataset.id);
}

function openRecord(type, id) {
  const collection = collectionFor(type);
  const record = collection.find((row) => rowId(type, row) === id);
  if (!record) return;
  editing = { type, id, record };
  dialogType.textContent = type;
  dialogTitle.textContent = id;
  dialogBody.innerHTML = Object.entries(record)
    .map(([key, value]) => `<label>${escapeHtml(key)}<input name="${escapeHtml(key)}" value="${escapeHtml(value)}" /></label>`)
    .join("");
  recordDialog.showModal();
}

function saveDialogRecord() {
  if (!editing) return;
  const form = new FormData(dialogBody.closest("form"));
  Object.keys(editing.record).forEach((key) => {
    const next = form.get(key);
    if (next !== null) editing.record[key] = coerceValue(editing.record[key], next);
  });
  if (editing.type === "load") recalculateLoad(editing.record);
  addHistory(`Updated ${editing.type}`, editing.id);
  saveState();
  recordDialog.close();
  render();
}

function coerceValue(previous, next) {
  if (typeof previous === "number") return Number(next) || 0;
  if (typeof previous === "boolean") return next === "true" || next === "Yes";
  return next;
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
  state.shipments.unshift(shipment(data.jobNo, data.branch, data.customer, data.origin, data.destination, data.status, Number(data.pieces), Number(data.actualKg), Number(data.cbm), Number(data.chargeableKg), Number(data.sell), Number(data.buyCost), "Pending", "Unbilled", today()));
  postShipment(data);
  addHistory("Created shipment", data.jobNo);
}

async function postShipment(data) {
  try {
    await fetchJson("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobNo: data.jobNo, branch: data.branch, customerName: data.customer, origin: data.origin, destination: data.destination, status: data.status, bookingDate: today() })
    });
  } catch {
    state.api.mode = "browser";
  }
}

function createLoad(data) {
  const item = load(data.loadNo, data.tripDate, data.route, data.transporter, data.vehicleNo, data.status, data.jobNumbers);
  recalculateLoad(item);
  state.loads.unshift(item);
  addHistory("Created consolidation", data.loadNo);
}

function createParty(key, data) {
  state[key].unshift(party(data.code, data.name, data.locationOrLane, data.email, data.terms, data.status, false, data.branch));
  addHistory(`Created ${key}`, data.code);
}

function createTariff(data) {
  state.tariffs.unshift(tariff(data.tariffNo, data.customer, data.origin, data.destination, data.mainSection, data.weightSection, data.rateType, Number(data.rate), Number(data.minCharge)));
  addHistory("Created tariff", data.tariffNo);
}

function createDocument(data) {
  state.documents.unshift(documentRow(data.documentNo, data.linkedNo, data.type, data.status, data.date, data.owner));
  addHistory("Tagged document", data.documentNo);
}

function createInvoice(data) {
  state.invoices.unshift(invoice(data.invoiceNo, data.customer, data.shipmentNo, Number(data.revenue), Number(data.supplierCost), data.status, data.date));
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.shipmentNo);
  if (shipmentItem) shipmentItem.invoiceStatus = data.invoiceNo;
  addHistory("Generated invoice", data.invoiceNo);
}

function updatePod(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return;
  shipmentItem.status = "Delivered";
  shipmentItem.podStatus = "Uploaded";
  state.documents.unshift(documentRow(nextNumber("DOC", state.documents, "documentNo"), data.jobNo, "POD", "Uploaded", today(), "delivery"));
  addHistory("Marked delivered and uploaded POD", `${data.jobNo} - ${data.receiver}`);
}

function updateStatus(data) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.jobNo);
  if (!shipmentItem) return;
  shipmentItem.status = data.status;
  shipmentItem.podStatus = data.podStatus;
  shipmentItem.invoiceStatus = data.invoiceStatus;
  addHistory("Updated shipment status", `${data.jobNo} - ${data.notes}`);
}

function updateSettings(data) {
  state.settings = { ...state.settings, ...data };
  addHistory("Saved company settings", data.companyName);
}

boot();
