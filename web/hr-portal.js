/* Apollo Freight ERP - Employee / HR Leave Portal
 * Loaded separately so HR leave features do not increase the core runtime.
 */
const HR_API_URL = (window.APOLLO_API_URL || "https://apollo-freighterp-f9kt.onrender.com").replace(/\/$/, "");
const HR_SESSION_KEY = "apollofreighterp-session";
const HR_DECLARATION = "I declare that the information provided in this leave application is true and complete. I understand that weekends and public holidays marked by HR are not deducted from my leave balance, and I will return to work on the stated rejoining date unless an approved extension is granted.";

const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const session = () => { try { return JSON.parse(sessionStorage.getItem(HR_SESSION_KEY) || "null"); } catch { return null; } };
const hrToken = () => String(session()?.token || "");
const hrUser = () => String(session()?.userName || "");
const hrAdmin = () => ["admin", "hr"].includes(String(session()?.role || "").toLowerCase()) && String(session()?.portal || "").toLowerCase() === "employee";
const hrFetch = async (path, options = {}) => {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${hrToken()}` };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(`${HR_API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};
const today = () => new Date().toISOString().slice(0, 10);
const year = () => new Date().getFullYear();

let cache = { config: null, requests: [], summary: null, adminBalances: null, policies: null };
let bound = false;

async function loadConfig() {
  cache.config = await hrFetch(`/api/hr/leave-config?year=${year()}`);
  return cache.config;
}
async function loadRequests() {
  cache.requests = (await hrFetch("/api/hr/leave-requests")).rows || [];
  return cache.requests;
}
async function refresh() {
  await Promise.all([loadConfig(), loadRequests()]);
  const active = document.querySelector("[data-module-content]");
  if (active) active.innerHTML = "";
}
function kpi(title, value, note) { return `<article class="hr-kpi"><strong>${esc(value)}</strong><span>${esc(title)}</span><small>${esc(note)}</small></article>`; }
function panel(title, body, note = "") { return `<article class="panel hr-panel"><div class="hr-panel-head"><div><h3>${esc(title)}</h3>${note ? `<small>${esc(note)}</small>` : ""}</div></div>${body}</article>`; }
function badge(status) { return `<span class="hr-status hr-status-${esc(String(status || "").toLowerCase())}">${esc(status || "")}</span>`; }
function dateDiffText(row) { return `${row.actual_leave_days ?? row.total_days ?? 0} working day(s) • ${row.weekend_days || 0} weekend • ${row.public_holiday_days || 0} holiday`; }

function renderBalanceCards(balances = []) {
  return balances.length ? `<div class="hr-balance-grid">${balances.map((b) => `<article class="hr-balance-card"><strong>${esc(b.leaveTypeName || b.leaveTypeCode)}</strong><div class="hr-balance-number">${esc(b.available)}</div><small>Available</small><dl><div><dt>Entitlement</dt><dd>${esc(b.entitlement)}</dd></div><div><dt>Used</dt><dd>${esc(b.used)}</dd></div><div><dt>Pending</dt><dd>${esc(b.pending)}</dd></div><div><dt>Carry forward</dt><dd>${esc(b.carryForward)}</dd></div></dl><div class="hr-projected">Projected after pending: <strong>${esc(b.projected)}</strong></div></article>`).join("")}</div>` : `<p class="empty-state">No leave balance has been configured.</p>`;
}

function renderMyLeave() {
  const config = cache.config || { balances: [], leaveTypes: [] };
  const rows = cache.requests || [];
  const approved = rows.filter((r) => r.status === "Approved").reduce((n, r) => n + Number(r.actual_leave_days || r.total_days || 0), 0);
  const pending = rows.filter((r) => r.status === "Pending").reduce((n, r) => n + Number(r.actual_leave_days || r.total_days || 0), 0);
  queueMicrotask(bindHrEvents);
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>My Leave</h2><p>Apply for leave with the actual working-day calculation used by HR.</p></div><button class="blue-button" data-hr-action="open-leave-form">Apply for Leave</button></div>
    <div class="hr-kpi-grid">${kpi("Available leave", config.balances.reduce((n,b)=>n+Number(b.available||0),0), "Across configured leave types")}${kpi("Pending", pending, "Awaiting approval")}${kpi("Approved used", approved, "Current requests")}${kpi("Year", year(), "Leave year")}</div>
    ${panel("Leave Balance", renderBalanceCards(config.balances))}
    ${panel("My Applications", rows.length ? `<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Request</th><th>Type</th><th>Period</th><th>Calculation</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map((r)=>`<tr><td>${esc(r.request_no)}</td><td>${esc(r.leave_type)}</td><td>${esc(String(r.start_date).slice(0,10))} → ${esc(String(r.end_date).slice(0,10))}</td><td>${esc(dateDiffText(r))}</td><td>${badge(r.status)}</td><td>${r.status === "Pending" || r.status === "Approved" ? `<button class="ghost-button" data-hr-action="cancel-leave" data-id="${esc(r.request_no)}">Cancel</button>` : ""}${r.status === "Approved" && !r.rejoined_at ? `<button class="ghost-button" data-hr-action="rejoin" data-id="${esc(r.request_no)}">I Rejoined</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">No leave applications yet.</p>`)}
  </section>`;
}

function renderBalance() {
  queueMicrotask(bindHrEvents);
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>Leave Balance</h2><p>Your yearly entitlement, usage, pending requests and projected balance.</p></div></div>${panel(`Balance — ${year()}`, renderBalanceCards(cache.config?.balances || []))}</section>`;
}

function renderCalendar() {
  const config = cache.config || { weekends: [], holidays: [] };
  queueMicrotask(bindHrEvents);
  const names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>Leave Calendar</h2><p>HR controls which dates are weekends, public holidays and restricted dates.</p></div></div>
    ${panel("Weekend Rules", `<div class="hr-weekend-list">${names.map((n,i)=>`<span class="${config.weekends.includes(i)?"is-weekend":""}">${esc(n)}${config.weekends.includes(i)?" • Weekend":""}</span>`).join("")}</div>`)}
    ${panel(`Calendar — ${year()}`, config.holidays?.length ? `<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Date</th><th>Type</th><th>Title</th><th>Notes</th></tr></thead><tbody>${config.holidays.map((h)=>`<tr><td>${esc(String(h.holiday_date).slice(0,10))}</td><td>${esc(h.day_type)}</td><td>${esc(h.title)}</td><td>${esc(h.notes)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">No special dates have been configured.</p>`)}
  </section>`;
}

function leaveForm() {
  const types = cache.config?.leaveTypes || [];
  return `<div class="hr-modal-backdrop" data-hr-modal><div class="hr-modal"><div class="hr-modal-head"><div><p class="eyebrow">Leave Application</p><h2>New Leave Request</h2></div><button type="button" class="secondary-button" data-hr-action="close-modal">Close</button></div>
    <form data-hr-form="leave-application" class="hr-form"><div class="hr-form-grid">
      <label>Kind of Leave<select name="leaveType" required>${types.map((t)=>`<option value="${esc(t.code)}">${esc(t.name)}</option>`).join("")}</select></label>
      <label>Time period<select name="halfDayType"><option value="">Full day(s)</option><option value="FIRST_HALF">Half day — first half</option><option value="SECOND_HALF">Half day — second half</option></select></label>
      <label>Start date<input name="startDate" type="date" value="${today()}" required></label>
      <label>End date<input name="endDate" type="date" value="${today()}" required></label>
      <label>Rejoining date<input name="rejoiningDate" type="date" required></label>
      <label>Contact number during leave<input name="contactDuringLeave" type="tel" required></label>
      <label class="hr-full">Address/location during leave<textarea name="leaveAddress" rows="2" required></textarea></label>
      <label>Emergency contact<input name="emergencyContact" type="tel"></label>
      <label class="hr-full">Reason for leave<textarea name="reason" rows="3" required></textarea></label>
    </div><div class="hr-calculation" data-hr-calculation>Choose dates to calculate actual leave days.</div>
    <label class="hr-declaration"><input type="checkbox" name="declarationAccepted" value="true" required><span>${esc(HR_DECLARATION)}</span></label>
    <p class="hr-form-message" data-hr-message></p><div class="dialog-actions"><button type="button" class="secondary-button" data-hr-action="close-modal">Cancel</button><button type="submit">Submit Leave Application</button></div></form></div></div>`;
}

function renderAdminApprovals() {
  queueMicrotask(bindHrEvents);
  const rows = cache.requests || [];
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">HR Admin</p><h2>Leave Management</h2><p>Review applications, check actual leave days and maintain the audit trail.</p></div></div>
    <div class="hr-kpi-grid">${kpi("Pending applications", rows.filter(r=>r.status==="Pending").length, "Requires HR action")}${kpi("Approved this year", rows.filter(r=>r.status==="Approved" && String(r.start_date).slice(0,4)===String(year())).length, "Approved requests")}${kpi("Employees", cache.summary?.employees?.length || "—", "Employee profiles")}</div>
    ${panel("Applications", rows.length ? `<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Request</th><th>Employee</th><th>Type</th><th>Period</th><th>Actual Days</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map((r)=>`<tr><td>${esc(r.request_no)}</td><td>${esc(r.employee_name)}</td><td>${esc(r.leave_type)}</td><td>${esc(String(r.start_date).slice(0,10))} → ${esc(String(r.end_date).slice(0,10))}</td><td>${esc(r.actual_leave_days)}</td><td>${badge(r.status)}</td><td>${r.status === "Pending" ? `<button class="ghost-button" data-hr-action="approve" data-id="${esc(r.request_no)}">Approve</button><button class="ghost-button" data-hr-action="reject" data-id="${esc(r.request_no)}">Reject</button>` : `<button class="ghost-button" data-hr-action="view-request" data-id="${esc(r.request_no)}">View</button>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">No leave applications found.</p>`)}
  </section>`;
}

function renderAdminCalendar() {
  queueMicrotask(bindHrEvents);
  const config = cache.config || { weekends: [], holidays: [] };
  const names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">HR Admin</p><h2>HR Calendar & Rules</h2><p>Maintain public holidays, blackout dates and weekends. These rules drive leave calculations.</p></div></div>
    ${panel("Weekend Configuration", `<form data-hr-form="weekends" class="hr-inline-form"><div class="hr-weekend-checks">${names.map((n,i)=>`<label><input type="checkbox" name="weekday" value="${i}" ${config.weekends.includes(i)?"checked":""}>${esc(n)}</label>`).join("")}</div><button type="submit">Save Weekend Rules</button></form>`)}
    ${panel("Add Public Holiday / Blackout", `<form data-hr-form="holiday" class="hr-form"><div class="hr-form-grid"><label>Date<input type="date" name="holidayDate" required></label><label>Type<select name="dayType"><option value="PUBLIC_HOLIDAY">Public Holiday</option><option value="BLACKOUT">Blackout / Restricted</option><option value="WORKING_DAY">Working Day Override</option></select></label><label class="hr-full">Title<input name="title" required></label><label class="hr-full">Notes<textarea name="notes" rows="2"></textarea></label></div><button type="submit">Save Calendar Date</button></form>`)}
    ${panel("Configured Dates", config.holidays?.length ? `<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Date</th><th>Type</th><th>Title</th><th>Action</th></tr></thead><tbody>${config.holidays.map((h)=>`<tr><td>${esc(String(h.holiday_date).slice(0,10))}</td><td>${esc(h.day_type)}</td><td>${esc(h.title)}</td><td><button class="ghost-button" data-hr-action="delete-calendar" data-id="${esc(h.id)}">Remove</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">No configured dates.</p>`)}
  </section>`;
}


async function loadPolicies(){ cache.policies=await hrFetch(`/api/hr/admin/policies?year=${year()}`); return cache.policies; }
async function savePolicy(form){ try { await hrFetch("/api/hr/admin/policies",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))}); await loadPolicies(); cache.adminBalances=null; window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error){window.alert(error.message);} }
function renderAdminPolicies(){ ensurePolicyData(); queueMicrotask(bindHrEvents); const data=cache.policies||{types:[],policies:[]}; const employees=cache.summary?.employees||[]; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">HR Admin</p><h2>HR Leave Policies</h2><p>Set annual entitlement, carry-forward and employee-specific adjustments.</p></div></div>${panel("Leave Type Defaults",data.types?.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Code</th><th>Leave Type</th><th>Paid</th><th>Annual Entitlement</th><th>Carry Forward</th><th>Probation</th></tr></thead><tbody>${data.types.map(t=>`<tr><td>${esc(t.code)}</td><td>${esc(t.name)}</td><td>${t.paid?"Yes":"No"}</td><td>${esc(t.annual_entitlement)}</td><td>${t.allow_carry_forward?`Up to ${esc(t.max_carry_forward)}`:"No"}</td><td>${t.allow_during_probation?"Allowed":"Restricted"}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No leave types configured.</p>`)}${panel("Employee Override",`<form data-hr-form="policy" class="hr-form"><div class="hr-form-grid"><label>Employee<select name="userName" required>${employees.map(e=>`<option value="${esc(e.user_name)}">${esc(e.full_name||e.user_name)}</option>`).join("")}</select></label><label>Leave Type<select name="leaveTypeCode" required>${data.types.map(t=>`<option value="${esc(t.code)}">${esc(t.name)}</option>`).join("")}</select></label><label>Year<input name="year" type="number" value="${year()}" required></label><label>Entitlement (days)<input name="entitlement" type="number" step="0.5" min="0" required></label><label>Carry Forward (days)<input name="carryForward" type="number" step="0.5" min="0" value="0"></label><label>Adjustment (days)<input name="adjustment" type="number" step="0.5" value="0"></label><label class="hr-full">Notes<textarea name="notes" rows="2"></textarea></label></div><button type="submit">Save Employee Policy</button></form>`)}${panel(`Existing Overrides — ${year()}`,data.policies?.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Employee</th><th>Leave</th><th>Entitlement</th><th>Carry</th><th>Adjustment</th><th>Notes</th></tr></thead><tbody>${data.policies.map(p=>`<tr><td>${esc(p.user_name)}</td><td>${esc(p.leave_type_code)}</td><td>${esc(p.entitlement)}</td><td>${esc(p.carry_forward)}</td><td>${esc(p.adjustment)}</td><td>${esc(p.notes)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No employee-specific overrides.</p>`)}</section>`; }
async function ensurePolicyData(){ if(!hrAdmin()) return; const first=!cache.policies; try { if(!cache.policies) await loadPolicies(); if(!cache.summary) cache.summary=await hrFetch(`/api/hr/admin/summary?year=${year()}`); } catch(error){console.warn("HR policy data unavailable",error);} if(first) window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); }

async function loadAdminBalances(){ cache.adminBalances=(await hrFetch(`/api/hr/admin/balances?year=${year()}`)).rows||[]; return cache.adminBalances; }
function renderAdminBalance() {
  ensureAdminData(); queueMicrotask(bindHrEvents);
  const rows=cache.adminBalances||[];
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">HR Admin</p><h2>Employee Leave Balances</h2><p>See every employee’s entitlement, used, pending and remaining leave for ${year()}.</p></div></div>${panel("How balances work", `<div class="hr-rule-box"><strong>Available = Entitlement + Carry Forward + Adjustment − Approved Leave</strong><br>Pending leave is shown separately. Weekends and public holidays never consume leave days.</div>`)}${panel(`Employee Balances — ${year()}`, rows.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Employee</th><th>Department</th><th>Leave Type</th><th>Entitlement</th><th>Used</th><th>Pending</th><th>Available</th><th>Projected</th></tr></thead><tbody>${rows.flatMap(e=>e.balances.map(b=>`<tr><td>${esc(e.full_name)}</td><td>${esc(e.department)}</td><td>${esc(b.leaveTypeName)}</td><td>${esc(b.entitlement)}</td><td>${esc(b.used)}</td><td>${esc(b.pending)}</td><td><strong>${esc(b.available)}</strong></td><td>${esc(b.projected)}</td></tr>`)).join("")}</tbody></table></div>`:`<p class="empty-state">No employee balances available.</p>`)}</section>`;
}

function renderRequestDetails(row) {
  return `<div class="hr-detail-modal" data-hr-modal><div class="hr-modal"><div class="hr-modal-head"><h2>${esc(row.request_no)}</h2><button type="button" class="secondary-button" data-hr-action="close-modal">Close</button></div><div class="hr-detail-grid"><strong>Employee</strong><span>${esc(row.employee_name)}</span><strong>Leave</strong><span>${esc(row.leave_type)}</span><strong>Period</strong><span>${esc(row.start_date)} → ${esc(row.end_date)}</span><strong>Calculation</strong><span>${esc(dateDiffText(row))}</span><strong>Reason</strong><span>${esc(row.reason)}</span><strong>Contact</strong><span>${esc(row.contact_during_leave)}</span><strong>Rejoining</strong><span>${esc(row.rejoining_date || "")}</span><strong>Declaration</strong><span>${row.declaration_accepted ? "Accepted" : "Not accepted"}</span></div></div></div>`;
}

async function submitLeave(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.declarationAccepted = form.querySelector("[name=declarationAccepted]")?.checked === true;
  const message = form.querySelector("[data-hr-message]");
  try {
    const result = await hrFetch("/api/hr/leave-requests", { method:"POST", body:JSON.stringify(data) });
    if (message) message.textContent = `Submitted ${result.row.request_no}. Actual leave days: ${result.calculation.actualLeaveDays}.`;
    await loadConfig(); await loadRequests();
    setTimeout(()=>document.querySelector("[data-hr-modal]")?.remove(), 900);
    window.dispatchEvent(new CustomEvent("apollo-hr-refresh"));
  } catch (error) { if(message) message.textContent = error.message; }
}
async function decide(requestNo, decision) {
  let reason = "";
  if (decision === "reject") { reason = window.prompt("Enter rejection reason:", "") || ""; if (!reason.trim()) return; }
  try { await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(requestNo)}/decision`, {method:"PUT",body:JSON.stringify({decision,reason})}); await loadRequests(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error) { window.alert(error.message); }
}
async function cancel(requestNo) { const reason = window.prompt("Cancellation reason:", "Cancelled by employee") || ""; try { await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(requestNo)}/cancel`,{method:"POST",body:JSON.stringify({reason})}); await loadRequests(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error){window.alert(error.message);} }
async function rejoin(requestNo) { try { await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(requestNo)}/rejoin`,{method:"POST",body:"{}"}); await loadRequests(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error){window.alert(error.message);} }
async function saveHoliday(form) { try { await hrFetch("/api/hr/calendar/holiday",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))}); await loadConfig(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); form.reset(); } catch(error){window.alert(error.message);} }
async function saveWeekends(form) { try { const weekdays=Array.from(form.querySelectorAll("[name=weekday]:checked")).map((x)=>Number(x.value)); await hrFetch("/api/hr/calendar/weekends",{method:"POST",body:JSON.stringify({weekdays})}); await loadConfig(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error){window.alert(error.message);} }
async function deleteCalendar(id) { if(!window.confirm("Remove this calendar date?")) return; try { await hrFetch(`/api/hr/calendar/holiday/${encodeURIComponent(id)}`,{method:"DELETE"}); await loadConfig(); window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); } catch(error){window.alert(error.message);} }

function openModal(html) { document.querySelector("[data-hr-modal]")?.remove(); document.body.insertAdjacentHTML("beforeend", html); }
function bindHrEvents() {
  if (bound) return;
  bound = true;
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-hr-action]"); if (!button) return;
    const action=button.dataset.hrAction; const id=button.dataset.id;
    if(action==="open-leave-form") openModal(leaveForm());
    else if(action==="close-modal") button.closest("[data-hr-modal]")?.remove();
    else if(action==="approve") await decide(id,"approve");
    else if(action==="reject") await decide(id,"reject");
    else if(action==="cancel-leave") await cancel(id);
    else if(action==="rejoin") await rejoin(id);
    else if(action==="delete-calendar") await deleteCalendar(id);
    else if(action==="view-request"){ const row=cache.requests.find(r=>r.request_no===id); if(row) openModal(renderRequestDetails(row)); }
  });
  document.addEventListener("submit", async (event) => {
    const form=event.target.closest("form[data-hr-form]"); if(!form) return; event.preventDefault();
    if(form.dataset.hrForm==="leave-application") await submitLeave(form);
    if(form.dataset.hrForm==="holiday") await saveHoliday(form);
    if(form.dataset.hrForm==="weekends") await saveWeekends(form);
    if(form.dataset.hrForm==="policy") await savePolicy(form);
  });
  document.addEventListener("change", async (event) => {
    const form=event.target.closest("form[data-hr-form=leave-application]"); if(!form || !["startDate","endDate"].includes(event.target.name)) return;
    const calc=form.querySelector("[data-hr-calculation]"); const start=form.querySelector("[name=startDate]")?.value; const end=form.querySelector("[name=endDate]")?.value;
    if(!start||!end){calc.textContent="Choose dates to calculate actual leave days.";return;}
    try { const response=await hrFetch(`/api/hr/calendar?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`); const dates=[]; for(let d=new Date(`${start}T00:00:00Z`);d<=new Date(`${end}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1)) dates.push(new Date(d)); const holidays=new Map((response.holidays||[]).map(h=>[String(h.holiday_date).slice(0,10),h])); let weekend=0,holiday=0,working=0; dates.forEach(d=>{const key=d.toISOString().slice(0,10);if(response.weekends.includes(d.getUTCDay()))weekend++;else if(holidays.has(key)&&["PUBLIC_HOLIDAY","BLACKOUT"].includes(holidays.get(key).day_type))holiday++;else working++;}); calc.innerHTML=`<strong>Actual leave days: ${working}</strong> • Calendar: ${dates.length} • Weekend: ${weekend} • Public holiday/restricted: ${holiday}`; } catch(error){calc.textContent=error.message;}
  });
}

