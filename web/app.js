const API_URL = (window.APOLLO_API_URL || "https://apollo-freighterp-f9kt.onrender.com").replace(/\/$/, "");
const STORAGE_KEY = "apollofreighterp-web-state-v3";
const SESSION_KEY = "apollofreighterp-session";

const modules = [
  ["Dashboard", "Live operational summary for land freight consolidation"],
  ["Shipment / Airway", "Create, track, duplicate, and close cargo shipments and airway bills"],
  ["Manifest", "Build trips, manifests, and loading lists"],
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
let dialogState = null;
let lastPendingNotificationCount = 0;

// ==========================================================================
// ENTERPRISE HARDWARE PRINT ENGINE LAUNCHER
// ==========================================================================
function openEnterprisePrintJob(htmlContentString) {
  const printWindow = window.open("", "_blank", "width=950,height=750");
  if (!printWindow) {
    if (typeof notifyDenied === "function") {
      notifyDenied("Popup Blocked", "Please permit popups to render document printing jobs.");
    } else {
      window.alert("Popup Blocked! Please permit the system to present print sheets.");
    }
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Apollo Print Engine</title>
        <link rel="stylesheet" href="./styles.css">
      </head>
      <body>
        ${htmlContentString}
        <script>
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ==========================================================================
// OFFICIAL DOCUMENT PRINT TEMPLATE GENERATORS
// ==========================================================================
function renderAirwayBillTcnPrint(shipmentItem) {
  let meta = {};
  try { meta = JSON.parse(shipmentItem.notes || '{}'); } catch(e) { meta = {}; }
  const natureOfGoods = shipmentItem.natureOfGoods || meta.natureOfGoods || "GARMENTS, SHOES & ACCESSORIES";
  const direction = shipmentItem.shipmentDirection || "Export";
  const service = shipmentItem.shipmentService || "LTL";

  return `
    <div class="printable-document">
      <header class="print-doc-header">
        <div class="print-brand-info">
          <h1>APOLLO FREIGHT SOLUTIONS</h1>
          <p>We bring continents closer...</p>
        </div>
        <div class="print-meta-info">
          <h2>TRUCK CONSIGNMENT NOTE - TCN/WAYBILL</h2>
          <div class="print-doc-id">WAYBILL NO: ${escapeHtml(shipmentItem.airwayBillNo || shipmentItem.jobNo)}</div>
          <p style="margin: 4px 0 0 0; font-size: 9pt;"><strong>Date / Place:</strong> ${escapeHtml(shipmentItem.bookingDate || "")} | ${escapeHtml(shipmentItem.origin || "")}</p>
        </div>
      </header>
      <div class="print-doc-grid">
        <div class="print-info-block">
          <h3>Shipper / Origin Location</h3>
          <p><strong>${escapeHtml(shipmentItem.customer || "")}</strong></p>
          <p>Origin Hub: ${escapeHtml(shipmentItem.origin || "")}</p>
          <p>Direction Mode: ${escapeHtml(direction)}</p>
        </div>
        <div class="print-info-block">
          <h3>Consignee / Destination Hub</h3>
          <p><strong>${escapeHtml(meta.billTo1 || shipmentItem.customer || "")}</strong></p>
          <p>Notify & Delivery Address: ${escapeHtml(shipmentItem.destination || "")}</p>
          <p>Carrier No / Service Level: ${escapeHtml(service)}</p>
        </div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Cargo Details / Nature of Goods</th>
            <th style="text-align: right;">No of Pieces/Pallets</th>
            <th style="text-align: right;">Gross Weight (Kgs)</th>
            <th style="text-align: right;">Volume Weight (CBM)</th>
            <th style="text-align: right;">Chargeable Wt (Kg)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(natureOfGoods)}</td>
            <td style="text-align: right;">${Number(shipmentItem.pieces || 0).toString().padStart(2, '0')} Units</td>
            <td style="text-align: right;">${typeof money === 'function' ? money(shipmentItem.actualKg) : shipmentItem.actualKg} Kg</td>
            <td style="text-align: right;">${Number(shipmentItem.cbm || 0).toFixed(3)} CBM</td>
            <td style="text-align: right;"><strong>${typeof money === 'function' ? money(shipmentItem.chargeableKg) : shipmentItem.chargeableKg} Kg</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="print-info-block" style="margin-top: 10px;">
        <h3>Declaration References</h3>
        <p>Operational Status Category: <strong>${escapeHtml(shipmentItem.status || "")}</strong> | Volumetric Divisor: ${escapeHtml(shipmentItem.chargeableDivisor || "250")}</p>
      </div>
      <div class="print-sign-row">
        <div class="print-sign-box">SHIPPER'S SIGNATURE</div>
        <div class="print-sign-box">RECEIVER'S SIGNATURE & STAMP</div>
      </div>
      <footer class="print-footer-clauses">
        <p><strong>Terms and Conditions:</strong></p>
        <p>1. The consignor certifies that he is either the owner of the goods or is duly authorized by the owner to act as his agent.</p>
        <p>2. The consignor agrees to indemnify the carrier against any claims arising out of damage to the goods or any injury to any person caused by the goods.</p>
        <p>3. The carrier is not liable for any damage caused by delay, negligence, or any other reason beyond the control of the carrier.</p>
        <p>4. The carrier's liability for loss or damage to any goods is limited to the lesser of the actual value of the goods or standard international conventions.</p>
        <p style="text-align: center; font-weight: bold; margin-top: 8px;">System generated document. Securely recorded in Apollo ERP.</p>
      </footer>
    </div>
  `;
}

function renderManifestConsolidationPrint(loadItem, linkedShipments) {
  return `
    <div class="printable-document">
      <header class="print-doc-header">
        <div class="print-brand-info">
          <h1>APOLLO FREIGHT SOLUTIONS</h1>
          <p>Consolidation Line-Haul Manifest</p>
        </div>
        <div class="print-meta-info">
          <h2>TRUCK MANIFEST LOADING LIST</h2>
          <div class="print-doc-id">MANIFEST NO: ${escapeHtml(loadItem.loadNo || "")}</div>
          <p style="margin: 4px 0 0 0; font-size: 9pt;"><strong>ETD / Run Date:</strong> ${escapeHtml(loadItem.tripDate || "")}</p>
        </div>
      </header>
      <div class="print-doc-grid">
        <div class="print-info-block">
          <h3>Fleet Vehicle Setup</h3>
          <p><strong>Truck Registration No:</strong> ${escapeHtml(loadItem.vehicleNo || "N/A")}</p>
          <p><strong>Driver Full Name:</strong> ${escapeHtml(loadItem.driverName || "FAHAD MAHMOUD AL NASER")}</p>
          <p><strong>Driver Contact Mobile:</strong> ${escapeHtml(loadItem.driverNumber || "N/A")}</p>
        </div>
        <div class="print-info-block">
          <h3>Routing & Customs</h3>
          <p><strong>From Lane / Origin:</strong> ${escapeHtml((loadItem.route || "").split('-')[0] || "JBL-UAE")}</p>
          <p><strong>To Destination:</strong> ${escapeHtml((loadItem.route || "").split('-')[1] || "KUWAIT")}</p>
          <p><strong>Customs Clearance Node:</strong> PUBLIC WAREHOUSE - SAIL SHIPPING</p>
        </div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Waybill / Job No</th>
            <th>Client Account</th>
            <th>Commodity</th>
            <th style="text-align: right;">Pieces</th>
            <th style="text-align: right;">Gross Weight (Kg)</th>
            <th style="text-align: right;">CBM</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${linkedShipments.map(item => `
            <tr>
              <td><strong>${escapeHtml(item.jobNo || "")}</strong></td>
              <td>${escapeHtml(item.customer || "")}</td>
              <td>${escapeHtml(item.natureOfGoods || "MIXED COMMODITY")}</td>
              <td style="text-align: right;">${Number(item.pieces || 0)}</td>
              <td style="text-align: right;">${typeof money === 'function' ? money(item.actualKg) : item.actualKg}</td>
              <td style="text-align: right;">${Number(item.cbm || 0).toFixed(2)}</td>
              <td><span style="font-size: 8pt; font-weight: bold;">${escapeHtml(item.podStatus || "PENDING")}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="print-sign-row" style="margin-top: 50px;">
        <div class="print-sign-box">DISPATCHING OPERATIONS AGENT</div>
        <div class="print-sign-box">LINE-HAUL DRIVER ACKNOWLEDGEMENT</div>
      </div>
    </div>
  `;
}

function renderPodPrint(shipmentItem) {
  return `
    <div class="printable-document">
      <header class="print-doc-header">
        <div class="print-brand-info">
          <h1>APOLLO FREIGHT SOLUTIONS</h1>
          <p>Delivery Run Verification Receipt</p>
        </div>
        <div class="print-meta-info">
          <h2>FINAL MILE PROOF OF DELIVERY (POD)</h2>
          <div class="print-doc-id">JOB REF: ${escapeHtml(shipmentItem.jobNo || "")}</div>
        </div>
      </header>
      <div class="print-info-block" style="margin-bottom: 20px;">
        <h3>Consignment Consignee Details</h3>
        <p style="font-size: 11pt; margin: 3px 0;"><strong>Customer Store:</strong> ${escapeHtml(shipmentItem.customer || "")}</p>
        <p><strong>Delivery Location:</strong> ${escapeHtml(shipmentItem.destination || "")}</p>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Airway Bill Number</th>
            <th style="text-align: right;">Units</th>
            <th style="text-align: right;">Weight (Kg)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${escapeHtml(shipmentItem.airwayBillNo || "No Linked AWB")}</strong></td>
            <td style="text-align: right;">${Number(shipmentItem.pieces || 0)} Pcs</td>
            <td style="text-align: right;">${typeof money === 'function' ? money(shipmentItem.actualKg) : shipmentItem.actualKg} Kgs</td>
            <td><strong>${escapeHtml(shipmentItem.podStatus || "PENDING")}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="print-sign-row" style="margin-top: 50px;">
        <div class="print-sign-box">Delivering Driver Verification</div>
        <div class="print-sign-box">Consignee Signature & Stamp</div>
      </div>
    </div>
  `;
}
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
      sectionAccess: normalizeSectionAccess(session.sectionAccess || "All"),
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
      tariff("TAR-1001", "Gulf Retail Trading", "Kuwait City", "Riyadh", "FTL", "Minimum", "100 KG", 0.42, 35),
      tariff("TAR-1002", "Desert Medical Supplies", "Shuwaikh", "Dammam", "LTL", "Up to 300 KG", "300 KG", 18, 55)
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
      user("admin", "admin@apollofreightsolution.com", "Admin", "Active", "Both", "All", true, true, true, true, "admin123", "System temporary admin"),
      user("ops-branch1", "operations.branch1@apollofreightsolution.com", "Operations", "Active", "Branch 1", "Dashboard, Shipment / Airway, Manifest, Customers, Suppliers / Transporters, Documents, Tariffs / Rate Master, Reports", true, false, false, false, "ops123", "Can create and track Branch 1 shipments"),
      user("billing-branch2", "billing.branch2@apollofreightsolution.com", "Billing", "Active", "Branch 2", "Dashboard, Billing / Invoices, POD / Delivery, Shipment Status, Reports", true, false, true, true, "billing123", "Invoice and finance access for Branch 2")
    ],
    unblockRequests: [],
    adminRequests: [],
    audit: [],
    settings: {
      settingsKey: "default",
      companyName: "APOLLO FREIGHT SOLUTIONS",
      companyLogoUrl: "",
      shipmentNumberFormat: "AFS-SI###",
      invoiceNumberFormat: "INV-YY###",
      consolidationNumberFormat: "CON-YY###",
      customerNumberFormat: "CUS-###",
      additionalChargeNumberFormat: "CHG-YY###",
      supplierNumberFormat: "TRN-###",
      defaultVolumetricDivisor: "5000",
      requirePodBeforeInvoice: "Yes",
      branches: "Kuwait 1, Dubai 2",
      dropdownOptionsJson: "{}"
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
    },
    dropdownOptions: {}
  };
}

function parseJsonMeta(value) {
  const text = String(value || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function shipmentMetaNotes(data) {
  return JSON.stringify({
    billTo1: String(data.billTo1 || "").trim(),
    billTo2: String(data.billTo2 || "").trim(),
    manualChargeableKg: Number(data.manualChargeableKg || 0),
    natureOfGoods: String(data.natureOfGoods || "").trim(),
    tcnNumber: String(data.tcnNumber || "").trim(),
    palletDimensionsJson: data.palletDimensionsJson || "[]",
    entryMode: data.entryMode || "shipment"
  });
}

// Global Factory Objects Builders
function shipment(jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate, airwayBillNo = jobNo.replace("AFS", "AWB"), tariffNo = "TAR-1001", transitDays = 3, shipmentDirection = "Export", shipmentService = "AE", shipmentServiceOther = "", volumeCategory = "Land", chargeableDivisor = 250, createdBy = "admin", notes = "") {
  const meta = parseJsonMeta(notes);
  return { jobNo, branch, customer, origin, destination, status, pieces, actualKg, cbm, chargeableKg, sell, buyCost, podStatus, invoiceStatus, bookingDate, airwayBillNo, tariffNo, transitDays, shipmentDirection, shipmentService, shipmentServiceOther, volumeCategory, chargeableDivisor, billTo1: meta.billTo1 || "", billTo2: meta.billTo2 || "", manualChargeableKg: Number(meta.manualChargeableKg || 0), natureOfGoods: meta.natureOfGoods || "", tcnNumber: meta.tcnNumber || "", palletDimensionsJson: meta.palletDimensionsJson || "[]", entryMode: meta.entryMode || (String(jobNo || "").startsWith("AWB") ? "airway" : "shipment"), notes, createdBy };
}

function load(loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers, manifestStatus = "Not Generated", lastManifestRequestNo = "", createdBy = "admin", notes = "") {
  const meta = parseJsonMeta(notes);
  return { loadNo, tripDate, route, transporter, vehicleNo, driverName: meta.driverName || "", driverNumber: meta.driverNumber || "", status, jobNumbers, pieces: 0, actualKg: 0, cbm: 0, chargeableKg: 0, manifestStatus, lastManifestRequestNo, notes, createdBy };
}

function party(code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, createdBy = "admin", fullAddress = "") {
  return { code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, fullAddress, createdBy, createdDate: new Date().toISOString().slice(0, 10) };
}

function tariff(tariffNo, customer, origin, destination, mainSection, weightSection, minUpTo, rate, minCharge, additionalChargesJson = "[]", additionalChargesTotal = 0, grandTotal = 0, createdBy = "admin") {
  return { tariffNo, customer, origin, destination, mainSection, weightSection, minUpTo, rate, minCharge, additionalChargesJson, additionalChargesTotal, grandTotal: grandTotal || Number(minCharge || 0) + Number(additionalChargesTotal || 0), volumetricDivisor: 5000, effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", status: "Active", createdBy };
}

function documentRow(documentNo, linkedNo, type, status, date, owner, fileName = "", createdBy = "admin") {
  return { documentNo, linkedNo, type, status, date, owner, fileName, createdBy };
}

function additionalCharge(refNo, shipmentNo, chargeDate, chargeType, chargeBasis, supplier, referenceNo, invoiceNo, amount, taxPercent, currency, remarks, attachmentName, status, requestedBy, approvedBy, approvalNotes, createdBy = "admin") {
  const taxAmount = Number(amount || 0) * (Number(taxPercent || 0) / 100);
  return { refNo, shipmentNo, chargeDate, chargeType, chargeBasis, supplier, referenceNo, invoiceNo, amount: Number(amount || 0), taxPercent: Number(taxPercent || 0), taxAmount, totalAmount: Number(amount || 0) + taxAmount, currency, remarks, attachmentName, status, requestedBy, approvedBy, approvalNotes, createdBy };
}

function invoice(invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, createdBy = "admin") {
  return { invoiceNo, customer, shipmentNo, revenue, supplierCost, status, date, grossProfit: revenue - supplierCost, createdBy };
}

function user(userName, email, role, accountStatus, branchAccess, sectionAccess, canViewAllEntry, canViewOnlySelfEntry, canEditAllEntry, canViewUpdatedHistory, password = "", notes = "Web demo user", createdDate = "2026-01-01") {
  return { userName, email, role, accountStatus, branchAccess, sectionAccess, canViewAllEntry, canViewOnlySelfEntry, canEditAllEntry, canViewUpdatedHistory, password, notes, createdDate };
}

function audit(dateTime, userName, action, reference, id = "") {
  return { id, dateTime, user: userName, action, reference };
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

function parseDropdownOptions(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeState(stored) {
  const defaults = seedState();
  if (!stored || typeof stored !== "object") {
    defaults.users = normalizeUsers(defaults.users);
    return defaults;
  }

  const normalized = {
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
    users: normalizeUsers(Array.isArray(stored.users) && stored.users.length ? stored.users : defaults.users),
    unblockRequests: Array.isArray(stored.unblockRequests) ? stored.unblockRequests : defaults.unblockRequests,
    adminRequests: Array.isArray(stored.adminRequests) ? stored.adminRequests : defaults.adminRequests,
    audit: Array.isArray(stored.audit) ? stored.audit : defaults.audit,
    settings: { ...defaults.settings, ...(stored.settings || {}) },
    dropdownOptions: { ...defaults.dropdownOptions, ...parseDropdownOptions((stored.settings || {}).dropdownOptionsJson), ...(stored.dropdownOptions || {}) },
    api: { ...defaults.api, ...(stored.api || {}) },
    ui: {
      ...defaults.ui,
      ...(stored.ui || {}),
      selectedLoadNo: (stored.ui || {}).selectedLoadNo || "",
      chargeFilters: { shipmentNo: "", chargeType: "All", supplier: "All", status: "All", fromDate: "", toDate: "", ...((stored.ui || {}).chargeFilters || {}) },
      auditFilters: { query: "", fromDate: "", toDate: "", ...((stored.ui || {}).auditFilters || {}) }
    }
  };
  return normalized;
}

function normalizeUsers(users) {
  return (Array.isArray(users) ? users : []).map((record) => ({
    ...record,
    sectionAccess: normalizeSectionAccess(record.sectionAccess || "All")
  }));
}

function normalizeSectionAccess(value) {
  const text = String(value || "All").trim();
  if (!text || text.toLowerCase() === "all") return "All";
  const sections = text.split(",").map((item) => typeof normalizeModuleName === 'function' ? normalizeModuleName(item.trim()) : item.trim()).filter(Boolean);
  return [...new Set(sections)].join(", ") || "Dashboard";
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

  return resolvedFormat.replace(/#+/, String(max + 1).padStart(digits, "0"));
}

function nextShipmentNumber() { return configuredNumber(state.settings.shipmentNumberFormat, state.shipments, "jobNo", "AFS"); }
function nextInvoiceNumber() { return configuredNumber(state.settings.invoiceNumberFormat, state.invoices, "invoiceNo", "INV"); }
function nextConsolidationNumber() { return configuredNumber(state.settings.consolidationNumberFormat, state.loads, "loadNo", "CON"); }
function nextCustomerNumber() { return configuredNumber(state.settings.customerNumberFormat, state.customers, "code", "CUS"); }
function nextSupplierNumber() { return configuredNumber(state.settings.supplierNumberFormat, state.suppliers, "code", "TRN"); }
function nextAdditionalChargeNumber() { return configuredNumber(state.settings.additionalChargeNumberFormat, state.additionalCharges, "refNo", "CHG"); }
function branchOptions() {
  const branches = String(state.settings.branches || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return branches.length ? branches : ["Branch 1", "Branch 2"];
}

function defaultUserBranch() {
  const currentSess = sessionStorage.getItem(SESSION_KEY) ? JSON.parse(sessionStorage.getItem(SESSION_KEY)) : null;
  const access = String(currentSess?.branchAccess || "").trim();
  if (access && !["both", "all"].includes(access.toLowerCase())) {
    return access.split(",").map((item) => item.trim()).filter(Boolean)[0] || branchOptions()[0];
  }
  return branchOptions()[0];
}

function recordDate(record) {
  return record.bookingDate || record.tripDate || record.date || record.createdDate || record.effectiveFrom || record.dateTime?.slice(0, 10) || "";
}

function filteredRows(rows) {
  const query = globalSearch?.value ? globalSearch.value.trim().toLowerCase() : "";
  const from = fromDate?.value || "";
  const to = toDate?.value || "";
  return rows.filter((row) => {
    const date = recordDate(row);
    const textMatch = !query || Object.values(row).join(" ").toLowerCase().includes(query);
    const fromMatch = !from || !date || date >= from;
    const toMatch = !to || !date || date <= to;
    return textMatch && fromMatch && toMatch;
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
  return (state.adminRequests || []).filter((row) => row.status === "Pending").length + (state.unblockRequests || []).filter((row) => row.status === "Pending").length;
}

function maybePlayAdminNotification() {
  const currentSess = sessionStorage.getItem(SESSION_KEY) ? JSON.parse(sessionStorage.getItem(SESSION_KEY)) : null;
  const isAdmin = currentSess && String(currentSess.role).toLowerCase() === "admin";
  const pending = pendingRequestCount();
  if (isAdmin && lastPendingNotificationCount > 0 && pending > lastPendingNotificationCount) {
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

function badge(value) {
  const tone = value === "Approved" || value === "Paid" || value === "Uploaded" ? "ok" : value === "Pending" || value === "Pending Approval" || value === "In-Transit" ? "warn" : value === "Rejected" || value === "Declined" || value === "Blocked" || value === "Missing" ? "bad" : "neutral";
  return `<span class="status-badge ${tone}">${escapeHtml(value)}</span>`;
}
function shipmentColumns() { return [["jobNo", "Job Ref"], ["customer", "Consignee"], ["origin", "Origin"], ["destination", "Destination"], ["status", "Status"], ["pieces", "Pcs"], ["actualKg", "Weight"], ["chargeableKg", "Chg Wt"], ["podStatus", "POD Status"], ["invoiceStatus", "Invoice Status"]]; }
function loadColumns() { return [["loadNo", "Manifest"], ["tripDate", "Run Date"], ["route", "Sector"], ["transporter", "Transporter"], ["vehicleNo", "Truck Registration"], ["status", "Fleet Status"], ["jobNumbers", "Consolidated Shipments"]]; }
function customerColumns() { return [["code", "Code"], ["name", "Name"], ["locationOrLane", "Lane / Location"], ["fullAddress", "Full Address"], ["email", "Email"], ["terms", "Terms"], ["status", "Status"], ["branch", "Branch"]]; }
function tariffColumns() { return [["tariffNo", "Tariff"], ["customer", "Consignee"], ["origin", "Origin"], ["destination", "Destination"], ["mainSection", "Main Section"], ["weightSection", "Weight Section"], ["minUpTo", "Minimum Up To"], ["rate", "Rate"], ["minCharge", "Minimum Charge"], ["grandTotal", "Grand Total"]]; }
function documentColumns() { return [["documentNo", "Document"], ["linkedNo", "Linked No"], ["type", "Type"], ["status", "Status"], ["date", "Date"], ["owner", "Owner"]]; }
function invoiceColumns() { return [["invoiceNo", "Invoice"], ["customer", "Consignee"], ["shipmentNo", "Shipment"], ["revenue", "Revenue"], ["supplierCost", "Cost"], ["status", "Status"], ["date", "Date"]]; }
function additionalChargeColumns() { return [["refNo", "Ref No"], ["shipmentNo", "Shipment No"], ["chargeType", "Charge Type"], ["supplier", "Supplier"], ["amount", "Amount"], ["taxAmount", "Tax"], ["totalAmount", "Total"], ["status", "Status"]]; }
function userColumns() { return [["userName", "User"], ["email", "Email"], ["role", "Role"], ["accountStatus", "Status"], ["branchAccess", "Branch"]]; }

function table(type, rows, columns, showActions = true) {
  if (!rows || !rows.length) {
    return `<div class="report-preview-empty"><p class="empty-state">No matching records found in this operational segment.</p></div>`;
  }
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "responsive-table-holder";
  const tbl = document.createElement("table");
  tbl.className = "data-grid-table";
  const thead = document.createElement("thead");
  const headerTr = document.createElement("tr");
  columns.forEach(([ , label]) => {
    const th = document.createElement("th"); th.textContent = label; headerTr.appendChild(th);
  });
  if (showActions) { const actionTh = document.createElement("th"); actionTh.textContent = "Actions"; headerTr.appendChild(actionTh); }
  thead.appendChild(headerTr); tbl.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach(([key]) => {
      const td = document.createElement("td"); let val = row[key] ?? "";
      if (["actualKg", "chargeableKg", "sell", "buyCost", "revenue", "supplierCost", "amount", "taxAmount", "totalAmount", "rate", "minCharge", "grandTotal"].includes(key)) {
        val = money(val);
      }
      if (["status", "podStatus", "invoiceStatus", "accountStatus"].includes(key)) { td.innerHTML = badge(val); }
      else { td.textContent = String(val); }
      tr.appendChild(td);
    });
    if (showActions) {
      const actionsCell = document.createElement("td");
      if (type === "shipment" && activeModule === "Shipment / Airway") {
        const loadBtn = document.createElement("button"); loadBtn.textContent = "Load";
        loadBtn.onclick = () => { if (typeof openRecordWindow === "function") openRecordWindow("shipment", row.jobNo); };
        actionsCell.appendChild(loadBtn);
        const printTcnBtn = document.createElement("button"); printTcnBtn.className = "blue-button"; printTcnBtn.style.marginLeft = "4px"; printTcnBtn.textContent = "Print TCN";
        printTcnBtn.onclick = (e) => { e.stopPropagation(); openEnterprisePrintJob(renderAirwayBillTcnPrint(row)); };
        actionsCell.appendChild(printTcnBtn);
      } else if (type === "load") {
        const selectBtn = document.createElement("button"); selectBtn.textContent = "Select";
        selectBtn.onclick = (e) => { e.stopPropagation(); state.ui.selectedLoadNo = row.loadNo; saveState(); if (typeof render === "function") render(); };
        actionsCell.appendChild(selectBtn);
        const printManifestBtn = document.createElement("button"); printManifestBtn.className = "navy-button"; printManifestBtn.style.marginLeft = "4px"; printManifestBtn.textContent = "Print Manifest";
        printManifestBtn.onclick = (e) => { e.stopPropagation(); const linkedShipments = state.shipments.filter(s => String(row.jobNumbers || "").includes(s.jobNo)); openEnterprisePrintJob(renderManifestConsolidationPrint(row, linkedShipments)); };
        actionsCell.appendChild(printManifestBtn);
      } else if (type === "shipment" && activeModule === "POD / Delivery") {
        const loadPodBtn = document.createElement("button"); loadPodBtn.textContent = "Load POD";
        loadPodBtn.onclick = () => { if (typeof openRecordWindow === "function") openRecordWindow("shipment", row.jobNo); };
        actionsCell.appendChild(loadPodBtn);
        const printPodBtn = document.createElement("button"); printPodBtn.className = "secondary-button"; printPodBtn.style.marginLeft = "4px"; printPodBtn.textContent = "Print Receipt";
        printPodBtn.onclick = (e) => { e.stopPropagation(); openEnterprisePrintJob(renderPodPrint(row)); };
        actionsCell.appendChild(printPodBtn);
      } else {
        const genericBtn = document.createElement("button"); genericBtn.textContent = "Load";
        genericBtn.onclick = () => { if (typeof openRecordWindow === "function") openRecordWindow(type, row.jobNo || row.loadNo || row.code || row.invoiceNo || row.documentNo); };
        actionsCell.appendChild(genericBtn);
      }
      tr.appendChild(actionsCell);
    }
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); tableWrapper.appendChild(tbl); return tableWrapper.outerHTML;
}

// Fallback runtime elements initializer binder
if (typeof render === "function") { render(); }
