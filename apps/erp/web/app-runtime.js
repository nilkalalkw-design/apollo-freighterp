const API_URL = (window.APOLLO_API_URL || "https://apollo-freighterp-f9kt.onrender.com").replace(/\/$/, "");
const STORAGE_KEY = "apollofreighterp-web-state-v3";
const SESSION_KEY = "apollofreighterp-session";

const customerModules = [
  ["Customer Dashboard", "Shipment requests, tracking updates, and notifications"],
  ["Customer New Shipment", "Submit shipment requests for company approval"],
  ["Customer Shipments", "Shipment request history and company shipments"],
  ["Customer Tracking", "Track your shipment status"],
  ["Customer Profile", "Profile, status, and password"],
  ["Customer Notifications", "Portal messages and activity"]
];

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
let activeDropdownMenu = null;
let customerPortalData = null;

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
const branchFilterPanel = document.querySelector("#branchFilterPanel");
const newShipmentButton = document.querySelector("#newShipmentButton");
const changePasswordButton = document.querySelector("#changePasswordButton");
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
const dialogMinimize = document.querySelector("#recordDialogMinimize");
const dialogMaximize = document.querySelector("#recordDialogMaximize");
const dialogClose = document.querySelector("#recordDialogClose");
const toastStack = document.querySelector("#toastStack");
const CANONICAL_BRANCHES = ["Kuwait HO", "Dubai", "Both"];

function currentSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      parsed.branchViewScope = normalizeBranchViewScope(parsed.branchViewScope || parsed.branch_view_scope || parsed.viewScope || "Assigned Branch Only");
      return parsed;
    }
  } catch {}

  return {
      userName: raw,
      role: raw === "admin" ? "Admin" : "Operations",
      branchAccess: raw === "admin" ? "Both" : "Kuwait HO",
      branchViewScope: raw === "admin" ? "All Branches" : "Assigned Branch Only"
  };
}

function rememberSession(sessionOrUserName) {
  const session =
    typeof sessionOrUserName === "object" && sessionOrUserName
      ? sessionOrUserName
      : {
          userName: sessionOrUserName,
          role: sessionOrUserName === "admin" ? "Admin" : "Operations",
          branchAccess: sessionOrUserName === "admin" ? "Both" : "Kuwait HO"
        };

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userName: session.userName,
      customerUserId: session.customerUserId || "",
      customerCode: session.customerCode || "",
      customerName: session.customerName || "",
      email: session.email || "",
      token: session.token || "",
      portal: session.portal || "company",
      role: session.role || "Operations",
      branchAccess: session.branchAccess || "Kuwait HO",
      password: session.password || "",
      branchViewScope: normalizeBranchViewScope(
        session.branchViewScope ||
          session.branch_view_scope ||
          session.viewScope ||
          (String(session.role || "").toLowerCase() === "admin" ? "All Branches" : "Assigned Branch Only")
      ),
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
      shipment("AFS-2605001", "Kuwait HO", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Booked", 14, 820, 5.2, 1040, 485, 330, "Pending", "Unbilled", "2026-05-05", "AWB-2605001", "TAR-1001", 3, "Export", "AE", ""),
      shipment("AFS-2605002", "Dubai", "Desert Medical Supplies", "Shuwaikh", "Dammam", "In-Transit", 8, 410, 2.1, 420, 215, 150, "Pending", "Unbilled", "2026-05-05", "AWB-2605002", "TAR-1002", 2, "Import", "AI", ""),
      shipment("AFS-2605003", "Kuwait HO", "Al Noor Projects", "Ahmadi", "Doha", "Delivered", 22, 1250, 7.8, 1560, 780, 590, "Missing", "Unbilled", "2026-05-04", "AWB-2605003", "TAR-1001", 4, "Export", "LE", ""),
      shipment("AFS-2605004", "Kuwait HO", "Gulf Retail Trading", "Kuwait City", "Riyadh", "Invoiced", 4, 160, 0.9, 180, 95, 70, "Uploaded", "INV-260001", "2026-05-02", "AWB-2605004", "TAR-1001", 3, "WHC", "WHC Remark", "Warehouse handling and cross-docking")
    ],
    loads: [
      load("CON-260501", "2026-05-05", "Kuwait - Riyadh", "Al Dana Transport", "KWT-49217", "Dispatched", "AFS-2605001, AFS-2605004", "Not Generated", ""),
      load("CON-260502", "2026-05-06", "Kuwait - Dammam", "Falcon Line Haul", "KWT-77320", "Planned", "AFS-2605002", "Not Generated", "")
    ],
    customers: [
      party("CUS-001", "Gulf Retail Trading", "Kuwait City", "ops@gulf-retail.example", "30 days", "Active", false, "Kuwait HO"),
      party("CUS-002", "Desert Medical Supplies", "Shuwaikh", "logistics@desert-med.example", "15 days", "Active", true, "Dubai"),
      party("CUS-003", "Al Noor Projects", "Ahmadi", "cargo@alnoor.example", "45 days", "Active", false, "Kuwait HO")
    ],
    suppliers: [
      party("TRN-001", "Al Dana Transport", "Kuwait - Riyadh", "dispatch@aldana.example", "20 days", "Active", false, "Kuwait HO"),
      party("TRN-002", "Falcon Line Haul", "Kuwait - Dammam", "ops@falconline.example", "30 days", "Active", false, "Dubai")
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
      user("admin", "admin@apollofreightsolution.com", "Admin", "Active", "Both", "All Branches", "All", true, true, true, true, "admin123", "System temporary admin"),
      user("ops-kuwait", "operations.kuwait@apollofreightsolution.com", "Operations", "Active", "Kuwait HO", "Assigned Branch Only", "Dashboard, Shipment / Airway, Manifest, Customers, Suppliers / Transporters, Documents, Tariffs / Rate Master, Reports", true, false, false, false, "ops123", "Can create and track Kuwait HO shipments"),
      user("billing-dubai", "billing.dubai@apollofreightsolution.com", "Billing", "Active", "Dubai", "Assigned Branch Only", "Dashboard, Billing / Invoices, POD / Delivery, Shipment Status, Reports", true, false, true, true, "billing123", "Invoice and finance access for Dubai")
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
      tcnNumberFormat: "TCN-YY###",
      deliveryNoteNumberFormat: "POD-YY###",
      documentNumberFormat: "DOC-YY###",
      tariffNumberFormat: "TAR-###",
      customerNumberFormat: "CUS-###",
      additionalChargeNumberFormat: "CHG-YY###",
      supplierNumberFormat: "TRN-###",
      columnLayoutJson: "{}",
      defaultVolumetricDivisor: "5000",
      requirePodBeforeInvoice: "Yes",
      branches: "Kuwait HO, Dubai",
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
    shipmentDate: String(data.shipmentDate || "").trim(),
    transportMode: String(data.transportMode || "").trim(),
    customerCode: String(data.customerCode || "").trim(),
    customerContactPerson: String(data.customerContactPerson || "").trim(),
    customerMobile: String(data.customerMobile || "").trim(),
    customerEmail: String(data.customerEmail || "").trim(),
    customerAddress: String(data.customerAddress || "").trim(),
    internalReferenceNo: String(data.internalReferenceNo || "").trim(),
    salesPerson: String(data.salesPerson || "").trim(),
    shipperName: String(data.shipperName || "").trim(),
    shipperAddress: String(data.shipperAddress || "").trim(),
    shipperContactPerson: String(data.shipperContactPerson || "").trim(),
    shipperMobile: String(data.shipperMobile || "").trim(),
    shipperEmail: String(data.shipperEmail || "").trim(),
    shipperVatTrn: String(data.shipperVatTrn || "").trim(),
    shipperCountry: String(data.shipperCountry || "").trim(),
    consigneeName: String(data.consigneeName || data.customer || "").trim(),
    consigneeAddress: String(data.consigneeAddress || "").trim(),
    consigneeContactPerson: String(data.consigneeContactPerson || "").trim(),
    consigneeMobile: String(data.consigneeMobile || "").trim(),
    consigneeEmail: String(data.consigneeEmail || "").trim(),
    consigneeCountry: String(data.consigneeCountry || "").trim(),
    pickupLocation: String(data.pickupLocation || "").trim(),
    pickupAddress: String(data.pickupAddress || "").trim(),
    pickupContactPerson: String(data.pickupContactPerson || "").trim(),
    pickupMobile: String(data.pickupMobile || "").trim(),
    pickupDate: String(data.pickupDate || "").trim(),
    pickupTime: String(data.pickupTime || "").trim(),
    deliveryLocation: String(data.deliveryLocation || "").trim(),
    deliveryAddress: String(data.deliveryAddress || "").trim(),
    deliveryContactPerson: String(data.deliveryContactPerson || "").trim(),
    deliveryMobile: String(data.deliveryMobile || "").trim(),
    deliveryDate: String(data.deliveryDate || "").trim(),
    deliveryTime: String(data.deliveryTime || "").trim(),
    notifyPartyName: String(data.notifyPartyName || "").trim(),
    notifyPartyAddress: String(data.notifyPartyAddress || "").trim(),
    notifyContactPerson: String(data.notifyContactPerson || "").trim(),
    notifyMobile: String(data.notifyMobile || "").trim(),
    notifyEmail: String(data.notifyEmail || "").trim(),
    billTo1: String(data.billTo1 || "").trim(),
    billTo2: String(data.billTo2 || "").trim(),
    billingParty1Address: String(data.billingParty1Address || "").trim(),
    billingParty1ContactPerson: String(data.billingParty1ContactPerson || "").trim(),
    billingParty1Mobile: String(data.billingParty1Mobile || "").trim(),
    billingParty1Email: String(data.billingParty1Email || "").trim(),
    billingParty1CreditTerms: String(data.billingParty1CreditTerms || "").trim(),
    billingParty2Address: String(data.billingParty2Address || "").trim(),
    billingParty2ContactPerson: String(data.billingParty2ContactPerson || "").trim(),
    billingParty2Mobile: String(data.billingParty2Mobile || "").trim(),
    billingParty2Email: String(data.billingParty2Email || "").trim(),
    billingParty2Percentage: String(data.billingParty2Percentage || "").trim(),
    printOnlyCargoDetails: isChecked(data.printOnlyCargoDetails),
    manualChargeableKg: Number(data.manualChargeableKg || 0),
    natureOfGoods: String(data.natureOfGoods || "").trim(),
    cargoItemsJson: data.cargoItemsJson || data.palletDimensionsJson || "[]",
    transitPoint: String(data.transitPoint || "").trim(),
    route: String(data.route || "").trim(),
    transporter: String(data.transporter || "").trim(),
    vehicleNo: String(data.vehicleNo || "").trim(),
    driverName: String(data.driverName || "").trim(),
    driverMobile: String(data.driverMobile || "").trim(),
    tripNo: String(data.tripNo || "").trim(),
    manifestNo: String(data.manifestNo || "").trim(),
    currency: String(data.currency || "KWD").trim(),
    freightAmount: Number(data.freightAmount || 0),
    otherChargesAmount: Number(data.otherChargesAmount || 0),
    taxAmount: Number(data.taxAmount || 0),
    totalAmount: Number(data.totalAmount || 0),
    paymentMode: String(data.paymentMode || "").trim(),
    invoiceCopy: String(data.invoiceCopy || "").trim(),
    packingListCopy: String(data.packingListCopy || "").trim(),
    podCopy: String(data.podCopy || "").trim(),
    customsDocuments: String(data.customsDocuments || "").trim(),
    otherDocuments: String(data.otherDocuments || "").trim(),
    specialInstructions: String(data.specialInstructions || "").trim(),
    handlingInstructions: String(data.handlingInstructions || "").trim(),
    internalNotes: String(data.internalNotes || "").trim(),
    tcnNumber: String(data.tcnNumber || "").trim(),
    palletDimensionsJson: data.palletDimensionsJson || "[]",
    entryMode: data.entryMode || "shipment",
    deliveryNoteNo: String(data.deliveryNoteNo || "").trim(),
    ginNo: String(data.ginNo || "").trim(),
    customerReference: String(data.customerReference || "").trim(),
    vehicleType: String(data.vehicleType || "").trim(),
    deliveryRemarks: String(data.deliveryRemarks || "").trim(),
    pocName: String(data.pocName || "").trim(),
    pocMobile: String(data.pocMobile || "").trim(),
    additionalContact: String(data.additionalContact || "").trim(),
    preparedBy: String(data.preparedBy || "").trim(),
    deliveredBy: String(data.deliveredBy || "").trim(),
    receivedBy: String(data.receivedBy || data.receiver || "").trim(),
    receiverPhone: String(data.receiverPhone || "").trim(),
    deliveryDatetime: String(data.deliveryDatetime || "").trim(),
    receiverSignature: String(data.receiverSignature || "").trim()
  });
}

function loadMetaNotes(data) {
  return JSON.stringify({
    driverName: String(data.driverName || "").trim(),
    driverNumber: String(data.driverNumber || "").trim(),
    driverMobile: String(data.driverMobile || "").trim(),
    transporterCode: String(data.transporterCode || "").trim()
  });
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
  volumeCategory = "Land",
  chargeableDivisor = 250,
  createdBy = currentUserName(),
  notes = ""
) {
  const meta = parseJsonMeta(notes);
  return {
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
    airwayBillNo,
    tariffNo,
    transitDays,
    shipmentDirection,
    shipmentService,
    shipmentServiceOther,
    volumeCategory,
    chargeableDivisor,
    shipmentDate: meta.shipmentDate || "",
    transportMode: meta.transportMode || "",
    customerCode: meta.customerCode || "",
    customerContactPerson: meta.customerContactPerson || "",
    customerMobile: meta.customerMobile || "",
    customerEmail: meta.customerEmail || "",
    customerAddress: meta.customerAddress || "",
    internalReferenceNo: meta.internalReferenceNo || "",
    salesPerson: meta.salesPerson || "",
    shipperName: meta.shipperName || "",
    shipperAddress: meta.shipperAddress || "",
    shipperContactPerson: meta.shipperContactPerson || "",
    shipperMobile: meta.shipperMobile || "",
    shipperEmail: meta.shipperEmail || "",
    shipperVatTrn: meta.shipperVatTrn || "",
    shipperCountry: meta.shipperCountry || "",
    consigneeName: meta.consigneeName || customer,
    consigneeAddress: meta.consigneeAddress || "",
    consigneeContactPerson: meta.consigneeContactPerson || "",
    consigneeMobile: meta.consigneeMobile || "",
    consigneeEmail: meta.consigneeEmail || "",
    consigneeCountry: meta.consigneeCountry || "",
    pickupLocation: meta.pickupLocation || "",
    pickupAddress: meta.pickupAddress || "",
    pickupContactPerson: meta.pickupContactPerson || "",
    pickupMobile: meta.pickupMobile || "",
    pickupDate: meta.pickupDate || "",
    pickupTime: meta.pickupTime || "",
    deliveryLocation: meta.deliveryLocation || "",
    deliveryAddress: meta.deliveryAddress || "",
    deliveryContactPerson: meta.deliveryContactPerson || "",
    deliveryMobile: meta.deliveryMobile || "",
    deliveryDate: meta.deliveryDate || "",
    deliveryTime: meta.deliveryTime || "",
    notifyPartyName: meta.notifyPartyName || "",
    notifyPartyAddress: meta.notifyPartyAddress || "",
    notifyContactPerson: meta.notifyContactPerson || "",
    notifyMobile: meta.notifyMobile || "",
    notifyEmail: meta.notifyEmail || "",
    billTo1: meta.billTo1 || "",
    billTo2: meta.billTo2 || "",
    billingParty1Address: meta.billingParty1Address || "",
    billingParty1ContactPerson: meta.billingParty1ContactPerson || "",
    billingParty1Mobile: meta.billingParty1Mobile || "",
    billingParty1Email: meta.billingParty1Email || "",
    billingParty1CreditTerms: meta.billingParty1CreditTerms || "",
    billingParty2Address: meta.billingParty2Address || "",
    billingParty2ContactPerson: meta.billingParty2ContactPerson || "",
    billingParty2Mobile: meta.billingParty2Mobile || "",
    billingParty2Email: meta.billingParty2Email || "",
    billingParty2Percentage: meta.billingParty2Percentage || "",
    manualChargeableKg: Number(meta.manualChargeableKg || 0),
    natureOfGoods: meta.natureOfGoods || "",
    cargoItemsJson: meta.cargoItemsJson || meta.palletDimensionsJson || "[]",
    transitPoint: meta.transitPoint || "",
    route: meta.route || "",
    transporter: meta.transporter || "",
    vehicleNo: meta.vehicleNo || "",
    driverName: meta.driverName || "",
    driverMobile: meta.driverMobile || "",
    tripNo: meta.tripNo || "",
    manifestNo: meta.manifestNo || "",
    currency: meta.currency || "KWD",
    freightAmount: Number(meta.freightAmount || 0),
    otherChargesAmount: Number(meta.otherChargesAmount || 0),
    taxAmount: Number(meta.taxAmount || 0),
    totalAmount: Number(meta.totalAmount || 0),
    paymentMode: meta.paymentMode || "",
    invoiceCopy: meta.invoiceCopy || "",
    packingListCopy: meta.packingListCopy || "",
    podCopy: meta.podCopy || "",
    customsDocuments: meta.customsDocuments || "",
    otherDocuments: meta.otherDocuments || "",
    specialInstructions: meta.specialInstructions || "",
    handlingInstructions: meta.handlingInstructions || "",
    internalNotes: meta.internalNotes || "",
    tcnNumber: meta.tcnNumber || "",
    palletDimensionsJson: meta.palletDimensionsJson || "[]",
    entryMode: meta.entryMode || (String(jobNo || "").startsWith("AWB") ? "airway" : "shipment"),
    deliveryNoteNo: meta.deliveryNoteNo || "",
    ginNo: meta.ginNo || "",
    customerReference: meta.customerReference || "",
    vehicleType: meta.vehicleType || "",
    deliveryRemarks: meta.deliveryRemarks || "",
    printOnlyCargoDetails: isChecked(meta.printOnlyCargoDetails),
    pocName: meta.pocName || "",
    pocMobile: meta.pocMobile || "",
    additionalContact: meta.additionalContact || "",
    preparedBy: meta.preparedBy || "",
    deliveredBy: meta.deliveredBy || "",
    receivedBy: meta.receivedBy || "",
    receiverPhone: meta.receiverPhone || "",
    deliveryDatetime: meta.deliveryDatetime || "",
    receiverSignature: meta.receiverSignature || "",
    notes,
    createdBy
  };
}

function load(loadNo, tripDate, route, transporter, vehicleNo, status, jobNumbers, manifestStatus = "Not Generated", lastManifestRequestNo = "", createdBy = currentUserName(), notes = "") {
  const meta = parseJsonMeta(notes);
  return { loadNo, tripDate, route, transporter, transporterCode: meta.transporterCode || "", vehicleNo, driverName: meta.driverName || "", driverNumber: meta.driverNumber || "", driverMobile: meta.driverMobile || "", status, jobNumbers, pieces: 0, actualKg: 0, cbm: 0, chargeableKg: 0, manifestStatus, lastManifestRequestNo, notes, createdBy };
}

function party(code, name, locationOrLane, email, terms, status, isAccountOverdue, branch, createdBy = currentUserName(), fullAddress = "", mobile = "") {
  return { code, name, locationOrLane, email, mobile, terms, status, isAccountOverdue, branch, fullAddress, createdBy, createdDate: new Date().toISOString().slice(0, 10) };
}

function tariff(tariffNo, customer, origin, destination, mainSection, weightSection, minUpTo, rate, minCharge, additionalChargesJson = "[]", additionalChargesTotal = 0, grandTotal = 0, createdBy = currentUserName()) {
  const weightRates = normalizeTariffWeightRates({ minimum: rate, upTo100: rate, upTo300: rate, upTo500: rate, upTo1000: rate, more: rate }, Number(rate || 0));
  return {
    tariffNo,
    customer,
    origin,
    destination,
    mainSection,
    weightSection: weightSection || "Table",
    minUpTo: minUpTo || "",
    rate: tariffPrimaryRate(weightRates),
    minCharge: Number(minCharge || 0),
    additionalChargesJson,
    additionalChargesTotal: Number(additionalChargesTotal || 0),
    grandTotal: Number(grandTotal || Number(minCharge || 0) + Number(additionalChargesTotal || 0)),
    weightRatesJson: JSON.stringify(weightRates),
    currency: "KD",
    rateType: "Per KG",
    volumetricDivisor: 5000,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    status: "Active",
    createdBy
  };
}

function tariffWeightBandDefinitions() {
  return [
    { key: "minimum", label: "Minimum", max: 0 },
    { key: "upTo100", label: "Up to 100", max: 100 },
    { key: "upTo300", label: "300", max: 300 },
    { key: "upTo500", label: "500", max: 500 },
    { key: "upTo1000", label: "1000", max: 1000 },
    { key: "more", label: "More", max: Infinity }
  ];
}

function tariffWeightBandKeys() {
  return tariffWeightBandDefinitions().map((band) => band.key);
}

function normalizeTariffWeightRates(value, fallbackRate = 0) {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed || "{}"); } catch { parsed = {}; }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = {};
  const fallback = Number(fallbackRate || parsed.rate || 0);
  const rates = {};
  tariffWeightBandKeys().forEach((key) => {
    const raw = parsed[key];
    rates[key] = raw === undefined || raw === null || raw === "" ? fallback : Number(raw || 0);
  });
  if (tariffWeightBandKeys().every((key) => Number(rates[key] || 0) === 0) && fallback > 0) {
    tariffWeightBandKeys().forEach((key) => { rates[key] = fallback; });
  }
  return rates;
}

function tariffWeightBandForWeight(weight) {
  const numeric = Number(weight || 0);
  if (numeric <= 0) return tariffWeightBandDefinitions()[0];
  if (numeric <= 100) return tariffWeightBandDefinitions()[1];
  if (numeric <= 300) return tariffWeightBandDefinitions()[2];
  if (numeric <= 500) return tariffWeightBandDefinitions()[3];
  if (numeric <= 1000) return tariffWeightBandDefinitions()[4];
  return tariffWeightBandDefinitions()[5];
}

function tariffWeightRateLookup(tariffItem, chargeableWeight) {
  const rates = normalizeTariffWeightRates(tariffItem?.weightRatesJson || tariffItem?.weight_rates_json || {}, Number(tariffItem?.rate || 0));
  const band = tariffWeightBandForWeight(chargeableWeight);
  return { rates, band, rate: Number(rates[band.key] || 0) };
}

function tariffPrimaryRate(rates) {
  const normalized = normalizeTariffWeightRates(rates || {}, 0);
  for (const band of tariffWeightBandDefinitions()) {
    const value = Number(normalized[band.key] || 0);
    if (Number.isFinite(value) && value > 0) return Number(value.toFixed(3));
  }
  return 0;
}

function tariffPricingForWeight(tariffItem, chargeableWeight) {
  if (!tariffItem) return { rates: normalizeTariffWeightRates({}, 0), band: tariffWeightBandForWeight(chargeableWeight), rate: 0, freight: 0, additional: 0, revenue: 0 };
  const lookup = tariffWeightRateLookup(tariffItem, chargeableWeight);
  const freight = Math.max(Number(tariffItem.minCharge || 0), Number(chargeableWeight || 0) * lookup.rate);
  const additional = Number(tariffItem.additionalChargesTotal || 0);
  return { ...lookup, freight: Number(freight.toFixed(3)), additional: Number(additional.toFixed(3)), revenue: Number((freight + additional).toFixed(3)) };
}

function buildTariffRecord(data = {}, existing = {}) {
  const source = { ...existing, ...data };
  const weightRates = normalizeTariffWeightRates(source.weightRatesJson || source.weight_rates_json || {}, Number(source.rate || 0));
  const weightRatesJson = JSON.stringify(weightRates);
  const minCharge = Number(source.minCharge ?? source.min_charge ?? 0);
  const additionalChargesTotal = Number(source.additionalChargesTotal ?? source.additional_charges_total ?? 0);
  const grandTotal = Number(source.grandTotal ?? source.grand_total ?? (minCharge + additionalChargesTotal));
  return {
    tariffNo: String(source.tariffNo || source.tariff_no || ""),
    customer: String(source.customer || ""),
    origin: String(source.origin || ""),
    destination: String(source.destination || ""),
    mainSection: String(source.mainSection || source.main_section || "FTL"),
    weightSection: String(source.weightSection || source.weight_section || "Table"),
    minUpTo: "",
    rate: tariffPrimaryRate(weightRates),
    minCharge,
    additionalChargesJson: source.additionalChargesJson || source.additional_charges_json || "[]",
    additionalChargesTotal,
    grandTotal,
    weightRatesJson,
    currency: String(source.currency || "KD"),
    rateType: String(source.rateType || source.rate_type || "Per KG"),
    volumetricDivisor: Number(source.volumetricDivisor || source.volumetric_divisor || 5000),
    effectiveFrom: String(source.effectiveFrom || source.effective_from || today()).slice(0, 10),
    effectiveTo: String(source.effectiveTo || source.effective_to || today()).slice(0, 10),
    status: String(source.status || "Active"),
    createdBy: String(source.createdBy || source.created_by || currentUserName())
  };
}

function tariffWeightRateTableHtml(tariffItem = {}, options = {}) {
  const editable = Boolean(options.editable);
  const selectedBand = options.selectedWeight === undefined || options.selectedWeight === null || options.selectedWeight === "" ? null : tariffWeightBandForWeight(options.selectedWeight);
  const rates = normalizeTariffWeightRates(tariffItem.weightRatesJson || tariffItem.weight_rates_json || {}, Number(tariffItem.rate || 0));
  const bands = tariffWeightBandDefinitions();
  const header = bands.map((band) => "<th>" + escapeHtml(band.label) + "</th>").join("");
  const cells = bands.map((band) => {
    const selected = selectedBand && selectedBand.key === band.key ? " is-selected" : "";
    const value = Number(rates[band.key] || 0);
    if (editable) return "<td class=\"tariff-weight-cell" + selected + "\"><input type=\"number\" step=\"0.001\" min=\"0\" data-tariff-weight-rate=\"" + escapeHtml(band.key) + "\" value=\"" + escapeHtml(numericInputValue(value)) + "\" /></td>";
    return "<td class=\"tariff-weight-cell" + selected + "\"><strong>" + money(value) + "</strong></td>";
  }).join("");
  return "<div class=\"table-wrap tariff-weight-wrap\"><table class=\"tariff-weight-table" + (editable ? " is-editable" : "") + "\"><thead><tr><th></th>" + header + "</tr></thead><tbody><tr><th>Rate</th>" + cells + "</tr></tbody></table></div>";
}

function tariffWeightRatesBuilder(record = {}) {
  const weightRatesJson = record.weightRatesJson || record.weight_rates_json || JSON.stringify(normalizeTariffWeightRates({}, Number(record.rate || 0)));
  const primaryRate = tariffPrimaryRate(weightRatesJson);
  return "<div class=\"tariff-weight-builder\" data-tariff-weight-builder>" +
    "<input type=\"hidden\" name=\"weightRatesJson\" value=\"" + escapeHtml(weightRatesJson) + "\" />" +
    "<input type=\"hidden\" name=\"weightSection\" value=\"Table\" />" +
    "<input type=\"hidden\" name=\"minUpTo\" value=\"\" />" +
    "<input type=\"hidden\" name=\"rate\" value=\"" + escapeHtml(String(primaryRate)) + "\" />" +
    tariffWeightRateTableHtml({ ...record, weightRatesJson }, { editable: true }) +
  "</div>";
}

function bindTariffWeightRates() {
  const builder = dialogBody.querySelector("[data-tariff-weight-builder]");
  if (!builder) return;
  const hidden = builder.querySelector("input[name='weightRatesJson']");
  const rateField = builder.querySelector("input[name='rate']");
  const inputs = [...builder.querySelectorAll("[data-tariff-weight-rate]")];
  const sync = () => {
    const rates = {};
    inputs.forEach((input) => { rates[input.dataset.tariffWeightRate] = Number(input.value || 0); });
    if (hidden) hidden.value = JSON.stringify(rates);
    if (rateField) rateField.value = String(tariffPrimaryRate(rates));
  };
  inputs.forEach((input) => { input.addEventListener("input", sync); input.addEventListener("change", sync); });
  sync();
}

function tariffDialogBody(record = {}) {
  const tariffItem = buildTariffRecord(record, record);
  const tariffNo = tariffItem.tariffNo || nextNumber("TAR", state.tariffs, "tariffNo");
  return "" +
    input("tariffNo", "Tariff Number", tariffNo, Boolean(record.tariffNo)) +
    selectFrom("customer", "Consignee", state.customers.map((row) => row.name), tariffItem.customer) +
    input("origin", "Origin", tariffItem.origin || "Kuwait City") +
    input("destination", "Destination", tariffItem.destination || "Riyadh") +
    selectEditable("mainSection", "Main Section", "mainSection", ["FTL", "LTL"], tariffItem.mainSection || "FTL") +
    formSection("Weight Section", tariffWeightRatesBuilder(tariffItem), true, true) +
    selectEditable("currency", "Currency", "currency", currencyOptions(), tariffItem.currency || "KD") +
    input("minCharge", "Minimum Charge", numericInputValue(tariffItem.minCharge || 0), false, "number") +
    tariffAdditionalChargesBuilder(tariffItem.additionalChargesJson || "[]");
}

function tariffPreviewRateSummary(tariffItem, selectedWeight) {
  const pricing = tariffPricingForWeight(tariffItem, selectedWeight || 0);
  return [
    summaryPair("Selected Band", pricing.band.label),
    summaryPair("Selected Rate", money(pricing.rate)),
    summaryPair("Minimum Charge", money(tariffItem.minCharge || 0)),
    summaryPair("Additional Charges", money(tariffItem.additionalChargesTotal || 0))
  ].join("");
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

function invoiceDialogBody(record = {}) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === record.shipmentNo) || null;
  const tariffItem = assignedTariffForShipment(shipmentItem) || state.tariffs.find((row) => row.tariffNo === record.tariffNo) || null;
  const customerName = record.customer || shipmentItem?.customer || record.customerName || shipmentItem?.customerName || '';
  let snapshot = {};
  try { snapshot = JSON.parse(record.invoiceSnapshotJson || '{}'); } catch {}
  const taxPercent = Number(record.taxPercent ?? snapshot.taxPercent ?? 0);
  const chargeableWeight = Number(record.chargeableWeight ?? snapshot.chargeableWeight ?? effectiveChargeableWeightForShipment(shipmentItem));
  const grossWeight = Number(record.grossWeight ?? snapshot.grossWeight ?? shipmentItem?.actualKg ?? 0);
  const volumeWeight = Number(record.volumeWeight ?? snapshot.volumeWeight ?? shipmentItem?.cbm ?? 0);
  const lines = parseInvoiceLineItems(record.invoiceLinesJson || JSON.stringify(invoiceLinesFromTariff(shipmentItem, tariffItem, chargeableWeight)));
  const tariffName = record.tariffName || snapshot.tariffName || tariffItem?.customer || '';
  const totals = invoiceTotals(lines, taxPercent);
  const revenue = Number(record.revenue ?? snapshot.revenue ?? totals.revenue);
  const supplierCost = Number(record.supplierCost ?? record.totalCost ?? snapshot.cost ?? totals.cost);
  return (
    input('invoiceNo', 'Invoice No', record.invoiceNo || nextInvoiceNumber(), Boolean(record.invoiceNo)) +
    selectFrom('customer', 'Customer', invoiceCustomerOptions(), customerName) +
    selectFrom('shipmentNo', 'Shipment No', invoiceShipmentOptionsForCustomer(customerName), record.shipmentNo || shipmentItem?.jobNo || '') +
    selectFrom('tariffNo', 'Tariff No', invoiceTariffOptionsForCustomer(customerName), record.tariffNo || tariffItem?.tariffNo || '') +
    tariffPreviewShell('invoice') +
    input('tariffName', 'Tariff Name', tariffName, true) +
    input('chargeableWeight', 'Chargeable Weight', chargeableWeight, true, 'number') +
    input('grossWeight', 'Gross Weight', grossWeight, true, 'number') +
    input('volumeWeight', 'Volume Weight', volumeWeight, true, 'number') +
    selectEditable('currency', 'Currency', 'currency', currencyOptions(), record.currency || shipmentItem?.currency || 'KD') +
    input('taxPercent', 'Tax %', taxPercent, false, 'number') +
    input('revenue', 'Revenue', revenue, true, 'number') +
    input('supplierCost', 'Cost', supplierCost, false, 'number') +
    input('totalCost', 'Total Cost', supplierCost, true, 'number') +
    input('taxAmount', 'Tax Amount', totals.taxAmount, true, 'number') +
    input('grossProfit', 'Gross Profit', totals.grossProfit, true, 'number') +
    input('profitPercent', 'Profit %', totals.profitPercent, true, 'number') +
    input('grandTotal', 'Grand Total', totals.grandTotal, true, 'number') +
    select('status', 'Status', ['Draft', 'Approved', 'Sent', 'Paid', 'Overdue'], record.status || 'Draft') +
    input('date', 'Date', record.date || today(), false, 'date') +
    '<input type="hidden" name="invoiceLinesJson" value="' + escapeHtml(record.invoiceLinesJson || JSON.stringify(lines)) + '" />' +
    '<input type="hidden" name="tariffSnapshotJson" value="' + escapeHtml(record.tariffSnapshotJson || JSON.stringify(tariffItem || {})) + '" />' +
    '<input type="hidden" name="invoiceSnapshotJson" value="' + escapeHtml(record.invoiceSnapshotJson || JSON.stringify(snapshot || invoiceSnapshotFromSelection(shipmentItem, tariffItem, lines, taxPercent))) + '" />'
  );
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
  branchViewScope,
  sectionAccess,
  canViewAllEntry,
  canViewOnlySelfEntry,
  canEditAllEntry,
  canViewUpdatedHistory,
  password = "",
  notes = "Web demo user",
  createdDate = today()
) {
  return {
    userName,
    email,
    role,
    accountStatus,
    branchAccess,
    branchViewScope: normalizeBranchViewScope(branchViewScope),
    sectionAccess,
    canViewAllEntry: isChecked(canViewAllEntry),
    canViewOnlySelfEntry: isChecked(canViewOnlySelfEntry),
    canEditAllEntry: isChecked(canEditAllEntry),
    canViewUpdatedHistory: isChecked(canViewUpdatedHistory),
    password,
    notes,
    createdDate
  };
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
    settings: {
      ...defaults.settings,
      ...(stored.settings || {})
    },
    dropdownOptions: {
      ...defaults.dropdownOptions,
      ...parseDropdownOptions((stored.settings || {}).dropdownOptionsJson),
      ...(stored.dropdownOptions || {})
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
      },
      adminBranchFilter: Object.prototype.hasOwnProperty.call(stored.ui || {}, "adminBranchFilter") && Array.isArray((stored.ui || {}).adminBranchFilter)
        ? (stored.ui || {}).adminBranchFilter
        : null
    }
  };
  return normalized;
}