async function ensureAdminData() { if(!hrAdmin()) return; const first=!cache.adminBalances; try { if(!cache.adminBalances) await loadAdminBalances(); } catch(error){ console.warn("HR admin balance unavailable",error); } if(first) window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); }

async function ensureLoaded() { const firstLoad=!cache.config; try { if(!cache.config) await loadConfig(); if(!cache.requests.length) await loadRequests(); } catch(error) { console.warn("HR portal data unavailable",error); } bindHrEvents(); if(firstLoad) window.dispatchEvent(new CustomEvent("apollo-hr-refresh")); }
window.ApolloHR = {
  renderMyLeave: () => { ensureLoaded(); return renderMyLeave(); },
  renderBalance: () => { ensureLoaded(); return renderBalance(); },
  renderCalendar: () => { ensureLoaded(); return renderCalendar(); },
  renderAdminApprovals: () => { ensureLoaded(); return renderAdminApprovals(); },
  renderAdminCalendar: () => { ensureLoaded(); return renderAdminCalendar(); },
  renderAdminPolicies: () => { ensurePolicyData(); return renderAdminPolicies(); },
  renderAdminBalance: () => { ensureLoaded(); return renderAdminBalance(); }
};
window.addEventListener("apollo-hr-refresh", () => { const navButton=document.querySelector('#moduleNav button[data-module="My Leave"],#moduleNav button[data-module="Leave Approvals"]'); if(navButton && window.__APOLLO_HR_RENDER) window.__APOLLO_HR_RENDER(); });
ensureLoaded();
