const apiInput = document.querySelector("#apiUrl");
const apiSettingsForm = document.querySelector("#apiSettingsForm");
const apiStatusTitle = document.querySelector("#apiStatusTitle");
const databaseStatus = document.querySelector("#databaseStatus");
const shipmentCount = document.querySelector("#shipmentCount");
const consolidationCount = document.querySelector("#consolidationCount");
const customerCount = document.querySelector("#customerCount");
const shipmentsBody = document.querySelector("#shipmentsBody");
const consolidationsList = document.querySelector("#consolidationsList");
const customersList = document.querySelector("#customersList");
const refreshButton = document.querySelector("#refreshButton");
const shipmentForm = document.querySelector("#shipmentForm");
const formMessage = document.querySelector("#formMessage");

const defaultApiUrl = window.APOLLO_API_URL || "";

function getApiUrl() {
  return (localStorage.getItem("APOLLO_API_URL") || defaultApiUrl).replace(/\/$/, "");
}

function setApiUrl(value) {
  localStorage.setItem("APOLLO_API_URL", value.replace(/\/$/, ""));
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

async function fetchJson(path, options) {
  const response = await fetch(`${getApiUrl()}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function renderShipments(rows) {
  shipmentCount.textContent = rows.length.toString();
  shipmentsBody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${row.job_no || ""}</td>
              <td>${row.customer_name || ""}</td>
              <td>${row.origin || ""} to ${row.destination || ""}</td>
              <td>${row.status || ""}</td>
              <td>${formatDate(row.booking_date)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5" class="empty-state">No shipments found.</td></tr>`;
}

function renderRecords(container, rows, mapper) {
  container.innerHTML = rows.length
    ? rows.map(mapper).join("")
    : `<p class="empty-state">No records found.</p>`;
}

async function loadDashboard() {
  apiInput.value = getApiUrl();
  apiStatusTitle.textContent = "Checking Render API";
  databaseStatus.textContent = "Pending";

  try {
    const [health, shipments, consolidations, customers] = await Promise.all([
      fetchJson("/api/health"),
      fetchJson("/api/shipments"),
      fetchJson("/api/consolidations"),
      fetchJson("/api/customers")
    ]);

    apiStatusTitle.textContent = health.ok ? "Render API connected" : "Render API unavailable";
    databaseStatus.textContent = health.database === "connected" ? "Connected" : "Check";

    renderShipments(shipments.rows || []);

    const consolidationRows = consolidations.rows || [];
    consolidationCount.textContent = consolidationRows.length.toString();
    renderRecords(
      consolidationsList,
      consolidationRows,
      (row) => `
        <div class="record">
          <strong>${row.load_no || ""}</strong>
          <span>${formatDate(row.trip_date)} | ${row.route || ""} | ${row.status || ""}</span>
          <span>${row.job_numbers || "No linked jobs yet"}</span>
        </div>
      `
    );

    const customerRows = customers.rows || [];
    customerCount.textContent = customerRows.length.toString();
    renderRecords(
      customersList,
      customerRows,
      (row) => `
        <div class="record">
          <strong>${row.code || ""} | ${row.name || ""}</strong>
          <span>${row.location_or_lane || ""} | ${row.status || ""} | ${row.branch || ""}</span>
        </div>
      `
    );
  } catch (error) {
    apiStatusTitle.textContent = "Render API needs setup";
    databaseStatus.textContent = "Offline";
    renderShipments([]);
    renderRecords(consolidationsList, [], () => "");
    renderRecords(customersList, [], () => "");
    setMessage(error.message, true);
  }
}

apiSettingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setApiUrl(apiInput.value);
  setMessage("API URL saved.");
  loadDashboard();
});

refreshButton.addEventListener("click", () => {
  setMessage("");
  loadDashboard();
});

shipmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Creating shipment...");

  const formData = new FormData(shipmentForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJson("/api/shipments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    shipmentForm.reset();
    setMessage("Shipment created.");
    loadDashboard();
  } catch (error) {
    setMessage(error.message, true);
  }
});

loadDashboard();