function normalizeUsers(users) {
  return (Array.isArray(users) ? users : []).map((record) => ({
    ...record,
    sectionAccess: normalizeSectionAccess(record.sectionAccess || "All"),
    branchViewScope: normalizeBranchViewScope(record.branchViewScope || record.branch_view_scope || record.viewScope || "Assigned Branch Only"),
    canViewAllEntry: isChecked(record.canViewAllEntry),
    canViewOnlySelfEntry: isChecked(record.canViewOnlySelfEntry),
    canEditAllEntry: isChecked(record.canEditAllEntry),
    canViewUpdatedHistory: isChecked(record.canViewUpdatedHistory)
  }));
}

function normalizeBranchViewScope(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["all branches", "all branch", "all", "both"].includes(text)) return "All Branches";
  return "Assigned Branch Only";
}

function normalizeSectionAccess(value) {
  const text = String(value || "All").trim();
  if (!text || text.toLowerCase() === "all") return "All";
  const sections = text
    .split(",")
    .map((item) => normalizeModuleName(item.trim()))
    .filter(Boolean);
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

function nextTcnNumber() {
  return configuredNumber(state.settings.tcnNumberFormat, state.shipments, "tcnNumber", "TCN");
}

function nextDeliveryNoteNumber() {
  return configuredNumber(state.settings.deliveryNoteNumberFormat, state.shipments, "deliveryNoteNo", "POD");
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
  return CANONICAL_BRANCHES.slice();
}

function defaultUserBranch() {
  const access = String(currentSession()?.branchAccess || "").trim();
  if (access && !["both", "all"].includes(access.toLowerCase())) {
    const normalized = normalizeBranchName(access);
    if (CANONICAL_BRANCHES.includes(normalized)) return normalized;
  }
  return branchOptions()[0];
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
    return textMatch && fromMatch && toMatch && adminBranchFilterMatch(row);
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
  changePasswordButton?.addEventListener("click", openChangePasswordDialog);
  globalSearch.addEventListener("input", render);
  applyFilters.addEventListener("click", render);
  branchFilterPanel?.addEventListener("change", handleAdminBranchFilterChange);
  resetFilters.addEventListener("click", () => {
    globalSearch.value = "";
    fromDate.value = "";
    toDate.value = "";
    state.ui.adminBranchFilter = ["Both"];
    saveState();
    render();
  });
  newShipmentButton?.addEventListener("click", openShipmentWorkspace);
  resetPasswordButton.addEventListener("click", handlePasswordReset);
  loginForm.querySelector("[data-toggle-password]")?.addEventListener("click", toggleLoginPassword);
  moduleContent.addEventListener("click", handleModuleClick);
  moduleContent.addEventListener("dblclick", handleModuleDoubleClick);
  moduleContent.addEventListener("keydown", handleModuleKeydown);
  moduleContent.addEventListener("submit", handleModuleSubmit);
  dialogSecondary.addEventListener("click", () => dialogState?.onSecondary?.());
  dialogMinimize?.addEventListener("click", toggleDialogMinimized);
  dialogMaximize?.addEventListener("click", toggleDialogMaximized);
  dialogClose?.addEventListener("click", () => recordDialog.close());
  dialogSave.addEventListener("click", saveDialogRecord);
  recordDialog.addEventListener("close", resetDialogShell);
  document.addEventListener("focus", handleDropdownFocus, true);
  document.addEventListener("pointerdown", handleDropdownPointerDown, true);
  document.addEventListener("input", handleDropdownInput, true);
  document.addEventListener("keydown", handleDropdownKeydown, true);
  document.addEventListener("blur", handleDropdownBlur, true);
  document.addEventListener("pointerdown", handleDocumentPointerDown, false);

  if (currentSession()) {
    showApp();
  } else {
    showLogin();
  }
}

function handleDropdownFocus(event) {
  const field = event.target.closest?.("[data-dropdown-input]");
  if (!field || field.readOnly) return;
  selectDropdownText(field);
  window.setTimeout(() => openDropdownMenu(field), 0);
}

function handleDropdownPointerDown(event) {
  const field = event.target.closest?.("[data-dropdown-input]");
  if (!field || field.readOnly) return;
  window.setTimeout(() => {
    selectDropdownText(field);
    openDropdownMenu(field);
  }, 0);
}

function handleDropdownInput(event) {
  const field = event.target.closest?.("[data-dropdown-input]");
  if (!field || field.readOnly) return;
  field.dataset.dropdownSelected = "0";
  openDropdownMenu(field);
}

function handleDropdownKeydown(event) {
  const field = event.target.closest?.("[data-dropdown-input]");
  if (!field || field.readOnly || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Escape") {
    closeDropdownMenu();
    return;
  }
  if (event.key.length !== 1) return;
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? 0;
  if (start === 0 && end === field.value.length) {
    field.dataset.dropdownSelected = "0";
    return;
  }
  if (field.dataset.dropdownSelected !== "1") return;
  field.dataset.dropdownSelected = "0";
  field.value = "";
}

function selectDropdownText(field) {
  field.dataset.dropdownSelected = "1";
  field.select?.();
}

function dropdownOptionsForField(field) {
  const listId = field.getAttribute("list");
  const datalist = listId ? document.getElementById(listId) : null;
  return Array.from(datalist?.options || [])
    .map((option) => ({
      value: option.value || "",
      label: option.label || option.value || ""
    }))
    .filter((option) => option.value);
}

function openDropdownMenu(field) {
  const options = dropdownOptionsForField(field);
  closeDropdownMenu();
  if (!options.length) return;

  const query = String(field.value || "").trim().toLowerCase();
  const visibleOptions = options
    .filter((option) => !query || `${option.value} ${option.label}`.toLowerCase().includes(query))
    .slice(0, 80);

  if (!visibleOptions.length) return;

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.dataset.dropdownMenu = "1";
  menu.innerHTML = visibleOptions.map((option) => `
    <button type="button" data-dropdown-value="${escapeHtml(option.value)}">
      <strong>${escapeHtml(option.value)}</strong>
      ${option.label && option.label !== option.value ? `<span>${escapeHtml(option.label)}</span>` : ""}
    </button>
  `).join("");

  menu.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const button = event.target.closest("[data-dropdown-value]");
    if (!button) return;
    field.value = button.dataset.dropdownValue || "";
    field.dataset.dropdownSelected = "0";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    closeDropdownMenu();
    field.focus();
  });

  document.body.appendChild(menu);
  activeDropdownMenu = menu;
  positionDropdownMenu(field, menu);
}

function positionDropdownMenu(field, menu) {
  const rect = field.getBoundingClientRect();
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.width = `${rect.width}px`;
}

function closeDropdownMenu() {
  activeDropdownMenu?.remove();
  activeDropdownMenu = null;
}

function handleDocumentPointerDown(event) {
  if (!activeDropdownMenu) return;
  if (event.target.closest?.("[data-dropdown-menu]") || event.target.closest?.("[data-dropdown-input]")) return;
  closeDropdownMenu();
}

function handleDropdownBlur(event) {
  const field = event.target.closest?.("[data-dropdown-input]");
  if (!field) return;
  rememberDropdownOptions({ [field.dataset.dropdownKey || field.name]: field.value });
  window.setTimeout(() => {
    if (document.activeElement !== field) closeDropdownMenu();
  }, 120);
}

function isCustomerSession() {
  return String(currentSession()?.portal || "").toLowerCase() === "customer";
}

function isAdminSession() {
  return !isCustomerSession() && (currentSession()?.role || "").toLowerCase() === "admin";
}

function visibleModules() {
  if (isCustomerSession()) return customerModules;
  if (isAdminSession()) return modules;
  const session = currentSession();
  const configured = String(session?.sectionAccess || "").trim();
  if (configured && configured.toLowerCase() !== "all") {
    const allowedSections = new Set(
      configured
        .split(",")
        .map((item) => normalizeModuleName(item.trim()))
        .filter(Boolean)
    );
    return modules.filter(([name]) => allowedSections.has(name));
  }
  const allowed = new Set([
    "Dashboard",
    "Shipment / Airway",
    "Manifest",
    "Customers",
    "Suppliers / Transporters",
    "Documents",
    "Tariffs / Rate Master",
    "Reports"
  ]);
  return modules.filter(([name]) => allowed.has(name));
}

function normalizeModuleName(name) {
  if (name === "Shipments / Jobs") return "Shipment / Airway";
  if (name === "Consolidation") return "Manifest";
  return name;
}

function renderModuleNav() {
  moduleNav.innerHTML = visibleModules()
    .map(([name]) => `<button type="button" data-module="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
}

function currentUserName() {
  return currentSession()?.userName || "operations";
}

function canViewAllBranches() {
  const session = currentSession() || {};
  return isAdminSession() || (Boolean(session?.canViewAllEntry) && normalizeBranchViewScope(session?.branchViewScope || session?.viewScope) === "All Branches");
}

function ownedByCurrentUser(row) {
  if (!branchAllowed(row)) return false;
  if (canViewAllBranches()) return true;
  if (Boolean(currentSession()?.canViewAllEntry)) return true;
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

function branchAllowed(row) {
  const branch = normalizeBranchName(row.branch);
  if (!branch) return true;
  if (canViewAllBranches()) return true;
  const access = String(currentSession()?.branchAccess || "Kuwait HO").trim();
  if (!access || ["both", "all"].includes(access.toLowerCase())) return true;
  const allowed = access
    .split(",")
    .map((item) => normalizeBranchName(item).toLowerCase())
    .filter(Boolean);
  return allowed.includes(branch.toLowerCase());
}

function normalizeBranchName(value) {
  const text = String(value || "").trim();
  const normalized = text.toLowerCase();
  if (["branch 1", "kuwait 1", "kuwait ho"].includes(normalized)) return "Kuwait HO";
  if (["branch 2", "dubai 2", "dubai"].includes(normalized)) return "Dubai";
  return text;
}

function allBranchFilterOptions() {
  return CANONICAL_BRANCHES.slice();
}

function selectedAdminBranches() {
  const options = allBranchFilterOptions();
  const selected = Array.isArray(state.ui.adminBranchFilter)
    ? state.ui.adminBranchFilter
    : ["Both"];
  const valid = new Set(options.map((branch) => branch.toLowerCase()));
  return selected.filter((branch) => valid.has(String(branch || "").toLowerCase()));
}

function renderAdminBranchFilter() {
  if (!branchFilterPanel) return;
  if (!isAdminSession()) {
    branchFilterPanel.innerHTML = "";
    branchFilterPanel.classList.add("is-hidden");
    return;
  }

  const options = allBranchFilterOptions();
  const selected = new Set(selectedAdminBranches().map((branch) => branch.toLowerCase()));
  branchFilterPanel.classList.remove("is-hidden");
  branchFilterPanel.innerHTML = `
    <span class="filter-label">Branch</span>
    ${options.map((branch) => checkbox("adminBranchFilter", branch, selected.has(branch.toLowerCase()), branch)).join("")}
  `;
}

function handleAdminBranchFilterChange(event) {
  if (!event.target.matches("input[name='adminBranchFilter']")) return;
  const changedValue = String(event.target.value || "").toLowerCase();
  if (changedValue === "both" && event.target.checked) {
    branchFilterPanel.querySelectorAll("input[name='adminBranchFilter']").forEach((input) => {
      input.checked = String(input.value || "").toLowerCase() === "both";
    });
  } else if (event.target.checked) {
    const bothField = Array.from(branchFilterPanel.querySelectorAll("input[name='adminBranchFilter']")).find((input) => String(input.value || "").toLowerCase() === "both");
    if (bothField) bothField.checked = false;
  }
  state.ui.adminBranchFilter = Array.from(branchFilterPanel.querySelectorAll("input[name='adminBranchFilter']:checked")).map((input) => input.value);
  saveState();
  render();
}

function adminBranchFilterSummary() {
  if (!isAdminSession()) return "";
  const selected = selectedAdminBranches();
  if (!selected.length || selected.map((branch) => branch.toLowerCase()).includes("both")) return "";
  return ` | Branch: ${selected.join(", ")}`;
}

function adminBranchFilterMatch(row) {
  if (!isAdminSession()) return true;
  const selected = selectedAdminBranches().map((branch) => branch.toLowerCase());
  if (!selected.length) return false;
  if (selected.includes("both")) return true;
  const rowBranches = branchValuesForRecord(row).map((branch) => branch.toLowerCase());
  return rowBranches.some((branch) => selected.includes(branch));
}

function branchValuesForRecord(row) {
  const branches = new Set();
  const add = (value) => {
    String(value || "")
      .split(",")
      .map(normalizeBranchName)
      .filter(Boolean)
      .forEach((item) => {
        if (!["both", "all"].includes(item.toLowerCase())) branches.add(item);
      });
  };

  add(row?.branch);
  add(row?.branchAccess);

  const shipmentKeys = [row?.shipmentNo, row?.jobNo, row?.linkedNo, row?.referenceNo]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  shipmentKeys.forEach((jobNo) => add(state.shipments.find((shipmentItem) => shipmentItem.jobNo === jobNo)?.branch));

  String(row?.jobNumbers || "")
    .split(",")
    .map((jobNo) => jobNo.trim())
    .filter(Boolean)
    .forEach((jobNo) => add(state.shipments.find((shipmentItem) => shipmentItem.jobNo === jobNo)?.branch));

  const customerName = row?.customer || row?.customerName || row?.customer_name;
  if (customerName) add(state.customers.find((customer) => customer.name === customerName || customer.code === customerName)?.branch);

  return [...branches];
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
  activeModule = "Shipment / Airway";
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

function openChangePasswordDialog() {
  openDialog({
    title: "Change Password",
    typeLabel: "Security",
    body: changePasswordDialogBody(),
    saveLabel: "Update Password",
    singleColumn: true,
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      const saved = await changeCurrentPassword(data);
      if (!saved) return;
      recordDialog.close();
      render();
    }
  });
}

function toggleLoginPassword(event) {
  const button = event.currentTarget;
  const field = loginForm.querySelector("input[name='password']");
  if (!field) return;
  const shouldShow = field.type === "password";
  field.type = shouldShow ? "text" : "password";
  button.textContent = shouldShow ? "Hide" : "View";
  button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  button.title = shouldShow ? "Hide password" : "Show password";
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(loginForm);
  const userName = String(form.get("userName") || "").trim();
  const password = String(form.get("password") || "");
  const customerMode = Boolean(form.get("customerLoginMode"));

  try {
    const loginResult = customerMode ? await attemptCustomerLogin(userName, password) : { session: await attemptApiLogin(userName, password), data: null };
    customerPortalData = loginResult.data || null;
    const session = loginResult.session;
    rememberSession({ ...session, password });
    loginMessage.textContent = "";
    resetMessage.textContent = "";
    showApp();
    return;
  } catch (error) {
    loginMessage.textContent = error.message || "Invalid login. Check user name and password.";
  }
}

async function attemptCustomerLogin(userName, password) {
  if (!userName || !password) {
    throw new Error("Customer user name and password are required.");
  }

  const result = await fetchJson("/api/customer-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password })
  });
  return { session: result.session, data: result.data };
}

async function attemptApiLogin(userName, password) {
  if (!userName || !password) {
    throw new Error("User name and password are required.");
  }

  const result = await fetchJson("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password })
  });
  return result.session;
}

function showLogin() {
  customerPortalData = null;
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
  if (isCustomerSession()) {
    await syncCustomerPortal();
    return;
  }
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
      state.users = normalizeUsers((users.rows || []).map(apiUser));
      state.unblockRequests = (unblockRequests.rows || []).map(apiUnblockRequest);
      state.adminRequests = (adminRequests.rows || []).map(apiAdminRequest);
      state.audit = (auditLog.rows || []).map(apiAudit);
      if (settings.rows?.length) {
        state.settings = apiSettings(settings.rows[0]);
        state.dropdownOptions = {
          ...state.dropdownOptions,
          ...parseDropdownOptions(state.settings.dropdownOptionsJson)
        };
      }
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

async function syncCustomerPortal() {
  const session = currentSession();
  if (!session?.token) { render(); return; }
  try {
    const result = await fetchJson("/api/customer/bootstrap", { headers: { Authorization: "Bearer " + session.token } });
    customerPortalData = result.data || customerPortalData;
    state.api = { status: "Customer portal connected", database: "connected", mode: result.mode || "database", error: "" };
    render();
  } catch (error) {
    state.api = { status: "Customer portal offline", database: "local data", mode: "browser", error: error.message };
    render();
  }
}

function apiShipment(row) {
  const item = shipment(
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
    row.volume_category || "Land",
    Number(row.chargeable_divisor || 250),
    row.created_by || "admin",
    row.notes || ""
  );
  return item;
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
    row.created_by || "admin",
    row.notes || ""
  );
  recalculateLoad(item);
  return item;
}

function apiCustomer(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch, row.created_by || "admin", row.full_address || "", row.mobile || "");
}

function apiSupplier(row) {
  return party(row.code, row.name, row.location_or_lane, row.email, row.terms, row.status, row.is_account_overdue, row.branch, row.created_by || "admin", row.full_address || "", row.mobile || "");
}

function apiTariff(row) {
  return buildTariffRecord(row, { createdBy: row.created_by || "admin" });
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
  const item = invoice(row.invoice_no, row.customer, row.shipment_no, Number(row.revenue || 0), Number(row.supplier_cost || 0), row.status, String(row.date || today()).slice(0, 10), row.created_by || "admin");
  item.customerCode = row.customer_code || "";
  item.tariffNo = row.tariff_no || "";
  item.tariffName = row.tariff_name || "";
  item.chargeableWeight = Number(row.chargeable_weight || 0);
  item.totalCost = Number(row.total_cost || row.supplier_cost || 0);
  item.taxPercent = Number(row.tax_percent || 0);
  item.taxAmount = Number(row.tax_amount || 0);
  item.grandTotal = Number(row.grand_total || row.revenue || 0);
  item.profitPercent = Number(row.profit_percent || 0);
  item.invoiceLinesJson = row.invoice_lines_json || "[]";
  item.tariffSnapshotJson = row.tariff_snapshot_json || "{}";
  item.invoiceSnapshotJson = row.invoice_snapshot_json || "{}";
  item.dueDate = row.due_date || "";
  item.notes = row.notes || "";
  return item;
}

function apiUser(row) {
  return user(
    row.user_name,
    row.email,
    row.role,
    row.account_status,
    row.branch_access,
    row.branch_view_scope || row.view_scope || "Assigned Branch Only",
    normalizeSectionAccess(row.section_access || "All"),
    isChecked(row.can_view_all_entry),
    isChecked(row.can_view_only_self_entry),
    isChecked(row.can_edit_all_entry),
    isChecked(row.can_view_updated_history),
    "",
    row.notes || "",
    String(row.created_at || today()).slice(0, 10)
  );
}

function apiUnblockRequest(row) {
  return {
    requestNo: row.request_no,
    requestType: row.request_type || "Unblock",
    targetType: row.target_type || "Customer",
    referenceNo: row.reference_no || "",
    customerName: row.customer_name,
    requestedBy: row.requested_by,
    reason: row.reason,
    status: row.status,
    date: String(row.date || today()).slice(0, 10),
    approvedBy: row.approved_by || "",
    notes: row.notes || ""
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
    companyLogoUrl: row.company_logo_url || state.settings.companyLogoUrl || "",
    shipmentNumberFormat: row.shipment_number_format || state.settings.shipmentNumberFormat,
    invoiceNumberFormat: row.invoice_number_format || state.settings.invoiceNumberFormat,
    consolidationNumberFormat: row.consolidation_number_format || state.settings.consolidationNumberFormat,
    tcnNumberFormat: row.tcn_number_format || state.settings.tcnNumberFormat,
    deliveryNoteNumberFormat: row.delivery_note_number_format || state.settings.deliveryNoteNumberFormat,
    documentNumberFormat: row.document_number_format || state.settings.documentNumberFormat,
    tariffNumberFormat: row.tariff_number_format || state.settings.tariffNumberFormat,
    customerNumberFormat: row.customer_number_format || state.settings.customerNumberFormat,
    additionalChargeNumberFormat: row.additional_charge_number_format || state.settings.additionalChargeNumberFormat,
    supplierNumberFormat: row.supplier_number_format || state.settings.supplierNumberFormat,
    defaultVolumetricDivisor: row.default_volumetric_divisor || state.settings.defaultVolumetricDivisor,
    requirePodBeforeInvoice: row.require_pod_before_invoice || state.settings.requirePodBeforeInvoice,
    branches: row.branches || state.settings.branches,
    columnLayoutJson: row.column_layout_json || state.settings.columnLayoutJson || "{}",
    dropdownOptionsJson: row.dropdown_options || state.settings.dropdownOptionsJson || "{}"
  };
}

function render() {
  if (!visibleModules().some(([name]) => name === activeModule)) {
    activeModule = isCustomerSession() ? "Customer Dashboard" : "Dashboard";
  }
  const activeModules = isCustomerSession() ? customerModules : modules;
  const module = activeModules.find(([name]) => name === activeModule) || activeModules[0];
  pageEyebrow.textContent = "";
  pageTitle.textContent = module[0];
  pageSubtitle.textContent = module[1];
  updateUserContext();
  renderAdminBranchFilter();
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
    "Shipment / Airway": renderShipments,
    Manifest: renderConsolidation,
    Customers: () => renderParties("customers", "Consignee"),
    "Suppliers / Transporters": () => renderParties("suppliers", "Supplier / Transporter"),
    "Tariffs / Rate Master": renderTariffs,
    Documents: renderDocuments,
    "Billing / Invoices": renderInvoices,
    "POD / Delivery": renderPod,
    "Shipment Status": renderShipmentStatus,
    Reports: renderReports,
    "User Management / Settings": renderSettings,
    "Audit Log": renderAudit,
    "Customer Dashboard": renderCustomerDashboard,
    "Customer New Shipment": renderCustomerNewShipment,
    "Customer Shipments": renderCustomerShipments,
    "Customer Tracking": renderCustomerTracking,
    "Customer Profile": renderCustomerProfile,
    "Customer Notifications": renderCustomerNotifications
  };
  moduleContent.innerHTML = (renderers[activeModule] || renderDashboard)();
}

function updateUserContext() {
  const session = currentSession() || { userName: "admin", branchAccess: "Both" };
  if (isCustomerSession()) {
    userContextText.textContent = `Customer: ${session.customerName || session.customerCode || session.userName}`;
    return;
  }
  userContextText.textContent = `User: ${session.userName} | Branch: ${session.branchAccess}`;
}

function updateDateFilterStatus() {
  const branchText = adminBranchFilterSummary();
  if (!fromDate.value && !toDate.value) {
    dateFilterStatusText.textContent = `Showing all records${branchText}`;
    return;
  }

  const fromLabel = fromDate.value || "start";
  const toLabel = toDate.value || "today";
  dateFilterStatusText.textContent = `Showing records from ${fromLabel} to ${toLabel}${branchText}`;
}

function portalRows(name) { return Array.isArray(customerPortalData?.[name]) ? customerPortalData[name] : []; }
function portalStatus(value) { return String(value || "").toUpperCase().replace(/\s+/g, "_"); }
function renderCustomerDashboard() { const requests = portalRows("shipmentRequests"); const shipments = portalRows("shipments"); const notifications = portalRows("notifications"); const activity = portalRows("activityLogs"); const pending = requests.filter((row) => ["SUBMITTED", "PENDING_REVIEW"].includes(portalStatus(row.status))).length; const approved = requests.filter((row) => ["AUTO_APPROVED", "APPROVED", "COMPLETED"].includes(portalStatus(row.status))).length; const rejected = requests.filter((row) => portalStatus(row.status) === "REJECTED").length; return "<section class=\"kpi-grid\">" + kpi("Total Shipments", shipments.length + requests.length, "Your shipment records") + kpi("Pending Requests", pending, "Waiting company review") + kpi("Approved Requests", approved, "Approved or auto approved") + kpi("Rejected Requests", rejected, "Rejected requests") + kpi("Notifications", notifications.length, "Portal messages") + "</section><section class=\"split-grid\"><article class=\"panel\">" + panelHeader("Recent Requests", "Customer Portal") + table("customerRequest", requests.slice(0, 8), customerRequestColumns()) + "</article><article class=\"panel\">" + panelHeader("Recent Activity", "Customer Portal") + table("customerActivity", activity.slice(0, 8), customerActivityColumns()) + "</article></section>"; }
function renderCustomerNewShipment() { const hsOptions = portalRows("hsCodeMaster").map((row) => ({ value: row.item_name || row.itemName || "", label: [row.hs_code || row.hsCode, row.item_code || row.itemCode, row.alternate_name || row.alternateName].filter(Boolean).join(" | ") })); return "<section class=\"panel\">" + panelHeader("New Shipment Request", "Customer Portal") + "<form class=\"stack-form\" data-form=\"customer-shipment-request\">" + select("shipmentType", "Shipment Type", ["Export", "Import", "Cross Trade", "Local Delivery"], "Export") + input("origin", "Origin", "") + input("destination", "Destination", "") + input("consignee", "Consignee", currentSession()?.customerName || "") + selectFrom("itemName", "Item Name", hsOptions, "") + input("hsCode", "HS Code", "") + input("itemCode", "Item Code", "") + input("quantity", "Quantity", "1", false, "number") + input("weight", "Weight", "0", false, "number") + input("invoiceValue", "Invoice Value", "0", false, "number") + textarea("remarks", "Remarks", "", false, 3) + "<label>Attachments<input name=\"attachments\" type=\"file\" multiple accept=\".pdf,.jpg,.jpeg,.png,.docx,.xlsx\" /></label><button type=\"submit\">Submit Request</button></form></section>"; }
function renderCustomerShipments() { return "<section class=\"split-grid wide-left\"><article class=\"panel\">" + panelHeader("Shipment Requests", "History") + table("customerRequest", portalRows("shipmentRequests"), customerRequestColumns()) + "</article><article class=\"panel\">" + panelHeader("Company Shipments", "Tracking") + table("customerShipment", portalRows("shipments"), customerShipmentColumns()) + "</article></section>"; }
function renderCustomerTracking() { return "<section class=\"panel\">" + panelHeader("Tracking", "Customer Portal") + table("customerShipment", portalRows("shipments"), customerShipmentColumns()) + "</section>"; }
function renderCustomerProfile() { const session = currentSession() || {}; return "<section class=\"panel\">" + panelHeader("Profile", "Customer Portal") + "<form class=\"stack-form\" data-form=\"customer-profile\">" + input("customerCode", "Customer Code", session.customerCode || "", true) + input("customerName", "Customer Name", session.customerName || "", true) + input("email", "Email", session.email || "") + passwordField("password", "New Password", "") + "<button type=\"submit\">Save Profile</button></form></section>"; }
function renderCustomerNotifications() { return "<section class=\"split-grid\"><article class=\"panel\">" + panelHeader("Notifications", "Customer Portal") + table("customerNotification", portalRows("notifications"), customerNotificationColumns()) + "</article><article class=\"panel\">" + panelHeader("Activity Logs", "Customer Portal") + table("customerActivity", portalRows("activityLogs"), customerActivityColumns()) + "</article></section>"; }

function portalCustomerCount() {
  return Array.isArray(state.customerUsers) ? state.customerUsers.length : 0;
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
        ${kpi("Open Shipments", open, "Your draft and booked jobs", "open-shipments")}
        ${kpi("In Transit", transit, "Your shipments moving", "in-transit")}
        ${kpi("Pending POD", pod, "Need delivery proof", "pending-pod")}
        ${kpi("Unbilled", unbilled, "Your jobs ready for billing", "unbilled")}
        ${kpi("Pending Requests", pendingRequests, "Your pending approvals", "pending-requests")}
      </section>
      <section class="panel">${panelHeader("My Shipments", "Limited Dashboard")} ${table("shipment", rows, shipmentColumns())}</section>`;
  }
  return `
    <section class="kpi-grid">
      ${kpi("Open Shipments", open, "Draft and booked jobs", "open-shipments")}
      ${kpi("In Transit", transit, "Currently moving", "in-transit")}
      ${kpi("Pending POD", pod, "Need delivery proof", "pending-pod")}
      ${kpi("Unbilled", unbilled, "Ready for billing review", "unbilled")}
      ${kpi("Pending Requests", pendingRequests, "Need admin action", "pending-requests")}
      ${kpi("Customer Portal", portalCustomerCount(), "Customer users", "customer-portal")}
      ${kpi("Month Revenue", money(rows.reduce((sum, row) => sum + Number(row.sell || 0), 0)), "Sell total", "month-revenue")}
      ${kpi("Gross Profit", money(rows.reduce((sum, row) => sum + Number(row.sell || 0) - Number(row.buyCost || 0), 0) - state.additionalCharges.reduce((sum, charge) => sum + Number(charge.totalAmount || 0), 0)), "Sell minus supplier and extra cost", "gross-profit")}
    </section>
    <section class="split-grid single-panel dashboard-shipment-register">
      <article class="panel">${panelHeader("Operational Shipments", "Dashboard")} ${table("shipment", rows, shipmentColumns())}</article>
    </section>
    <section class="split-grid single-panel dashboard-alert-row">
      <details class="panel collapsible-section dashboard-alert-panel">
        <summary>${panelHeader("Exception Alerts")}<span class="dashboard-alert-toggle" aria-hidden="true"></span></summary>
        <div class="alert-list">
          ${alert("Jobs missing tariff/rate", "AFS-2605005 needs tariff selection before invoice.")}
          ${alert("Delivered but not invoiced", "AFS-2605003 is delivered and waiting for billing.")}
          ${alert("Pending POD", `${pod} shipments need POD upload or dispute update.`)}
          ${alert("Admin requests waiting", `${pendingRequests} pending request(s) need admin approval. Open User Management / Settings to review.`)}
          ${alert("Additional charges waiting", `${pendingCharges} additional charge entry/changes are waiting for approval.`)}
        </div>
      </details>
    </section>`;
}

function dashboardMetricConfig(metric) {
  const rows = filteredRows(visibleRows(state.shipments));
  if (metric === "open-shipments") {
    const selected = rows.filter((row) => ["Draft", "Booked"].includes(row.status));
    return {
      title: "Open Shipments",
      summary: "Draft and booked shipments",
      rows: selected,
      columns: dashboardShipmentColumns()
    };
  }

  if (metric === "in-transit") {
    const selected = rows.filter((row) => row.status === "In-Transit");
    return {
      title: "In Transit",
      summary: "Shipments currently moving",
      rows: selected,
      columns: dashboardShipmentColumns()
    };
  }

  if (metric === "pending-pod") {
    const selected = rows.filter((row) => row.podStatus !== "Uploaded");
    return {
      title: "Pending POD",
      summary: "Shipments waiting for delivery proof",
      rows: selected,
      columns: dashboardShipmentColumns()
    };
  }

  if (metric === "unbilled") {
    const selected = rows.filter((row) => ["Unbilled", "Missing rate"].includes(row.invoiceStatus));
    return {
      title: "Unbilled",
      summary: "Shipments waiting for invoice completion",
      rows: selected,
      columns: dashboardShipmentColumns()
    };
  }

  if (metric === "pending-requests") {
    const selected = allUserRequests().filter((row) => String(row.status || "").toLowerCase() === "pending");
    return {
      title: "Pending Requests",
      summary: "User and admin requests waiting for review",
      rows: selected,
      columns: userRequestColumns()
    };
  }

  if (metric === "month-revenue" || metric === "gross-profit") {
    const selected = rows.map((row) => ({
      ...row,
      profit: Number(row.sell || 0) - Number(row.buyCost || 0)
    }));
    return {
      title: metric === "month-revenue" ? "Month Revenue" : "Gross Profit",
      summary: metric === "month-revenue" ? "Shipment revenue by record" : "Shipment profit by record",
      rows: selected,
      columns: [
        ...dashboardShipmentColumns(),
        ["sell", "SELL"],
        ["buyCost", "COST"],
        ["profit", "PROFIT"]
      ]
    };
  }

  return null;
}

