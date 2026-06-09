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

// ==========================================
// UNIVERSAL DOCUMENT & MANIFEST PRINT ENGINE
// ==========================================
window.printUniversalDocument = function(documentType, data) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print layouts.");
    return;
  }

  // Current operational date formatting
  const today = new Date();
  const formattedDate = today.getDate().toString().padStart(2, '0') + '-' + 
                        today.toLocaleString('en-US', { month: 'short' }) + '-' + 
                        today.getFullYear();

  // ----------------------------------------------------
  // ROUTE A: IF PRINTING THE TRUCK CONSOLIDATION MANIFEST
  // ----------------------------------------------------
  if (documentType === "Consolidation Manifest" || data.truckNo || data.sealNo) {
    const decs = (data.declarationsList || "").split("\n").map(d => d.trim()).filter(Boolean);
    const invs = (data.invoicesList || "").split("\n").map(i => i.trim()).filter(Boolean);
    
    let leftMetaRowsHtml = "";
    const maxLines = Math.max(decs.length, invs.length, 4);
    
    for(let m = 0; m < maxLines; m++) {
      leftMetaRowsHtml += `
        <tr>
          <td style="border: 1px solid #000; padding:4px; font-family:monospace; font-size:11px;">${decs[m] || ""}</td>
          <td style="border: 1px solid #000; padding:4px; font-family:monospace; font-size:11px;">${invs[m] || ""}</td>
        </tr>
      `;
    }

    // Filter matching active shipment rows for this lane to embed inside manifest
    let consolidatedCargoRowsHtml = "";
    const filteredJobs = (state.shipments || []).filter(j => j.destination === data.destination || j.origin === data.origin);
    
    if (filteredJobs.length > 0) {
      let totalQty = 0;
      let totalGross = 0;
      
      consolidatedCargoRowsHtml = filteredJobs.map(job => {
        totalQty += (parseInt(job.pieces) || 1);
        totalGross += (parseFloat(job.grossWeightKg || job.weightKg) || 0);
        return `
          <tr>
            <td style="border:1px solid #000; padding:5px;">${data.loadNo || 'ALT66466'}<br><strong>${job.jobNo || 'AFS261146'}</strong></td>
            <td style="border:1px solid #000; padding:5px;">${job.tcnNumber || 'INV#' + (job.jobNo || '')}</td>
            <td style="border:1px solid #000; padding:5px;"><strong>${job.customer || 'GENERAL COMMODITY'}</strong></td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${job.pieces || 1}</td>
            <td style="border:1px solid #000; padding:5px; text-align:right;">${(parseFloat(job.grossWeightKg || job.weightKg || 0)).toFixed(2)}</td>
            <td style="border:1px solid #000; padding:5px;">${job.natureOfGoods || 'GENERAL COMMODITY'}</td>
            <td style="border:1px solid #000; padding:5px; font-size:10px;">${job.billTo1 || 'As Per Border Documents'}</td>
          </tr>
        `;
      }).join('');
    } else {
      // Direct text fallback matching the required structural template document layout exactly
      consolidatedCargoRowsHtml = `
        <tr>
          <td style="border:1px solid #000; padding:5px;">ALT66466<br><strong>AFS261146</strong></td>
          <td style="border:1px solid #000; padding:5px;">4130243800</td>
          <td style="border:1px solid #000; padding:5px;"><strong>KARCHER</strong></td>
          <td style="border:1px solid #000; padding:5px; text-align:center;">1</td>
          <td style="border:1px solid #000; padding:5px; text-align:right;">50.00</td>
          <td style="border:1px solid #000; padding:5px;">GENERAL COMMODITY</td>
          <td style="border:1px solid #000; padding:5px; font-size:10px;">Bahrah Trading Company (Al Sayer)</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:5px;">ALT66520<br><strong>AFS261152</strong></td>
          <td style="border:1px solid #000; padding:5px;">SSSJA/2000479346</td>
          <td style="border:1px solid #000; padding:5px;"><strong>SUN & SANDS</strong></td>
          <td style="border:1px solid #000; padding:5px; text-align:center;">165</td>
          <td style="border:1px solid #000; padding:5px; text-align:right;">1106.67</td>
          <td style="border:1px solid #000; padding:5px;">FOOTWEAR & APPAREL</td>
          <td style="border:1px solid #000; padding:5px; font-size:10px;">SUN AND SAND SPORTS LLC</td>
        </tr>
      `;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>Manifest - ${data.loadNo || 'ALT66466'}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; line-height: 1.2; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .header-title { font-size: 15px; font-weight: bold; }
          .grid-header td { padding: 4px; border: 1px solid #000; vertical-align: top; }
          .cargo-table th, .cargo-table td { border: 1px solid #000; padding: 5px; text-align: left; }
          .cargo-table th { background: #f2f2f2; font-size: 10px; }
        </style>
      </head>
      <body>
        <table style="border:none; margin-bottom:5px;">
          <tr>
            <td>
              <div class="header-title">APOLLO FREIGHT SOLUTIONS</div>
              <span style="font-size:9px;">& CLEARING L.L.C • Tel: +971 4 3202668 • abekai@altexpressure.com</span>
            </td>
            <td style="text-align: right; font-weight: bold; font-size: 14px;">INTERNATIONAL TRUCK VOYAGE MANIFEST</td>
          </tr>
        </table>

        <table class="grid-header">
          <tr>
            <td style="width: 20%;"><strong>TRUCK NO:</strong></td>
            <td style="width: 30%; font-size:12px; font-weight:bold;">${data.truckNo || '48221 DXB'}</td>
            <td style="width: 15%;"><strong>FROM:</strong></td>
            <td style="width: 35%;">${data.origin || 'JBL-UAE'}</td>
          </tr>
          <tr>
            <td><strong>MANIFEST NO:</strong></td>
            <td style="font-size:12px; font-weight:bold; color:red;">${data.loadNo || 'ALT66466'}</td>
            <td><strong>TO:</strong></td>
            <td>${data.destination || 'KUWAIT'}</td>
          </tr>
          <tr>
            <td><strong>DRIVER NAME:</strong></td>
            <td>${data.driverName || 'FAHAD MAHMOUD AL NASER'}</td>
            <td><strong>ETD DATE:</strong></td>
            <td>${data.etdDate || '6-Jun-26'}</td>
          </tr>
          <tr>
            <td><strong>MOB / CONTACT:</strong></td>
            <td>${data.driverMob || '971 52 110 3672'}</td>
            <td><strong>CUSTOMS POINT:</strong></td>
            <td>${data.customsRoute || 'PUBLIC WAREHOUSE - SAIL SHIPPING'}</td>
          </tr>
          <tr>
            <td><strong>SEAL NO:</strong></td>
            <td colspan="3" style="font-family:monospace;">${data.sealNo || '303-01055290-26'}</td>
          </tr>
        </table>

        <div style="font-weight:bold; margin-bottom:3px; text-transform:uppercase;">Customs Declaration & Commercial Invoice Audit Reference</div>
        <table style="width:100%; margin-bottom:15px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="border: 1px solid #000; padding:4px; width:50%;">DECLARATION / BOE LINE REF</th>
              <th style="border: 1px solid #000; padding:4px; width:50%;">INVOICE REFERENCE CODE</th>
            </tr>
          </thead>
          <tbody>
            ${leftMetaRowsHtml}
          </tbody>
        </table>

        <div style="font-weight:bold; margin-bottom:3px; text-transform:uppercase;">Consolidated Cargo Items Breakdown</div>
        <table class="cargo-table">
          <thead>
            <tr>
              <th>ALT NO / JOB #</th>
              <th>INVOICE NO</th>
              <th>SHIPPER BRAND</th>
              <th style="text-align:center;">QTY (PKGS)</th>
              <th style="text-align:right;">GROSS WT (KG)</th>
              <th>COMMODITY TYPE</th>
              <th>CONSIGNEE / NOTIFY PARTY</th>
            </tr>
          </thead>
          <tbody>
            ${consolidatedCargoRowsHtml}
          </tbody>
        </table>

        <table style="width:100%; margin-top:30px; border:1px solid #000;">
          <tr>
            <td style="width:33%; border-right:1px solid #000; height:70px; text-align:center; vertical-align:bottom; padding-bottom:5px;">
              <div style="border-top:1px dashed #000; width:80%; margin:0 auto;"></div>
              <span style="font-size:10px;">ALT Express STAMP & SIGN</span>
            </td>
            <td style="width:33%; border-right:1px solid #000; text-align:center; vertical-align:middle; font-style:italic; padding:10px;">
              "We assume full operational responsibility for the accuracy of all information declared on this border manifest run."
            </td>
            <td style="width:34%; text-align:center; vertical-align:bottom; padding-bottom:5px;">
              <div style="border-top:1px dashed #000; width:80%; margin:0 auto;"></div>
              <span style="font-size:10px;">CUSTOMS ENTRY STAMP AREA</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `);
  } 
  // ----------------------------------------------------
  // ROUTE B: TRUCK CONSIGNMENT NOTE (TCN) / WAYBILL LAYOUT
  // ----------------------------------------------------
  else {
    let dimensionsRowsHtml = "";
    if (data.palletDimensionsJson) {
      try {
        const breakdown = JSON.parse(data.palletDimensionsJson);
        if (breakdown.length > 0) {
          dimensionsRowsHtml = breakdown.map(b => `
            <tr>
              <td style="padding: 5px; border: 1px solid #000;">${b.qty} ${b.type}</td>
              <td style="padding: 5px; border: 1px solid #000; text-align: center;">${data.grossWeightKg || data.weightKg || b.weight || 0}</td>
              <td style="padding: 5px; border: 1px solid #000; text-align: center;">${data.chargeableWeight || 0}</td>
              <td style="padding: 5px; border: 1px solid #000; text-align: center;">${b.length} x ${b.width} x ${b.height} cm</td>
            </tr>
          `).join('');
        }
      } catch(e){}
    }

    if (!dimensionsRowsHtml) {
      dimensionsRowsHtml = `
        <tr>
          <td style="padding: 5px; border: 1px solid #000;">${data.pieces || 1} Pallet / Pkg</td>
          <td style="padding: 5px; border: 1px solid #000; text-align: center;">${data.grossWeightKg || 41.97}</td>
          <td style="padding: 5px; border: 1px solid #000; text-align: center;">${data.chargeableWeight || 200.00}</td>
          <td style="padding: 5px; border: 1px solid #000; text-align: center;">As per CBM (${data.cbm || 0.00})</td>
        </tr>
      `;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>TCN Waybill - ${data.jobNo || 'AFS261134'}</title>
        <style>
          body { font-family: 'Arial', sans-serif; color: #000; margin: 20px; line-height: 1.3; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { vertical-align: top; }
          .outer-border { border: 2px solid #000; padding: 10px; }
          .header-title { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          .sub-header { font-size: 10px; color: #333; }
          .doc-type { font-size: 15px; font-weight: bold; text-align: right; text-transform: uppercase; margin: 0; }
          .waybill-box { border: 2px solid #000; background: #f0f0f0; padding: 5px; text-align: center; font-size: 14px; font-weight: bold; margin-top: 5px; }
          .section-box { border: 1px solid #000; padding: 6px; min-height: 80px; font-size: 11px; }
          .section-title { font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; margin-bottom: 4px; padding-bottom: 2px; text-transform: uppercase; }
          .terms-section { font-size: 8px; line-height: 1.2; text-align: justify; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; }
          .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px; text-align: center; }
          .sign-box { border-top: 1px solid #000; padding-top: 4px; font-size: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="outer-border">
          <table style="margin-bottom: 15px;">
            <tr>
              <td style="width: 50%;">
                <div class="header-title">APOLLO FREIGHT SOLUTIONS</div>
                <div class="sub-header" style="font-style: italic;">we bring continents closer...</div>
                <div class="sub-header" style="margin-top: 4px;">Office 823, Building 6WA, DAFZA, UAE<br>Tel: +971 04-2602287</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div class="doc-type">Truck Consignment Note - TCN/WAYBILL</div>
                <div style="width: 220px; float: right;">
                  <div class="waybill-box">
                    <span style="font-size: 9px; display: block; font-weight: normal; margin-bottom: 2px;">WAYBILL NUMBER</span>
                    ${data.tcnNumber || data.jobNo || 'AFS261134'}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <table style="margin-bottom: 10px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 50%; padding-right: 5px;">
                <div class="section-box">
                  <div class="section-title">Shipper</div>
                  <strong>${data.customer || 'SUN AND SAND SPORTS LLC'}</strong><br>
                  PO BOX 7011, JAFZA DUBAI<br>
                  UNITED ARAB EMIRATES
                </div>
              </td>
              <td style="width: 50%; padding-left: 5px;">
                <div class="section-box">
                  <div class="section-title">Pickup & Route Logistics</div>
                  <strong>Origin Lane:</strong> ${data.origin || 'DUBAI UAE'}<br>
                  <strong>Carrier Type / Run:</strong> LTL Freight Service<br>
                  <strong>Execution Date:</strong> ${formattedDate}<br>
                  <strong>Pickup Location:</strong> TRILOGI LOGISTICS - MEGA DC, JEBEL ALI SOUTH, UAE
                </div>
              </td>
            </tr>
          </table>

          <table style="margin-bottom: 15px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 50%; padding-right: 5px;">
                <div class="section-box" style="min-height: 95px;">
                  <div class="section-title">Consignee</div>
                  <strong>${data.customer || 'SUN AND SAND SPORTS LLC'}</strong><br>
                  ${data.billTo1 || 'SSS OMNI-B2B2C (ARAMEX WAREHOUSE)'}<br>
                  SALMIYA CITY, SALEM AL MUBARAK STREET, KUWAIT<br>
                  Tel: +9652244845 &nbsp; Contact: MR. WALTON NORONHA
                </div>
              </td>
              <td style="width: 50%; padding-left: 5px;">
                <div class="section-box" style="min-height: 95px;">
                  <div class="section-title">Notify & Delivery Address</div>
                  <strong>Destination Country:</strong> ${data.destination || 'KUWAIT'}<br>
                  <strong>Delivery Target W/H:</strong> SSS ECOM KUWAIT-ARAMEX W/H, KUWAIT<br>
                  <strong>Ref / Invoice Details:</strong> ${data.jobNo || 'AFS261134'} / TU-2000478859
                </div>
              </td>
            </tr>
          </table>

          <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 11px;">Cargo Specifications & Metrics</div>
          <table style="width:100%; margin-bottom: 15px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 5px; border: 1px solid #000; text-align: left; font-size: 11px;">Cargo Details</th>
                <th style="padding: 5px; border: 1px solid #000; text-align: center; font-size: 11px;">Gross Weight (Kgs)</th>
                <th style="padding: 5px; border: 1px solid #000; text-align: center; font-size: 11px;">Volume Weight (Kgs)</th>
                <th style="padding: 5px; border: 1px solid #000; text-align: center; font-size: 11px;">Dimensions Details</th>
              </tr>
            </thead>
            <tbody>
              ${dimensionsRowsHtml}
            </tbody>
          </table>

          <table style="margin-bottom: 15px; border: 1px solid #000;">
            <tr>
              <td style="padding: 6px; width: 50%; border-right: 1px solid #000;">
                <strong>NATURE OF GOODS:</strong><br>
                ${data.natureOfGoods || 'GARMENTS SHOES & ACCESSORIES'}
              </td>
              <td style="padding: 6px; width: 50%;">
                <strong>CARGO TYPE:</strong> GENERAL CARGO<br>
                <strong>TOTAL CBM METRIC:</strong> ${data.cbm || '0.000'} CBM
              </td>
            </tr>
          </table>

          <div class="terms-section">
            <strong>Terms and Conditions:</strong><br>
            1. The consignor certifies that he is the owner of the goods or authorized agent.<br>
            2. Consignor agrees to indemnify carrier against claims arising from cargo safety faults.<br>
            3. Carrier is not liable for border or clearance delays outside structural control rules.<br>
            4. Carrier liability limit rules apply per standard international land tariff guidelines.
          </div>

          <div class="sign-grid">
            <div class="sign-box" style="margin-top: 35px;">SHIPPER'S SIGNATURE</div>
            <div class="sign-box" style="margin-top: 35px;">CARRIER / DRIVER SIGN</div>
            <div class="sign-box" style="margin-top: 35px;">RECEIVER'S SIGN & STAMP</div>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};

// ==========================================
// FORM STATE DATA DATA EXTRACTION CAPTURE
// ==========================================
window.captureActiveDialogFormData = function() {
  const dialog = document.getElementById("recordDialog");
  if (!dialog) return {};
  
  const getVal = (name) => {
    const el = dialog.querySelector(`[name="${name}"]`);
    return el ? el.value : "";
  };

  const getNum = (name) => {
    const el = dialog.querySelector(`[name="${name}"]`);
    return el ? parseFloat(el.value) || 0 : 0;
  };

  return {
    jobNo: dialog.querySelector("#field_jobNo")?.value || "AUTO-GEN",
    branch: getVal("branch"),
    customer: getVal("customer"),
    origin: getVal("origin"),
    destination: getVal("destination"),
    transitDays: getNum("transitDays"),
    pieces: getNum("pieces"),
    palletsCount: getNum("palletsCount"),
    cartonsCount: getNum("cartonsCount"),
    weightKg: getNum("weightKg"),
    grossWeightKg: getNum("grossWeightKg"),
    cbm: getNum("cbm"),
    chargeableWeightBasis: getVal("chargeableWeightBasis"),
    chargeableWeight: getNum("chargeableWeight"),
    volumeCategory: getVal("volumeCategory"),
    natureOfGoods: getVal("natureOfGoods"),
    tcnNumber: getVal("tcnNumber"),
    sellRevenue: getNum("sellRevenue"),
    buyCost: getNum("buyCost"),
    billTo1: getVal("billTo1"),
    billTo2: getVal("billTo2"),
    palletDimensionsJson: dialog.querySelector("#hidden_dim_json")?.value || "[]"
  };
};

window.executeAirwayBillPrintAndRegisterWorkflow = async function() {
  const currentFormData = window.captureActiveDialogFormData();
  
  if (!currentFormData.branch || !currentFormData.customer || !currentFormData.billTo1) {
    alert("Please ensure all required fields (*) like Branch, Customer, and Bill To Account 1 are filled out.");
    return;
  }

  if (!currentFormData.jobNo || currentFormData.jobNo === "AWB-Auto" || currentFormData.jobNo.startsWith("AFS-")) {
    currentFormData.jobNo = "AFS" + Math.floor(260000 + Math.random() * 9999);
  }

  state.shipments.unshift(currentFormData);
  saveState();
  notifySuccess("AWB Registered", `Airway Bill ${currentFormData.jobNo} saved.`);
  window.printUniversalDocument("Master Airway Bill (AWB)", currentFormData);

  const recordDialog = document.getElementById("recordDialog");
  if (recordDialog) recordDialog.close();
  render();
};

window.triggerLiveTcnPrintWorkflow = function() {
  const currentJobNo = document.getElementById("field_jobNo")?.value || "TCN-TEMP";
  const tcnInput = document.getElementById("field_tcn");
  if (tcnInput) tcnInput.value = currentJobNo;
  
  const currentData = window.captureActiveDialogFormData();
  currentData.tcnNumber = currentJobNo; 
  window.printUniversalDocument("Transit Control Document (TCN)", currentData);
};

// ==========================================
// COMPONENT CORE BACKBONE LOGIC STATE UTILS
// ==========================================
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error loading state", e);
  }
  return {
    shipments: [],
    manifests: [],
    customers: [{ name: "SUN AND SAND SPORTS LLC", email: "info@gss.com" }, { name: "SEPHORA", email: "ops@sephora.com" }],
    suppliers: [],
    tariffs: [],
    auditLogs: []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notifySuccess(title, msg) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const div = document.createElement("div");
  div.className = "toast success-toast";
  div.innerHTML = `<strong>${title}</strong><p>${msg}</p>`;
  stack.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function nextShipmentNumber() {
  const count = state.shipments.length + 1;
  return `AFS-${261100 + count}`;
}

function branchOptions(selected) {
  const branches = ["Kuwait Main Office", "Dubai Logistics Hub", "Qatar Station", "Bahrain Terminal"];
  return branches.map(b => `<option value="${b}" ${selected === b ? "selected" : ""}>${b}</option>`).join("");
}

// ==========================================
// MODAL FORMS DIALOG LAYOUT GENERATION HTML
// ==========================================
function shipmentDialogBody(mode = "shipment") {
  const isAirway = mode === "airway";
  let displayJobNo = editing ? editing.jobNo : "";
  if (!editing) {
    displayJobNo = nextShipmentNumber();
  }

  return `
    <div class="dialog-grid">
      <div>
        <label>Job Number</label>
        <input type="text" id="field_jobNo" name="jobNo" value="${displayJobNo}" readonly disabled />
      </div>
      <div>
        <label>Branch *</label>
        <select name="branch" required>
          ${branchOptions(editing?.branch)}
        </select>
      </div>
      <div>
        <label>Customer *</label>
        <select name="customer" required>
          <option value="">-- Select Customer --</option>
          ${state.customers.map(c => `<option value="${c.name}" ${editing?.customer === c.name ? "selected" : ""}>${c.name}</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Origin</label>
        <input type="text" name="origin" value="${editing?.origin || "DUBAI UAE"}" />
      </div>
      <div>
        <label>Destination</label>
        <input type="text" name="destination" value="${editing?.destination || "KUWAIT"}" />
      </div>
      <div>
        <label>Transit Days</label>
        <input type="number" name="transitDays" value="${editing?.transitDays || 3}" />
      </div>
      <div>
        <label>Pieces (Pkgs Total) *</label>
        <input type="number" name="pieces" id="calc_pieces" value="${editing?.pieces || 1}" min="1" required />
      </div>
      <div>
        <label>No. of Pallets</label>
        <input type="number" name="palletsCount" id="calc_pallets" value="${editing?.palletsCount || 1}" min="0" />
      </div>
      <div>
        <label>No. of Cartons</label>
        <input type="number" name="cartonsCount" id="calc_cartons" value="${editing?.cartonsCount || 0}" min="0" />
      </div>
      <div>
        <label>Actual Weight (KG)</label>
        <input type="number" step="0.01" name="weightKg" id="calc_weight" value="${editing?.weightKg || 41.97}" oninput="updateDimTotals()" />
      </div>
      <div>
        <label>Gross Weight (KG)</label>
        <input type="number" step="0.01" name="grossWeightKg" id="calc_gross_weight" value="${editing?.grossWeightKg || 41.97}" oninput="updateDimTotals()" />
      </div>
      <div>
        <label>CBM</label>
        <input type="number" step="0.01" name="cbm" id="calc_cbm" value="${editing?.cbm || 0.60}" oninput="updateDimTotals()" />
      </div>
      <div>
        <label>Chargeable Weight Basis</label>
        <select name="chargeableWeightBasis" id="calc_chargeable_basis" onchange="updateDimTotals()">
          <option value="Actual" ${editing?.chargeableWeightBasis === "Actual" ? "selected" : ""}>Use Actual / Gross Weight</option>
          <option value="Volumetric_Air" ${editing?.chargeableWeightBasis === "Volumetric_Air" ? "selected" : ""}>Volumetric (Air - 1:6000)</option>
          <option value="Volumetric_Land" ${editing?.chargeableWeightBasis === "Volumetric_Land" ? "selected" : ""}>Volumetric (Land - 1:3000)</option>
          <option value="CBM_Fixed" ${editing?.chargeableWeightBasis === "CBM_Fixed" ? "selected" : ""}>Fixed CBM Value</option>
        </select>
      </div>
      <div>
        <label>Total Chargeable Weight (KG)</label>
        <input type="number" step="0.01" name="chargeableWeight" id="calc_chargeable_weight" value="${editing?.chargeableWeight || 200.00}" style="font-weight: bold;" />
      </div>
      <div>
        <label>Volume Category</label>
        <select name="volumeCategory">
          <option value="Land">Land Freight</option>
          <option value="Air">Air Freight</option>
        </select>
      </div>
      <div>
        <label>Nature of Goods</label>
        <input type="text" name="natureOfGoods" value="${editing?.natureOfGoods || "GARMENTS SHOES & ACCESSORIES"}" />
      </div>
      <div>
        <label>TCN Waybill Code Mapping</label>
        <div style="display: flex; gap: 4px;">
          <input type="text" name="tcnNumber" id="field_tcn" value="${editing?.tcnNumber || ""}" placeholder="Auto Matches AFS ID" />
          <button type="button" class="blue-button" onclick="window.triggerLiveTcnPrintWorkflow()" style="background:#425e7b; color:#fff;">Gen & Print TCN</button>
        </div>
      </div>
      <div></div>
      <div>
        <label>Sell Revenue (KWD)</label>
        <input type="number" step="0.001" name="sellRevenue" value="${editing?.sellRevenue || 0}" />
      </div>
      <div>
        <label>Buy Cost (KWD)</label>
        <input type="number" step="0.001" name="buyCost" value="${editing?.buyCost || 0}" />
      </div>
      <div></div>
      <div>
        <label>Bill To Account 1 *</label>
        <input type="text" name="billTo1" value="${editing?.billTo1 || "SSS OMNI-B2B2C (ARAMEX WAREHOUSE)"}" required />
      </div>
      <div>
        <label>Bill To Account 2</label>
        <input type="text" name="billTo2" value="${editing?.billTo2 || ""}" />
      </div>
    </div>

    <div class="pallet-section" style="margin-top: 16px; border-top: 1px solid var(--line); padding-top: 16px;">
      <h3>Dimension Details & Volumetric Matrix Configuration</h3>
      ${palletDimensionBuilder(editing?.palletDimensionsJson)}
    </div>

    <div style="margin-top:20px; padding:12px; background:var(--blue-soft); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <span style="font-weight:bold; color:var(--nav);">Logistics Document Actions:</span><br/>
        <span style="font-size:12px; color:var(--muted);">Sync entries to local registry and instantly compile standard physical copy outputs.</span>
      </div>
      <button type="button" class="blue-button" onclick="window.executeAirwayBillPrintAndRegisterWorkflow()" style="background:var(--accent); border-color:var(--accent-deep); font-weight:bold; color:white; padding:8px 14px;">
        ✈️ Generate Waybill & Print TCN
      </button>
    </div>
  `;
}

function palletDimensionBuilder(jsonStr = "[]") {
  let rows = [];
  try { rows = JSON.parse(jsonStr || "[]"); } catch (e) { rows = []; }
  if (!Array.isArray(rows) || rows.length === 0) {
    rows = [{ type: "Pallet", length: 120, width: 80, height: 160, weight: 41.97, qty: 1 }];
  }

  const tableRowsHtml = rows.map((r, idx) => `
    <tr data-idx="${idx}">
      <td>
        <select class="dim-type" onchange="updateDimTotals()">
          <option value="Pallet" ${r.type === "Pallet" ? "selected" : ""}>Pallet</option>
          <option value="Carton" ${r.type === "Carton" ? "selected" : ""}>Carton</option>
        </select>
      </td>
      <td><input type="number" class="dim-qty" value="${r.qty || 1}" min="1" oninput="updateDimTotals()" style="width:70px;" /></td>
      <td><input type="number" class="dim-l" value="${r.length || 120}" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
      <td><input type="number" class="dim-w" value="${r.width || 80}" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
      <td><input type="number" class="dim-h" value="${r.height || 160}" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
      <td><input type="number" step="0.01" class="dim-weight" value="${r.weight || 41.97}" min="0" oninput="updateDimTotals()" style="width:80px;" /></td>
      <td><span class="dim-row-cbm">0.00</span></td>
      <td><span class="dim-row-tot-weight">0.00</span></td>
      <td><button type="button" class="red-button" onclick="removeDimRow(${idx})" style="padding:2px 8px;">X</button></td>
    </tr>
  `).join("");

  return `
    <table class="data-table" id="dimBuilderTable" style="width:100%; margin-bottom:12px;">
      <thead>
        <tr>
          <th>Unit Type</th><th>Qty</th><th>Length (cm)</th><th>Width (cm)</th><th>Height (cm)</th><th>Weight/Unit (KG)</th><th>Total CBM</th><th>Total Weight (KG)</th><th>Action</th>
        </tr>
      </thead>
      <tbody>${tableRowsHtml}</tbody>
    </table>
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <button type="button" class="secondary-button" onclick="addDimRow('Pallet')">+ Add Pallet Row</button>
      <button type="button" class="secondary-button" onclick="addDimRow('Carton')">+ Add Carton Row</button>
    </div>
    <div style="background:var(--canvas); padding:12px; border-radius:6px; display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; font-size:12px;">
      <div>Pallets Total Qty: <span id="summary_pallet_qty" style="color:var(--accent); font-weight:bold;">0</span><br/>Weight: <span id="summary_pallet_wt">0.00</span> KG</div>
      <div>Cartons Total Qty: <span id="summary_carton_qty" style="color:var(--accent); font-weight:bold;">0</span><br/>Weight: <span id="summary_carton_wt">0.00</span> KG</div>
      <div>Combined Matrix CBM: <span id="summary_total_cbm" style="font-weight:bold;">0.000</span><br/>Accumulated Wt: <span id="summary_total_weight" style="font-weight:bold;">0.00</span> KG</div>
    </div>
    <input type="hidden" name="palletDimensionsJson" id="hidden_dim_json" value="" />
    <script>setTimeout(() => { if(typeof updateDimTotals === "function") updateDimTotals(); }, 150);</script>
  `;
}

// ==========================================
// VOLUMETRIC METRIC RUNTIME MATHEMATICS
// ==========================================
window.updateDimTotals = function() {
  const table = document.getElementById("dimBuilderTable");
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  
  let totalPalletQty = 0, totalPalletWeight = 0, totalCartonQty = 0, totalCartonWeight = 0;
  let accumulatedCbm = 0, accumulatedWeight = 0, totalPieces = 0;
  let serializedData = [];

  rows.forEach(row => {
    const type = row.querySelector(".dim-type").value;
    const qty = parseInt(row.querySelector(".dim-qty").value) || 0;
    const l = parseFloat(row.querySelector(".dim-l").value) || 0;
    const w = parseFloat(row.querySelector(".dim-w").value) || 0;
    const h = parseFloat(row.querySelector(".dim-h").value) || 0;
    const unitWeight = parseFloat(row.querySelector(".dim-weight").value) || 0;

    const rowCbm = (l * w * h * qty) / 1000000;
    const rowTotalWeight = unitWeight * qty;

    row.querySelector(".dim-row-cbm").innerText = rowCbm.toFixed(3);
    row.querySelector(".dim-row-tot-weight").innerText = rowTotalWeight.toFixed(2);

    totalPieces += qty;
    accumulatedCbm += rowCbm;
    accumulatedWeight += rowTotalWeight;

    if (type === "Pallet") {
      totalPalletQty += qty;
      totalPalletWeight += rowTotalWeight;
    } else {
      totalCartonQty += qty;
      totalCartonWeight += rowTotalWeight;
    }
    serializedData.push({ type, length: l, width: w, height: h, weight: unitWeight, qty });
  });

  const hiddenJson = document.getElementById("hidden_dim_json");
  if (hiddenJson) hiddenJson.value = JSON.stringify(serializedData);

  document.getElementById("summary_pallet_qty").innerText = totalPalletQty;
  document.getElementById("summary_pallet_wt").innerText = totalPalletWeight.toFixed(2);
  document.getElementById("summary_carton_qty").innerText = totalCartonQty;
  document.getElementById("summary_carton_wt").innerText = totalCartonWeight.toFixed(2);
  document.getElementById("summary_total_cbm").innerText = accumulatedCbm.toFixed(3);
  document.getElementById("summary_total_weight").innerText = accumulatedWeight.toFixed(2);

  const mainWeightInput = document.getElementById("calc_weight");
  const mainGrossWeightInput = document.getElementById("calc_gross_weight");
  const mainCbmInput = document.getElementById("calc_cbm");
  const mainPiecesInput = document.getElementById("calc_pieces");
  const basisSelection = document.getElementById("calc_chargeable_basis");
  const chargeableWeightInput = document.getElementById("calc_chargeable_weight");

  if (rows.length > 0) {
    if (mainWeightInput) mainWeightInput.value = accumulatedWeight.toFixed(2);
    if (mainGrossWeightInput) mainGrossWeightInput.value = accumulatedWeight.toFixed(2);
    if (mainCbmInput) mainCbmInput.value = accumulatedCbm.toFixed(3);
    if (mainPiecesInput) mainPiecesInput.value = totalPieces;
  }

  const activeActualWeight = mainWeightInput && rows.length === 0 ? parseFloat(mainWeightInput.value) || 0 : accumulatedWeight;
  const activeCbm = mainCbmInput && rows.length === 0 ? parseFloat(mainCbmInput.value) || 0 : accumulatedCbm;

  if (chargeableWeightInput && basisSelection) {
    const selectedBasis = basisSelection.value;
    let finalChargeableWeight = 0;
    if (selectedBasis === "Actual") finalChargeableWeight = activeActualWeight;
    else if (selectedBasis === "Volumetric_Air") finalChargeableWeight = activeCbm * 166.667;
    else if (selectedBasis === "Volumetric_Land") finalChargeableWeight = activeCbm * 333.333;
    else if (selectedBasis === "CBM_Fixed") finalChargeableWeight = activeCbm;
    
    chargeableWeightInput.value = finalChargeableWeight.toFixed(2);
  }
};

window.addDimRow = function(defaultType = "Pallet") {
  const table = document.getElementById("dimBuilderTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  const nextIdx = tbody.querySelectorAll("tr").length;

  const tr = document.createElement("tr");
  tr.setAttribute("data-idx", nextIdx);
  tr.innerHTML = `
    <td>
      <select class="dim-type" onchange="updateDimTotals()">
        <option value="Pallet" ${defaultType === "Pallet" ? "selected" : ""}>Pallet</option>
        <option value="Carton" ${defaultType === "Carton" ? "selected" : ""}>Carton</option>
      </select>
    </td>
    <td><input type="number" class="dim-qty" value="1" min="1" oninput="updateDimTotals()" style="width:70px;" /></td>
    <td><input type="number" class="dim-l" value="120" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
    <td><input type="number" class="dim-w" value="80" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
    <td><input type="number" class="dim-h" value="160" min="0" oninput="updateDimTotals()" style="width:70px;" /></td>
    <td><input type="number" step="0.01" class="dim-weight" value="41.97" min="0" oninput="updateDimTotals()" style="width:80px;" /></td>
    <td><span class="dim-row-cbm">0.00</span></td>
    <td><span class="dim-row-tot-weight">0.00</span></td>
    <td><button type="button" class="red-button" onclick="removeDimRow(${nextIdx})" style="padding:2px 8px;">X</button></td>
  `;
  tbody.appendChild(tr);
  updateDimTotals();
};

window.removeDimRow = function(idx) {
  const table = document.getElementById("dimBuilderTable");
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach(row => { if(row.getAttribute("data-idx") == idx) row.remove(); });
  updateDimTotals();
};

// ==========================================
// CORE SYSTEM MODULE RENDER HOOK ROUTINES
// ==========================================
function render() {
  const container = document.getElementById("moduleContent");
  if (!container) return;

  if (activeModule === "Dashboard") {
    container.innerHTML = `
      <h2>Dashboard Operational Summary</h2>
      <p>Welcome to Apollo Freight Solutions Enterprise Dashboard ERP workspace controls.</p>
    `;
  } 
  else if (activeModule === "Shipment / Airway") {
    let tableRows = state.shipments.map(row => `
      <tr>
        <td><strong>${row.jobNo}</strong></td>
        <td>${row.customer}</td>
        <td>${row.origin} ➡️ ${row.destination}</td>
        <td>${row.pieces} Pkgs (Pallets: ${row.palletsCount || 0})</td>
        <td>${row.chargeableWeight || 0} KG</td>
        <td>
          <button class="secondary-button" style="padding:2px 6px; font-size:11px;" onclick='window.printUniversalDocument("Airway Bill Cargo Run", ${JSON.stringify(row).replace(/'/g, "&apos;")})'>🖨️ Quick Print</button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
        <h2>Shipment & Airway Registry</h2>
        <button class="blue-button" onclick="openCreateDialog()">+ New Shipment / Airway Window</button>
      </div>
      <table class="data-table" style="width:100%;">
        <thead>
          <tr><th>Job No</th><th>Customer</th><th>Route Lane</th><th>Pieces Matrix</th><th>Chargeable Weight</th><th>Actions</th></tr>
        </thead>
        <tbody>${tableRows || "<tr><td colspan='6'>No active records found.</td></tr>"}</tbody>
      </table>
    `;
  } 
  else if (activeModule === "Manifest") {
    let rowsHtml = state.manifests.map(row => `
      <tr>
        <td><strong>${row.loadNo || 'ALT66466'}</strong></td>
        <td>${row.truckNo || '48221 DXB'}</td>
        <td>${row.driverName || 'FAHAD MAHMOUD'}</td>
        <td>${row.origin} ➡️ ${row.destination}</td>
        <td><span class="badge" style="background:#eef3f8; padding:2px 6px; border-radius:4px;">${row.status || 'Active'}</span></td>
        <td>
          <button class="blue-button" style="padding:2px 6px; font-size:11px; background:#12202f;" onclick='window.printUniversalDocument("Consolidation Manifest", ${JSON.stringify(row).replace(/'/g, "&apos;")})'>
            🖨️ Print Manifest PDF
          </button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <div>
          <h2>Consolidation & Land Voyage Manifests</h2>
          <p style="font-size:12px; color:var(--muted); margin:0;">Manage border clearances, declarations, truck info, and multi-job consolidation tracking sheets.</p>
        </div>
        <button class="blue-button" onclick="window.openManifestCreateForm()">+ Create Land Voyage Manifest</button>
      </div>

      <div id="manifestFormWrapper" style="display:none; background:var(--canvas); border:1px solid var(--line); padding:15px; border-radius:6px; margin-bottom:20px;">
        <h3 style="margin-top:0; margin-bottom:12px; border-bottom:1px solid var(--line); padding-bottom:6px; color:var(--nav);">New Land Flight / Border Manifest Builder</h3>
        <form id="activeManifestForm" onsubmit="window.saveManifestEntry(event)">
          <div class="dialog-grid" style="grid-template-columns: repeat(4, 1fr); gap:10px;">
            <div><label>Manifest / ALT Number *</label><input type="text" name="loadNo" value="ALT66466" required /></div>
            <div><label>Truck Plate No *</label><input type="text" name="truckNo" value="48221 DXB" required /></div>
            <div><label>Driver Full Name</label><input type="text" name="driverName" value="FAHAD MAHMOUD AL NASER" /></div>
            <div><label>Driver Mobile No</label><input type="text" name="driverMob" value="971 52 110 3672" /></div>
            <div><label>From (Origin Hub)</label><input type="text" name="origin" value="JBL-UAE" /></div>
            <div><label>To (Destination)</label><input type="text" name="destination" value="KUWAIT" /></div>
            <div><label>ETD Departure Date</label><input type="date" name="etdDate" value="2026-06-06" /></div>
            <div><label>Customs / Clearance Point</label><input type="text" name="customsRoute" value="PUBLIC WAREHOUSE - SAIL SHIPPING" /></div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-top:12px;">
            <div><label>Container Seal Numbers</label><input type="text" name="sealNo" value="303-01055290-26" /></div>
            <div><label>Customs Declarations / BOE Lines</label><textarea name="declarationsList" rows="3" style="width:100%; font-family:monospace;">3030105313626\n303-01056277-26\n303-01054530-26</textarea></div>
            <div><label>Commercial Invoices Linked</label><textarea name="invoicesList" rows="3" style="width:100%; font-family:monospace;">4130243800\nGECS052400\nINV 156000000002745</textarea></div>
          </div>
          <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
            <button type="button" class="secondary-button" onclick="document.getElementById('manifestFormWrapper').style.display='none'">Cancel</button>
            <button type="submit" class="blue-button" style="background:var(--accent); border:none; color:white;">Save & Sync Manifest</button>
          </div>
        </form>
      </div>

      <table class="data-table" style="width:100%;">
        <thead>
          <tr><th>Manifest No</th><th>Truck Plate No</th><th>Driver Name</th><th>Route Lane</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>${rowsHtml || "<tr><td colspan='6'>No active manifests on file.</td></tr>"}</tbody>
      </table>
    `;
  } 
  else if (activeModule === "POD / Delivery") {
    let rows = state.shipments.map(row => `
      <tr>
        <td><strong>${row.jobNo}</strong></td>
        <td>${row.customer}</td>
        <td>${row.podStatus || 'Pending Target Drop'}</td>
        <td>
          <button class="secondary-button" style="padding:2px 6px; font-size:11px;" onclick='window.printUniversalDocument("Proof Of Delivery Report", ${JSON.stringify(row).replace(/'/g, "&apos;")})'>🖨️ Print POD</button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <h2>POD / Delivery Management Center</h2>
      <table class="data-table" style="width:100%;">
        <thead><tr><th>Job No</th><th>Customer</th><th>POD Status</th><th>Actions</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='4'>No entries found in registry layout.</td></tr>"}</tbody>
      </table>`;
  } 
  else {
    container.innerHTML = `<h2>${activeModule}</h2><p>Workspace section initialized successfully.</p>`;
  }
}

// ==========================================
// ACTION TRIGGERS & FORM EVENT INTEGRATIONS
// ==========================================
window.openManifestCreateForm = function() {
  const formBox = document.getElementById("manifestFormWrapper");
  if(formBox) {
    formBox.style.display = "block";
    formBox.scrollIntoView({ behavior: 'smooth' });
  }
};

window.saveManifestEntry = function(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const newManifest = {
    loadNo: formData.get("loadNo"),
    truckNo: formData.get("truckNo"),
    driverName: formData.get("driverName"),
    driverMob: formData.get("driverMob"),
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    etdDate: formData.get("etdDate"),
    customsRoute: formData.get("customsRoute"),
    sealNo: formData.get("sealNo"),
    declarationsList: formData.get("declarationsList"),
    invoicesList: formData.get("invoicesList"),
    status: "Active / In Transit"
  };

  state.manifests.unshift(newManifest);
  saveState();
  form.reset();
  document.getElementById("manifestFormWrapper").style.display = "none";
  notifySuccess("Manifest Created", `Voyage list ${newManifest.loadNo} saved.`);
  render();
};

function openCreateDialog() {
  editing = null;
  const dialog = document.getElementById("recordDialog");
  const body = document.getElementById("dialogBody");
  if (!dialog || !body) return;

  document.getElementById("dialogTitle").innerText = "Generate New Airway Cargo Run";
  body.innerHTML = shipmentDialogBody("shipment");
  
  const actionsBar = dialog.querySelector(".dialog-actions");
  if (actionsBar) {
    const existingActivePrint = document.getElementById("dialog_active_window_print");
    if (!existingActivePrint) {
      const printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.id = "dialog_active_window_print";
      printBtn.className = "secondary-button";
      printBtn.style.marginRight = "auto";
      printBtn.innerText = "🖨️ Print Active Window";
      printBtn.onclick = function() {
        const activeData = window.captureActiveDialogFormData();
        window.printUniversalDocument("ERP Live Profile Update", activeData);
      };
      actionsBar.insertBefore(printBtn, actionsBar.firstChild);
    }
  }

  dialog.showModal();
  updateDimTotals();
}

// ==========================================
// CORE APP ENTRYPOINT EVENTS DOM CONTENT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Setup standard base manifest layout fallback if empty 
  state.manifests = state.manifests || [];
  if (state.manifests.length === 0) {
    state.manifests.push({
      loadNo: "ALT66466",
      truckNo: "48221 DXB",
      driverName: "FAHAD MAHMOUD AL NASER",
      driverMob: "971 52 110 3672",
      origin: "JBL-UAE",
      destination: "KUWAIT",
      etdDate: "2026-06-06",
      customsRoute: "PUBLIC WAREHOUSE - SAIL SHIPPING",
      sealNo: "303-01055290-26",
      declarationsList: "3030105313626\n303-01056277-26\n303-01054530-26",
      invoicesList: "4130243800\nGECS052400\nINV 156000000002745",
      status: "In Transit"
    });
  }

  render();
  
  document.querySelectorAll(".nav-item, .nav-list li").forEach(item => {
    item.addEventListener("click", (e) => {
      const text = item.textContent.trim().split("\n")[0];
      const match = modules.find(m => m[0] === text || text.startsWith(m[0]));
      if (match) {
        activeModule = match[0];
        render();
      }
    });
  });

  const dialogSaveBtn = document.getElementById("dialogSave");
  if (dialogSaveBtn) {
    dialogSaveBtn.addEventListener("click", () => {
      const data = window.captureActiveDialogFormData();
      state.shipments.unshift(data);
      saveState();
      document.getElementById("recordDialog")?.close();
      render();
    });
  }
});