function openDashboardMetricDialog(metric) {
  const config = dashboardMetricConfig(metric);
  if (!config) return;
  openDialog({
    title: `${config.title} Details`,
    typeLabel: "Dashboard",
    body: `
      <div class="dashboard-popup-shell">
        <div class="report-preview-shell">
        <div class="report-preview-page">
          <div class="report-preview-heading">
            <div>
              <h3>${escapeHtml(config.title)}</h3>
              <p>${escapeHtml(config.summary)}</p>
            </div>
            <span class="status-badge neutral">${escapeHtml(String(config.rows.length))}</span>
          </div>
          ${config.rows.length ? table(metric === "pending-requests" ? "userRequest" : "shipment", config.rows, config.columns, false) : `<p class="empty-state">No matching records found.</p>`}
        </div>
      </div>
      </div>
    `,
    saveLabel: "Close",
    singleColumn: true,
    onSave() {
      recordDialog.close();
    }
  });
}

function adminTopRequestsPanel() {
  if (!isAdminSession()) return "";
  return `<section class="split-grid single-panel admin-request-strip">
    <article class="panel">${panelHeader("All User Requests", "Admin")}
      ${safeTable("userRequest", filteredRows(allUserRequests()), userRequestColumns(), "No user requests are loaded yet.")}
    </article>
  </section>`;
}

function allUserRequests() {
  const blockRows = (state.unblockRequests || []).map((row) => ({
    ...row,
    sourceType: "unblock",
    target: row.targetType || "Block / Unblock",
    referenceNo: row.referenceNo || row.customerName || "",
    details: row.reason || ""
  }));
  const adminRows = (state.adminRequests || []).map((row) => ({
    ...row,
    sourceType: "adminRequest",
    target: row.targetModule || "Admin Request",
    customerName: row.targetModule || "",
    details: row.details || ""
  }));
  return [...blockRows, ...adminRows].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
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
        "Double-click a shipment number or AWB number to open the record.",
        "Shipment type controls service options: Import, Export, WHC, and Consolidation service."
      ]) + documentActionControls("shipment", "Shipment") + blockRequestControls("shipment", "Shipment"))}
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
      <article class="panel">${panelHeader("Manifest Register", "Loads / Trips")}
        ${table("load", rows, loadColumns())}
        ${selectedLoad ? consolidationJobsPanel(selectedLoad) : `<div class="report-preview-empty"><p class="empty-state">Select a manifest from the list to open the related job numbers below.</p></div>`}
      </article>
      ${moduleActionPanel("Manifest Actions", "load", "Generate, load, print, export, and update consolidation manifests from separate popup windows.", documentActionControls("load", "Manifest") + actionChecklist([
        "Select a manifest, then load it to review or edit.",
        "New button opens a fresh manifest builder.",
        "Click any job below the manifest list to open that shipment.",
        "Non-admin manifest changes go to admin approval first."
      ]))}
    </section>
    ${adminDeletePanel("load", "Manifest", "Deleting a manifest removes the trip/manifest only. Shipments stay available.")}`;
}

function renderParties(key, label) {
  const rows = filteredRows(state[key]);
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader(`${label} Register`, "Master data")} ${table(key, rows, partyColumns(key))}</article>
      ${moduleActionPanel(`${label} Actions`, key, `Open separate New and Load windows for ${label.toLowerCase()} records.`, actionChecklist([
        "New creates a fresh master-data entry window.",
        "Load opens an existing record to review or update."
      ]) + blockRequestControls(key, label))}
    </section>
    ${adminDeletePanel(key, label)}`;
}

function renderTariffs() {
  const rows = filteredRows(visibleRows(state.tariffs));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("Rate Master", "Tariffs")} ${table("tariff", rows, tariffColumns())}</article>
      ${moduleActionPanel("Tariff Actions", "tariff", "Maintain tariff cards from separate New and Load popups just like the desktop layout.", documentActionControls("tariff", "Tariff"))}
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
      ${moduleActionPanel("Invoice Actions", "invoice", "Keep invoice creation and load/update in separate popup windows.", documentActionControls("invoice", "Bill"))}
    </section>
    ${adminDeletePanel("invoice", "Invoice")}`;
}

function renderPod() {
  const rows = filteredRows(visibleRows(state.shipments).filter((row) => row.podStatus !== "Uploaded" || row.status !== "Closed"));
  return `
    <section class="split-grid wide-left">
      <article class="panel">${panelHeader("POD Pending / Delivery Board", "Delivery")} ${table("shipment", rows, shipmentColumns())}</article>
      ${moduleActionPanel("POD Actions", "pod", "Load a shipment into a separate POD window or create a new delivery update popup.", documentActionControls("pod", "Delivery Note / POD"))}
    </section>
    ${adminDeletePanel("shipment", "Shipment", "Admin deletion is available here for POD-related shipment cleanup.")}`;
}

function chargeReceiptPanel(shipmentNo) {
  const charges = state.additionalCharges.filter((row) => row.shipmentNo === shipmentNo);
  if (!shipmentNo) return `<p class="empty-state">Select a shipment to view charge receipt lines.</p>`;
  const invoiceNo = charges.find((row) => row.invoiceNo)?.invoiceNo || "Not assigned";
  const receiptNo = charges.find((row) => row.referenceNo)?.referenceNo || charges[0]?.refNo || "No receipt";
  const total = charges.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const rows = charges.length
    ? charges
        .map(
          (row) => `<div class="receipt-line">
            <span>${escapeHtml(row.chargeType)}</span>
            <small>${escapeHtml(row.status)} | ${escapeHtml(row.currency)}</small>
            <strong>${money(row.totalAmount)}</strong>
            <button type="button" class="ghost-button" data-action="open" data-type="charge" data-id="${escapeHtml(row.refNo)}">Edit</button>
            ${isAdminSession() ? `<button type="button" class="danger-button" data-action="delete-record-direct" data-type="charge" data-id="${escapeHtml(row.refNo)}">Delete</button>` : ""}
          </div>`
        )
        .join("")
    : `<p class="empty-state">No charge lines added for this shipment yet.</p>`;
  return `<section class="receipt-box">
    <div class="panel-header"><div><p class="eyebrow">Receipt ${escapeHtml(receiptNo)} / Invoice ${escapeHtml(invoiceNo)}</p><h2>Charge Lines</h2></div></div>
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
    <section class="split-grid single-panel">
      <article class="panel">${panelHeader("Company Settings", "System")}
        <div class="action-row">
          <button type="button" data-action="toggle-settings">${settingsOpen ? "Close Settings" : "Open / Update Settings"}</button>
        </div>
        ${settingsOpen ? `<form class="stack-form" data-form="settings">
          ${input("companyName", "Company Name", state.settings.companyName)}
          ${input("companyLogoUrl", "Company Logo URL", state.settings.companyLogoUrl || "")}
          ${input("shipmentNumberFormat", "Shipment Number Format", state.settings.shipmentNumberFormat)}
          ${input("invoiceNumberFormat", "Invoice Number Format", state.settings.invoiceNumberFormat)}
          ${input("consolidationNumberFormat", "Consolidation Number Format", state.settings.consolidationNumberFormat)}
          ${input("tcnNumberFormat", "TCN Number Format", state.settings.tcnNumberFormat)}
          ${input("deliveryNoteNumberFormat", "POD / Delivery Note Number Format", state.settings.deliveryNoteNumberFormat)}
          ${input("documentNumberFormat", "Document Number Format", state.settings.documentNumberFormat)}
          ${input("tariffNumberFormat", "Tariff Number Format", state.settings.tariffNumberFormat)}
          ${input("customerNumberFormat", "New Customer Number Format", state.settings.customerNumberFormat)}
          ${input("additionalChargeNumberFormat", "Additional Charges Number Format", state.settings.additionalChargeNumberFormat)}
          ${input("supplierNumberFormat", "Supplier / Transporter Number Format", state.settings.supplierNumberFormat)}
          ${input("defaultVolumetricDivisor", "Default Volumetric Divisor", state.settings.defaultVolumetricDivisor)}
          ${select("requirePodBeforeInvoice", "Require POD Before Invoice", ["Yes", "No"], state.settings.requirePodBeforeInvoice)}
          ${select("branches", "Branches", branchOptions(), normalizeBranchName(state.settings.branches || branchOptions()[0]))}
          <p class="empty-state">Next shipment: ${escapeHtml(nextShipmentNumber())} | invoice: ${escapeHtml(nextInvoiceNumber())} | manifest: ${escapeHtml(nextConsolidationNumber())} | TCN: ${escapeHtml(nextTcnNumber())} | POD: ${escapeHtml(nextDeliveryNoteNumber())} | customer: ${escapeHtml(nextCustomerNumber())} | charge: ${escapeHtml(nextAdditionalChargeNumber())} | supplier: ${escapeHtml(nextSupplierNumber())}</p>
          <button type="submit">Save Company Settings</button>
        </form>` : `<p class="empty-state">Open settings to update number formats, branches, and invoice/POD controls.</p>`}
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
  const newButtons = type === "shipment"
    ? `<button type="button" data-action="new-record" data-type="shipment" data-mode="shipment">New Shipment</button><button type="button" class="secondary-button" data-action="new-record" data-type="shipment" data-mode="airway">New Airway</button>`
    : `<button type="button" data-action="new-record" data-type="${escapeHtml(type)}">New</button>`;
  return `<article class="panel">${panelHeader(title, "New / Load")}
    <div class="action-stack">
      <p class="empty-state">${escapeHtml(note)}</p>
      ${newRecordSelectorMarkup(type)}
      <div class="action-row">
        ${newButtons}
        <button type="button" class="secondary-button" data-action="export-list" data-type="${escapeHtml(type)}">Export Excel</button>
      </div>
      ${loadSelectorMarkup(type)}
      <div class="action-row">
        <button type="button" class="secondary-button" data-action="load-record" data-type="${escapeHtml(type)}">Load</button>
      </div>
      ${extra}
    </div>
  </article>`;
}

function blockRequestControls(type, label) {
  const rows = collectionFor(type);
  return `<div class="action-stack">
    ${loadSelectorMarkup(type, `${label} To Request`)}
    <div class="action-row">
      <button type="button" class="secondary-button" data-action="request-block" data-type="${escapeHtml(type)}">Block Request</button>
      <button type="button" class="secondary-button" data-action="request-unblock" data-type="${escapeHtml(type)}">Unblock Request</button>
    </div>
    <p class="empty-state">${rows.length ? "Requests are sent to admin and shown in User Management / Settings." : `No ${label.toLowerCase()} records available for request.`}</p>
  </div>`;
}

function documentActionControls(type, label) {
  return `<div class="action-stack">
    ${loadSelectorMarkup(type, `${label} To Generate`)}
    <div class="action-row">
      <button type="button" class="secondary-button" data-action="generate-document" data-type="${escapeHtml(type)}">Generate ${escapeHtml(label)}</button>
      <button type="button" class="secondary-button" data-action="export-document" data-type="${escapeHtml(type)}">Save / Export</button>
    </div>
  </div>`;
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
    shipment: "New Shipment / Airway",
    load: "New Manifest",
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
    return shipmentOptionLabel(row);
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

function shipmentOptions() {
  return visibleRows(state.shipments).map((row) => ({ value: row.jobNo, label: shipmentOptionLabel(row) }));
}

function tariffOptionsForCustomer(customer) {
  const name = String(customer || "").trim().toLowerCase();
  if (!name) return [];
  return visibleRows(state.tariffs)
    .filter((row) => String(row.customer || "").trim().toLowerCase() === name)
    .map((row) => ({ value: row.tariffNo, label: `${row.tariffNo} | ${row.customer} | ${row.origin} to ${row.destination}` }));
}

function shipmentOptionLabel(row) {
  return `${row.jobNo} | ${row.airwayBillNo || ""} | ${row.customer} | ${row.origin} to ${row.destination}`;
}

function consolidationJobsPanel(loadItem) {
  const jobs = String(loadItem.jobNumbers || "")
    .split(",")
    .map((jobNo) => jobNo.trim())
    .filter(Boolean);

  return `<section class="consolidation-jobs">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Selected Manifest</p>
        <h2>${escapeHtml(loadItem.loadNo)}</h2>
        <p class="empty-state">Manifest: ${escapeHtml(loadItem.manifestStatus || "Not Generated")}${loadItem.lastManifestRequestNo ? ` | Request: ${escapeHtml(loadItem.lastManifestRequestNo)}` : ""}</p>
      </div>
      <div class="action-row">
        ${isAdminSession()
          ? `<button type="button" class="secondary-button" data-action="approve-load-manifest" data-id="${escapeHtml(loadItem.loadNo)}">Generate / Approve Manifest</button>`
          : `<button type="button" class="secondary-button" data-action="request-load-manifest" data-id="${escapeHtml(loadItem.loadNo)}">Send Manifest Request</button>`}
        <button type="button" class="secondary-button" data-action="open" data-type="load" data-id="${escapeHtml(loadItem.loadNo)}">Edit Manifest</button>
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
    <div class="job-list-main">
      <button type="button" class="ghost-button inline-link" data-action="open" data-type="shipment" data-id="${escapeHtml(jobNo)}">${escapeHtml(jobNo)}</button>
      <span class="status-badge neutral">${escapeHtml(shipmentItem.status)}</span>
    </div>
    <div class="job-list-detail-grid">
      <span><strong>Customer</strong>${escapeHtml(shipmentItem.customer)}</span>
      <span><strong>Route</strong>${escapeHtml(shipmentItem.origin)} to ${escapeHtml(shipmentItem.destination)}</span>
      <span><strong>Service</strong>${escapeHtml(shipmentItem.shipmentDirection)} / ${escapeHtml(shipmentItem.shipmentService)}</span>
      <span><strong>Pieces</strong>${escapeHtml(shipmentItem.pieces)}</span>
      <span><strong>Actual KG</strong>${money(shipmentItem.actualKg)}</span>
      <span><strong>CBM</strong>${money(shipmentItem.cbm)}</span>
      <span><strong>Chargeable KG</strong>${money(shipmentItem.chargeableKg)}</span>
      <span><strong>POD</strong>${escapeHtml(shipmentItem.podStatus)}</span>
      <span><strong>Invoice</strong>${escapeHtml(shipmentItem.invoiceStatus)}</span>
      <span><strong>Sell / Cost</strong>${money(shipmentItem.sell)} / ${money(shipmentItem.buyCost)}</span>
    </div>
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

function kpi(title, value, caption, metric = "") {
  const metricAttr = metric ? ` data-dashboard-metric="${escapeHtml(metric)}" role="button" tabindex="0"` : "";
  return `<article class="kpi"${metricAttr}><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(caption)}</small></article>`;
}

function alert(title, detail) {
  return `<article class="alert"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></article>`;
}

function panelHeader(title) {
  return `<div class="panel-header"><div><h2>${escapeHtml(title)}</h2></div></div>`;
}

function empty(text) {
  return `<p class="empty-state">${escapeHtml(text)}</p>`;
}

function table(type, rows, columns, showLoad = type !== "shipment") {
  const header = showLoad ? `<th>Load</th>` : "";
  const colSpan = columns.length + (showLoad ? 1 : 0);
  const body = rows.length
    ? rows.map((row, index) => tableRow(type, row, index, columns, showLoad)).join("")
    : `<tr><td colspan="${colSpan}">${empty("No records found.")}</td></tr>`;
  return `<div class="table-wrap"><table><thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function safeTable(type, rows, columns, fallbackText) {
  try {
    return table(type, Array.isArray(rows) ? rows : [], columns);
  } catch (error) {
    return `<div class="report-preview-empty"><p class="empty-state">${escapeHtml(fallbackText)} ${escapeHtml(error?.message || "")}</p></div>`;
  }
}

function tableRow(type, row, index, columns, showLoad = true) {
  const id = rowId(type, row);
  const actionCell = showLoad ? `<td>${tableActionButton(type, id)}</td>` : "";
  return `<tr>${columns.map(([key]) => `<td>${cellHtml(type, key, row, index)}</td>`).join("")}${actionCell}</tr>`;
}

function tableActionButton(type, id) {
  if (type === "load") {
    return `<button class="ghost-button" data-action="view-load" data-id="${escapeHtml(id)}">View Jobs</button>`;
  }

  if (type === "unblock" || type === "adminRequest" || type === "userRequest") {
    return `<button class="ghost-button" data-action="open" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Review</button>`;
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
  return dropdownOptions("shipmentDirection", ["Export", "Import", "Consolidation"]);
}

function shipmentServiceOptions(direction) {
  if (direction === "Import") {
    return dropdownOptions("shipmentService", ["SI", "AI", "LI", "FI", "WHC"]);
  }

  if (direction === "Consolidation" || direction === "Consoladation") {
    return dropdownOptions("shipmentService", ["Consolidation", "WHC"]);
  }

  return dropdownOptions("shipmentService", ["SE", "AE", "LE", "FE", "WHC"]);
}

function isConsolidationShipment(row) {
  const values = [row?.shipmentDirection, row?.shipmentService].map((item) => String(item || "").trim().toLowerCase());
  return values.includes("consolidation") || values.includes("consoladation");
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

function cellHtml(type, key, row, index = 0) {
  if (key === "slNo") return escapeHtml(index + 1);
  if (key === "palletCount") return escapeHtml(cargoPalletCount(row));
  if (key === "truckDetails") return escapeHtml([row.vehicleNo, row.driverName, row.driverMobile].filter(Boolean).join(" / "));
  if (type === "shipment" && (key === "jobNo" || key === "airwayBillNo")) {
    const value = display(row[key]);
    return `<button type="button" class="table-inline-link" data-shipment-open data-shipment-id="${escapeHtml(row.jobNo || "")}" data-shipment-field="${escapeHtml(key)}" aria-label="Open shipment ${escapeHtml(String(value))}">${escapeHtml(value)}</button>`;
  }

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

function cargoPalletCount(row) {
  return parsePalletDimensions(row.cargoItemsJson || row.palletDimensionsJson || "[]")
    .filter((line) => String(line.packageType || "").toLowerCase() === "pallet")
    .reduce((sum, line) => sum + Number(line.quantity || line.count || 0), 0);
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

function dashboardShipmentColumns() {
  return [
    ["slNo", "SL."],
    ["bookingDate", "DATE"],
    ["jobNo", "SHIPMENT NO."],
    ["airwayBillNo", "AWB NO."],
    ["customer", "CUSTOMER"],
    ["origin", "ORIGIN"],
    ["destination", "DESTINATION"],
    ["status", "STATUS"],
    ["podStatus", "POD"],
    ["invoiceStatus", "INVOICE"],
    ["createdBy", "USERNAME"]
  ];
}

function input(name, label, value = "", readonly = false, type = "text") {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}" ${readonly ? "readonly" : ""} /></label>`;
}

function textarea(name, label, value = "", readonly = false, rows = 4) {
  return `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}" ${readonly ? "readonly" : ""}>${escapeHtml(value)}</textarea></label>`;
}

function checkbox(name, label, checked = false, value = "on") {
  return `<label class="checkbox-field"><input name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(value)}" ${checked ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function select(name, label, options, selected = options[0]) {
  const selectedValue = optionValue(selected);
  const optionKey = dropdownKeyForField(name) || name;
  return selectEditable(name, label, optionKey, options, selectedValue);
}

function selectFrom(name, label, options, value = "") {
  const optionKey = dropdownKeyForField(name) || name;
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" list="${escapeHtml(name)}Options" value="${escapeHtml(optionValue(value))}" data-dropdown-key="${escapeHtml(optionKey)}" data-dropdown-input /><datalist id="${escapeHtml(name)}Options">${options.map((option) => `<option value="${escapeHtml(optionValue(option))}" label="${escapeHtml(optionLabel(option))}"></option>`).join("")}</datalist></label>`;
}

function optionValue(option) {
  return typeof option === "object" && option ? option.value || "" : option || "";
}

function optionLabel(option) {
  return typeof option === "object" && option ? option.label || option.value || "" : option || "";
}

function dropdownOptions(key, defaults = []) {
  const saved = Array.isArray(state.dropdownOptions?.[key]) ? state.dropdownOptions[key] : [];
  return [...new Set([...defaults, ...saved].map((item) => String(item || "").trim()).filter(Boolean))];
}

function selectEditable(name, label, optionKey, defaults = [], selected = "") {
  return `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" list="${escapeHtml(optionKey)}Options" value="${escapeHtml(optionValue(selected))}" data-dropdown-key="${escapeHtml(optionKey)}" data-dropdown-input /><datalist id="${escapeHtml(optionKey)}Options">${dropdownOptions(optionKey, defaults).map((option) => `<option value="${escapeHtml(optionValue(option))}" label="${escapeHtml(optionLabel(option))}"></option>`).join("")}</datalist></label>`;
}

function rememberDropdownOptions(data) {
  let changed = false;
  Object.entries(data).forEach(([name, value]) => {
    const optionKey = dropdownKeyForField(name);
    const text = String(value || "").trim();
    if (!optionKey || !text) return;
    const current = dropdownOptions(optionKey);
    if (!current.map((item) => item.toLowerCase()).includes(text.toLowerCase())) {
      state.dropdownOptions[optionKey] = [...current, text];
      changed = true;
    }
  });
  if (changed) {
    state.settings.dropdownOptionsJson = JSON.stringify(state.dropdownOptions);
    saveState();
    persistRecord("settings", state.settings);
  }
}

function dropdownKeyForField(name) {
  return {
    branch: "branch",
    status: "status",
    podStatus: "podStatus",
    invoiceStatus: "invoiceStatus",
    shipmentDirection: "shipmentDirection",
    shipmentService: "shipmentService",
    manifestStatus: "manifestStatus",
    chargeType: "chargeType",
    chargeBasis: "chargeBasis",
    mainSection: "mainSection",
    weightSection: "weightSection",
    minUpTo: "minUpTo",
    type: "documentType",
    role: "role",
    accountStatus: "accountStatus",
    branchAccess: "branchAccess",
    currency: "currency",
    terms: "terms",
    volumeCategory: "volumeCategory",
    transportMode: "transportMode",
    vehicleType: "vehicleType",
    paymentMode: "paymentMode",
    billingParty1CreditTerms: "creditTerms",
    palletPackageType: "packageType",
    palletDimensionUnit: "dimensionUnit",
    palletWeightUnit: "weightUnit",
    customerCode: "customerCode",
    customer: "customer",
    consigneeName: "consignee",
    origin: "origin",
    destination: "destination",
    pickupLocation: "pickupLocation",
    deliveryLocation: "deliveryLocation",
    transporter: "transporter"
  }[name] || name;
}

function statusOptions() {
  return dropdownOptions("status", ["Draft", "Booked", "In-Transit", "Delivered", "Invoiced", "Closed", "Blocked"]);
}

function roleOptions() {
  return dropdownOptions("role", ["Admin", "Operations", "Billing", "Management", "Read-only"]);
}

function accountStatusOptions() {
  return dropdownOptions("accountStatus", ["Active", "Inactive", "Locked"]);
}

function branchAccessOptions() {
  return CANONICAL_BRANCHES.slice();
}

function volumeCategoryOptions() {
  return dropdownOptions("volumeCategory", ["1 CBM = 167 KG", "1 CBM = 200 KG", "1 CBM = 250 KG", "1 CBM = 333 KG", "Same as Gross Weight"]);
}

function currencyOptions() {
  return dropdownOptions("currency", ["KD", "KWD", "AED", "USD", "SAR", "QAR", "OMR", "BHD"]);
}

function volumeDivisorFor(category) {
  const label = String(category || "");
  if (/167/.test(label)) return 167;
  if (/200/.test(label)) return 200;
  if (/250/.test(label)) return 250;
  if (/333/.test(label)) return 333;
  const match = String(category || "").match(/=\s*(\d+(?:\.\d+)?)\s*KG/i);
  if (match) return Number(match[1]);
  return { Sea: 333, Land: 250, Air: 167 }[category] || 0;
}

function isSameAsGrossWeightCategory(category) {
  return String(category || "").trim().toLowerCase() === "same as gross weight";
}

function configurableColumns(type, defaults) {
  return defaults.filter(([key]) => !isRegisterAddressColumn(key));
}

function isRegisterAddressColumn(key) {
  return /address/i.test(String(key || ""));
}

function defaultColumnLayouts() {
  return {
    shipment: [
      ["slNo", "SL."],
      ["bookingDate", "DATE"],
      ["jobNo", "JOB NO."],
      ["airwayBillNo", "AWB Number"],
      ["origin", "ORIGIN"],
      ["destination", "DESTINATION"],
      ["customerReference", "CUSTOMER REFERENCE"],
      ["billTo1", "BILL TO"],
      ["shipperName", "SHIPPER"],
      ["consigneeName", "CONSIGNEE"],
      ["pickupLocation", "PICK UP LOCATIONS"],
      ["deliveryLocation", "DELIVERY LOCATION"],
      ["transportMode", "MODE"],
      ["shipmentService", "MODE FULL"],
      ["pieces", "PKGS / CARTONS"],
      ["palletCount", "No# of Pallets"],
      ["actualKg", "G.WT"],
      ["manualChargeableKg", "C.WT"],
      ["status", "STATUS"],
      ["createdBy", "USERNAME"]
    ],
    load: [["loadNo", "Manifest"], ["tripDate", "Trip Date"], ["route", "Route"], ["transporter", "Transporter"], ["vehicleNo", "Truck No"], ["driverName", "Driver Name"], ["driverNumber", "Driver Number"], ["status", "Status"], ["manifestStatus", "Manifest"], ["jobNumbers", "Job Numbers"]],
    customers: [["code", "Code"], ["name", "Name"], ["locationOrLane", "Lane / Location"], ["email", "Email"], ["mobile", "Mobile"], ["terms", "Terms"], ["status", "Status"], ["branch", "Branch"]],
    suppliers: [["code", "Code"], ["name", "Name"], ["locationOrLane", "Lane / Location"], ["email", "Email"], ["mobile", "Mobile"], ["terms", "Terms"], ["status", "Status"], ["branch", "Branch"]],
    tariff: [["tariffNo", "Tariff"], ["customer", "Consignee"], ["origin", "Origin"], ["destination", "Destination"], ["mainSection", "Main Section"], ["currency", "Currency"], ["minCharge", "Minimum Charge"], ["grandTotal", "Grand Total"]],
    document: [["documentNo", "Document"], ["linkedNo", "Linked No"], ["type", "Type"], ["status", "Status"], ["date", "Date"], ["owner", "Owner"]],
    invoice: [["invoiceNo", "Invoice"], ["customer", "Consignee"], ["shipmentNo", "Shipment"], ["revenue", "Revenue"], ["supplierCost", "Cost"], ["status", "Status"], ["date", "Date"]],
    charge: [["refNo", "Ref No"], ["shipmentNo", "Shipment No"], ["chargeType", "Charge Type"], ["supplier", "Supplier"], ["amount", "Amount"], ["taxAmount", "Tax"], ["totalAmount", "Total"], ["status", "Status"]],
    user: [["userName", "User"], ["email", "Email"], ["role", "Role"], ["accountStatus", "Status"], ["branchAccess", "Branch"]]
  };
}

function shipmentColumns() {
  return configurableColumns("shipment", defaultColumnLayouts().shipment);
}

function loadColumns() {
  return configurableColumns("load", defaultColumnLayouts().load);
}

function partyColumns(type = "customers") {
  return configurableColumns(type, defaultColumnLayouts()[type] || defaultColumnLayouts().customers);
}

function tariffColumns() {
  return configurableColumns("tariff", defaultColumnLayouts().tariff);
}

function documentColumns() {
  return configurableColumns("document", defaultColumnLayouts().document);
}

function invoiceColumns() {
  return configurableColumns("invoice", defaultColumnLayouts().invoice);
}

function additionalChargeColumns() {
  return configurableColumns("charge", defaultColumnLayouts().charge);
}

function userColumns() {
  return configurableColumns("user", defaultColumnLayouts().user);
}

function customerRequestColumns() { return [["request_no", "Request"], ["item_name", "Item"], ["origin", "Origin"], ["destination", "Destination"], ["status", "Status"], ["created_at", "Created"]]; }
function customerShipmentColumns() { return [["job_no", "Shipment"], ["origin", "Origin"], ["destination", "Destination"], ["status", "Status"], ["pod_status", "POD"], ["invoice_status", "Invoice"]]; }
function customerNotificationColumns() { return [["title", "Title"], ["message", "Message"], ["read_status", "Status"], ["created_at", "Created"]]; }
function customerActivityColumns() { return [["action", "Action"], ["description", "Description"], ["ip_address", "IP"], ["created_at", "Created"]]; }

function unblockColumns() {
  return [["requestNo", "Request"], ["requestType", "Type"], ["targetType", "Target"], ["referenceNo", "Reference"], ["customerName", "Name"], ["requestedBy", "Requested By"], ["reason", "Reason"], ["status", "Status"], ["date", "Date"]];
}

function adminRequestColumns() {
  return [["requestNo", "Request"], ["requestType", "Type"], ["targetModule", "Module"], ["referenceNo", "Reference"], ["requestedBy", "Requested By"], ["status", "Status"], ["date", "Date"]];
}

function userRequestColumns() {
  return [["requestNo", "Request"], ["requestType", "Type"], ["target", "Section"], ["referenceNo", "Reference"], ["requestedBy", "Requested By"], ["status", "Status"], ["date", "Date"]];
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
    userRequest: "requestNo",
    audit: "id"
  };
  const id = row[keys[type]] || "";
  return type === "userRequest" ? `${row.sourceType}:${id}` : id;
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
    userRequest: allUserRequests(),
    audit: state.audit
  };
  return collections[type] || [];
}

async function handleModuleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, type, id, mode } = button.dataset;

  if (action === "open") {
    openRecord(type, id);
    return;
  }

  if (action === "new-record") {
    openNewDialog(selectedNewRecordType(type), mode || "");
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

  if (action === "request-block" || action === "request-unblock") {
    await submitBlockRequest(type, selectedRecordId(type), action === "request-block" ? "Block" : "Unblock");
    return;
  }

  if (action === "generate-document" || action === "export-document") {
    generateRecordDocument(type, selectedRecordId(type), action === "export-document");
    return;
  }

  if (action === "export-list") {
    exportCollectionCsv(type);
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

function handleModuleDoubleClick(event) {
  const shipmentButton = event.target.closest("[data-shipment-open]");
  if (shipmentButton) {
    const shipmentId = shipmentButton.dataset.shipmentId || "";
    if (shipmentId) {
      openRecord("shipment", shipmentId);
    }
    return;
  }

  const metricCard = event.target.closest("[data-dashboard-metric]");
  if (metricCard) {
    openDashboardMetricDialog(metricCard.dataset.dashboardMetric);
  }
}

function handleModuleKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const metricCard = event.target.closest("[data-dashboard-metric]");
  if (!metricCard) return;
  event.preventDefault();
  openDashboardMetricDialog(metricCard.dataset.dashboardMetric);
}

function selectedRecordId(type) {
  return moduleContent.querySelector(`[data-load-select='${type}']`)?.value || "";
}

function selectedNewRecordType(type) {
  return moduleContent.querySelector(`[data-new-select='${type}']`)?.value || type;
}

function handleLoadRecord(type) {
  let selectedId = selectedRecordId(type);

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

  if (!selectedId) {
    const fallback = collectionFor(type)[0];
    selectedId = fallback ? rowId(type, fallback) : "";
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

  if (type === "unblock") {
    openBlockRequestDialog(record);
    return;
  }

  if (type === "userRequest") {
    if (record.sourceType === "adminRequest") openAdminRequestDialog(record);
    else openBlockRequestDialog(record);
    return;
  }

  if (type === "tariff") {
    editing = { type, id, record };
    dialogState = null;
    openDialog({
      title: `Tariff - ${id}`,
      typeLabel: "Tariff",
      saveLabel: "Save Changes",
      body: tariffDialogBody(record),
      onSave: async () => {
        const data = collectFormValues(dialogBody.closest("form"));
        rememberDropdownOptions(data);
        const updatedRecord = buildTariffRecord(data, record);
        state.tariffs = state.tariffs.map((row) => rowId("tariff", row) === id ? updatedRecord : row);
        await persistRecord("tariff", updatedRecord);
        saveState();
        recordDialog.close();
        render();
      },
      afterOpen: () => {
        bindTariffWeightRates();
        bindTariffAdditionalCharges(record.additionalChargesJson || "[]");
      }
    });
    return;
  }

  if (type === "invoice") {
    editing = { type, id, record };
    dialogState = null;
    openDialog({
      title: `Invoice - ${id}`,
      typeLabel: "Invoice",
      saveLabel: "Save Changes",
      body: invoiceDialogBody(record),
      onSave: async () => {
        const data = collectFormValues(dialogBody.closest("form"));
        rememberDropdownOptions(data);
        const updatedRecord = {
          ...record,
          customer: data.customer || record.customer || "",
          shipmentNo: data.shipmentNo || record.shipmentNo || "",
          tariffNo: data.tariffNo || record.tariffNo || "",
          tariffName: data.tariffName || record.tariffName || "",
          chargeableWeight: Number(data.chargeableWeight || record.chargeableWeight || 0),
          grossWeight: Number(data.grossWeight || record.grossWeight || 0),
          volumeWeight: Number(data.volumeWeight || record.volumeWeight || 0),
          currency: data.currency || record.currency || "KD",
          taxPercent: Number(data.taxPercent || record.taxPercent || 0),
          revenue: Number(data.revenue || record.revenue || 0),
          supplierCost: Number(data.supplierCost || data.totalCost || record.supplierCost || 0),
          totalCost: Number(data.totalCost || record.totalCost || data.supplierCost || 0),
          taxAmount: Number(data.taxAmount || record.taxAmount || 0),
          grossProfit: Number(data.grossProfit || record.grossProfit || 0),
          profitPercent: Number(data.profitPercent || record.profitPercent || 0),
          grandTotal: Number(data.grandTotal || record.grandTotal || 0),
          status: data.status || record.status || "Draft",
          date: data.date || record.date || today(),
          invoiceLinesJson: data.invoiceLinesJson || record.invoiceLinesJson || "[]",
          tariffSnapshotJson: data.tariffSnapshotJson || record.tariffSnapshotJson || "{}",
          invoiceSnapshotJson: data.invoiceSnapshotJson || record.invoiceSnapshotJson || "{}"
        };
        state.invoices = state.invoices.map((row) => rowId("invoice", row) === id ? updatedRecord : row);
        await persistRecord("invoice", updatedRecord);
        saveState();
        recordDialog.close();
        render();
      },
      afterOpen: bindInvoiceShipmentTariff
    });
    return;
  }

  editing = { type, id, record };
  dialogState = null;
  dialogType.textContent = `${type} record`;
  dialogTitle.textContent = id;
  dialogSave.textContent = type === "charge" && !isAdminSession() ? "Send Change Request" : "Save Changes";
  dialogSecondary.classList.add("is-hidden");
  dialogBody.innerHTML = type === "shipment"
    ? shipmentDialogBody(record.entryMode || "shipment", record)
    : Object.entries(record)
      .map(([key, value]) => detailFieldControl(type, key, value, record))
      .join("");
  if (type === "shipment") bindShipmentDirectionDialog();
  if (type === "shipment") bindShipmentCustomerTariffs();
  if (type === "shipment") bindShipmentCustomerAutofill();
  if (type === "shipment") bindShipmentCopySections();
  if (type === "shipment") bindTransporterAutofill();
  if (type === "shipment") bindTariffFinancialAutofill();
  if (type === "shipment") bindVolumeCalculator();
  if (type === "shipment") bindPalletDimensionBuilder();
  if (type === "tariff") bindTariffAdditionalCharges(record.additionalChargesJson || "[]");
  if (type === "load") bindConsolidationJobPicker();
  if (type === "invoice") bindInvoiceShipmentTariff();
  bindDialogPasswordToggles();
  resetDialogChrome();
  recordDialog.showModal();
}
function duplicateRecordExists(type, id) {
  const normalized = String(id || "").trim().toLowerCase();
  if (!normalized) return false;
  return allCollectionFor(type).some((row) => String(rowId(type, row) || "").trim().toLowerCase() === normalized);
}

function allCollectionFor(type) {
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
    adminRequest: state.adminRequests
  };
  return collections[type] || collectionFor(type);
}

function notifyDuplicate(id) {
  notifyDenied("Already used", `${id} is already used. Enter a different serial number.`);
}

function detailFieldControl(type, key, value, record) {
  const readonlyKeys = new Set(["jobNo", "loadNo", "code", "tariffNo", "documentNo", "invoiceNo", "refNo", "userName", "requestNo"]);
  const options = detailFieldOptions(type, key, record);
  if (type === "shipment" && ["sell", "buyCost"].includes(key)) {
    return "";
  }
  if (type === "shipment" && ["transitPoint", "route", "invoiceCopy", "packingListCopy", "podCopy", "customsDocuments", "otherDocuments"].includes(key)) {
    return `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" />`;
  }
  if (type === "shipment" && key === "actualKg" && record?.entryMode === "airway") {
    return `<input type="hidden" name="actualKg" value="${escapeHtml(value ?? 0)}" />`;
  }
  if (["shipment", "load"].includes(type) && key === "notes") {
    return "";
  }
  if (type === "tariff" && key === "additionalChargesJson") {
    return tariffAdditionalChargesBuilder(value || "[]");
  }
  if (type === "tariff" && ["additionalChargesTotal", "grandTotal"].includes(key)) {
    return "";
  }
  if (type === "shipment" && key === "cargoItemsJson") {
    return cargoItemsBuilder(value || record.palletDimensionsJson || "[]", record.tariffNo, record.customer);
  }
  if (type === "shipment" && key === "palletDimensionsJson") {
    return record.cargoItemsJson ? "" : cargoItemsBuilder(value || "[]", record.tariffNo, record.customer);
  }
  if (type === "shipment" && key === "tcnNumber") {
    return `${input(key, labelize(key), value ?? "", true)}<div class="action-row"><button type="button" class="secondary-button" data-dialog-action="generate-tcn">Generate TCN Number</button></div>`;
  }
  if (type === "invoice" && key === "tariffNo") {
    return `${selectFrom(key, labelize(key), tariffSelectionOptions(), String(value ?? ""))}${tariffPreviewShell("invoice")}`;
  }
  if (type === "user" && key === "password") {
    return passwordField(key, labelize(key), value ?? "");
  }
  if (type === "user" && key === "sectionAccess") {
    return sectionAccessCheckboxes(sectionAccessSet(value));
  }
  if (type === "load" && key === "jobNumbers") {
    return consolidationShipmentPicker(value, record.loadNo);
  }
  if (typeof value === "boolean") {
    return checkbox(key, labelize(key), value);
  }

  if (options.length) {
    const optionKey = dropdownKeyForField(key);
    const fieldLabel = type === "shipment" && key === "shipmentDirection" ? "Shipment Type" : labelize(key);
    return optionKey ? selectEditable(key, fieldLabel, optionKey, options, String(value ?? "")) : select(key, fieldLabel, options, String(value ?? ""));
  }

  const inputType = key.toLowerCase().includes("date") ? "date" : typeof value === "number" ? "number" : "text";
  const readonly = readonlyKeys.has(key);
  return input(key, labelize(key), value ?? "", readonly, inputType);
}

function passwordField(name, label, value = "") {
  return `<label>${escapeHtml(label)}<span class="password-input-wrap"><input name="${escapeHtml(name)}" type="password" value="${escapeHtml(value)}" /><button type="button" class="password-toggle" data-dialog-action="toggle-password" aria-label="Show password" title="Show password">View</button></span></label>`;
}

function detailFieldOptions(type, key, record) {
  const common = {
    branch: branchOptions(),
    status: statusOptions(),
    podStatus: ["Pending", "Uploaded", "Missing", "Disputed", "Approved"],
    invoiceStatus: ["Unbilled", "Draft", "Approved", "Sent", "Paid", "Overdue", ...state.invoices.map((row) => row.invoiceNo)],
    shipmentDirection: shipmentDirectionOptions(),
    shipmentService: shipmentServiceOptions(record.shipmentDirection || "Export"),
    volumeCategory: volumeCategoryOptions(),
    manifestStatus: ["Not Generated", "Pending Approval", "Approved", "Rejected"],
    chargeType: chargeTypeOptions(),
    chargeBasis: chargeBasisOptions(),
    currency: currencyOptions(),
    accountStatus: accountStatusOptions(),
    role: roleOptions(),
    branchAccess: branchAccessOptions()
  };

  if (key === "customer") return state.customers.map((row) => row.name);
  if (key === "tariffNo" && type === "shipment" && record?.entryMode !== "airway") return tariffOptionsForCustomer(record.customer);
  if (key === "tariffNo") return visibleRows(state.tariffs).map((row) => row.tariffNo);
  if (key === "branchViewScope") return branchViewScopeOptions();
  if (key === "mainSection") return dropdownOptions("mainSection", ["FTL", "LTL"]);
  if (key === "weightSection") return dropdownOptions("weightSection", ["Minimum", "Up to 100 KG", "300 KG", "500 KG", "1000 KG", "More"]);
  if (key === "minUpTo") return dropdownOptions("minUpTo", ["Minimum", "100 KG", "300 KG", "500 KG", "1000 KG", "More"]);
  if (key === "supplier") return state.suppliers.map((row) => row.name);
  if (key === "shipmentNo" || key === "linkedNo" || key === "jobNo") return shipmentOptions();
  if (type === "load" && key === "jobNumbers") return [];
  return common[key] || [];
}

function labelize(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function branchViewScopeOptions() {
  return ["Assigned Branch Only", "All Branches"];
}

async function saveDialogRecord() {
  if (dialogState?.onSave) {
    await dialogState.onSave();
    return;
  }

  if (!editing) return;
  const data = collectFormValues(dialogBody.closest("form"));
  rememberDropdownOptions(data);
  const updatedRecord = { ...editing.record };
  Object.keys(updatedRecord).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      updatedRecord[key] = coerceValue(updatedRecord[key], data[key]);
    }
  });
  if (editing.type === "shipment") {
    if (!String(updatedRecord.billTo1 || "").trim() && !String(updatedRecord.billTo2 || "").trim()) {
      notifyDenied("Bill To required", "Enter at least one Bill To value.");
      return;
    }
    updatedRecord.notes = shipmentMetaNotes(updatedRecord);
  }
  if (editing.type === "load") {
    const jobs = normalizeConsolidationJobs(updatedRecord.jobNumbers, editing.id);
    if (!jobs.length) {
      notifyDenied("Consolidation not saved", "Add at least one unassigned shipment with service type Consolidation.");
      return;
    }
    updatedRecord.jobNumbers = jobs.join(", ");
    updatedRecord.notes = loadMetaNotes(updatedRecord);
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
  dialogBody.classList.remove("single-column");
  resetDialogChrome();
}

function resetDialogChrome() {
  recordDialog.classList.remove("is-minimized", "is-maximized");
  dialogMinimize?.setAttribute("aria-pressed", "false");
  dialogMaximize?.setAttribute("aria-pressed", "false");
}

function toggleDialogMinimized() {
  const minimized = recordDialog.classList.toggle("is-minimized");
  if (minimized) recordDialog.classList.remove("is-maximized");
  dialogMinimize?.setAttribute("aria-pressed", String(minimized));
  dialogMaximize?.setAttribute("aria-pressed", String(recordDialog.classList.contains("is-maximized")));
}

function toggleDialogMaximized() {
  const maximized = recordDialog.classList.toggle("is-maximized");
  if (maximized) recordDialog.classList.remove("is-minimized");
  dialogMaximize?.setAttribute("aria-pressed", String(maximized));
  dialogMinimize?.setAttribute("aria-pressed", String(recordDialog.classList.contains("is-minimized")));
}

function openDialog({ title, typeLabel, body, saveLabel, secondaryLabel = "", onSave = null, onSecondary = null, afterOpen = null, singleColumn = false }) {
  resetDialogShell();
  dialogType.textContent = typeLabel;
  dialogTitle.textContent = title;
  dialogBody.innerHTML = body;
  dialogBody.classList.toggle("single-column", Boolean(singleColumn));
  dialogSave.textContent = saveLabel || "Save Changes";
  dialogState = { onSave, onSecondary };
  if (secondaryLabel && onSecondary) {
    dialogSecondary.textContent = secondaryLabel;
    dialogSecondary.classList.remove("is-hidden");
  }
  recordDialog.showModal();
  afterOpen?.();
  bindDialogPasswordToggles();
}

function openNewDialog(type, mode = "") {
  const config = dialogConfigFor(type, mode);
  if (!config) return;
  openDialog({
    title: config.title,
    typeLabel: config.typeLabel,
    body: config.body,
    saveLabel: config.saveLabel,
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      rememberDropdownOptions(data);
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
      ${selectFrom("jobNo", "Shipment No", shipmentOptions(), shipmentItem?.jobNo || "")}
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
  const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo) || visibleRows(state.shipments)[0] || {};
  openDialog({
    title: jobNo ? `POD / Delivery - ${jobNo}` : "Delivery Update",
    typeLabel: "POD",
    body: `
      ${selectFrom("jobNo", "Shipment No", shipmentOptions(), shipmentItem.jobNo || "")}
      ${input("deliveryNoteNo", "Delivery Note No", shipmentItem.deliveryNoteNo || nextDeliveryNoteNumber())}
      ${input("ginNo", "GIN Number", shipmentItem.ginNo || "")}
      ${input("customerReference", "Customer Reference", shipmentItem.customerReference || "")}
      ${textarea("deliveryRemarks", "Delivery Remarks / Coordinates", shipmentItem.deliveryRemarks || "", false, 3)}
      ${input("pocName", "POC Name", shipmentItem.pocName || shipmentItem.deliveryContactPerson || "")}
      ${input("pocMobile", "POC Mobile Number", shipmentItem.pocMobile || shipmentItem.deliveryMobile || "")}
      ${input("additionalContact", "Additional Contact Person", shipmentItem.additionalContact || "")}
      ${input("preparedBy", "Prepared By", shipmentItem.preparedBy || currentUserName())}
      ${input("deliveredBy", "Delivered By", shipmentItem.deliveredBy || shipmentItem.driverName || "")}
      ${input("receivedBy", "Goods Received By", shipmentItem.receivedBy || "")}
      ${input("receiverPhone", "Receiver Telephone Number", shipmentItem.receiverPhone || "")}
      ${input("receiverSignature", "Receiver Signature", shipmentItem.receiverSignature || "")}
      ${input("deliveryDatetime", "Delivery Date & Time", shipmentItem.deliveryDatetime || new Date().toISOString().slice(0, 16), false, "datetime-local")}
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

function dialogConfigFor(type, mode = "") {
  const configs = {
    shipment: {
      title: mode === "airway" ? "New Airway Bill" : "New Shipment",
      typeLabel: mode === "airway" ? "Airway Bill" : "Shipment",
      saveLabel: mode === "airway" ? "Create Airway Bill" : "Create Shipment",
      body: shipmentDialogBody(mode),
      onSave: createShipment,
      afterOpen: () => {
        bindShipmentDirectionDialog();
        bindShipmentCustomerTariffs();
        bindShipmentCustomerAutofill();
        bindShipmentCopySections();
        bindTransporterAutofill();
        bindTariffFinancialAutofill();
        bindVolumeCalculator();
        bindPalletDimensionBuilder();
      }
    },
    load: {
      title: "New Manifest",
      typeLabel: "Manifest",
      saveLabel: "Create Manifest",
      body: `
        ${input("loadNo", "Manifest No", nextConsolidationNumber(), false)}
        ${input("tripDate", "Trip Date", today(), false, "date")}
        ${input("route", "Route", "Kuwait - Riyadh")}
        ${formSection("Transport Information", `
          ${selectFrom("transporter", "Transporter", state.suppliers.map((row) => ({ value: row.name, label: `${row.code} | ${row.name}` })), "Al Dana Transport")}
          ${selectFrom("transporterCode", "Transporter Number", state.suppliers.map((row) => ({ value: row.code, label: `${row.code} | ${row.name}` })), "")}
          ${input("vehicleNo", "Vehicle No", "KWT-00000")}
          ${input("driverName", "Driver Name", "")}
          ${input("driverNumber", "Driver Number", "")}
          ${input("driverMobile", "Driver Mobile", "")}
        `, true)}
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
      body: tariffDialogBody(),
      onSave: createTariff,
      afterOpen: () => {
        bindTariffWeightRates();
        bindTariffAdditionalCharges();
      }
    },
    document: {
      title: "New Document Tag",
      typeLabel: "Document",
      saveLabel: "Save Document Tag",
      body: `
        ${input("documentNo", "Document No", nextNumber("DOC", state.documents, "documentNo"), false)}
        ${selectFrom("linkedNo", "Attach To", shipmentOptions())}
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
      onSave: createCharge,
      afterOpen: bindChargeLineBuilder
    },
    invoice: {
      title: "New Invoice",
      typeLabel: "Invoice",
      saveLabel: "Create Invoice",
      body: invoiceDialogBody(),
      onSave: createInvoice,
      afterOpen: bindInvoiceShipmentTariff
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
      ${input("code", `${label} Code`, key === "customers" ? nextCustomerNumber() : nextSupplierNumber(), false)}
      ${input("name", "Name", "")}
      ${input("locationOrLane", "Lane / Location", "")}
      ${key === "customers" ? textarea("fullAddress", "Full Address / Shipping Delivery Address", "", false, 3) : ""}
      ${input("email", "Contact Email", "", false, "email")}
      ${input("mobile", "Mobile Number", "")}
      ${select("terms", "Credit Limit Days", ["15 days", "30 days", "45 days"])}
      ${select("status", "Status", ["Active", "Inactive", "Blocked"])}
      ${select("branch", "Branch", branchOptions(), defaultUserBranch())}
    `,
    onSave: (data) => createParty(key, data)
  };
}

function shipmentDialogBody(mode = "shipment", record = null) {
  const actualMode = record?.entryMode || mode || "shipment";
  const isAirway = actualMode === "airway";
  const loaded = Boolean(record);
  const sectionOpen = loaded;
  const defaultCustomer = record?.customer || "";
  const fieldValue = (key, fallback = "") => record?.[key] ?? fallback;
  return `
    <input type="hidden" name="entryMode" value="${escapeHtml(actualMode)}" />
    ${formSection("Shipment Information", `
      ${input("jobNo", isAirway ? "Airway Bill Number" : "Shipment Number", fieldValue("jobNo", isAirway ? nextNumber("AWB", state.shipments, "jobNo") : nextShipmentNumber()), loaded)}
      ${input("bookingDate", "Booking Date", fieldValue("bookingDate", today()), false, "date")}
      ${input("shipmentDate", "Shipment Date", fieldValue("shipmentDate", today()), false, "date")}
      ${select("status", "Status", statusOptions(), fieldValue("status", "Booked"))}
      ${select("shipmentDirection", "Shipment Type", shipmentDirectionOptions(), fieldValue("shipmentDirection", "Export"))}
      ${select("shipmentService", "Service Type", shipmentServiceOptions(fieldValue("shipmentDirection", "Export")), fieldValue("shipmentService", "SE"))}
      ${selectEditable("origin", "Origin", "origin", ["Kuwait City"], fieldValue("origin"))}
      ${selectEditable("destination", "Destination", "destination", ["Riyadh"], fieldValue("destination"))}
      ${input("customerReference", "Customer Reference", fieldValue("customerReference"))}
      ${select("branch", "Branch", branchOptions(), normalizeBranchName(fieldValue("branch", defaultUserBranch())))}
      ${input("salesPerson", "Sales Person", fieldValue("salesPerson", currentUserName()))}
      ${input("airwayBillNo", "Airway Bill / Bill of Lading", fieldValue("airwayBillNo", isAirway ? "" : nextNumber("AWB", state.shipments, "jobNo")), false)}
    `, true, sectionOpen)}
    ${formSection("Customer Information", `
      ${selectFrom("customer", "Customer Name", state.customers.map((row) => row.name), defaultCustomer)}
      ${selectFrom("customerCode", "Customer Code", state.customers.map((row) => ({ value: row.code, label: `${row.code} | ${row.name}` })), fieldValue("customerCode"))}
      ${input("customerContactPerson", "Contact Person", fieldValue("customerContactPerson"))}
      ${input("customerMobile", "Mobile Number", fieldValue("customerMobile"))}
      ${input("customerEmail", "Email Address", fieldValue("customerEmail"), false, "email")}
      ${textarea("customerAddress", "Address", fieldValue("customerAddress"), false, 3)}
    `, true, sectionOpen)}
    ${formSection("Shipper Information", `
      ${checkbox("copyCustomerToShipper", "Same as customer information")}
      ${input("shipperName", "Shipper Name", fieldValue("shipperName"))}
      ${textarea("shipperAddress", "Shipper Address", fieldValue("shipperAddress"), false, 3)}
      ${input("shipperContactPerson", "Contact Person", fieldValue("shipperContactPerson"))}
      ${input("shipperMobile", "Mobile Number", fieldValue("shipperMobile"))}
      ${input("shipperEmail", "Email Address", fieldValue("shipperEmail"), false, "email")}
      ${input("shipperVatTrn", "VAT / TRN Number", fieldValue("shipperVatTrn"))}
      ${input("shipperCountry", "Country", fieldValue("shipperCountry", "Kuwait"))}
    `, true, sectionOpen)}
    ${formSection("Consignee Information", `
      ${checkbox("copyCustomerToConsignee", "Same as customer information")}
      ${selectFrom("consigneeName", "Consignee Name", state.customers.map((row) => row.name), fieldValue("consigneeName", defaultCustomer))}
      ${textarea("consigneeAddress", "Consignee Address", fieldValue("consigneeAddress"), false, 3)}
      ${input("consigneeContactPerson", "Contact Person", fieldValue("consigneeContactPerson"))}
      ${input("consigneeMobile", "Mobile Number", fieldValue("consigneeMobile"))}
      ${input("consigneeEmail", "Email Address", fieldValue("consigneeEmail"), false, "email")}
      ${input("consigneeCountry", "Country", fieldValue("consigneeCountry"))}
    `, true, sectionOpen)}
    ${formSection("Pickup Information", `
      ${checkbox("copyCustomerToPickup", "Same as customer information")}
      ${input("pickupLocation", "Pickup Location", fieldValue("pickupLocation"))}
      ${textarea("pickupAddress", "Pickup Address", fieldValue("pickupAddress"), false, 3)}
      ${input("pickupContactPerson", "Pickup Contact Person", fieldValue("pickupContactPerson"))}
      ${input("pickupMobile", "Pickup Mobile", fieldValue("pickupMobile"))}
      ${input("pickupDate", "Pickup Date", fieldValue("pickupDate", today()), false, "date")}
      ${input("pickupTime", "Pickup Time", fieldValue("pickupTime"), false, "time")}
    `, true, sectionOpen)}
    ${formSection("Delivery Information", `
      ${input("deliveryLocation", "Delivery Location", fieldValue("deliveryLocation"))}
      ${textarea("deliveryAddress", "Delivery Address", fieldValue("deliveryAddress"), false, 3)}
      ${input("deliveryContactPerson", "Delivery Contact Person", fieldValue("deliveryContactPerson"))}
      ${input("deliveryMobile", "Delivery Mobile", fieldValue("deliveryMobile"))}
      ${input("deliveryDate", "Delivery Date", fieldValue("deliveryDate"), false, "date")}
      ${input("deliveryTime", "Delivery Time", fieldValue("deliveryTime"), false, "time")}
    `, true, sectionOpen)}
    ${formSection("Billing Party 1", `
      ${checkbox("copyCustomerToBilling1", "Same as customer information")}
      ${input("billTo1", "Billing Party Name", fieldValue("billTo1", defaultCustomer))}
      ${textarea("billingParty1Address", "Billing Address", fieldValue("billingParty1Address"), false, 3)}
      ${input("billingParty1ContactPerson", "Contact Person", fieldValue("billingParty1ContactPerson"))}
      ${input("billingParty1Mobile", "Mobile Number", fieldValue("billingParty1Mobile"))}
      ${input("billingParty1Email", "Email Address", fieldValue("billingParty1Email"), false, "email")}
      ${selectEditable("billingParty1CreditTerms", "Credit Terms", "creditTerms", ["Cash", "15 days", "30 days", "45 days"], fieldValue("billingParty1CreditTerms"))}
    `, true, sectionOpen)}
    ${cargoItemsBuilder(fieldValue("cargoItemsJson", record?.palletDimensionsJson || "[]"), fieldValue("tariffNo"), defaultCustomer)}
    <input type="hidden" name="transportMode" value="" />
    <input type="hidden" name="deliveryNoteNo" value="${escapeHtml(fieldValue("deliveryNoteNo"))}" />
    <input type="hidden" name="tcnNumber" value="${escapeHtml(fieldValue("tcnNumber"))}" />
    <input type="hidden" name="transitDays" value="${escapeHtml(fieldValue("transitDays", "3"))}" />
    <input type="hidden" name="shipmentServiceOther" value="${escapeHtml(fieldValue("shipmentServiceOther"))}" />
    ${checkbox("printOnlyCargoDetails", "Cargo Summary", fieldValue("printOnlyCargoDetails", false))}
    <div class="action-row">
      <button type="button" class="secondary-button" data-dialog-action="generate-tcn">Generate TCN</button>
      <button type="button" class="secondary-button" data-dialog-action="view-tcn">View TCN</button>
      <button type="button" class="secondary-button" data-dialog-action="generate-pod">Generate Delivery Note / POD</button>
    </div>
  `;
}

function formSection(title, body, collapsible = false, open = false) {
  const sectionBody = `<div class="form-section-grid">${body}</div>`;
  if (!collapsible) return `<section class="form-section"><h3>${escapeHtml(title)}</h3>${sectionBody}</section>`;
  return `<details class="form-section collapsible-section" ${open ? "open" : ""}><summary>${escapeHtml(title)}</summary>${sectionBody}</details>`;
}

function palletDimensionBuilder(initialValue = "[]") {
  return `<section class="pallet-builder" data-pallet-builder>
    <input type="hidden" name="palletDimensionsJson" value="${escapeHtml(initialValue || "[]")}" />
    <div class="tariff-charge-entry">
      ${input("palletCount", "No of Pallets", "1", false, "number")}
      ${input("palletLength", "Length", "100", false, "number")}
      ${input("palletWidth", "Width", "120", false, "number")}
      ${input("palletHeight", "Height", "120", false, "number")}
      <button type="button" class="secondary-button" data-dialog-action="add-pallet-line">Add</button>
    </div>
    <div class="tariff-charge-table" data-pallet-lines-list></div>
  </section>`;
}

function cargoItemsBuilder(initialValue = "[]", appliedTariffNo = "", customerName = "") {
  return `<section class="form-section pallet-builder" data-pallet-builder>
    <h3>Cargo Details</h3>
    <input type="hidden" name="cargoItemsJson" value="${escapeHtml(initialValue || "[]")}" />
    <input type="hidden" name="palletDimensionsJson" value="${escapeHtml(initialValue || "[]")}" />
    <div class="tariff-charge-entry cargo-entry">
      ${select("palletPackageType", "Package Type", ["Pallet", "Carton", "Crate", "Box", "Package", "Drum"], "Pallet")}
      ${input("palletCount", "Quantity", "1", false, "number")}
      ${input("palletLength", "Length", "100", false, "number")}
      ${input("palletWidth", "Width", "120", false, "number")}
      ${input("palletHeight", "Height", "100", false, "number")}
      ${select("palletDimensionUnit", "Dimension Unit", ["CM", "M", "INCH"], "CM")}
      ${input("palletWeight", "Weight Per Unit", "0", false, "number")}
      ${input("palletTotalWeight", "Total Gross Weight", "0", false, "number")}
      <button type="button" class="secondary-button" data-dialog-action="add-pallet-line">Add</button>
    </div>
    <div class="cargo-live-summary" data-cargo-live-summary>
      <span>Pieces: 1</span>
      <span>CBM: 1.2</span>
      <span>Total Gross Weight: 0 KG</span>
    </div>
    <div class="tariff-charge-table" data-pallet-lines-list></div>
    <div class="form-section-grid cargo-totals">
      ${select("volumeCategory", "", volumeCategoryOptions(), "1 CBM = 250 KG")}
      ${input("cbm", "Grand Total CBM", "0", true, "number")}
      ${input("actualKg", "Total Actual Weight", "0", true, "number")}
      ${input("chargeableKg", "Chargeable Weight", "0", false, "number")}
      <input type="hidden" name="pieces" value="0" />
      <input type="hidden" name="chargeableDivisor" value="250" />
      <input type="hidden" name="manualChargeableKg" value="0" />
    </div>
    <div class="form-section-grid cargo-description-row">
      ${textarea("natureOfGoods", "Nature of Goods / Description of Goods", "", false, 3)}
      ${selectFrom("tariffNo", "Apply Tariff", tariffOptionsForCustomer(customerName), appliedTariffNo)}
    </div>
  </section>`;
}

function userDialogBody() {
  const checkedSections = sectionAccessSet("Dashboard, Shipment / Airway, Reports");
  return `
    ${input("userName", "User Name", "")}
    ${passwordField("password", "Password", "")}
    ${input("email", "Email", "", false, "email")}
    ${select("role", "User Role", roleOptions(), "Operations")}
    ${select("accountStatus", "User Account", accountStatusOptions(), "Active")}
    ${select("branchAccess", "Branch Access", branchAccessOptions(), branchOptions()[0])}
    ${select("branchViewScope", "View Scope", branchViewScopeOptions(), "Assigned Branch Only")}
    ${sectionAccessCheckboxes(checkedSections)}
    ${checkbox("canViewAllEntry", "User can view all entry")}
    ${checkbox("canViewOnlySelfEntry", "User can view only self entry", true)}
    ${checkbox("canEditAllEntry", "User can edit all entry")}
    ${checkbox("canViewUpdatedHistory", "User can view updated history", true)}
    ${input("notes", "Notes", "Created from admin panel")}
  `;
}

function changePasswordDialogBody() {
  return `
    ${input("userName", "User Name", currentUserName(), true)}
    ${passwordField("currentPassword", "Current Password", "")}
    ${passwordField("newPassword", "New Password", "")}
    ${passwordField("confirmPassword", "Confirm Password", "")}
  `;
}

function sectionAccessCheckboxes(checkedSections = new Set()) {
  return `<fieldset class="section-access-grid">
    <legend>Menu Access Permissions</legend>
    ${modules.map(([name]) => checkbox("sectionAccessList", name, checkedSections.has(name), name)).join("")}
  </fieldset>`;
}

function sectionAccessSet(value) {
  const normalized = normalizeSectionAccess(value || "");
  if (normalized === "All") return new Set(modules.map(([name]) => name));
  return new Set(normalized.split(",").map((item) => item.trim()).filter(Boolean));
}

function openBlockRequestDialog(record) {
  openDialog({
    title: record.requestNo,
    typeLabel: "Block / Unblock Request",
    body: `
      <label>Request Type<input value="${escapeHtml(record.requestType || "Unblock")}" readonly /></label>
      <label>Target<input value="${escapeHtml(record.targetType || "Customer")}" readonly /></label>
      <label>Reference<input value="${escapeHtml(record.referenceNo || record.customerName)}" readonly /></label>
      <label>Requested By<input value="${escapeHtml(record.requestedBy)}" readonly /></label>
      <label>Status<input value="${escapeHtml(record.status)}" readonly /></label>
      <label>Reason<textarea rows="4" readonly>${escapeHtml(record.reason)}</textarea></label>
      <label>Approval Notes<textarea name="approvalNotes" rows="4">${escapeHtml(record.notes || "")}</textarea></label>
    `,
    saveLabel: "Approve Request",
    secondaryLabel: "Reject Request",
    async onSave() {
      const data = collectFormValues(dialogBody.closest("form"));
      await approveBlockRequest(record, data.approvalNotes || "");
      recordDialog.close();
      render();
    },
    async onSecondary() {
      const data = collectFormValues(dialogBody.closest("form"));
      await rejectBlockRequest(record, data.approvalNotes || "");
      recordDialog.close();
      render();
    }
  });
}

function chargeDialogBody() {
  const invoiceOptions = ["", ...state.invoices.map((row) => row.invoiceNo)];
  return `
    ${input("refNo", "Receipt / Reference No", nextAdditionalChargeNumber(), false)}
    ${selectFrom("shipmentNo", "Shipment No", shipmentOptions())}
    ${input("chargeDate", "Charge Date", today(), false, "date")}
    ${selectFrom("supplier", "Supplier / Vendor", state.suppliers.map((row) => row.name))}
    ${input("referenceNo", "Reference No", "")}
    ${select("invoiceNo", "Invoice No", invoiceOptions, "")}
    ${input("taxPercent", "Tax %", "0", false, "number")}
    ${selectEditable("currency", "Currency", "currency", currencyOptions(), "KD")}
    <input type="hidden" name="chargeLines" value="[]" />
    <section class="charge-line-builder" data-charge-line-builder>
      <div class="charge-line-entry">
        ${select("lineChargeType", "Charge Type", chargeTypeOptions())}
        ${input("lineAmount", "Amount", "0.000", false, "number")}
        <button type="button" class="secondary-button" data-dialog-action="add-charge-line">Add</button>
      </div>
      <div class="charge-line-list" data-charge-lines-list></div>
      <p class="empty-state">Add one or more charge lines to the same receipt/reference number.</p>
    </section>
    ${input("attachmentName", "Attachment Upload", "")}
    ${select("status", "Status", chargeStatusOptions(), isAdminSession() ? "Approved" : "Pending Approval")}
    ${textarea("remarks", "Remarks", "")}
  `;
}

function bindChargeLineBuilder() {
  const builder = dialogBody.querySelector("[data-charge-line-builder]");
  if (!builder) return;
  const hiddenField = dialogBody.querySelector("input[name='chargeLines']");
  const typeField = dialogBody.querySelector("select[name='lineChargeType']");
  const amountField = dialogBody.querySelector("input[name='lineAmount']");
  const list = builder.querySelector("[data-charge-lines-list]");
  const lines = [];

  const sync = () => {
    hiddenField.value = JSON.stringify(lines);
    const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    list.innerHTML = lines.length
      ? `${lines
          .map(
            (line, index) => `<div class="charge-line-row">
              <span>${escapeHtml(line.chargeType)}</span>
              <strong>${money(line.amount)}</strong>
              <button type="button" class="ghost-button" data-remove-charge-line="${index}">Remove</button>
            </div>`
          )
          .join("")}<div class="charge-line-total"><span>Total Added</span><strong>${money(total)}</strong></div>`
      : `<p class="empty-state">No charge lines added yet.</p>`;
  };

  builder.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-dialog-action='add-charge-line']");
    if (addButton) {
      const amount = Number(amountField.value || 0);
      if (!amount || amount <= 0) {
        notifyDenied("Line not added", "Enter an amount greater than zero.");
        return;
      }
      lines.push({ chargeType: typeField.value, amount });
      amountField.value = "0.000";
      sync();
      return;
    }

    const removeButton = event.target.closest("[data-remove-charge-line]");
    if (removeButton) {
      lines.splice(Number(removeButton.dataset.removeChargeLine), 1);
      sync();
    }
  });

  sync();
}

function consolidationShipmentPicker(initialJobs = "", currentLoadNo = "") {
  const shipmentOptionIds = availableConsolidationShipmentOptions(initialJobs, currentLoadNo);
  return `<div class="dialog-picker" data-consolidation-picker>
    <input type="hidden" name="jobNumbers" value="${escapeHtml(initialJobs)}" />
    <label>Add Shipment To Manifest
      <select data-consolidation-job-select>
        ${shipmentOptionIds.map((jobNo) => {
          const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo);
          return `<option value="${escapeHtml(jobNo)}">${escapeHtml(shipmentItem ? shipmentOptionLabel(shipmentItem) : jobNo)}</option>`;
        }).join("")}
      </select>
    </label>
    <div class="action-row">
      <button type="button" class="secondary-button" data-dialog-action="add-consolidation-job">Add Shipment</button>
    </div>
    <div class="selected-job-list" data-consolidation-jobs-list></div>
    ${tariffPreviewShell("load")}
    <p class="empty-state">${shipmentOptionIds.length ? "Only shipments saved with service type Consolidation are available. Already assigned shipments are hidden." : "No unassigned Consolidation service shipments are available."}</p>
  </div>`;
}

function bindShipmentDirectionDialog() {
  const directionSelect = dialogBody.querySelector("[name='shipmentDirection']");
  const serviceSelect = dialogBody.querySelector("[name='shipmentService']");
  const otherField = dialogBody.querySelector("[name='shipmentServiceOther']");
  if (!directionSelect || !serviceSelect) return;
  const serviceList = dialogBody.querySelector("#shipmentServiceOptions");

  const syncOptions = () => {
    const currentValue = serviceSelect.value;
    const options = shipmentServiceOptions(directionSelect.value);
    if (serviceList) serviceList.innerHTML = options.map((option) => `<option value="${escapeHtml(optionValue(option))}" label="${escapeHtml(optionLabel(option))}"></option>`).join("");
    if (options.includes(currentValue)) {
      serviceSelect.value = currentValue;
    } else if (directionSelect.value === "Consolidation" || directionSelect.value === "Consoladation") {
      serviceSelect.value = "Consolidation";
      if (otherField) otherField.placeholder = "Manual consolidation remark";
    } else {
      serviceSelect.value = options[0];
      if (otherField) otherField.placeholder = "Optional other service";
    }
  };

  directionSelect.addEventListener("change", syncOptions);
  syncOptions();
}

function bindShipmentCustomerTariffs() {
  const customerField = dialogBody.querySelector("input[name='customer']");
  const tariffField = dialogBody.querySelector("input[name='tariffNo']");
  if (!customerField || !tariffField || tariffField.type !== "text") return;
  const datalistId = tariffField.getAttribute("list");
  const datalist = datalistId ? dialogBody.querySelector(`#${CSS.escape(datalistId)}`) : null;
  if (!datalist) return;

  const syncTariffs = () => {
    const options = tariffOptionsForCustomer(customerField.value);
    datalist.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}" label="${escapeHtml(option.label)}"></option>`).join("");
    if (!options.some((option) => option.value === tariffField.value)) {
      tariffField.value = options[0]?.value || "";
    }
  };

  customerField.addEventListener("input", syncTariffs);
  customerField.addEventListener("change", syncTariffs);
  syncTariffs();
}

function bindShipmentCustomerAutofill() {
  const customerField = dialogBody.querySelector("input[name='customer']");
  const codeField = dialogBody.querySelector("input[name='customerCode']");
  if (!customerField && !codeField) return;

  const fill = (source) => {
    const value = String(source?.value || "").trim().toLowerCase();
    if (!value) return;
    const customer = state.customers.find((row) =>
      String(row.name || "").trim().toLowerCase() === value ||
      String(row.code || "").trim().toLowerCase() === value
    );
    if (!customer) return;

    setDialogValue("customer", customer.name);
    setDialogValue("customerCode", customer.code);
    setDialogValue("customerEmail", customer.email);
    setDialogValue("customerMobile", customer.mobile);
    setDialogValue("customerContactPerson", customer.name);
    setDialogValue("customerAddress", customer.fullAddress || customer.locationOrLane);
    setDialogValue("consigneeName", customer.name);
    setDialogValue("consigneeAddress", customer.fullAddress || customer.locationOrLane);
    setDialogValue("consigneeEmail", customer.email);
    setDialogValue("billTo1", customer.name);
    setDialogValue("billingParty1Address", customer.fullAddress || customer.locationOrLane);
    setDialogValue("billingParty1Email", customer.email);
    setDialogValue("billingParty1CreditTerms", customer.terms);
    setDialogValue("branch", customer.branch || defaultUserBranch());
  };

  customerField?.addEventListener("input", () => fill(customerField));
  customerField?.addEventListener("change", () => fill(customerField));
  codeField?.addEventListener("input", () => fill(codeField));
  codeField?.addEventListener("change", () => fill(codeField));
}

function customerDialogSnapshot() {
  return {
    name: dialogValue("customer"),
    code: dialogValue("customerCode"),
    address: dialogValue("customerAddress") || customerAddressFor(dialogValue("customer"), dialogValue("customerCode")),
    contact: dialogValue("customerContactPerson") || dialogValue("customer"),
    mobile: dialogValue("customerMobile"),
    email: dialogValue("customerEmail"),
    country: ""
  };
}

function deliveryDialogSnapshot() {
  return {
    name: dialogValue("deliveryLocation"),
    address: dialogValue("deliveryAddress"),
    contact: dialogValue("deliveryContactPerson"),
    mobile: dialogValue("deliveryMobile"),
    email: ""
  };
}

function customerAddressFor(name, code) {
  const lookup = [name, code].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  const customer = state.customers.find((row) => lookup.includes(String(row.name || "").trim().toLowerCase()) || lookup.includes(String(row.code || "").trim().toLowerCase()));
  return customer?.fullAddress || customer?.locationOrLane || "";
}

function bindShipmentCopySections() {
  const mappings = [
    ["copyCustomerToShipper", customerDialogSnapshot, { shipperName: "name", shipperAddress: "address", shipperContactPerson: "contact", shipperMobile: "mobile", shipperEmail: "email", shipperCountry: "country" }],
    ["copyCustomerToConsignee", customerDialogSnapshot, { consigneeName: "name", consigneeAddress: "address", consigneeContactPerson: "contact", consigneeMobile: "mobile", consigneeEmail: "email", consigneeCountry: "country" }],
    ["copyCustomerToPickup", customerDialogSnapshot, { pickupLocation: "name", pickupAddress: "address", pickupContactPerson: "contact", pickupMobile: "mobile" }],
    ["copyCustomerToBilling1", customerDialogSnapshot, { billTo1: "name", billingParty1Address: "address", billingParty1ContactPerson: "contact", billingParty1Mobile: "mobile", billingParty1Email: "email" }],
    ["copyDeliveryToNotify", deliveryDialogSnapshot, { notifyPartyName: "name", notifyPartyAddress: "address", notifyContactPerson: "contact", notifyMobile: "mobile", notifyEmail: "email" }],
    ["copyDeliveryToBilling2", deliveryDialogSnapshot, { billTo2: "name", billingParty2Address: "address", billingParty2ContactPerson: "contact", billingParty2Mobile: "mobile", billingParty2Email: "email" }]
  ];

  mappings.forEach(([checkboxName, sourceFactory, fieldMap]) => {
    const checkboxField = dialogBody.querySelector(`input[name='${checkboxName}']`);
    if (!checkboxField) return;
    const copy = () => {
      if (!checkboxField.checked) return;
      const source = sourceFactory();
      Object.entries(fieldMap).forEach(([target, sourceKey]) => setDialogValue(target, source[sourceKey]));
    };
    checkboxField.addEventListener("change", copy);
    ["customer", "customerCode", "customerContactPerson", "customerMobile", "customerEmail", "customerAddress", "deliveryLocation", "deliveryAddress", "deliveryContactPerson", "deliveryMobile"].forEach((name) => {
      dialogBody.querySelector(`[name='${name}']`)?.addEventListener("input", copy);
    });
    copy();
  });
}

function bindTransporterAutofill() {
  const transporterField = dialogBody.querySelector("input[name='transporter']");
  const codeField = dialogBody.querySelector("input[name='transporterCode']");
  if (!transporterField && !codeField) return;
  const fill = (field) => {
    const value = String(field?.value || "").trim().toLowerCase();
    if (!value) return;
    const supplier = state.suppliers.find((row) => String(row.name || "").trim().toLowerCase() === value || String(row.code || "").trim().toLowerCase() === value);
    if (!supplier) return;
    setDialogValue("transporter", supplier.name);
    setDialogValue("transporterCode", supplier.code);
  };
  transporterField?.addEventListener("input", () => fill(transporterField));
  transporterField?.addEventListener("change", () => fill(transporterField));
  codeField?.addEventListener("input", () => fill(codeField));
  codeField?.addEventListener("change", () => fill(codeField));
}

function bindTariffFinancialAutofill() {
  const tariffField = dialogBody.querySelector("input[name='tariffNo']");
  if (!tariffField) return;
  const chargeableField = dialogBody.querySelector("input[name='chargeableKg'], input[name='chargeableWeight']");
  const fill = () => {
    const tariff = state.tariffs.find((row) => String(row.tariffNo || "").trim().toLowerCase() === String(tariffField.value || "").trim().toLowerCase());
    if (!tariff) return;
    const pricing = tariffPricingForWeight(tariff, Number(chargeableField?.value || 0));
    setDialogValue("currency", tariff.currency || dialogValue("currency"));
    setDialogValue("freightAmount", pricing.freight || pricing.rate || tariff.rate || tariff.minimumCharge || 0);
    setDialogValue("otherChargesAmount", tariff.additionalChargesTotal || 0);
    setDialogValue("totalAmount", pricing.revenue || Number((Number(pricing.freight || tariff.rate || tariff.minimumCharge || 0) + Number(tariff.additionalChargesTotal || 0)).toFixed(3)));
  };
  tariffField.addEventListener("input", fill);
  tariffField.addEventListener("change", fill);
  chargeableField?.addEventListener("input", fill);
  chargeableField?.addEventListener("change", fill);
  fill();
}

function dialogValue(name) {
  return dialogBody.querySelector(`[name='${CSS.escape(name)}']`)?.value || "";
}

function setDialogValue(name, value) {
  const field = dialogBody.querySelector(`[name='${CSS.escape(name)}']`);
  if (field && value !== undefined && value !== null && value !== "") field.value = value;
}

function bindVolumeCalculator() {
  const categoryField = dialogBody.querySelector("[name='volumeCategory']");
  const divisorField = dialogBody.querySelector("[name='chargeableDivisor']");
  const cbmField = dialogBody.querySelector("[name='cbm']");
  const chargeableField = dialogBody.querySelector("[name='chargeableKg']");
  const actualWeightField = dialogBody.querySelector("[name='actualKg']");
  if (!categoryField || !divisorField || !cbmField || !chargeableField) return;

  const syncDivisor = () => {
    if (isSameAsGrossWeightCategory(categoryField.value)) {
      divisorField.value = "";
      divisorField.readOnly = true;
      syncChargeable();
      return;
    }
    const divisor = volumeDivisorFor(categoryField.value);
    if (divisor) {
      divisorField.value = String(divisor);
      divisorField.readOnly = true;
    } else {
      divisorField.readOnly = false;
      if (!Number(divisorField.value || 0)) divisorField.value = "";
    }
    syncChargeable();
  };

  const syncChargeable = () => {
    if (isSameAsGrossWeightCategory(categoryField.value)) {
      chargeableField.value = String(roundUpToWholeKg(actualWeightField?.value || 0));
      return;
    }
    const divisor = Number(divisorField.value || 0);
    const gross = Number(actualWeightField?.value || 0);
    const cbm = Number(cbmField.value || 0);
    const volumeWeight = cbm * divisor;
    if (divisor > 0 && cbm >= 0) {
      chargeableField.value = String(roundUpToWholeKg(Math.max(gross, volumeWeight)));
    }
  };

  categoryField.addEventListener("change", syncDivisor);
  cbmField.addEventListener("input", syncChargeable);
  divisorField.addEventListener("input", syncChargeable);
  actualWeightField?.addEventListener("input", syncChargeable);
  syncDivisor();
}

function bindPalletDimensionBuilder() {
  const builder = dialogBody.querySelector("[data-pallet-builder]");
  const hiddenField = dialogBody.querySelector("input[name='cargoItemsJson']") || dialogBody.querySelector("input[name='palletDimensionsJson']");
  const legacyPalletField = dialogBody.querySelector("input[name='palletDimensionsJson']");
  const cbmField = dialogBody.querySelector("input[name='cbm']");
  const chargeableField = dialogBody.querySelector("input[name='chargeableKg']");
  const piecesField = dialogBody.querySelector("input[name='pieces']");
  const actualWeightField = dialogBody.querySelector("input[name='actualKg']");
  const manualChargeableField = dialogBody.querySelector("input[name='manualChargeableKg']");
  const deliveryNoteField = dialogBody.querySelector("input[name='deliveryNoteNo']");
  const tcnField = dialogBody.querySelector("input[name='tcnNumber']");
  const airwayBillField = dialogBody.querySelector("input[name='airwayBillNo']");
  if (!builder || !hiddenField) return;

  const fields = {
    packageType: dialogBody.querySelector("[name='palletPackageType']"),
    count: dialogBody.querySelector("input[name='palletCount']"),
    length: dialogBody.querySelector("input[name='palletLength']"),
    width: dialogBody.querySelector("input[name='palletWidth']"),
    height: dialogBody.querySelector("input[name='palletHeight']"),
    dimensionUnit: dialogBody.querySelector("[name='palletDimensionUnit']"),
    weight: dialogBody.querySelector("input[name='palletWeight']"),
    totalWeight: dialogBody.querySelector("input[name='palletTotalWeight']")
  };
  const list = builder.querySelector("[data-pallet-lines-list]");
  const liveSummary = builder.querySelector("[data-cargo-live-summary]");
  const lines = parsePalletDimensions(hiddenField.value || "[]");
  let manualGrossTouched = false;
  let editingLineIndex = -1;

  const liveCalculation = () => {
    const count = Number(fields.count?.value || 0);
    const length = Number(fields.length?.value || 0);
    const width = Number(fields.width?.value || 0);
    const height = Number(fields.height?.value || 0);
    const weight = Number(fields.weight?.value || 0);
    const computedTotalWeight = weight * count;
    const manualTotalWeight = Number(fields.totalWeight?.value || 0);
    const totalWeight = manualGrossTouched ? manualTotalWeight : computedTotalWeight;
    const totalWeightKg = totalWeight;
    const cbm = cargoVolumeCbm(count, length, width, height, fields.dimensionUnit?.value || "CM");
    const volumeCategory = dialogBody.querySelector("[name='volumeCategory']")?.value;
    const volumeWeight = cargoVolumetricWeight(count, length, width, height, fields.dimensionUnit?.value || "CM", volumeCategory);
    const chargeable = isSameAsGrossWeightCategory(volumeCategory) ? totalWeightKg : Math.max(totalWeightKg, volumeWeight);
    if (fields.totalWeight && !manualGrossTouched) fields.totalWeight.value = String(Number(computedTotalWeight.toFixed(3)));
    if (liveSummary) {
      liveSummary.innerHTML = `
        <span>Pieces: ${escapeHtml(count || 0)}</span>
        <span>CBM: ${money(cbm)}</span>
        <span>Total Gross Weight: ${money(totalWeightKg)}</span>
      `;
    }
  };

  const currentShipmentData = () => collectFormValues(dialogBody.closest("form"));

  const printPod = () => {
    const data = currentShipmentData();
    const deliveryNo = data.deliveryNoteNo || nextDeliveryNoteNumber();
    const deliveryDatetime = data.deliveryDatetime || (data.deliveryDate ? `${data.deliveryDate}${data.deliveryTime ? `T${data.deliveryTime}` : ""}` : "");
    if (deliveryNoteField) deliveryNoteField.value = deliveryNo;
    openPrintableDocument(podDocumentHtml({
      ...data,
      deliveryNoteNo: deliveryNo,
      deliveryDatetime: deliveryDatetime || today()
    }));
  };

  const printTcn = (persistNumber = true) => {
    const data = currentShipmentData();
    const tcn = data.tcnNumber || data.airwayBillNo || nextTcnNumber();
    if (persistNumber) {
      if (tcnField) tcnField.value = tcn;
      if (airwayBillField) airwayBillField.value = tcn;
    }
    openPrintableDocument(tcnDocumentHtml({ ...data, airwayBillNo: tcn, tcnNumber: tcn, palletDimensionsJson: hiddenField.value }));
  };

  const sync = () => {
    const totalPieces = lines.reduce((sum, line) => sum + Number(line.count || line.quantity || 0), 0);
    const actualWeight = lines.reduce((sum, line) => sum + Number(line.weightKg || line.weight || 0), 0);
    const total = lines.reduce((sum, line) => sum + Number(line.total || line.volumeWeight || 0), 0);
    const volumeCategory = dialogBody.querySelector("[name='volumeCategory']")?.value;
    const roundedTotal = roundUpToHalf(total);
    const totalVolumetricWeight = isSameAsGrossWeightCategory(volumeCategory)
      ? actualWeight
      : Number((roundedTotal * volumeDivisorFor(volumeCategory)).toFixed(3));
    hiddenField.value = JSON.stringify(lines);
    if (legacyPalletField) legacyPalletField.value = hiddenField.value;
    if (piecesField) piecesField.value = String(totalPieces || Number(piecesField.value || 0));
    if (actualWeightField) actualWeightField.value = String(Number(actualWeight.toFixed(3)));
    if (cbmField) {
      cbmField.value = String(roundedTotal);
      cbmField.dataset.volumeWeight = String(totalVolumetricWeight);
    }
    const volumeWeight = isSameAsGrossWeightCategory(volumeCategory) ? actualWeight : totalVolumetricWeight;
    const chargeableWeight = Math.max(actualWeight, volumeWeight);
    if (chargeableField && !chargeableField.dataset.manualChargeable) chargeableField.value = String(roundUpToWholeKg(chargeableWeight));
    if (manualChargeableField && !Number(manualChargeableField.value || 0)) manualChargeableField.value = String(roundUpToWholeKg(chargeableWeight));
    list.innerHTML = palletDimensionTable(lines, total, roundedTotal, volumeCategory);
  };

  builder.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-dialog-action='add-pallet-line']");
    if (addButton) {
      const count = Number(fields.count?.value || 0);
      const length = Number(fields.length?.value || 0);
      const width = Number(fields.width?.value || 0);
      const height = Number(fields.height?.value || 0);
      if (count <= 0 || length <= 0 || width <= 0 || height <= 0) {
        notifyDenied("Pallet line not added", "Enter pallet count, length, width, and height.");
        return;
      }
      const dimensionUnit = fields.dimensionUnit?.value || "CM";
      const weight = Number(fields.weight?.value || 0);
      const total = cargoVolumeCbm(count, length, width, height, dimensionUnit);
      const totalWeight = manualGrossTouched ? Number(fields.totalWeight?.value || 0) : weight * count;
      const weightKg = totalWeight;
      const volumetricWeight = cargoVolumetricWeight(count, length, width, height, dimensionUnit, dialogBody.querySelector("[name='volumeCategory']")?.value);
      const line = {
        packageType: fields.packageType?.value || "Pallet",
        count,
        quantity: count,
        length,
        width,
        height,
        dimensionUnit,
        weight,
        weightUnit: "KG",
        totalWeight,
        weightKg,
        volumetricWeight,
        volumeWeight: total,
        total,
        remarks: ""
      };
      if (editingLineIndex >= 0) {
        lines.splice(editingLineIndex, 1, line);
        editingLineIndex = -1;
      } else {
        lines.push(line);
      }
      manualGrossTouched = false;
      sync();
      return;
    }

    const removeButton = event.target.closest("[data-remove-pallet-line]");
    if (removeButton) {
      lines.splice(Number(removeButton.dataset.removePalletLine), 1);
      sync();
      return;
    }

    const editButton = event.target.closest("[data-edit-pallet-line]");
    if (editButton) {
      editingLineIndex = Number(editButton.dataset.editPalletLine);
      const line = lines[editingLineIndex];
      if (!line) return;
      if (fields.packageType) fields.packageType.value = line.packageType || "Pallet";
      if (fields.count) fields.count.value = line.count || line.quantity || 1;
      if (fields.length) fields.length.value = line.length || 0;
      if (fields.width) fields.width.value = line.width || 0;
      if (fields.height) fields.height.value = line.height || 0;
      if (fields.dimensionUnit) fields.dimensionUnit.value = line.dimensionUnit || "CM";
      if (fields.weight) fields.weight.value = line.weight || 0;
      if (fields.totalWeight) fields.totalWeight.value = line.weightKg || line.totalWeight || 0;
      manualGrossTouched = true;
      liveCalculation();
    }
  });

  dialogBody.querySelector("[data-dialog-action='generate-pod']")?.addEventListener("click", printPod);
  dialogBody.querySelector("[data-dialog-action='generate-tcn']")?.addEventListener("click", () => printTcn(true));
  dialogBody.querySelector("[data-dialog-action='view-tcn']")?.addEventListener("click", () => printTcn(false));

  dialogBody.querySelector("[name='volumeCategory']")?.addEventListener("change", sync);
  chargeableField?.addEventListener("input", () => {
    const roundedChargeableWeight = roundUpToWholeKg(chargeableField.value);
    chargeableField.value = String(roundedChargeableWeight);
    chargeableField.dataset.manualChargeable = "1";
    if (manualChargeableField) manualChargeableField.value = String(roundedChargeableWeight);
  });
  fields.totalWeight?.addEventListener("input", () => {
    manualGrossTouched = true;
    liveCalculation();
  });
  fields.weight?.addEventListener("input", () => {
    manualGrossTouched = false;
  });
  fields.count?.addEventListener("input", () => {
    if (Number(fields.weight?.value || 0) > 0) manualGrossTouched = false;
  });
  Object.values(fields).forEach((field) => field?.addEventListener("input", liveCalculation));
  Object.values(fields).forEach((field) => field?.addEventListener("change", liveCalculation));
  liveCalculation();
  sync();
}

function cargoVolumeCbm(count, length, width, height, unit = "CM") {
  const divisor = unit === "M" ? 1 : unit === "INCH" ? 61023.7441 : 1000000;
  return Number((count * length * width * height / divisor).toFixed(3));
}

function cargoVolumetricWeight(count, length, width, height, unit = "CM", category = "") {
  const factor = volumeDivisorFor(category);
  if (!factor) return 0;
  return Number((cargoVolumeCbm(count, length, width, height, unit) * factor).toFixed(3));
}

function palletDimensionTable(lines, total, roundedTotal, volumeCategory = "") {
  const rows = lines.length
    ? lines.map((line, index) => `<tr>
      <td>${index + 1}</td><td>${escapeHtml(line.packageType || "Pallet")}</td><td>${line.count || line.quantity}</td><td>${line.length}</td><td>${line.width}</td><td>${line.height}</td><td>${escapeHtml(line.dimensionUnit || "CM")}</td><td>${money(line.weightKg || line.totalWeight || 0)}</td><td>${money(cargoVolumetricWeight(line.count || line.quantity, line.length, line.width, line.height, line.dimensionUnit || "CM", volumeCategory))}</td>
      <td><button type="button" class="ghost-button" data-remove-pallet-line="${index}">Remove</button><button type="button" class="ghost-button" data-edit-pallet-line="${index}">Edit</button></td>
    </tr>`).join("")
    : `<tr><td colspan="10" class="empty-state">No cargo items added.</td></tr>`;
  return `<div class="table-wrap"><table class="tariff-charges-table pallet-dimensions-table">
    <colgroup>
      <col class="pallet-col-sr" />
      <col class="pallet-col-count" />
      <col class="pallet-col-count" />
      <col class="pallet-col-measure" />
      <col class="pallet-col-measure" />
      <col class="pallet-col-measure" />
      <col class="pallet-col-measure" />
      <col class="pallet-col-total" />
      <col class="pallet-col-total" />
      <col class="pallet-col-button" />
    </colgroup>
    <thead><tr><th>Sr no</th><th>Package Type</th><th>Qty</th><th>Length</th><th>Width</th><th>Height</th><th>Unit</th><th>Weight KG</th><th>Volume Weight</th><th>Button</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><th colspan="8">Grand total CBM</th><th>${roundedTotal}</th><th></th></tr></tfoot>
  </table></div>`;
}

function tariffAdditionalChargesBuilder(initialValue = "[]") {
  return `<section class="tariff-charge-builder" data-tariff-charge-builder>
    <input type="hidden" name="additionalChargesJson" value="${escapeHtml(initialValue)}" />
    <input type="hidden" name="additionalChargesTotal" value="0" />
    <input type="hidden" name="grandTotal" value="0" />
    <div class="tariff-charge-entry">
      ${input("tariffChargeDescription", "Additional Charge Description", "")}
      ${input("tariffChargeQuotation", "Quotation Per Unit", "0.000", false, "number")}
      ${input("tariffChargeUnits", "Units", "1", false, "number")}
      <button type="button" class="secondary-button" data-dialog-action="add-tariff-charge">Add More</button>
    </div>
    <div class="tariff-charge-table" data-tariff-charge-list></div>
  </section>`;
}

function bindTariffAdditionalCharges(initialValue = "[]") {
  const builder = dialogBody.querySelector("[data-tariff-charge-builder]");
  if (!builder) return;
  const hiddenField = builder.querySelector("input[name='additionalChargesJson']");
  const totalField = builder.querySelector("input[name='additionalChargesTotal']");
  const grandField = builder.querySelector("input[name='grandTotal']");
  const minChargeField = dialogBody.querySelector("input[name='minCharge']");
  const descriptionField = builder.querySelector("input[name='tariffChargeDescription']");
  const quotationField = builder.querySelector("input[name='tariffChargeQuotation']");
  const unitsField = builder.querySelector("input[name='tariffChargeUnits']");
  const list = builder.querySelector("[data-tariff-charge-list]");
  let lines = parseTariffChargeLines(initialValue || hiddenField.value);

  const sync = () => {
    const total = lines.reduce((sum, line) => sum + Number(line.total || 0), 0);
    const grandTotal = Number(minChargeField?.value || 0) + total;
    hiddenField.value = JSON.stringify(lines);
    totalField.value = String(total);
    grandField.value = String(grandTotal);
    list.innerHTML = tariffChargeTable(lines, total, grandTotal);
  };

  builder.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-dialog-action='add-tariff-charge']");
    if (addButton) {
      const description = descriptionField.value.trim();
      const quotation = Number(quotationField.value || 0);
      const units = Number(unitsField.value || 0);
      if (!description || quotation <= 0 || units <= 0) {
        notifyDenied("Line not added", "Enter description, quotation, and units.");
        return;
      }
      lines.push({ description, quotation, units, total: quotation * units });
      descriptionField.value = "";
      quotationField.value = "0.000";
      unitsField.value = "1";
      sync();
      return;
    }

    const removeButton = event.target.closest("[data-remove-tariff-charge]");
    if (removeButton) {
      lines.splice(Number(removeButton.dataset.removeTariffCharge), 1);
      sync();
    }
  });

  minChargeField?.addEventListener("input", sync);
  sync();
}

function parseTariffChargeLines(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.map((line, index) => ({
          description: line.description || "",
          quotation: Number(line.quotation || 0),
          units: Number(line.units || 0),
          total: Number(line.total || Number(line.quotation || 0) * Number(line.units || 0)),
          srNo: index + 1
        })).filter((line) => line.description)
      : [];
  } catch {
    return [];
  }
}

function tariffChargeTable(lines, total, grandTotal, showActions = true, options = {}) {
  const actionHeader = showActions ? "<th>Button</th>" : "";
  const footerAction = showActions ? "<th></th>" : "";
  const emptyColspan = showActions ? 6 : 5;
  const showTotalRow = options.showTotalRow !== false;
  const rows = lines.length
    ? lines.map((line, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(line.description)}</td>
        <td>${money(line.quotation)}</td>
        <td>${escapeHtml(line.units)}</td>
        <td>${money(line.total)}</td>
        ${showActions ? `<td><button type="button" class="ghost-button" data-remove-tariff-charge="${index}">Remove</button></td>` : ""}
      </tr>`).join("")
    : `<tr><td colspan="${emptyColspan}" class="empty-state">No charges added.</td></tr>`;
  return `<div class="table-wrap"><table class="tariff-charges-table">
    <thead><tr><th>Sr no</th><th>Description</th><th>Quotation per unit</th><th>Units</th><th>Total</th>${actionHeader}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      ${showTotalRow ? `<tr><th colspan="4">Total</th><th>${money(total)}</th>${footerAction}</tr>` : ""}
      <tr><th colspan="4">Grand total</th><th>${money(grandTotal)}</th>${footerAction}</tr>
    </tfoot>
  </table></div>`;
}

function normalizeLookupText(value) {
  return String(value || '').trim().toLowerCase();
}

function customerSearchTokens(customerName) {
  const lookup = normalizeLookupText(customerName);
  if (!lookup) return [];
  const tokens = new Set([lookup]);
  visibleRows(state.customers).forEach((customer) => {
    const matched = [customer.name, customer.code, customer.customerName, customer.customerCode].some((value) => {
      const candidate = normalizeLookupText(value);
      return candidate && (candidate === lookup || candidate.includes(lookup) || lookup.includes(candidate));
    });
    if (!matched) return;
    [customer.name, customer.code, customer.customerName, customer.customerCode].forEach((value) => {
      const candidate = normalizeLookupText(value);
      if (candidate) tokens.add(candidate);
    });
  });
  return [...tokens];
}

function rowMatchesLookup(row, fields, tokens) {
  if (!tokens.length) return true;
  return fields.some((value) => {
    const candidate = normalizeLookupText(value);
    return candidate && tokens.some((token) => candidate === token || candidate.includes(token) || token.includes(candidate));
  });
}

function invoiceCustomerOptions() {
  const options = [];
  const seen = new Set();
  const addOption = (value, label) => {
    const key = normalizeLookupText(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value, label: label || value });
  };

  visibleRows(state.customers).forEach((row) => {
    addOption(row.name || row.customerName || '', [row.code, row.name || row.customerName || ''].filter(Boolean).join(' | '));
  });
  visibleRows(state.shipments).forEach((row) => {
    addOption(row.customer || row.customerName || row.consigneeName || row.billTo1 || '', [row.jobNo, row.customerCode, row.origin, row.destination].filter(Boolean).join(' | '));
  });

  return options;
}

function invoiceShipmentOptionsForCustomer(customerName) {
  return invoiceShipmentsForCustomer(customerName).map((row) => ({
    value: row.jobNo,
    label: row.jobNo + ' | ' + (row.customer || row.customerName || row.billTo1 || '') + ' | ' + (row.origin || '') + ' to ' + (row.destination || '')
  }));
}

function invoiceTariffOptionsForCustomer(customerName) {
  return invoiceTariffsForCustomer(customerName).map((row) => ({
    value: row.tariffNo,
    label: row.tariffNo + ' | ' + (row.customer || '') + ' | ' + (row.origin || '') + ' to ' + (row.destination || '')
  }));
}

function invoiceTariffsForCustomer(customerName) {
  const lookup = normalizeLookupText(customerName);
  if (!lookup) return [];
  const rows = visibleRows(state.tariffs);
  const tokens = customerSearchTokens(customerName);
  return rows.filter((row) => rowMatchesLookup(row, [row.customer, row.consigneeName, row.customerName, row.customerCode, row.tariffNo], tokens));
}

function invoiceShipmentsForCustomer(customerName) {
  const lookup = normalizeLookupText(customerName);
  if (!lookup) return [];
  const rows = visibleRows(state.shipments);
  const tokens = customerSearchTokens(customerName);
  return rows.filter((row) => rowMatchesLookup(row, [row.customer, row.customerName, row.billTo1, row.shipperName, row.consigneeName, row.customerCode], tokens));
}

function parseInvoiceLineItems(value) {
  try {
    var parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed)
      ? parsed.map((line, index) => ({
          id: line.id || 'invoice-line-' + (index + 1),
          source: line.source || 'manual',
          description: line.description || '',
          unit: line.unit || 'Unit',
          qty: Number(line.qty || 0),
          rate: Number(line.rate || 0),
          amount: Number(line.amount || line.total || 0),
          cost: Number(line.cost || 0),
          remarks: line.remarks || '',
          tariffNo: line.tariffNo || '',
          tariffName: line.tariffName || '',
          chargeableWeight: Number(line.chargeableWeight || 0)
        }))
      : [];
  } catch {
    return [];
  }
}

function invoiceLineAmount(line) {
  var qty = Number(line?.qty || 0);
  var rate = Number(line?.rate || 0);
  var amount = Number(line?.amount || 0);
  return amount || qty * rate;
}

function invoiceTotals(lines, taxPercent) {
  var revenue = lines.reduce((sum, line) => sum + invoiceLineAmount(line), 0);
  var cost = lines.reduce((sum, line) => sum + Number(line?.cost || 0), 0);
  var taxAmount = revenue * (Number(taxPercent || 0) / 100);
  var grandTotal = revenue + taxAmount;
  var grossProfit = revenue - cost;
  var profitPercent = revenue ? (grossProfit / revenue) * 100 : 0;
  return {
    revenue: Number(revenue.toFixed(3)),
    cost: Number(cost.toFixed(3)),
    taxAmount: Number(taxAmount.toFixed(3)),
    grandTotal: Number(grandTotal.toFixed(3)),
    grossProfit: Number(grossProfit.toFixed(3)),
    profitPercent: Number(profitPercent.toFixed(2))
  };
}

function effectiveChargeableWeightForShipment(shipmentItem) {
  const manual = Number(shipmentItem?.manualChargeableKg || 0);
  if (manual > 0) return roundUpToWholeKg(manual);
  const actual = Number(shipmentItem?.actualKg || 0);
  const cbm = Number(shipmentItem?.cbm || 0);
  const divisor = Number(shipmentItem?.chargeableDivisor || volumeDivisorFor(shipmentItem?.volumeCategory || '') || 0);
  const volumetric = divisor > 0 && cbm > 0 ? Number((cbm * divisor).toFixed(3)) : 0;
  const calculated = Math.max(actual, volumetric);
  if (calculated > 0) return roundUpToWholeKg(calculated);
  return Number(shipmentItem?.chargeableKg || 0);
}

function invoiceLinesFromTariff(shipmentItem, tariffItem, chargeableWeight = effectiveChargeableWeightForShipment(shipmentItem)) {
  if (!tariffItem) return [];
  const pricing = tariffPricingForWeight(tariffItem, chargeableWeight);
  const weightLabel = pricing.band?.label ? " (" + pricing.band.label + ")" : "";
  const lines = [{
    id: "tariff-base",
    source: "tariff-base",
    description: (tariffItem.customer || "Freight Charge") + weightLabel,
    unit: "KG",
    qty: chargeableWeight || 1,
    rate: pricing.rate,
    amount: pricing.freight,
    cost: Number(tariffItem.supplierCost || 0),
    remarks: pricing.band?.label || "",
    chargeableWeight,
    tariffNo: tariffItem.tariffNo || "",
    tariffName: tariffItem.customer || ""
  }];
  const extras = parseTariffChargeLines(tariffItem.additionalChargesJson || "[]").map((line, index) => ({
    id: "tariff-extra-" + (index + 1),
    source: "tariff-extra",
    description: line.description || "",
    unit: "Unit",
    qty: Number(line.units || 1),
    rate: Number(line.quotation || 0),
    amount: Number(line.total || Number(line.quotation || 0) * Number(line.units || 0)),
    cost: Number(line.cost || 0),
    remarks: String(line.remarks || ""),
    chargeableWeight,
    tariffNo: tariffItem.tariffNo || "",
    tariffName: tariffItem.customer || ""
  }));
  return lines.concat(extras);
}

function invoiceSnapshotFromSelection(shipmentItem, tariffItem, lines, taxPercent) {
  var summary = invoiceTotals(lines, taxPercent);
  return {
    customerCode: shipmentItem?.customerCode || '',
    customerName: shipmentItem?.customer || '',
    shipmentNo: shipmentItem?.jobNo || '',
    tariffNo: tariffItem?.tariffNo || '',
    tariffName: tariffItem?.customer || '',
    chargeableWeight: effectiveChargeableWeightForShipment(shipmentItem),
    grossWeight: Number(shipmentItem?.actualKg || 0),
    volumeWeight: Number(shipmentItem?.cbm || 0),
    lines: lines,
    taxPercent: Number(taxPercent || 0),
    revenue: summary.revenue,
    cost: summary.cost,
    taxAmount: summary.taxAmount,
    grandTotal: summary.grandTotal,
    grossProfit: summary.grossProfit,
    profitPercent: summary.profitPercent
  };
}

function invoiceLineTable(lines, canEditCost) {
  var rows = lines.length ? lines.map((line, index) => {
    return '<tr data-invoice-line-row="' + index + '">' +
      '<td>' + (index + 1) + '</td>' +
      '<td><input data-invoice-line-field="description" data-line-index="' + index + '" value="' + escapeHtml(line.description || '') + '" /></td>' +
      '<td><input data-invoice-line-field="unit" data-line-index="' + index + '" value="' + escapeHtml(line.unit || '') + '" /></td>' +
      '<td><input data-invoice-line-field="qty" data-line-index="' + index + '" type="number" step="0.001" value="' + escapeHtml(line.qty ?? 0) + '" /></td>' +
      '<td><input data-invoice-line-field="rate" data-line-index="' + index + '" type="number" step="0.001" value="' + escapeHtml(line.rate ?? 0) + '" /></td>' +
      '<td><input data-invoice-line-field="amount" data-line-index="' + index + '" type="number" step="0.001" value="' + escapeHtml(invoiceLineAmount(line)) + '" /></td>' +
      '<td><input data-invoice-line-field="cost" data-line-index="' + index + '" type="number" step="0.001" ' + (canEditCost ? '' : 'readonly') + ' value="' + escapeHtml(line.cost ?? 0) + '" /></td>' +
      '<td><input data-invoice-line-field="remarks" data-line-index="' + index + '" value="' + escapeHtml(line.remarks || '') + '" /></td>' +
      '<td><button type="button" class="ghost-button" data-remove-invoice-line="' + index + '">Remove</button></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="9" class="empty-state">No tariff lines loaded yet.</td></tr>';
  return '<div class="table-wrap"><table class="tariff-charges-table invoice-lines-table"><thead><tr><th>Sr no</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Cost</th><th>Remarks</th><th>Button</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function invoicePreviewSummary(summary) {
  return '<section class="summary-card invoice-summary">' +
    '<div><span>Revenue</span><strong data-invoice-summary="revenue">' + money(summary.revenue) + '</strong></div>' +
    '<div><span>Cost</span><strong data-invoice-summary="cost">' + money(summary.cost) + '</strong></div>' +
    '<div><span>Tax</span><strong data-invoice-summary="taxAmount">' + money(summary.taxAmount) + '</strong></div>' +
    '<div><span>Gross Profit</span><strong data-invoice-summary="grossProfit">' + money(summary.grossProfit) + '</strong></div>' +
    '<div><span>Profit %</span><strong data-invoice-summary="profitPercent">' + money(summary.profitPercent) + '%</strong></div>' +
    '<div><span>Grand Total</span><strong data-invoice-summary="grandTotal">' + money(summary.grandTotal) + '</strong></div>' +
  '</section>';
}

function invoicePreviewMeta(shipmentItem, tariffItem) {
  return '<div class="tariff-preview-meta">' +
    '<div><span>Shipment</span><strong>' + escapeHtml(shipmentItem?.jobNo || '') + '</strong></div>' +
    '<div><span>Customer</span><strong>' + escapeHtml(shipmentItem?.customer || '') + '</strong></div>' +
    '<div><span>Tariff</span><strong>' + escapeHtml(tariffItem?.tariffNo || '') + '</strong></div>' +
    '<div><span>Weights</span><strong>' + escapeHtml([shipmentItem?.actualKg, shipmentItem?.cbm].filter(Boolean).join(' / ')) + '</strong></div>' +
  '</div>';
}

function invoicePreviewMarkup(shipmentItem, tariffItem, lines, taxPercent, canEditCost = true) {
  const selectedWeight = shipmentItem ? effectiveChargeableWeightForShipment(shipmentItem) : null;
  var summary = invoiceTotals(lines, taxPercent);
  return '<section class="invoice-preview-shell">' +
    invoicePreviewMeta(shipmentItem, tariffItem) +
    (tariffItem ? tariffPreviewHtml([tariffItem], 'Select a tariff to view full details.', selectedWeight) : '<p class="empty-state">Select a tariff to view full details.</p>') +
    invoicePreviewSummary(summary) +
    invoiceLineTable(lines, canEditCost) +
    '<div class="action-row"><button type="button" class="secondary-button" data-add-invoice-line>Add Charge</button></div>' +
  '</section>';
}

function tariffSelectionOptions(customerName = "") {
  const rows = customerName ? invoiceTariffsForCustomer(customerName) : visibleRows(state.tariffs);
  return rows.map((row) => ({
    value: row.tariffNo,
    label: row.tariffNo + " | " + row.customer + " | " + row.origin + " to " + row.destination
  }));
}

function tariffPreviewShell(scope) {
  return `<section class="tariff-detail-preview" data-tariff-preview="${escapeHtml(scope)}"></section>`;
}

function summaryPair(label, value) {
  return `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "")}</strong></p>`;
}

function tariffPreviewHtml(tariffs, emptyText = "Select a tariff to view full details.", selectedWeight = null) {
  const uniqueTariffs = [];
  const seen = new Set();
  tariffs.filter(Boolean).forEach((tariffItem) => {
    const key = String(tariffItem.tariffNo || "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniqueTariffs.push(tariffItem);
  });
  if (!uniqueTariffs.length) return "<p class=\"empty-state\">" + escapeHtml(emptyText) + "</p>";
  return uniqueTariffs.map((tariffItem) => {
    const charges = parseTariffChargeLines(tariffItem.additionalChargesJson || "[]");
    const pricing = tariffPricingForWeight(tariffItem, selectedWeight || 0);
    const headlineTotal = selectedWeight ? pricing.revenue : Number(tariffItem.grandTotal || tariffItem.minCharge || 0);
    return "<article class=\"tariff-preview-card\">" +
      "<div class=\"tariff-preview-heading\"><div><p class=\"eyebrow\">Tariff Details</p><h3>" + escapeHtml(tariffItem.tariffNo) + "</h3></div><strong>" + escapeHtml(tariffItem.currency || "KD") + " " + money(headlineTotal) + "</strong></div>" +
      "<div class=\"tariff-preview-grid\">" +
        summaryPair("Consignee", tariffItem.customer) +
        summaryPair("Origin", tariffItem.origin) +
        summaryPair("Destination", tariffItem.destination) +
        summaryPair("Main Section", tariffItem.mainSection) +
        tariffPreviewRateSummary(tariffItem, selectedWeight || 0) +
      "</div>" +
      tariffWeightRateTableHtml(tariffItem, { selectedWeight }) +
      tariffChargeTable(charges, Number(tariffItem.additionalChargesTotal || 0), Number(tariffItem.grandTotal || 0), false) +
    "</article>";
  }).join("");
}

function updateTariffPreview(scope, tariffs, emptyText) {
  const container = dialogBody.querySelector('[data-tariff-preview="' + scope + '"]');
  if (!container) return;
  if (scope === 'invoice') {
    const invoiceLinesField = dialogBody.querySelector('input[name="invoiceLinesJson"]');
    const taxPercentField = dialogBody.querySelector('input[name="taxPercent"]');
    container.innerHTML = invoicePreviewMarkup(null, tariffs[0] || null, parseInvoiceLineItems(invoiceLinesField?.value || '[]'), Number(taxPercentField?.value || 0), true);
    return;
  }
  container.innerHTML = tariffPreviewHtml(tariffs, emptyText);
}

function tariffsForJobNumbers(jobNumbers) {
  return jobNumbers
    .map((jobNo) => state.shipments.find((shipmentItem) => shipmentItem.jobNo === jobNo))
    .filter(Boolean)
    .map(assignedTariffForShipment)
    .filter(Boolean);
}

function bindDialogPasswordToggles() {
  dialogBody.querySelectorAll("[data-dialog-action='toggle-password']").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.closest(".password-input-wrap")?.querySelector("input");
      if (!field) return;
      const shouldShow = field.type === "password";
      field.type = shouldShow ? "text" : "password";
      button.textContent = shouldShow ? "Hide" : "View";
    });
  });
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
    const jobNumbers = [...selectedJobs];
    hiddenField.value = jobNumbers.join(", ");
    list.innerHTML = selectedJobs.size
      ? [...selectedJobs].map((jobNo) => {
          const shipmentItem = state.shipments.find((row) => row.jobNo === jobNo);
          return `<span class="job-chip selected-job-chip"><strong>${escapeHtml(jobNo)}</strong><small>${escapeHtml(shipmentItem ? `${shipmentItem.customer} | ${shipmentItem.origin} to ${shipmentItem.destination}` : "Shipment details not found")}</small><button type="button" class="ghost-button" data-remove-consolidation-job="${escapeHtml(jobNo)}">Remove</button></span>`;
        }).join("")
      : `<p class="empty-state">No shipments added yet.</p>`;
    updateTariffPreview("load", tariffsForJobNumbers(jobNumbers), "Add shipments to this manifest to view their tariff details.");
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
  if (form.querySelectorAll("input[name='sectionAccessList']").length) {
    data.sectionAccess = normalizeSectionAccess(formData.getAll("sectionAccessList").join(", ") || "Dashboard");
  }
  form.querySelectorAll("input[type='checkbox'][name]").forEach((input) => {
    if (input.name === "sectionAccessList") return;
    data[input.name] = input.checked;
  });
  return data;
}

function bindInvoiceShipmentTariff() {
  const customerField = dialogBody.querySelector('input[name="customer"]');
  const shipmentField = dialogBody.querySelector('input[name="shipmentNo"]');
  const tariffField = dialogBody.querySelector('input[name="tariffNo"]');
  const taxPercentField = dialogBody.querySelector('input[name="taxPercent"]');
  const invoiceLinesField = dialogBody.querySelector('input[name="invoiceLinesJson"]');
  const tariffSnapshotField = dialogBody.querySelector('input[name="tariffSnapshotJson"]');
  const invoiceSnapshotField = dialogBody.querySelector('input[name="invoiceSnapshotJson"]');
  const totalCostField = dialogBody.querySelector('input[name="totalCost"]');
  const supplierCostField = dialogBody.querySelector('input[name="supplierCost"]');
  const revenueField = dialogBody.querySelector('input[name="revenue"]');
  const grandTotalField = dialogBody.querySelector('input[name="grandTotal"]');
  const profitPercentField = dialogBody.querySelector('input[name="profitPercent"]');
  const taxAmountField = dialogBody.querySelector('input[name="taxAmount"]');
  const chargeableWeightField = dialogBody.querySelector('input[name="chargeableWeight"]');
  const grossWeightField = dialogBody.querySelector('input[name="grossWeight"]');
  const volumeWeightField = dialogBody.querySelector('input[name="volumeWeight"]');
  const tariffNameField = dialogBody.querySelector('input[name="tariffName"]');
  const previewContainer = dialogBody.querySelector('[data-tariff-preview="invoice"]');
  const shipmentDatalist = shipmentField?.getAttribute('list') ? dialogBody.querySelector('#' + shipmentField.getAttribute('list') + 'Options') : null;
  const tariffDatalist = tariffField?.getAttribute('list') ? dialogBody.querySelector('#' + tariffField.getAttribute('list') + 'Options') : null;
  let lines = parseInvoiceLineItems(invoiceLinesField?.value || '[]');

  const selectedShipment = () => state.shipments.find((row) => String(row.jobNo || '').trim().toLowerCase() === String(shipmentField?.value || '').trim().toLowerCase()) || null;
  const selectedTariff = () => state.tariffs.find((row) => String(row.tariffNo || '').trim().toLowerCase() === String(tariffField?.value || '').trim().toLowerCase()) || assignedTariffForShipment(selectedShipment()) || null;

  const syncDatalist = () => {
    if (shipmentDatalist) {
      const shipments = invoiceShipmentOptionsForCustomer(customerField?.value || '');
      shipmentDatalist.innerHTML = shipments.map((option) => '<option value="' + escapeHtml(option.value || '') + '" label="' + escapeHtml(option.label || option.value || '') + '"></option>').join('');
      if (shipmentField?.value && !shipments.some((option) => option.value === shipmentField.value)) shipmentField.value = '';
    }
    if (tariffDatalist) {
      const tariffs = invoiceTariffOptionsForCustomer(customerField?.value || '');
      tariffDatalist.innerHTML = tariffs.map((option) => '<option value="' + escapeHtml(option.value || '') + '" label="' + escapeHtml(option.label || option.value || '') + '"></option>').join('');
      if (tariffField?.value && !tariffs.some((option) => option.value === tariffField.value)) tariffField.value = '';
    }
  };

  const renderInvoicePreview = (shipmentItem, tariffItem, taxPercent) => {
    if (previewContainer) previewContainer.innerHTML = invoicePreviewMarkup(shipmentItem, tariffItem, lines, taxPercent, true);
  };

  const updateInvoicePreviewSummary = (summary) => {
    if (!previewContainer) return;
    const summaryMap = {
      revenue: summary.revenue,
      cost: summary.cost,
      taxAmount: summary.taxAmount,
      grossProfit: summary.grossProfit,
      profitPercent: summary.profitPercent,
      grandTotal: summary.grandTotal
    };
    Object.entries(summaryMap).forEach(([key, value]) => {
      const node = previewContainer.querySelector('[data-invoice-summary="' + key + '"]');
      if (node) node.textContent = key === 'profitPercent' ? money(value) + '%' : money(value);
    });
    lines.forEach((line, index) => {
      const amountField = previewContainer.querySelector('[data-invoice-line-row="' + index + '"] [data-invoice-line-field="amount"]');
      if (amountField) amountField.value = invoiceLineAmount(line);
    });
  };

  const syncInvoice = (renderPreview = false) => {
    const shipmentItem = selectedShipment();
    const tariffItem = selectedTariff();
    const taxPercent = Number(taxPercentField?.value || 0);
    const currentChargeable = Number(chargeableWeightField?.value || 0);
    const currentGross = Number(grossWeightField?.value || 0);
    const currentVolume = Number(volumeWeightField?.value || 0);
    if (shipmentItem) {
      customerField.value = shipmentItem.customer || shipmentItem.customerName || customerField.value || '';
    } else if (tariffItem && !customerField.value) {
      customerField.value = tariffItem.customer || '';
    }
    if (chargeableWeightField) chargeableWeightField.value = shipmentItem ? effectiveChargeableWeightForShipment(shipmentItem) : currentChargeable;
    if (grossWeightField) grossWeightField.value = shipmentItem ? Number(shipmentItem.actualKg || 0) : currentGross;
    if (volumeWeightField) volumeWeightField.value = shipmentItem ? Number(shipmentItem.cbm || 0) : currentVolume;
    if (tariffNameField) tariffNameField.value = tariffItem ? tariffItem.customer || '' : '';
    if (!lines.length && tariffItem) lines = invoiceLinesFromTariff(shipmentItem, tariffItem, Number(chargeableWeightField?.value || effectiveChargeableWeightForShipment(shipmentItem) || 0));
    const summary = invoiceTotals(lines, taxPercent);
    if (revenueField) revenueField.value = summary.revenue;
    if (supplierCostField) supplierCostField.value = summary.cost;
    if (totalCostField) totalCostField.value = summary.cost;
    if (taxAmountField) taxAmountField.value = summary.taxAmount;
    if (grandTotalField) grandTotalField.value = summary.grandTotal;
    if (profitPercentField) profitPercentField.value = summary.profitPercent;
    if (invoiceLinesField) invoiceLinesField.value = JSON.stringify(lines);
    if (tariffSnapshotField) tariffSnapshotField.value = JSON.stringify(tariffItem || {});
    if (invoiceSnapshotField) invoiceSnapshotField.value = JSON.stringify(invoiceSnapshotFromSelection(shipmentItem, tariffItem, lines, taxPercent));
    if (previewContainer) {
      if (renderPreview || !previewContainer.querySelector('[data-invoice-summary="revenue"]')) {
        renderInvoicePreview(shipmentItem, tariffItem, taxPercent);
      } else {
        updateInvoicePreviewSummary(summary);
      }
    }
  };

  const loadSelection = () => {
    const shipmentItem = selectedShipment();
    const tariffItem = selectedTariff();
    if (shipmentItem && !customerField.value) customerField.value = shipmentItem.customer || shipmentItem.customerName || '';
    if (shipmentItem && tariffField && !tariffField.value && tariffItem) tariffField.value = tariffItem.tariffNo || '';
    lines = parseInvoiceLineItems(invoiceLinesField?.value || '[]');
    if (!lines.length && tariffItem) lines = invoiceLinesFromTariff(shipmentItem, tariffItem, Number(chargeableWeightField?.value || effectiveChargeableWeightForShipment(shipmentItem) || 0));
    syncDatalist();
    syncInvoice(true);
  };

  const updateLineValue = (index, field, value) => {
    const line = lines[index];
    if (!line) return;
    line[field] = field === 'qty' || field === 'rate' || field === 'amount' || field === 'cost' ? Number(value || 0) : value;
    if (field === 'qty' || field === 'rate') line.amount = Number((Number(line.qty || 0) * Number(line.rate || 0)).toFixed(3));
    if (field === 'amount' && !value) line.amount = Number((Number(line.qty || 0) * Number(line.rate || 0)).toFixed(3));
    syncInvoice();
  };

  dialogBody.addEventListener('input', (event) => {
    const target = event.target;
    if (target === customerField || target === shipmentField || target === tariffField || target === taxPercentField) {
      syncDatalist();
      const shipmentItem = selectedShipment();
      const tariffItem = selectedTariff();
      if (target === customerField) {
        lines = shipmentItem && tariffItem ? parseInvoiceLineItems(invoiceLinesField?.value || '[]') : [];
      } else if (target === tariffField || target === shipmentField) {
        lines = tariffItem ? invoiceLinesFromTariff(shipmentItem, tariffItem, Number(chargeableWeightField?.value || effectiveChargeableWeightForShipment(shipmentItem) || 0)) : [];
      } else {
        lines = shipmentItem && tariffItem ? parseInvoiceLineItems(invoiceLinesField?.value || '[]') : [];
      }
      syncInvoice(true);
      return;
    }
    const lineIndex = target?.dataset?.lineIndex;
    const lineField = target?.dataset?.invoiceLineField;
    if (lineIndex !== undefined && lineField) updateLineValue(Number(lineIndex), lineField, target.value);
  });

  dialogBody.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-invoice-line]');
    if (addButton) {
      lines.push({ id: 'manual-' + Date.now(), source: 'manual', description: '', unit: 'Unit', qty: 1, rate: 0, amount: 0, cost: 0, remarks: '' });
      syncInvoice(true);
      return;
    }
    const removeButton = event.target.closest('[data-remove-invoice-line]');
    if (removeButton) {
      lines.splice(Number(removeButton.dataset.removeInvoiceLine), 1);
      syncInvoice(true);
    }
  });

  syncDatalist();
  syncInvoice(true);
}

function assignedTariffForShipment(shipmentItem) {

  return state.tariffs.find((row) => row.tariffNo === shipmentItem?.tariffNo)
    || state.tariffs.find((row) => row.customer === shipmentItem?.customer && row.origin === shipmentItem?.origin && row.destination === shipmentItem?.destination)
    || null;
}

function numericInputValue(value) {
  return Number(value || 0).toFixed(3);
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
  if (typeof previous === "boolean") return isChecked(next);
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
          th, td { border: 1px solid #d96f16; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #fff3e8; text-transform: uppercase; }
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

function exportCollectionCsv(type) {
  const rows = collectionFor(type);
  const columns = columnsForType(type);
  if (!rows.length || !columns.length) {
    notifyDenied("Export not ready", "No rows are available for this section.");
    return;
  }
  const header = columns.map(([, label]) => `"${String(label).replace(/"/g, '""')}"`).join(",");
  const lines = rows.map((row, index) => columns
    .map(([key]) => `"${String(displayCellValue(type, key, row, index)).replace(/"/g, '""')}"`)
    .join(","));
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${typeLabel(type).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  notifySuccess("Export ready", `${rows.length} row(s) exported.`);
}

function columnsForType(type) {
  return {
    shipment: shipmentColumns,
    pod: shipmentColumns,
    status: shipmentColumns,
    load: loadColumns,
    customers: () => partyColumns("customers"),
    suppliers: () => partyColumns("suppliers"),
    tariff: tariffColumns,
    document: documentColumns,
    charge: additionalChargeColumns,
    invoice: invoiceColumns,
    user: userColumns
  }[type]?.() || [];
}

function displayCellValue(type, key, row, index = 0) {
  if (key === "slNo") return index + 1;
  if (key === "palletCount") return cargoPalletCount(row);
  if (key === "truckDetails") return [row.vehicleNo, row.driverName, row.driverMobile].filter(Boolean).join(" / ");
  return row[key] ?? "";
}

function generateRecordDocument(type, id, download = false) {
  const record = collectionFor(type).find((row) => rowId(type, row) === id);
  if (!record) {
    notifyDenied("Document not generated", "Select a saved record first.");
    return;
  }
  const documentBuilders = {
    invoice: invoiceDocumentHtml,
    tariff: tariffDocumentHtml,
    shipment: shipmentDocumentHtml,
    load: manifestDocumentHtml,
    pod: podDocumentHtml,
    status: shipmentDocumentHtml,
    tcn: tcnDocumentHtml
  };
  const builder = documentBuilders[type] || shipmentDocumentHtml;
  const html = builder(record);
  const filePrefix = { invoice: "bill", tariff: "tariff", pod: "pod", shipment: "shipment", load: "manifest", status: "shipment", tcn: "tcn" }[type] || type;
  const fileName = `${filePrefix}-${rowId(type, record)}.html`.toLowerCase();
  if (download) {
    downloadHtml(fileName, html);
    notifySuccess("Export ready", `${rowId(type, record)} was exported.`);
    return;
  }
  openPrintableDocument(html);
}

function viewDocument(type, id) {
  return generateRecordDocument(type, id, false);
}

function editDocument(type, id) {
  return openRecord(type, id);
}

function printDocument(type, id) {
  return generateRecordDocument(type, id, false);
}

function downloadPdf(type, id) {
  return generateRecordDocument(type, id, true);
}

function emailDocument(type, id) {
  const record = collectionFor(type).find((row) => rowId(type, row) === id);
  const subject = encodeURIComponent(`${typeLabel(type)} ${id}`);
  const body = encodeURIComponent(`Please find ${typeLabel(type)} ${id} attached or printed from Apollo Freight ERP.\n\nReference: ${record ? rowId(type, record) : id}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shipmentDocumentHtml(record) {
  return documentShell(
    `Shipment ${record.jobNo}`,
    "Shipment Document",
    record.jobNo,
    record.shipmentDate || record.bookingDate || today(),
    `
      <section class="document-summary">
        <div><span>Status</span><strong class="status-pill">${escapeHtml(record.status)}</strong><small>${escapeHtml(record.shipmentService || "")} / ${escapeHtml(record.transportMode || "")}</small></div>
        <div><span>QR Reference</span>${qrMarkup(record.jobNo)}<small>${escapeHtml(record.customerReference || record.airwayBillNo || "")}</small></div>
      </section>
      ${documentBlock("Shipment Information", [
        ["Shipment Number", record.jobNo],
        ["Booking Date", record.bookingDate],
        ["Shipment Date", record.shipmentDate],
        ["Service Type", record.shipmentService],
        ["Transport Mode", record.transportMode],
        ["Origin", record.origin],
        ["Destination", record.destination],
        ["Customer Reference", record.customerReference],
        ["Internal Reference", record.internalReferenceNo],
        ["Branch", record.branch],
        ["Sales Person", record.salesPerson]
      ])}
      ${documentBlock("Customer Information", [
        ["Customer Name", record.customer],
        ["Customer Code", record.customerCode],
        ["Contact Person", record.customerContactPerson],
        ["Mobile Number", record.customerMobile],
        ["Email Address", record.customerEmail],
        ["Address", record.customerAddress || customerAddressFor(record.customer, record.customerCode)]
      ])}
      ${documentBlock("Shipper Information", [
        ["Shipper Name", record.shipperName],
        ["Address", record.shipperAddress],
        ["Contact Person", record.shipperContactPerson],
        ["Mobile Number", record.shipperMobile],
        ["Email Address", record.shipperEmail],
        ["VAT / TRN", record.shipperVatTrn],
        ["Country", record.shipperCountry]
      ])}
      ${documentBlock("Consignee Information", [
        ["Consignee Name", record.consigneeName || record.customer],
        ["Address", record.consigneeAddress],
        ["Contact Person", record.consigneeContactPerson],
        ["Mobile Number", record.consigneeMobile],
        ["Email Address", record.consigneeEmail],
        ["Country", record.consigneeCountry]
      ])}
      ${documentBlock("Pickup Information", [
        ["Pickup Location", record.pickupLocation],
        ["Pickup Address", record.pickupAddress],
        ["Pickup Contact Person", record.pickupContactPerson],
        ["Pickup Mobile", record.pickupMobile],
        ["Pickup Date", record.pickupDate],
        ["Pickup Time", record.pickupTime]
      ])}
      ${documentBlock("Delivery Information", [
        ["Delivery Location", record.deliveryLocation],
        ["Delivery Address", record.deliveryAddress],
        ["Delivery Contact Person", record.deliveryContactPerson],
        ["Delivery Mobile", record.deliveryMobile],
        ["Delivery Date", record.deliveryDate],
        ["Delivery Time", record.deliveryTime]
      ])}
      ${documentBlock("Billing Party 1", [
        ["Billing Party Name", record.billTo1],
        ["Billing Address", record.billingParty1Address],
        ["Contact Person", record.billingParty1ContactPerson],
        ["Mobile Number", record.billingParty1Mobile],
        ["Email Address", record.billingParty1Email],
        ["Credit Terms", record.billingParty1CreditTerms]
      ])}
      ${cargoItemsPrintTable(record)}
      ${documentBlock("Cargo Summary", [
        ["Nature of Goods", record.natureOfGoods]
      ])}
      <p class="footer-note">Terms and conditions apply as per Apollo Freight Solutions cargo acceptance and delivery policy.</p>
    `,
    { qrValue: record.jobNo }
  );
}

function podDocumentHtml(record) {
  const deliveryNo = record.deliveryNoteNo || `POD-${record.jobNo}`;
  return documentShell(
    `POD ${deliveryNo}`,
    "CARGO DELIVERY NOTE",
    deliveryNo,
    record.deliveryDatetime || today(),
    `
      <section class="document-summary">
        <div><span>File Reference Number</span><strong>${escapeHtml(deliveryNo)}</strong><small>${escapeHtml(record.customer || "")}</small></div>
        <div><span>QR Reference</span>${qrMarkup(deliveryNo)}<small>${escapeHtml(record.jobNo)}</small></div>
      </section>
      ${documentBlock("Shipment Information", [
        ["From", record.origin || record.pickupLocation],
        ["To", record.destination || record.deliveryLocation],
        ["Airway Bill / Bill of Lading", record.airwayBillNo],
        ["Shipment Number (SHPT#)", record.jobNo],
        ["GIN Number", record.ginNo],
        ["Customer Reference", record.customerReference]
      ])}
      ${documentBlock("Cargo Details", [
        ["Number of Pieces", record.pieces],
        ["Weight (Kgs)", money(record.actualKg)],
        ["Vehicle Type", record.vehicleType],
        ["Nature of Goods", record.natureOfGoods]
      ])}
      ${documentBlock("Delivery Information", [
        ["Delivery Remarks / Coordinates", record.deliveryRemarks],
        ["POC Name", record.pocName || record.deliveryContactPerson],
        ["POC Mobile Number", record.pocMobile || record.deliveryMobile],
        ["Additional Contact Person", record.additionalContact]
      ])}
      <section class="delivery-signatures">
        <div><span>Prepared By</span><strong>${escapeHtml(record.preparedBy || currentUserName())}</strong><small>Date & Time</small><em>${escapeHtml(record.deliveryDatetime || new Date().toLocaleString())}</em></div>
        <div><span>Delivered By</span><strong>${escapeHtml(record.deliveredBy || record.driverName || "")}</strong><small>Date & Time</small><em>${escapeHtml(record.deliveryDatetime || "")}</em></div>
        <div><span>Goods Received By</span><strong>${escapeHtml(record.receivedBy || "")}</strong><small>Telephone Number</small><em>${escapeHtml(record.receiverPhone || "")}</em><small>Signature</small><b>${escapeHtml(record.receiverSignature || " ")}</b><small>Date & Time</small><em>${escapeHtml(record.deliveryDatetime || "")}</em></div>
      </section>
      <p class="acknowledgement">This is to confirm that goods have been received in good order and condition. Any discrepancy must be notified within 24 hours from the time of receipt.</p>
      <p class="acknowledgement">Shipment was opened and checked by customs</p>
    `,
    { compact: true, qrValue: deliveryNo, hideDefaultSignatures: true }
  );
}

function manifestDocumentHtml(record) {
  const jobNos = String(record.jobNumbers || "").split(",").map((item) => item.trim()).filter(Boolean);
  const shipments = jobNos.map((jobNo) => state.shipments.find((row) => row.jobNo === jobNo)).filter(Boolean);
  const totals = shipments.reduce((sum, shipmentItem) => ({
    qty: sum.qty + Number(shipmentItem.pieces || 0),
    gross: sum.gross + Number(shipmentItem.actualKg || 0),
    net: sum.net + Number(shipmentItem.manualChargeableKg || shipmentItem.chargeableKg || 0),
    value: sum.value + Number(shipmentItem.totalAmount || shipmentItem.freightAmount || 0)
  }), { qty: 0, gross: 0, net: 0, value: 0 });
  const rows = shipments.length
    ? shipments.map((shipmentItem) => `<tr>
        <td>${escapeHtml(shipmentItem.tripNo || shipmentItem.manifestNo || record.loadNo || "")}</td>
        <td>${escapeHtml(shipmentItem.customerReference || shipmentItem.airwayBillNo || "")}</td>
        <td>${escapeHtml(shipmentItem.jobNo || "")}</td>
        <td>${escapeHtml(shipmentItem.shipperName || shipmentItem.customer || "")}</td>
        <td>${escapeHtml(shipmentItem.consigneeName || shipmentItem.customer || "")}</td>
        <td>${escapeHtml(shipmentItem.destination || shipmentItem.deliveryLocation || "")}</td>
        <td>${escapeHtml(shipmentItem.pieces || "")}</td>
        <td>${money(shipmentItem.actualKg || 0)}</td>
        <td>${money(shipmentItem.manualChargeableKg || shipmentItem.chargeableKg || 0)}</td>
        <td>${escapeHtml(shipmentItem.currency || "")} ${money(shipmentItem.totalAmount || shipmentItem.freightAmount || 0)}</td>
        <td>${escapeHtml(shipmentItem.natureOfGoods || "")}</td>
        <td>${escapeHtml(shipmentItem.hsCode || shipmentItem.customsDocuments || "AS PER BOE")}</td>
        <td>${escapeHtml(shipmentItem.notifyPartyName || shipmentItem.deliveryContactPerson || "")}</td>
        <td>${escapeHtml(shipmentItem.countryOfOrigin || shipmentItem.shipperCountry || "")}</td>
      </tr>`).join("")
    : `<tr><td colspan="14">No shipments linked to this manifest.</td></tr>`;

  return documentShell(
    `Manifest ${record.loadNo}`,
    "MANIFEST",
    record.loadNo,
    record.tripDate || today(),
    `
      <section class="manifest-sheet">
        <div class="manifest-header-grid">
          <p><strong>TRUCK NO</strong><span>${escapeHtml(record.vehicleNo || "")}</span></p>
          <p><strong>FROM</strong><span>${escapeHtml(record.from || record.origin || record.route || "")}</span></p>
          <p><strong>MANIFEST NO</strong><span>${escapeHtml(record.loadNo || "")}</span></p>
          <p><strong>TO</strong><span>${escapeHtml(record.to || record.destination || "")}</span></p>
          <p><strong>DRIVER NAME</strong><span>${escapeHtml(record.driverName || "")}</span></p>
          <p><strong>ETD</strong><span>${escapeHtml(record.tripDate || "")}</span></p>
          <p><strong>MOB NO</strong><span>${escapeHtml(record.driverNumber || record.driverMobile || "")}</span></p>
        </div>
      </section>
      <table class="manifest-table">
        <thead><tr><th>ALT NO</th><th>INV #</th><th>JOB #</th><th>Shipper</th><th>Consignee</th><th>Dest</th><th>QTY</th><th>Gross Weight</th><th>Net Weight</th><th>Value</th><th>Commodity</th><th>HS Code</th><th>NOTIFY PARTY</th><th>COO</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="6">TOTAL</th><th>${escapeHtml(totals.qty)}</th><th>${money(totals.gross)}</th><th>${money(totals.net)}</th><th>${money(totals.value)}</th><th colspan="4"></th></tr></tfoot>
      </table>
      <section class="manifest-declaration">
        <strong>DECLARATION</strong>
        <p>We assume all responsibility for all the above information.</p>
        <span>PAGE 1 OF 1</span>
      </section>
      <section class="manifest-stamps">
        <div>ALT Express STAMP & SIGN</div>
        <div>CUSTOMS STAMP</div>
      </section>
    `,
    { qrValue: record.loadNo, landscape: true, hideDefaultSignatures: true }
  );
}

function documentBlock(title, pairs) {
  return `<h2>${escapeHtml(title)}</h2><section class="meta">${pairs.map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><span>${escapeHtml(display(value ?? ""))}</span></p>`).join("")}</section>`;
}

function cargoItemsPrintTable(record) {
  const lines = parsePalletDimensions(record.cargoItemsJson || record.palletDimensionsJson || "[]");
  const rows = lines.length
    ? lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(line.packageType || "Pallet")}</td><td>${escapeHtml(line.quantity || line.count || "")}</td><td>${escapeHtml(line.length || "")}</td><td>${escapeHtml(line.width || "")}</td><td>${escapeHtml(line.height || "")}</td><td>${escapeHtml(line.dimensionUnit || "CM")}</td><td>${money(line.weightKg || line.weight || 0)}</td><td>${money(line.volumeWeight || line.total || 0)}</td><td>${escapeHtml(line.remarks || "")}</td></tr>`).join("")
    : `<tr><td colspan="10">No cargo items recorded.</td></tr>`;
  return `<h2>Cargo Dimensions Table</h2><table><thead><tr><th>Sr No</th><th>Package Type</th><th>Quantity</th><th>Length</th><th>Width</th><th>Height</th><th>Unit</th><th>Weight</th><th>Volume Weight</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function qrMarkup(value) {
  const encoded = encodeURIComponent(String(value || ""));
  return `<img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encoded}" alt="QR ${escapeHtml(value || "")}" />`;
}

function invoiceDocumentHtml(record) {
  const shipmentItem = state.shipments.find((row) => row.jobNo === record.shipmentNo);
  const tariffItem = assignedTariffForShipment(shipmentItem);
  const customerItem = state.customers.find((row) => row.name === record.customer || row.code === shipmentItem?.customerCode);
  const invoiceLines = invoiceChargeLines(record, shipmentItem, tariffItem);
  const invoiceTotal = invoiceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0) || Number(record.revenue || 0);
  const billToAddress = shipmentItem?.billingParty1Address || shipmentItem?.customerAddress || customerItem?.fullAddress || customerItem?.locationOrLane || "";
  const shipToName = shipmentItem?.consigneeName || shipmentItem?.deliveryLocation || shipmentItem?.customer || record.customer;
  const shipToAddress = shipmentItem?.consigneeAddress || shipmentItem?.deliveryAddress || "";
  return documentShell(
    `Bill ${record.invoiceNo}`,
    "Invoice",
    record.invoiceNo,
    record.date,
    `
      <section class="invoice-party-grid">
        <div><h2>BILL TO</h2><strong>${escapeHtml(shipmentItem?.billTo1 || record.customer)}</strong><p>${escapeHtml(billToAddress)}</p><p>${escapeHtml(shipmentItem?.billingParty1Email || customerItem?.email || "")}</p></div>
        <div><h2>SHIP TO</h2><strong>${escapeHtml(shipToName)}</strong><p>${escapeHtml(shipToAddress)}</p><p>${escapeHtml(shipmentItem?.deliveryMobile || shipmentItem?.consigneeMobile || "")}</p></div>
      </section>
      <table class="invoice-info-table"><tbody>
        <tr><th>INVOICE NO.</th><th>DATE</th><th>TOTAL DUE</th><th>DUE DATE</th><th>TERMS</th><th>ENCLOSED</th></tr>
        <tr><td>${escapeHtml(record.invoiceNo)}</td><td>${escapeHtml(record.date)}</td><td>${escapeHtml(invoiceCurrency(record, shipmentItem))} ${money(invoiceTotal)}</td><td>${escapeHtml(invoiceDueDate(record.date, shipmentItem?.billingParty1CreditTerms))}</td><td>${escapeHtml(shipmentItem?.billingParty1CreditTerms || customerItem?.terms || "Net 30")}</td><td></td></tr>
      </tbody></table>
      <table class="invoice-info-table"><tbody>
        <tr><th>SHIP VIA</th><th>TRACKING NO.</th><th>FROM / TO</th><th>GR / VOL WEIGHT</th><th>JOB NO.</th></tr>
        <tr><td>${escapeHtml(shipmentItem?.transportMode || shipmentItem?.shipmentService || "")}</td><td>${escapeHtml(shipmentItem?.airwayBillNo || shipmentItem?.tcnNumber || "")}</td><td>${escapeHtml(invoiceFromTo(shipmentItem))}</td><td>${escapeHtml(invoiceWeightText(shipmentItem))}</td><td>${escapeHtml(record.shipmentNo)}</td></tr>
      </tbody></table>
      <table class="invoice-lines-table">
        <thead><tr><th>ACTIVITY</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr></thead>
        <tbody>${invoiceLines.map((line) => `<tr><td>${escapeHtml(line.activity)}</td><td>${escapeHtml(line.qty)}</td><td>${money(line.rate)}</td><td>${money(line.amount)}</td></tr>`).join("")}</tbody>
      </table>
      <section class="invoice-footer-grid">
        <div>
          <strong>Banking Details:</strong>
          <p>National Bank Of Kuwait (NBK)</p>
          <p>Apollo Freight Solutions Co. W.L.L</p>
          <p>Account No.2018077826</p>
          <p>IBAN: KW52NBOK0000000000002018077826</p>
          <p>Swift Code: NBOKKWKW</p>
        </div>
        <div class="invoice-balance"><span>BALANCE DUE</span><strong>${escapeHtml(invoiceCurrency(record, shipmentItem))} ${money(invoiceTotal)}</strong></div>
      </section>
      <section class="invoice-note">
        <strong>Note:</strong>
        <p>- Additional 1% of invoice value will be charged if credit limits exceeded.</p>
        <p>- Any disputed amount or clarification must be raised within maximum 7 days from invoice receipt, otherwise the invoice is considered accepted in full and due for payment.</p>
      </section>
    `
  );
}

function invoiceChargeLines(record, shipmentItem, tariffItem) {
  const savedLines = parseInvoiceLineItems(record.invoiceLinesJson || "[]").map((line) => ({
    activity: line.description || line.activity || "Charges",
    qty: Number(line.qty || 1),
    rate: Number(line.rate || 0),
    amount: Number(line.amount || invoiceLineAmount(line) || 0)
  }));
  if (savedLines.length) return savedLines;
  const chargeableWeight = Number(record.chargeableWeight || effectiveChargeableWeightForShipment(shipmentItem) || 0);
  const tariffLines = invoiceLinesFromTariff(shipmentItem, tariffItem, chargeableWeight)
    .map((line) => ({ activity: line.description || "Charges", qty: Number(line.qty || 1), rate: Number(line.rate || 0), amount: Number(line.amount || invoiceLineAmount(line) || 0) }));
  const approvedCharges = state.additionalCharges
    .filter((row) => row.shipmentNo === record.shipmentNo && row.status !== "Rejected")
    .map((row) => ({ activity: row.chargeType || "Charges", qty: 1, rate: row.totalAmount || row.amount || 0, amount: row.totalAmount || row.amount || 0 }));
  const lines = [...tariffLines, ...approvedCharges];
  if (lines.length) return lines;
  return [{ activity: shipmentItem?.natureOfGoods || "Freight Charges", qty: 1, rate: Number(record.revenue || 0), amount: Number(record.revenue || 0) }];
}

function invoiceCurrency(record, shipmentItem) {
  return shipmentItem?.currency || state.additionalCharges.find((row) => row.shipmentNo === record.shipmentNo)?.currency || "KWD";
}

function invoiceDueDate(dateValue, terms = "") {
  const days = Number(String(terms || "").match(/\d+/)?.[0] || 30);
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function invoiceFromTo(shipmentItem) {
  if (!shipmentItem) return "";
  const from = shipmentItem.shipperName || shipmentItem.pickupLocation || shipmentItem.origin || "";
  const to = shipmentItem.consigneeName || shipmentItem.deliveryLocation || shipmentItem.destination || "";
  return [from, to].filter(Boolean).join(" / ");
}

function invoiceWeightText(shipmentItem) {
  if (!shipmentItem) return "";
  const gross = Number(shipmentItem.actualKg || 0);
  const chargeable = effectiveChargeableWeightForShipment(shipmentItem);
  return `${money(gross || chargeable)} KGS`;
}

function tariffDocumentHtml(record) {
  const charges = parseTariffChargeLines(record.additionalChargesJson || "[]");
  return documentShell(
    `Tariff ${record.tariffNo}`,
    "Tariff Quotation",
    record.tariffNo,
    today(),
    `
      <section class="document-summary">
        <div>
          <span>Customer</span>
          <strong>${escapeHtml(record.consigneeName || record.customer)}</strong>
          <small>${escapeHtml(record.origin)} to ${escapeHtml(record.destination)}</small>
        </div>
        <div>
          <span>Grand Total</span>
          <strong>${money(record.grandTotal)}</strong>
          <small>${escapeHtml(record.tariffNo)}</small>
        </div>
      </section>
      <section class="meta">
        <p><strong>Tariff Number</strong><span>${escapeHtml(record.tariffNo)}</span></p>
        <p><strong>Customer</strong><span>${escapeHtml(record.customer)}</span></p>
        <p><strong>Origin</strong><span>${escapeHtml(record.origin)}</span></p>
        <p><strong>Destination</strong><span>${escapeHtml(record.destination)}</span></p>
        <p><strong>Main Section</strong><span>${escapeHtml(record.mainSection)}</span></p>
        <p><strong>Currency</strong><span>${escapeHtml(record.currency || "KD")}</span></p>
      </section>
      <h2>Weight Section</h2>
      ${tariffWeightRateTableHtml(record)}
      <h2>Charges</h2>
      ${tariffChargeTable(charges, Number(record.additionalChargesTotal || 0), Number(record.grandTotal || 0), false, { showTotalRow: false })}
    `
  );
}

function tcnDocumentHtml(record) {
  const shipmentRecord = shipmentForTcn(record);
  const mergedRecord = mergeFilled(shipmentRecord, record);
  const cargoLines = parsePalletDimensions(mergedRecord.cargoItemsJson || mergedRecord.palletDimensionsJson || "[]");
  const printOnlyCargoDetails = isChecked(mergedRecord.printOnlyCargoDetails);
  const totalVolumetricWeight = cargoLines.reduce((sum, line) => sum + cargoVolumetricWeight(line.count || line.quantity, line.length, line.width, line.height, line.dimensionUnit || "CM", mergedRecord.volumeCategory), 0);
  const cargoPieces = cargoLines.reduce((sum, line) => sum + Number(line.quantity || line.count || 0), 0);
  const totalPieces = Number(mergedRecord.pieces || 0) || cargoPieces || "";
  const totalGrossWeight = cargoLines.reduce((sum, line) => sum + Number(line.weightKg || line.weight || 0), 0) || Number(mergedRecord.actualKg || 0);
  const grandTotalCbm = Number(mergedRecord.cbm || roundUpToHalf(cargoLines.reduce((sum, line) => sum + cargoVolumeCbm(line.count || line.quantity, line.length, line.width, line.height, line.dimensionUnit || "CM"), 0)));
  const chargeableWeight = roundUpToWholeKg(Math.max(totalGrossWeight, totalVolumetricWeight, Number(mergedRecord.chargeableKg || 0)));
  return documentShell(
    `TCN ${mergedRecord.tcnNumber || mergedRecord.jobNo}`,
    "Truck Consignment Note - TCN / WAYBILL",
    mergedRecord.tcnNumber || mergedRecord.jobNo,
    mergedRecord.bookingDate || today(),
    `
      <section class="tcn-grid">
        <div><span>WAYBILL NUMBER</span><strong>${escapeHtml(mergedRecord.tcnNumber || mergedRecord.airwayBillNo || mergedRecord.jobNo)}</strong></div>
        <div><span>DATE</span><strong>${escapeHtml(mergedRecord.bookingDate || today())}</strong></div>
        <div><span>PLACE</span><strong>${escapeHtml(mergedRecord.origin || mergedRecord.pickupLocation || "")}</strong></div>
        <div><span>ORIGIN</span><strong>${escapeHtml(mergedRecord.origin || "")}</strong></div>
        <div><span>DESTINATION</span><strong>${escapeHtml(mergedRecord.destination || "")}</strong></div>
        <div><span>CARRIER No & DATE</span><strong>${escapeHtml(mergedRecord.vehicleNo || mergedRecord.tripNo || "")} ${escapeHtml(mergedRecord.shipmentDate || "")}</strong></div>
      </section>
      <section class="tcn-two-col">
        <div><span>SHIPPER</span><strong>${escapeHtml(mergedRecord.shipperName || mergedRecord.customer || "")}</strong><p>${escapeHtml(mergedRecord.shipperAddress || "")}</p><p>${escapeHtml(mergedRecord.shipperCountry || "")}</p></div>
        <div><span>PICKUP LOCATION</span><strong>${escapeHtml(mergedRecord.pickupLocation || "")}</strong><p>${escapeHtml(mergedRecord.pickupAddress || "")}</p><p>${escapeHtml(mergedRecord.pickupContactPerson || "")} ${escapeHtml(mergedRecord.pickupMobile || "")}</p></div>
      </section>
      <section class="tcn-two-col">
        <div><span>CONSIGNEE</span><strong>${escapeHtml(mergedRecord.consigneeName || mergedRecord.customer || "")}</strong><p>${escapeHtml(mergedRecord.consigneeAddress || "")}</p><p>${escapeHtml(mergedRecord.consigneeCountry || "")}</p></div>
        <div><span>NOTIFY & DELIVERY ADDRESS</span><strong>${escapeHtml(mergedRecord.notifyPartyName || mergedRecord.deliveryContactPerson || "")}</strong><p>${escapeHtml(mergedRecord.deliveryAddress || mergedRecord.notifyPartyAddress || "")}</p><p>${escapeHtml(mergedRecord.deliveryMobile || mergedRecord.notifyMobile || "")}</p></div>
      </section>
      <section class="tcn-grid tcn-cargo-head">
        <div><span>CARGO TYPE</span><strong>${escapeHtml(mergedRecord.vehicleType || mergedRecord.transportMode || "GENERAL CARGO")}</strong></div>
        <div><span>CUSTOMER REFERENCE</span><strong>${escapeHtml(mergedRecord.customerReference || "")}</strong></div>
      </section>
      <h2>CARGO DETAILS</h2>
      <table class="tcn-cargo-table">
        <thead><tr><th>No Of Pieces / Pallets</th><th>Grand Total CBM</th><th>Gross Weight (Kgs)</th><th>Chargeable Weight (Kgs)</th><th>Nature of Goods</th></tr></thead>
        <tbody><tr><td>${escapeHtml(totalPieces)}</td><td>${money(grandTotalCbm)}</td><td>${money(totalGrossWeight)}</td><td>${money(chargeableWeight)}</td><td>${escapeHtml(mergedRecord.natureOfGoods || "")}</td></tr></tbody>
      </table>
      ${printOnlyCargoDetails ? "" : tcnDimensionsTable(cargoLines, mergedRecord.volumeCategory)}
      ${tcnTermsHtml()}
         <section class="tcn-signatures">
      </section>
    `,
    { hideDefaultSignatures: true }
  );
}

function shipmentForTcn(record) {
  const byJob = state.shipments.find((row) => record.jobNo && row.jobNo === record.jobNo);
  if (byJob) return byJob;
  const byTcn = state.shipments.find((row) => record.tcnNumber && row.tcnNumber === record.tcnNumber);
  if (byTcn) return byTcn;
  return state.shipments.find((row) => record.airwayBillNo && row.airwayBillNo === record.airwayBillNo) || {};
}

function mergeFilled(base, override) {
  const merged = { ...(base || {}) };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  });
  return merged;
}

function tcnDimensionsTable(lines, volumeCategory = "") {
  const rows = lines.length
    ? lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(line.packageType || "Pallet")}</td><td>${escapeHtml(line.quantity || line.count || "")}</td><td>${escapeHtml(line.length || "")}</td><td>${escapeHtml(line.width || "")}</td><td>${escapeHtml(line.height || "")}</td><td>${escapeHtml(line.dimensionUnit || "CM")}</td><td>${money(line.weightKg || line.weight || 0)}</td></tr>`).join("")
    : `<tr><td colspan="8">No dimensions recorded.</td></tr>`;
  return `<h2>DIMENSIONS</h2><table><thead><tr><th>Sr</th><th>Package</th><th>Qty</th><th>Length</th><th>Width</th><th>Height</th><th>Unit</th><th>Gross Weight</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function tcnTermsHtml() {
  const terms = [
"These Terms apply to all transport, freight forwarding, customs clearance coordination, storage, handling, collection and delivery services performed by the Company.",
"By placing a booking, accepting a quotation, handing over cargo, signing a TCN, receiving delivery, or paying any invoice, the Customer accepts these Terms.",
"These Terms override any conflicting terms issued by the Customer, consignee, supplier or third party, unless the Company agrees otherwise in writing.",
"The Customer confirms that it is the owner of the cargo or is authorized by the owner to instruct the Company.",
"The Customer is fully responsible for providing accurate and complete shipment details, including cargo description, quantity, weight, dimensions, value, HS code, origin, destination, invoice, packing list, permits and customs documents.",
"The Customer is responsible for all consequences arising from incorrect, incomplete, late or misleading documents or declarations, including customs fines, penalties, delays, storage, demurrage, seizure, re-export, destruction or additional charges.",
"The Customer must declare in writing before collection if the cargo is fragile, valuable, dangerous, restricted, perishable, temperature-sensitive, bonded, time-critical or requires special handling.",
"The Customer is responsible for proper packing, wrapping, palletizing, labeling and cargo readiness. The Company is not liable for loss or damage caused by weak packing, poor palletizing, concealed damage, leakage, breakage, insufficient wrapping or unsuitable packaging.",
"Unless agreed in writing, loading at origin and unloading at destination are the Customer’s responsibility. Any assistance by the Company, driver or subcontractor is at the Customer’s risk unless proven gross negligence is established.",
"The Company is not responsible for the contents, count, weight, condition or shortage inside sealed cartons, pallets, trailers, containers or packages. Acceptance of cargo confirms only apparent external condition.",
"Any weights, quantities, measurements or descriptions shown on the TCN are based on information supplied by the Customer unless verified and confirmed by the Company in writing.",
"Transit times, border crossing times, customs clearance times and delivery dates are estimates only and are not guaranteed unless expressly agreed in writing.",
"The Company may choose the route, vehicle, driver, border, subcontractor, consolidation method and delivery sequence at its discretion.",
"The Company may consolidate, reload, transfer, cross-dock, store or transship cargo where operationally required, unless the Customer has paid for a dedicated exclusive truck service.",
"The Company is not liable for delay caused by customs, border congestion, government action, road closure, accident, breakdown, weather, war, unrest, force majeure, incomplete documents, customer delay, consignee delay or events outside the Company’s reasonable control.",
"Freight charges do not include cargo insurance unless expressly agreed and charged separately. The Customer is responsible for arranging cargo insurance for the full cargo value if full-value protection is required.",
"The Company shall only be liable for direct physical loss of or damage to cargo where the Customer proves that such loss or damage was directly caused by the Company’s proven fault during the period in which the cargo was in the Company’s care, custody and control.",
"The Company’s liability, if any, shall be strictly limited to the coverage, terms, conditions, exclusions, deductibles and maximum limits of the Company’s applicable haulage / carrier liability insurance policy.",
"The Company shall not be liable for any amount, loss, claim or damage that is not admitted, covered or paid by the insurer under the applicable haulage / carrier liability insurance policy, unless mandatory law provides otherwise.",
"The Company’s liability shall never exceed the amount actually recoverable and paid under the applicable haulage / carrier liability insurance policy for the affected shipment, after application of all deductibles, exclusions, depreciation, survey findings and policy limits.",
"The Company’s liability is not cargo insurance and shall not be treated as full-value protection for the cargo. The Customer is responsible for arranging its own cargo insurance if it requires protection for the full invoice value, commercial value, profit, delay risk or consequential loss.",
"The Company shall not be liable for loss of profit, loss of sales, loss of market, business interruption, contractual penalties, production delay, loss of goodwill, indirect loss, special loss, punitive loss or consequential damages, whether or not such losses were foreseeable.",
"Nothing in these Terms shall make the Company liable for loss, damage, delay, shortage, customs penalties, authority action, confiscation, rejection, seizure or additional charges caused by incorrect documents, poor packing, inherent nature of the cargo, loading or unloading by others, customer delay, consignee delay, undeclared cargo risks, force majeure, government action, customs action or events outside the Company’s reasonable control.",
"Dangerous, prohibited, illegal, restricted, hazardous, flammable, explosive, toxic, controlled or sanctioned cargo must not be handed to the Company unless declared in writing and accepted by the Company in writing before collection.",
"The Customer is fully liable for all claims, fines, penalties, damages, injury, clean-up cost, delay, legal cost or authority action arising from undeclared, misdeclared, illegal, dangerous or restricted cargo.",
"The Company may refuse, suspend, return, unload, store, abandon, destroy or hand over to authorities any cargo that is unsafe, illegal, misdeclared, restricted, unpaid, undocumented or unsuitable for transport, at the Customer’s risk and expense.",
"All customs duties, taxes, deposits, government charges, inspection fees, penalties, storage, demurrage, waiting time, re-delivery, cancellation, documentation and additional charges are payable by the Customer on demand.",
"If no credit facility is approved in writing, all charges are payable before release or delivery.",
"The Customer shall pay all invoices without set-off, deduction, withholding or counterclaim. Any claim must be handled separately and does not justify withholding freight, duties, deposits or other charges.",
"The Company may suspend services, hold cargo, hold documents, cancel credit terms, require advance payment, or refuse delivery if any amount is overdue or if payment risk becomes unacceptable.",
"The Company has a general and particular lien over all cargo, documents and goods in its possession or control for any amount owed by the Customer, whether related to the same shipment or any previous shipment.",
"If payment is not made after notice, the Company may store, sell, dispose of, return or otherwise deal with the cargo as permitted by law, and all related costs remain payable by the Customer.",
"The Company may subcontract all or part of the services. All protections, exclusions, defenses and limits of liability available to the Company also apply to its employees, drivers, agents, subcontractors and service providers.",
"The Customer shall indemnify and protect the Company against all claims, losses, damages, fines, penalties, costs and legal expenses arising from incorrect documents, misdeclaration, unpaid charges, customs issues, poor packing, illegal cargo, dangerous cargo, customer delay, consignee delay, or breach of these Terms.",
"Any visible loss or damage must be clearly written on the delivery note or TCN at the time of delivery. A clean signature is evidence that the cargo was received in good apparent order and condition.",
"Concealed damage must be reported in writing within 3 calendar days from delivery. Non-delivery, shortage or delay claims must be reported in writing within 7 calendar days.",
"All claims must be supported by documents, photos, invoice value, packing list, damage report, proof of actual loss and any other evidence requested by the Company.",
"No claim shall be accepted if the cargo, packaging or evidence is not preserved for inspection by the Company or its insurer.",
"Any legal action against the Company must be started within 9 months from the delivery date, expected delivery date, or the date the services ended, whichever is earlier, unless mandatory law provides otherwise.",
"The Company is not liable for failure or delay caused by force majeure, including war, civil unrest, border closure, customs system failure, government restriction, accident, road closure, natural disaster, fire, flood, strike, fuel shortage, cyberattack, sanctions, epidemic, pandemic, or any event beyond the Company’s reasonable control.",
"Email, WhatsApp, scanned copies, electronic signatures, digital proof of delivery and electronic shipment records are valid evidence of instructions, acceptance, delivery and charges.",
"Delivery may be made to the consignee, warehouse, receiving staff, security gate, nominated agent or any person appearing to have authority to receive cargo at the stated delivery location.",
"If the consignee refuses or delays delivery, or if documents or payment are missing, the Company may store, return, re-route or hold the cargo at the Customer’s risk and expense.",
"These Terms are governed by the laws of the United Arab Emirates, unless mandatory law requires otherwise. Any dispute shall be subject to the courts or dispute forum selected by the Company, unless otherwise agreed in writing.",
"By instructing the Company, the Customer confirms that it accepts these Terms and understands that the Company’s liability is limited and that cargo insurance should be arranged separately for full-value protection."

  ];
  return `<section class="tcn-terms"><h2>Terms and Conditions:</h2><ol>${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ol></section>`;
}

function parsePalletDimensions(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function roundUpToHalf(value) {
  return Math.ceil(Number(value || 0) * 10) / 10;
}

function roundUpToWholeKg(value) {
  return Math.ceil(Number(value || 0));
}

function palletDimensionPrintTable(lines, roundedTotal) {
  const rows = lines.length
    ? lines.map((line, index) => `<tr><td>${index + 1}</td><td>${line.count}</td><td>${line.length}</td><td>${line.width}</td><td>${line.height}</td><td>${money(line.total)}</td></tr>`).join("")
    : `<tr><td colspan="6">No pallet dimensions added.</td></tr>`;
  return `<h2>Pallet Dimensions</h2><table>
    <thead><tr><th>Sr no</th><th>No of pallets</th><th>Length</th><th>Width</th><th>Height</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><th colspan="5">Grand total CBM</th><th>${roundedTotal}</th></tr></tfoot>
  </table>`;
}

function documentShell(title, documentLabel, documentNo, documentDate, body, options = {}) {
  const printedAt = new Date().toLocaleString();
  const generatedBy = currentUserName();
  const companyName = state.settings.companyName || "APOLLO FREIGHT SOLUTIONS";
  const logoUrl = String(state.settings.companyLogoUrl || "").trim() || defaultDocumentLogoUrl();
  const pageSize = options.landscape ? "A4 landscape" : "A4 portrait";
  const pageWidth = options.landscape ? "297mm" : "210mm";
  const pageMinHeight = options.landscape ? "210mm" : "297mm";
  const fallbackLogoUrl = defaultDocumentLogoUrl();
  const logoMarkup = `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)} logo" onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogoUrl)}'" />`;
  return `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #edf2f7; color: #172033; font-family: Arial, sans-serif; }
        .page { width: ${pageWidth}; min-height: ${pageMinHeight}; margin: 0 auto; background: #fff; box-shadow: 0 20px 55px rgba(22, 32, 51, .16); }
        .toolbar { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; background: #fff8f2; border-bottom: 1px solid #d96f16; }
        button { border: 0; border-radius: 6px; padding: 10px 14px; background: #d96f16; color: #fff; font-weight: 700; cursor: pointer; }
        .document-head { display: grid; grid-template-columns: 1fr auto; gap: 20px; padding: 28px 34px; color: #172033; background: #fff; border-top: 8px solid #d96f16; border-bottom: 1px solid #d96f16; }
        .brand { display: flex; align-items: center; gap: 16px; }
        .logo { display: grid; place-items: center; width: 92px; height: 92px; border-radius: 12px; background: #fff; color: #d96f16; font-size: 22px; font-weight: 800; overflow: hidden; border: 1px solid #d96f16; }
        .logo img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
        h1 { margin: 0; color: #111; font-size: 28px; letter-spacing: 0; }
        h1 .afs-initial { color: #d96f16; }
        .brand p, .doc-meta p { margin: 4px 0 0; color: #607080; }
        .doc-meta { text-align: right; min-width: 210px; }
        .doc-meta strong { display: block; color: #111; font-size: 20px; }
        main { padding: 28px 34px 34px; }
        .document-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
        .document-summary div { padding: 18px; border-left: 5px solid #d96f16; background: #fff8f2; }
        .document-summary span, .meta strong, th, .signature span { color: #5d6c7b; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0; }
        .document-summary strong { display: block; margin-top: 7px; color: #172033; font-size: 22px; }
        .document-summary small { display: block; margin-top: 5px; color: #607080; }
        h2 { margin: 26px 0 8px; color: #111; }
        .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
        .meta p { display: grid; gap: 5px; margin: 0; padding: 12px; border: 1px solid #d96f16; background: #fff; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #fff3e8; text-align: left; }
        th, td { border: 1px solid #d96f16; padding: 10px; }
        tfoot th { background: #fff3e8; color: #172033; font-size: 13px; }
        .qr-code { width: 76px; height: 76px; display: block; margin-top: 8px; }
        .status-pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fff3e8; color: #111; font-size: 16px; }
        .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 48px; }
        .signature { min-height: 86px; border-top: 1px solid #d96f16; padding-top: 10px; }
        .signature strong { display: block; margin-top: 5px; }
        .delivery-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 26px; }
        .delivery-signatures div { min-height: 138px; border: 1px solid #d96f16; padding: 12px; background: #fff; }
        .delivery-signatures span, .delivery-signatures small { display: block; color: #5d6c7b; text-transform: uppercase; font-size: 11px; font-weight: 800; margin-top: 8px; }
        .delivery-signatures strong, .delivery-signatures em, .delivery-signatures b { display: block; min-height: 22px; margin-top: 6px; color: #172033; font-style: normal; }
        .acknowledgement { border: 1px solid #d96f16; padding: 10px 12px; margin: 12px 0 0; font-size: 12px; color: #172033; }
        .tcn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 1px solid #d96f16; margin-bottom: 10px; }
        .tcn-grid div, .tcn-two-col div { min-height: 62px; padding: 9px; border-right: 1px solid #d96f16; overflow-wrap: anywhere; }
        .tcn-grid div:last-child, .tcn-two-col div:last-child { border-right: 0; }
        .tcn-grid span, .tcn-two-col span, .tcn-signatures span { display: block; color: #172033; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }
        .tcn-grid strong, .tcn-two-col strong { display: block; font-size: 13px; color: #172033; }
        .tcn-two-col { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d96f16; margin-bottom: 10px; }
        .tcn-two-col p { margin: 5px 0 0; font-size: 12px; line-height: 1.35; }
        .tcn-cargo-head { grid-template-columns: 1fr 2fr; }
        .tcn-cargo-table th, .tcn-cargo-table td { text-align: center; }
        .tcn-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; margin-top: 44px; }
        .tcn-signatures div { min-height: 92px; border-top: 1px solid #d96f16; padding-top: 8px; }
        .tcn-terms { margin-top: 18px; font-size: 10px; line-height: 1.35; }
        .tcn-terms h2 { margin-top: 0; font-size: 14px; }
        .tcn-terms ol { margin: 6px 0 0 18px; padding: 0; }
        .tcn-terms p { font-weight: 700; margin-top: 8px; }
        .manifest-header-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d96f16; margin-bottom: 10px; }
        .manifest-header-grid p { min-height: 42px; margin: 0; padding: 7px; border-right: 1px solid #d96f16; border-bottom: 1px solid #d96f16; }
        .manifest-header-grid p:nth-child(4n) { border-right: 0; }
        .manifest-header-grid strong { display: block; font-size: 10px; color: #172033; text-transform: uppercase; }
        .manifest-header-grid span { display: block; margin-top: 4px; font-size: 12px; color: #172033; overflow-wrap: anywhere; }
        .manifest-table { table-layout: fixed; font-size: 9px; }
        .manifest-table th, .manifest-table td { padding: 5px; border-color: #d96f16; vertical-align: top; overflow-wrap: anywhere; }
        .manifest-table th { background: #fff3e8; color: #172033; text-align: center; }
        .manifest-table tfoot th { font-size: 10px; }
        .manifest-declaration { display: grid; grid-template-columns: 140px 1fr 120px; align-items: center; gap: 10px; margin-top: 12px; font-size: 11px; }
        .manifest-declaration p { margin: 0; }
        .manifest-declaration span { text-align: right; font-weight: 700; }
        .manifest-stamps { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; margin-top: 20px; }
        .manifest-stamps div { min-height: 72px; border-top: 1px solid #d96f16; padding-top: 8px; font-size: 11px; font-weight: 700; text-align: center; }
        .invoice-party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 16px; }
        .invoice-party-grid div { min-height: 104px; border: 1px solid #d96f16; padding: 12px; background: #fff; }
        .invoice-party-grid h2 { margin: 0 0 8px; font-size: 13px; color: #111; }
        .invoice-party-grid strong, .invoice-party-grid p { display: block; margin: 4px 0; overflow-wrap: anywhere; }
        .invoice-info-table { table-layout: fixed; margin-top: 10px; font-size: 11px; }
        .invoice-info-table th, .invoice-info-table td { text-align: center; padding: 8px 6px; overflow-wrap: anywhere; }
        .invoice-lines-table { margin-top: 18px; }
        .invoice-lines-table th:nth-child(2), .invoice-lines-table th:nth-child(3), .invoice-lines-table th:nth-child(4),
        .invoice-lines-table td:nth-child(2), .invoice-lines-table td:nth-child(3), .invoice-lines-table td:nth-child(4) { text-align: right; width: 90px; }
        .invoice-footer-grid { display: grid; grid-template-columns: 1fr 240px; gap: 20px; margin-top: 18px; align-items: start; }
        .invoice-footer-grid p { margin: 3px 0; font-size: 11px; }
        .invoice-balance { border-top: 2px solid #d96f16; padding-top: 10px; text-align: right; }
        .invoice-balance span { display: block; color: #5d6c7b; font-size: 11px; font-weight: 800; }
        .invoice-balance strong { display: block; margin-top: 6px; color: #111; font-size: 18px; }
        .invoice-note { margin-top: 14px; font-size: 10px; line-height: 1.35; }
        .invoice-note p { margin: 3px 0; }
        .footer-note { margin-top: 26px; padding-top: 14px; border-top: 1px solid #d96f16; color: #607080; font-size: 12px; text-align: center; }
        @page { size: ${pageSize}; margin: 8mm; }
        @media print {
          body { background: #fff; font-size: 10px; }
          .toolbar { display: none; }
          .page { width: auto; min-height: auto; box-shadow: none; }
          .document-head { padding: 10px 16px; border-top-width: 5px; }
          .logo { width: 58px; height: 58px; border-radius: 8px; }
          h1 { font-size: 20px; }
          .doc-meta strong { font-size: 15px; }
          main { padding: 10px 16px 8mm; }
          h2 { margin: 12px 0 6px; font-size: 14px; break-after: avoid; }
          .document-summary { gap: 8px; margin-bottom: 10px; }
          .document-summary div { padding: 10px; }
          .document-summary strong { font-size: 16px; }
          .meta { gap: 6px; margin-bottom: 8px; }
          .meta p { padding: 7px; }
          th, td { padding: 5px; }
          .signature-grid { margin-top: 24px; gap: 12px; }
          .signature { min-height: 54px; }
          .footer-note { margin-top: 10px; padding-top: 8px; font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
        <header class="document-head">
          <div class="brand">
            <div class="logo">${logoMarkup}</div>
            <div>
              <h1>${companyNameMarkup(companyName)}</h1>
              <p>Freight, logistics and customs documentation</p>
            </div>
          </div>
          <div class="doc-meta">
            <strong>${escapeHtml(documentLabel)}</strong>
            <p>No: ${escapeHtml(documentNo)}</p>
            <p>Date: ${escapeHtml(documentDate)}</p>
          </div>
        </header>
        <main>
          ${body}
          ${options.hideDefaultSignatures ? "" : `<section class="signature-grid">
            <div class="signature"><span>Generated By</span><strong>${escapeHtml(generatedBy)}</strong></div>
            <div class="signature"><span>Receiver Sign</span><strong>&nbsp;</strong></div>
            <div class="signature"><span>Authorized Signature</span><strong>&nbsp;</strong></div>
          </section>`}
          <p class="footer-note">Printed date and time: ${escapeHtml(printedAt)}</p>
        </main>
      </div>
    </body>
  </html>`;
}

function defaultDocumentLogoUrl() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAA7CAYAAAA+XsUpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RjZGNTc1MjdFMjQ0MTFFNzlBMEFCMjUwMDBGM0Y4OEMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RjZGNTc1MjhFMjQ0MTFFNzlBMEFCMjUwMDBGM0Y4OEMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGNkY1NzUyNUUyNDQxMUU3OUEwQUIyNTAwMEYzRjg4QyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGNkY1NzUyNkUyNDQxMUU3OUEwQUIyNTAwMEYzRjg4QyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PrIqhDoAABeQSURBVHja7F0HmFzVdT6vzM7sSlvVACEkIRACLCEJoQhTjE1zjE1JZIpD+ACbYj5wgNBMDDaQOBgSgmkhIAQ2YDAEMGAwsiSaKYaIthJYCFUkivoWbZudmZd7dv67c/bufW8WrF2ttO9839l9be675bR7zr3nOQ0X7kH9GBygK85d8d81nnEs98znPKDbwzJ88d8Xv+XjBI49cU8+51ne54nnXOO+7ZpZRgIon3WNY69IWWG/G6bwXYXHKtzAHR7kAvJLXCorV8UFRUYr5dFDr22i7z31Ke0o4IMYyhSWKizBtRJgQhwnxXEKvykRxCAHrkScl1jK0/eSQJMBzEG2EbwNbfc9cd0ziD2G7nCgwr00g1Qoov9gY5punbeOBiXcSEnmuw7dXVu/Q3WGJpK0+C8JybEQqSsYwjOksommNPUNwteM50cQuyTqMOknnykRkt21SGFTe/ghUt430A2R6J7oBxJ1lxrQsWg/px/Txd4KX81rBZc2ZwO68936ASkteOBZcbYDY7D3kWdhRBvj2zSfjXn9iPL8CAHjGs8lhRUgGTxhMcVci3CwCb6RsA7ICTrUAr32cfOAHvwYoiEDHEjgqamHU1nuB7e+tIEue379gB18N6b/GCyQraz0g/verqMfzV83oDsiZpAYQijDobVNmbgbYkqIoQdQqfB4hTUxg8QQg4LWhgxdOK2aZu41mE/ZhXWiwmsHWj84/TxQ2O/7j6I9QmHxGNM9bD5neq6KxX9s6JM9iCljU2Eetyo1SV9cmXJvblNW1q53LKMNLVnWIE8oPEXhwwNlgM3or4xxaJekDhD6ooMTIYMoffyeICJb3CJBxV2POlZgEpIjrpnXo+pFojwzXmMSky2y7VgI3hbncIznnSKE7hj95Ie0uc80vpqCrE5ngoca07m1uPScws8V/pryMZLVA4VB9GCXCAZgphhE+ei6jrInqRBtTwnGSVDXGID09fsWqZUwGNC3oBkkDFtO4Ra5LwN4MXwx2EVpkUklnjN396oEa5BWdW2Bwm8rfFDhEVQIMO/QDKKDhP01GuRQ94i5a5HyNuYxI94JC0NHReu9IuemRrWZMvLcj2Bs13guLHLvU/TaqmIazbFYDDbN5KVzwaSKcn/uTYcPp4Mf+Jiv/QkMcojCGxReOBAYpL8Dx3OzwIE0t/EofG2Zbe2ZafKRYaaGLdh0LOUwk9aoix9y77e053S9nocw5fv/pPANhQ/FDBLDthAK/TEI8YFCViXjcH4L5Vf//mVHHYjYzRtDcW4tLHNnM/w1cWuowtsUVsQaJIaBCWqmnvS6+Dl4HvKP4vwb0Czs1VoDDaNxA65/QtvpYtg4DhJD0cnQ4JRH99fW02nPspeXpin8vy9QxBaFSxQuByO9r3CxwpUKG2IGiWFb07fpObPtowk7L1HWVXuQpSWVw5O5I2avpPkrmkap669Tfln8l4UsmOYvYLZl+L+yv5tYZjDKsXhGzOuB5T5Zfmcem89GDXJgHBd7v+kajnKLhgUqzWCorQyfwl3BUdtbzV2Y8jmHoveVmO8KC3LKmFOU+zdsuzH/L1V/tjgezaC27Ir2TIc3aw00gGaQXyn8DJplrMKdKB87ixpTruPewL/DtTqFtQrnUt5bxjGXdH9jEG7YYHRqClhKhcBg0nIuj02/fxiaW3htO/jM2IJ57sUKok+AaWKMwhV6zg7P1eE4f0XhLBwzbeymkM2S8Qp3xn/G0SgrDKoUHgq8TuE7YJY/QmM19wcGaYP6iwqe+T2QlLYlFiZKYrctxZBlmerflHwe2dcwuT3QHmGmhlwl4IX0gV+kj4pt37Vphv4Ix1N77oVzJlfSy6tb+PxtcW+qOOabHwKfEddZ6O5O+b3uByicovBvFJZHvHMK8DLMXR5VOBuT/3gO0o9terfIfyeEiV0Lw0tt61k0ZVRmkhKyL4R0jGtkMRfNTC0+2bf08juGK3wp6TnXb1Gljbt9OdW1ZCfxNUh9JtwTv0Q/7iaY4AgwWqrI79gMe0zhTWCaPtcgMUSDjuoPRMngtDXnAk4DBE/UJ2CQ1Jfsx1XA3yn8KeYjRyv8DuUzq5SGmGHfp/yK4rsU/lxhr+4HjgOFMfSMUBwn2NiSpfZspxdq8VYWsuzRuhlzm8kKLzBMOXNexOvAFin8h5hBYtjm4CUcmr2wnpozneuy3hMeqa29YppdwLdhvnKcwhdDnmPz7wFM6mMGiWHbQaY9R5dMr6aKZCfJLBTzid4C5sanoFWOpPziSBv8BIwSM0gM2wbS2YB2Kffpsumd29LXCCIOevn1/I55Cv+W8rESDU1g1MUwtU6KJ+nbyAQne65f03tk2z5r/jYsy6L0bplJ5Ex3cZgLOmpPS9T+FjPvrxm8LM/maDWlvCtnjCmt61iNVdhR2JfBvM2Uj7tMEtdOgdNgWG8I/DAG0cE/7U408+vqQUpaOtmMT5gEZYux2OIXjmXQzbSdZhluBDG7ogNlWbYNSg6FpxcNW5ZhS5WaIPu+DnMbstvvtblDGWrJ/veE8kTdpGFJql3fVg8P0sY+rskyccy7XseDQXrFm+VHSEyd2jIlGEZH0UvF9ZQgBDPqHbb91kxiLZNZpwwJadsHL/34tmUZMfQCrTS0ZseMHFW68Nh9yqn2pTYOKnNc4rM+rocZ/2Cz64lea3TI9WbqndC+08NnzHVVQUgZTkTZDnVf7yS1g8lsNpPDNFdsuXXNPLqu5dimJc1ovS0Kb9M0cudgsQQaZh2L7VCMSp5R6rjODGrLPd3a0hkK4jjG533MICspv4x+KM4PhiZp6jMG4VhQiedQaYmztadfwVZ6piiLKZuZmtI5K0fyC1x1Y3BJP1I2qj7N6YAyajLsOFtNGMnofNiSm56cc1nl6s9azvae9DsqyNqeV+C+sw1MrFWCQfak/DqvD/qEQXj3WGV1gra05mjR2lZKeNtfUhAmMt7DMHqnVJ7bbQyknlnyeSvlFCM5Tv+o89gRKaooU/SYDbaWMNKJt9u2CrspgfKHt+roF69v0p6l+6mP10ZRfuMVe9D2FzQ8pdcYpLwy0fWKYog3lzXR3e/U0aza+u0yZw5TxljVrhu+PoyaCwkHCh4IJQHXN2fp4vnrKc1pzPtJna+YUUMH7VpKm1r632oWtijq23Kqz9ZRJuj0Xm2rvehmTq7DKJ+KaOsr9tO/UtGtIx5bsoU2tgzIJUcxbB/AiyN/K87fovx+lG0yaY6h/4NjODRcw+ERlQ7Ido9CzuWGOtcoy3TD2/KWhSX68yxlUEiZzTCprsHcioGX2Z8ORhlKhe0U2gSTmT49UW/bimz20DYqfFZhthiDJC1eGOnKdal7ClFfVNAhe35Zc0Bs6USdiMHyjMGx5X5yLIMYRQye0aFuCEF4IYMXRShhHxM1g4sJyzuCkHZSxLlvaYvt03ZhqVDJIFqzTNfST2EBUFscqjcEc8ao718LvGp4drGtrhVUSDeqP9opzxNwsSUEM8mdgjKnrxkLccj+FdkEhW9pDWNWv8h9MxLtxNozhiLAm74OKUYkXyTmIFX8F/1dQNH7y21lR9XB9l6zbJuGcizmhM09ajt3I8q27f+WGsan6N2PYe+NSr8qjxMWAeFFmD62lQNRn7A2Vw8khMaJ2vvuFNFCURiWAHxrwl2xFI2hV7yjIYxnW24UtrynJ593MHdDRi1r8qjnQVL+PX80qDUeyhhiiCGGGP4692AoVKVcOndyVYcBX5X06MWPm2nOiqbtvuFlvkPnTqnqWDaRFbFEXkkwtNyjBz9opNrPdkwNW17idrSdF0nwBqhX17TQM8uaYm6w2YqVSft6JI6aXjC1is7bv4om7Ir98wmXTlvXRq+ozjxv3rrtLpioZ+pnTqygi6bX0D6qXa5LXVd/8TKP0WW0aPaqHYpBeDkNM/+5kyvpgmnVtLdqe8cSGzWmn61vozdXNNMlL62npZvbY66QDLL4B2OsN7K5gGrKE1SqGKgRnZZT10aUenSi6uSLX9z+Pi7PixPfOHUU7TUiRa4ijMb67sSQUwxSOShNbtuOtZKgJuXRm6rto4ckO/aXN9YVxrRa9ctxB9bQqKEltP+slTFXSAYZUuqFSpx0JkcNSpPoxXyu61B7e0BbWjMyJf52JUVHDPbJVUzQ0NzeLxYp9qX25LazPdnQEnQd00xAqYZ2SibirTTdGKQ1ExQlqh0FmBjYpGjfekvKtytoUWOdUH0Q2vZsEHOEySA9fG4XhRcrvJfy2xsl8OeBOZ/qZir4pPkjK89ahNhRlN8BxqkoeaMNZ+V7TzzDaR7PpXzK/P+hrrvV+Df82a8hCu+jrpv3JXAyZM6CwTsTOeU+f7K4Y5tmnZozvby8iY4fP5haC8TA37rgPEx1OOfVA0vxfk5mdhoVNo9xmZyS5knx/D4Kz6D8+p2ACjEATurMM99zqOBbZ7vtfipsG+V3fU/hflRITPAkjhl4lcLZ6Jf/VfgC5VcqnIVr3H+cO+p8tqJEPbkenNaT1yY9whem75yiMt/VPLAr2r0H6shlv2zpS06C8HW0ievMK2bl8vavUj5ZAuftvZW6LqvnPj0Tv7sT96ajPQtw7VTKZ1TcLOrN48xL159GOzlZHK+1KhPt1X3DYzMFfct0NJu6bvTjd/GW4MfEta+g7WnUeR2uT0d7uR9XafrrKYN8S+E/U+HbdBJ407wt9SR/5PFycX495fOsSvgXNOJuQWz8Hl5X84zBIBy4uZryy1fesTAIEw5/L+8E4/qF6BD+jDHd9nYdHT+pknKtuY5NUxjgo43fLEIHMQFdYWmb/pglf99iosJLLM/UYuB/alz/AESzJ4hgL3HvPMpvH2WmaUWbL1I4CucvgDD42u7oH8afkP0rTy+C+HNXHjqUyso9amzIcFm/p66JDy4AMd8r+vo3GHcJ50MY/BHnh6DOa9FfkkFmoNzlEAp872uUX+M0BQzCBH6kpd68Eesjhf9KhfVpDJ+CQSaAWacavzsL47kI54fi/BghsCcKOnwEDDITgtQzxuKwnhid/KPvam3B+6mUIKIRZZ1lrRX/OTfR6zi/CB1IIHpdKZZATwkJfJd4rl4re+q+5TdNhQQBtg1ANwvm4A76A4iKV3fyt715cz/NX9VMd7y2kSorfVkuw8qODguU9nOdeeAerWbaQVRPQOJyfa/Slosohzucl2E/jgFejHpomIfBdyEN90JbHkGfZNCGu0V/6PK1sGimwjbXNIiGJeR8KiQuWAiBwJg7a79KOmiXFLVs6XA8XAvmWA0hpol9NvnOeBzfKpijFs+kYUncg/+6XwiCwPRq1Iux0uO10bBcWNDMhVYmtOtZ1Psjrf0E0/wJx3cK5nhVaL9JqB8Z72Mh8U0cZ8S4bcDx1cLy+Xf0DWdJuaUnDDINphHDbplccPYgxRy3HzlCmk66oiypD0ZjEuJ35+D/G7h/HKT2ZuN+WpRps5TDVoPuC01GGMxJGOAz0CHc2B92cnRTlrT6EFKDpflJjksHUSZ3UZCfm+n8sNyRp8N8u12oZMkg9ZDCJyv8e8p/ImANTMaMEBRsjvwIZpWW3iehT1ii/lm0X7rZdF2qBIGVQwicib7W5uoDMGV/wSdjqtVQqDFrz9tXo/HMr6HhuU2XKtvr9vqW7Ke4/2088xjqeTTekYN5doZ2+hnjYprU5rFMps3H16Hev8H1P0PaX40+v1TQyBXo02OhiRhuAj3x+c/EuBxn1KsUfbITFRLeuRA2o0E/BKF3JTQPlz2nJwxymeBgbZKU5rpvHW8RnbZBcOseMCcYrqHCbrA3Fd6I468ZDPJFYX+YBY0wd3TlHhZmwzRDXZOwexlGqoOxruccSu25kZnWrMmY+rlhhvTUgz4EfcRag3M3jRTzDFfMoxgOwv/noC0SILp1IIpHqZCUQTPXxZCqb1hMCy2Vk2KulJ9slPs0cw/12oaMnpzr73z8EIR5sWrZ02r2fv4nm9JbQHDVMB+lefggJDHDAfj/ZQNFJvEMMoSAvG5OAw4QpuqPxfVrMOfScyOpLfT4PA7tr5fGD8J8Q8+rb4d2Ogqa5MZic5A9IWE+x48e7pAmAR2upNHvjWenwL6cDOlFIJRhgvhXW+x0LQnNjovyM5mMXYn/TGDmNlD9zmpM9OrN0Iee3Dvc1o4aODc6jiPnS8NgwjhC8r9kDKqLST3DzmLQPUu9y4y6TcUEMxAT0okwFQOhOaqKeHK79dmE4UkaP2YQ1a9rzXvxiP4NYzRVa90gCK5VDPKo5ztyLrlBMJNpTtcIUzhsvIIIhggbT9dy3THGqUrUzxSomwx60L/5EH16IISpD+bWAus6zKEmAAnnPy6mQU7D/7dRmQ7vizI/Tt5351KaNrILw/MEexYmctreng9Jm8bkeqJR/tGCsGUHpS1zEMdi35Jhn/P3u79h3NPSdo3ld12cnCxZ8vxBba7TbaAmC+aYS4WEya6okzYdZ1Lhe3ubxUDVi8GV0pC9Zr+DiVRmaGQtxH4F6XcSFTKrF4V0Wr1aaUO30KDlIJIZcGDco1RLm9Ka3x1S6k8XfTlG1K+T38Q8koRGbqfuaXdK8L9JaJo28TvPwkAmIzUaZjeJ+ddYMRfSjDPWeMYXwuwU9GmJ5V2ssYfDfLsU80GGy6MYpBI/0F6sJszsaUtb7pRhe5fvc+pXh8gXfQ4X5RxIKT1hXgAO1jbjt2ACnAH7nMRENiE6dywk8b7CHteENgpSbF88+woGnuE/cZ3f8XO4oaXEJ8+1Si/2gA1VZsgkxSY3pfP2emDMQeYIjedaGOwtMM8CMTh7iGfH4f8TwhV6p5icv4Lr76M9MnP6e7j/JNmzCAYRhCbnMY9R4RuDv2QTS7V5KYuGYVWJaXCyLEedbwBTlOH4SKMvpUk3Ae2bIBiDoFUPEF4v7WjI9IC/xwhzcTf8fx7tGwWTaCdo+NvQ1wTBLJlqb8yRTzTG6zNYSQvBFCzU/gOOjA56jGKQkzDZTYP46yHpWzs6r6H9ImrOSHPhVRDjN+F23CLK0rbsTpCUa4TtzWr7FsNGLwHTrIaZMROSWL/rDjRuEZiA6/dfws/9Ju5rG/VddGBHPOAqxdjNhWUmuhPbg4DqB9eULHx8SePm3y5ulOaRBwl+lXBh/swwoWpAWG1Q9SxcDsNguYIxTkAfPCgcFCvQVq19bwMRVIvyqwVR1hhSWtcjYRAulXDur1KvY0kJJGgO3rNHQBhsHezbpLTMPmPKFt141PAWxJn0hHcBPGWXirnobKPt42AuL8VEeyIYeRlMzTnQOmeLuaHpojfbMxVubT3m90Ggvk6FTO7H453LqfCdkEeFt8vsD54W/EDMb/QcpBTTgleFkOsQVGEMkoLXQvuK90QnsOvqqoDXmaRz34Gcag6ZYEnQvv31qPQQdO77IP5lFjPKFwNQatx3RWcmBVFdCkYuE7bq83BTd1A8r2R1FMGIbECd+7hLEw41bUrT/QvqyOJ1GQbi0Nk0LgehfmKYFQnRh7aPVup6fR/u1DSIf1fU8SpolTDvkNQQTsgcpPP6gk9a6A3F7JUFt/y58Nh5ECY8rulcjs6iEvflysG+tsmvRH0GCZv+ORCibaGa1P6DofFPhraqgMTPwoq4PqQ9OSMwnDSeKxcxilnou0HifbOEhy1sHnsPHDkOtGgatL4U5U/FeLDwPSvsG4VJuLp8qPVGqaYVf8yoGJGs+OXLG1658Lm1ZfAQrYCkjoIhcIGOA7E9I2xtTTzThAdC7zBbAKl8EIguLRhnKVDDaDDdUJgCc/QAeMqWeGbmSDp6bBk1pnMy4stBt4XlKe+j2rWttN+9q/S9EahPPbxH7bBVJ4I55sOUOAx10gkWEghmpmFeSHfou4aJxANwBDTPXCp8VkALielgzncghV3MIXaGBlghiGF/2OW1Yg5EVyuNec1RwzsXKAKOQb03QQguKx9TRnc/v57OfqozPjsOGq8G0nyuMZ6jwGQtQqPkMF6NwiFxAohxHtm/GjUO87tlwlU9CG330Y8pCNQ1hpY5Bn3yrPC0ahiPufEq6poB0sWEfYkYi2rUcwLGiIV6y/8LMABSXLKGd0tYOAAAAABJRU5ErkJggg==";
}
function companyNameMarkup(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `<span class="afs-initial">${escapeHtml(word.slice(0, 1))}</span>${escapeHtml(word.slice(1))}`)
    .join(" ");
}

function openPrintableDocument(html) {
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) {
    notifyDenied("Popup blocked", "Allow popups to preview the document.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

function downloadHtml(fileName, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
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

async function submitBlockRequest(type, id, requestType) {
  const record = collectionFor(type).find((row) => rowId(type, row) === id);
  if (!record) {
    notifyDenied("Request not sent", "Select a saved record first.");
    return false;
  }
  const targetType = type === "shipment" ? "Shipment" : type === "suppliers" ? "Supplier" : "Customer";
  const displayName = record.customer || record.name || id;
  const request = {
    requestNo: nextNumber("REQ", state.unblockRequests, "requestNo"),
    requestType,
    targetType,
    referenceNo: id,
    customerName: displayName,
    requestedBy: currentUserName(),
    reason: `${requestType} requested for ${targetType.toLowerCase()} ${id}`,
    status: "Pending",
    date: today(),
    approvedBy: "",
    notes: ""
  };
  state.unblockRequests.unshift(request);
  await postRecord("unblock", request);
  addHistory(`Submitted ${requestType.toLowerCase()} request`, `${targetType} ${id}`);
  saveState();
  notifySuccess("Request sent", `${requestType} request for ${id} was sent to admin.`);
  render();
  return true;
}

async function approveBlockRequest(request, approvalNotes = "") {
  request.status = "Approved";
  request.approvedBy = currentUserName();
  request.notes = approvalNotes;
  await applyBlockRequestToRecord(request);
  await persistRecord("unblock", request);
  addHistory(`Approved ${String(request.requestType || "").toLowerCase()} request`, request.referenceNo || request.customerName);
  saveState();
}

async function rejectBlockRequest(request, approvalNotes = "") {
  request.status = "Rejected";
  request.approvedBy = currentUserName();
  request.notes = approvalNotes;
  await persistRecord("unblock", request);
  addHistory(`Rejected ${String(request.requestType || "").toLowerCase()} request`, request.referenceNo || request.customerName);
  saveState();
}

async function applyBlockRequestToRecord(request) {
  const isBlock = String(request.requestType || "").toLowerCase() === "block";
  const target = String(request.targetType || "").toLowerCase();
  const id = request.referenceNo || request.customerName;
  if (target === "shipment") {
    const shipmentItem = state.shipments.find((row) => row.jobNo === id);
    if (shipmentItem) {
      shipmentItem.status = isBlock ? "Blocked" : "Booked";
      await persistRecord("shipment", shipmentItem);
    }
    return;
  }

  const collectionKey = target === "supplier" ? "suppliers" : "customers";
  const record = state[collectionKey].find((row) => row.code === id || row.name === id);
  if (record) {
    record.status = isBlock ? "Blocked" : "Active";
    record.isAccountOverdue = isBlock;
    await persistRecord(collectionKey, record);
  }
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
  rememberDropdownOptions(data);
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
    settings: () => updateSettings(data),
    "customer-shipment-request": () => submitCustomerShipmentRequest(data, form),
    "customer-profile": () => updateCustomerProfile(data)
  };
  const saved = await handlers[type]?.();
  if (saved === false) {
    return;
  }
  saveState();
  render();
}

async function createShipment(data) {
  if (duplicateRecordExists("shipment", data.jobNo)) {
    notifyDuplicate(data.jobNo);
    return false;
  }
  if (!String(data.billTo1 || "").trim() && !String(data.billTo2 || "").trim()) {
    notifyDenied("Bill To required", "Enter at least one Bill To value.");
    return false;
  }
  if (data.entryMode !== "airway") {
    const allowedTariffs = tariffOptionsForCustomer(data.customer).map((option) => option.value);
    if (data.tariffNo && !allowedTariffs.includes(data.tariffNo)) {
      notifyDenied("Tariff not allowed", "Select a tariff created for the selected consignee.");
      return false;
    }
  }
  const tariffItem = state.tariffs.find((row) => row.tariffNo === data.tariffNo) || assignedTariffForShipment({ customer: data.customer, origin: data.origin, destination: data.destination, tariffNo: data.tariffNo });
  const chargeableWeight = Number(data.chargeableKg || 0);
  const pricing = tariffPricingForWeight(tariffItem, chargeableWeight);
  const record = shipment(
    data.jobNo, data.branch, data.customer, data.origin, data.destination, data.status || "Booked",
    Number(data.pieces), Number(data.actualKg), Number(data.cbm), Number(data.chargeableKg), pricing.revenue, 0,
    "Pending", "Unbilled", data.bookingDate || today(), data.airwayBillNo || data.jobNo?.replace("AFS", "AWB"),
    data.tariffNo || "", Number(data.transitDays || 0), data.shipmentDirection || "Export", data.shipmentService || "AE",
    data.shipmentServiceOther || "", data.volumeCategory || "Land", Number(data.chargeableDivisor || volumeDivisorFor(data.volumeCategory || "Land") || 0),
    currentUserName(), shipmentMetaNotes(data)
  );
  state.shipments.unshift(record);
  await postRecord("shipment", record);
  addHistory("Created shipment", data.jobNo);
  notifySuccess("Shipment created", data.jobNo + " was saved successfully.");
  return true;
}

function parseChargeLines(data) {
  try {
    const parsed = JSON.parse(data.chargeLines || "[]");
    if (Array.isArray(parsed)) {
      return parsed
        .map((line) => ({ chargeType: line.chargeType, amount: Number(line.amount || 0), chargeBasis: line.chargeBasis || "Per Shipment" }))
        .filter((line) => line.chargeType && line.amount > 0);
    }
  } catch {}

  if (data.chargeType && Number(data.amount || 0) > 0) {
    return [{ chargeType: data.chargeType, amount: Number(data.amount || 0), chargeBasis: data.chargeBasis || "Per Shipment" }];
  }
  return [];
}

function chargeLineRef(baseRef, index, count) {
  return count <= 1 ? baseRef : `${baseRef}-${String(index + 1).padStart(2, "0")}`;
}

async function createInvoice(data) {
  const invoiceNo = String(data.invoiceNo || nextInvoiceNumber()).trim();
  if (duplicateRecordExists("invoice", invoiceNo)) {
    notifyDuplicate(invoiceNo);
    return false;
  }
  const shipmentItem = state.shipments.find((row) => row.jobNo === data.shipmentNo);
  const tariffItem = state.tariffs.find((row) => row.tariffNo === data.tariffNo) || assignedTariffForShipment(shipmentItem);
  const chargeableWeight = Number(data.chargeableWeight || effectiveChargeableWeightForShipment(shipmentItem) || 0);
  const lines = parseInvoiceLineItems(data.invoiceLinesJson || JSON.stringify(invoiceLinesFromTariff(shipmentItem, tariffItem, chargeableWeight)));
  const totals = invoiceTotals(lines, Number(data.taxPercent || 0));
  const customer = shipmentItem?.customer || data.customer;
  const record = invoice(invoiceNo, customer, data.shipmentNo, Number(data.revenue || totals.revenue || 0), Number(data.supplierCost || data.totalCost || totals.cost || 0), data.status || "Draft", data.date || today());
  Object.assign(record, {
    customerCode: shipmentItem?.customerCode || data.customerCode || "",
    tariffNo: data.tariffNo || tariffItem?.tariffNo || "",
    tariffName: data.tariffName || tariffItem?.customer || "",
    chargeableWeight,
    totalCost: Number(data.totalCost || data.supplierCost || totals.cost || 0),
    taxPercent: Number(data.taxPercent || 0),
    taxAmount: Number(data.taxAmount || totals.taxAmount || 0),
    grandTotal: Number(data.grandTotal || totals.grandTotal || 0),
    profitPercent: Number(data.profitPercent || totals.profitPercent || 0),
    invoiceLinesJson: data.invoiceLinesJson || JSON.stringify(lines),
    tariffSnapshotJson: data.tariffSnapshotJson || JSON.stringify(tariffItem || {}),
    invoiceSnapshotJson: data.invoiceSnapshotJson || JSON.stringify(invoiceSnapshotFromSelection(shipmentItem, tariffItem, lines, Number(data.taxPercent || 0)))
  });
  state.invoices.unshift(record);
  await postRecord("invoice", record);
  if (shipmentItem) shipmentItem.invoiceStatus = invoiceNo;
  addHistory("Generated invoice", invoiceNo);
  notifySuccess("Invoice saved", invoiceNo + " was saved successfully.");
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

async function submitCustomerShipmentRequest(data, form) {
  const session = currentSession();
  if (!session?.token) { notifyDenied("Login required", "Please login again."); return false; }
  const files = Array.from(form.querySelector("input[type='file']")?.files || []).map((file) => ({ name: file.name, type: file.type, size: file.size }));
  const result = await fetchJson("/api/customer/shipment-requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token }, body: JSON.stringify({ ...data, attachments: files }) });
  notifySuccess("Request submitted", "Shipment request saved with " + (result.status || "submitted") + " status.");
  await syncCustomerPortal();
  activeModule = "Customer Shipments";
  return true;
}

async function updateCustomerProfile(data) {
  const session = currentSession();
  if (!session?.token) return false;
  await fetchJson("/api/customer/profile", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token }, body: JSON.stringify(data) });
  notifySuccess("Profile saved", "Your customer profile was updated.");
  return true;
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

