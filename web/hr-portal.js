/* Apollo Freight ERP - Employee / HR Leave Portal
 * HR/Employee leave UI is isolated from the core ERP runtime.
 */
const HR_API_URL = (window.APOLLO_API_URL || "https://apollo-freighterp-f9kt.onrender.com").replace(/\/$/, "");
const HR_SESSION_KEY = "apollofreighterp-session";
const HR_DECLARATION = "I declare that the information provided in this leave application is true and complete. I understand that weekends and public holidays marked by HR are not deducted from my leave balance, and I will return to work on the stated rejoining date unless an approved extension is granted.";
const esc = (v) => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
const fmtDate = v => v ? new Date(`${String(v).slice(0,10)}T00:00:00Z`).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}) : "—";
let cache = { config:null, requests:null, summary:null, adminBalances:null, policies:null, leaveTypes:null, delegations:null, ledger:null };
let bound = false;

async function loadConfig(){ cache.config = await hrFetch(`/api/hr/leave-config?year=${year()}`); return cache.config; }
async function loadRequests(){ cache.requests = (await hrFetch("/api/hr/leave-requests")).rows || []; return cache.requests; }
async function loadAdminBalances(){ cache.adminBalances = (await hrFetch(`/api/hr/admin/balances?year=${year()}`)).rows || []; return cache.adminBalances; }
async function loadPolicies(){ cache.policies = await hrFetch(`/api/hr/admin/policies?year=${year()}`); return cache.policies; }
async function loadLeaveTypes(){ cache.leaveTypes = (await hrFetch("/api/hr/admin/leave-types")).rows || []; return cache.leaveTypes; }
async function loadDelegations(){ cache.delegations = (await hrFetch("/api/hr/admin/delegations")).rows || []; return cache.delegations; }
async function loadLedger(){ cache.ledger = (await hrFetch("/api/hr/leave-ledger")).rows || []; return cache.ledger; }
async function loadAdminCalendar(branch=adminCalendarBranch){ adminCalendarBranch=String(branch||"Kuwait HO"); adminCalendarConfig=await hrFetch(`/api/hr/admin/calendar?branch=${encodeURIComponent(adminCalendarBranch)}`); return adminCalendarConfig; }
let coreRenderScheduled = false;
let ledgerLoading = false;
let adminCalendarBranch = "Kuwait HO";
let adminCalendarConfig = {weekends:[],holidays:[]};

async function ensureLoaded(){
  let loaded = false;
  try {
    if(cache.config === null){
      await loadConfig();
      loaded = true;
    }
    if(cache.requests === null){
      await loadRequests();
      loaded = true;
    }
  } catch(e){
    console.warn("HR portal data unavailable", e);
  }
  bindHrEvents();

  // IMPORTANT: render functions call ensureLoaded(). Never force a render
  // unless this call actually loaded data. Otherwise:
  // render -> ensureLoaded -> requestCoreRender -> render -> ...
  if(loaded && cache.config !== null && cache.requests !== null){
    requestCoreRender();
  }
}

async function ensureAdminData(){
  if(!hrAdmin()) return;
  let loaded = false;
  try {
    if(cache.adminBalances === null){
      await loadAdminBalances();
      loaded = true;
    }
    if(cache.summary === null){
      cache.summary = await hrFetch(`/api/hr/admin/summary?year=${year()}`);
      loaded = true;
    }
    if(cache.policies === null){
      await loadPolicies();
      loaded = true;
    }
    if(cache.leaveTypes === null){
      await loadLeaveTypes();
      loaded = true;
    }
    if(!adminCalendarConfig || !Array.isArray(adminCalendarConfig.holidays)){
      await loadAdminCalendar(adminCalendarBranch);
      loaded = true;
    }
  } catch(e){
    console.warn("HR admin data unavailable", e);
  }
  bindHrEvents();

  if(loaded &&
     cache.adminBalances !== null &&
     cache.summary !== null &&
     cache.policies !== null &&
     cache.leaveTypes !== null){
    requestCoreRender();
  }
}

function requestCoreRender(){
  if(coreRenderScheduled) return;
  coreRenderScheduled = true;
  requestAnimationFrame(() => {
    coreRenderScheduled = false;
    if(typeof window.__APOLLO_HR_RENDER === "function"){
      window.__APOLLO_HR_RENDER();
    }
  });
}
function kpi(title,value,note){ return `<article class="hr-kpi"><strong>${esc(value)}</strong><span>${esc(title)}</span><small>${esc(note)}</small></article>`; }
function panel(title,body,note=""){ return `<article class="panel hr-panel"><div class="hr-panel-head"><div><h3>${esc(title)}</h3>${note?`<small>${esc(note)}</small>`:""}</div></div>${body}</article>`; }
function badge(status){ return `<span class="hr-status hr-status-${esc(String(status||"").toLowerCase())}">${esc(status||"")}</span>`; }
function dateDiffText(r){ return `${r.actual_leave_days ?? r.total_days ?? 0} working day(s) • ${r.weekend_days||0} weekend • ${r.public_holiday_days||0} holiday`; }
function renderBalanceCards(balances=[]){
  if(!balances.length) return `<p class="empty-state">No leave balance has been configured for you.</p>`;
  return `<div class="hr-balance-grid">${balances.map(b=>`<article class="hr-balance-card"><strong>${esc(b.leaveTypeName||b.leaveTypeCode)}</strong><div class="hr-balance-number">${esc(b.available)}</div><small>Available</small><dl><div><dt>Entitlement</dt><dd>${esc(b.entitlement)}</dd></div><div><dt>Used</dt><dd>${esc(b.used)}</dd></div><div><dt>Pending</dt><dd>${esc(b.pending)}</dd></div><div><dt>Carry forward</dt><dd>${esc(b.carryForward)}</dd></div></dl><div class="hr-projected">Projected after pending: <strong>${esc(b.projected)}</strong></div></article>`).join("")}</div>`;
}
function renderMyLeave(){
  const cfg=cache.config||{balances:[],leaveTypes:[]}, rows=cache.requests||[], emp=cfg.employee||{};
  const pending=rows.filter(r=>r.status==="Pending").reduce((n,r)=>n+Number(r.actual_leave_days||r.total_days||0),0);
  const used=rows.filter(r=>r.status==="Approved").reduce((n,r)=>n+Number(r.actual_leave_days||r.total_days||0),0);
  return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>My Leave</h2><p>Complete your leave application and track your balance, approvals and return to work.</p></div><button class="blue-button" data-hr-action="open-leave-form">Apply for Leave</button></div>
  <div class="hr-kpi-grid">${kpi("Available leave",cfg.balances.reduce((n,b)=>n+Number(b.available||0),0),"All leave types")}${kpi("Pending",pending,"Awaiting HR approval")}${kpi("Approved used",used,"Approved requests")}${kpi("Year",year(),"Leave year")}</div>
  ${panel("My Leave Balance",renderBalanceCards(cfg.balances),"Leave is deducted only for working days.")}
  ${panel("My Applications",rows.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Request</th><th>Type</th><th>Period</th><th>Calculation</th><th>Rejoining</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.request_no)}</td><td>${esc(r.leave_type)}</td><td>${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}</td><td>${esc(dateDiffText(r))}</td><td>${fmtDate(r.rejoining_date)}</td><td>${badge(r.status)}</td><td><button class="ghost-button" data-hr-action="view-request" data-id="${esc(r.request_no)}">View</button>${["Pending","Approved"].includes(r.status)?`<button class="ghost-button" data-hr-action="cancel-leave" data-id="${esc(r.request_no)}">Cancel</button>`:""}${r.status==="Approved"&&!r.rejoined_at?`<button class="ghost-button" data-hr-action="rejoin" data-id="${esc(r.request_no)}">I Rejoined</button><button class="ghost-button" data-hr-action="extend-leave" data-id="${esc(r.request_no)}">Request Extension</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No leave applications yet.</p>`)}</section>`;
}
function renderBalance(){ if(cache.ledger===null && !ledgerLoading){ ledgerLoading=true; loadLedger().then(requestCoreRender).catch(()=>{}).finally(()=>{ ledgerLoading=false; }); } const ledger=cache.ledger||[]; const ledgerHtml=ledger.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Date</th><th>Leave Type</th><th>Transaction</th><th>Days</th><th>Balance After</th><th>Reference / Note</th></tr></thead><tbody>${ledger.map(r=>`<tr><td>${fmtDate(r.created_at)}</td><td>${esc(r.leave_type_code)}</td><td>${esc(r.transaction_type)}</td><td>${esc(r.days)}</td><td>${esc(r.balance_after)}</td><td>${esc(r.reference_no||r.reason)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No leave balance transactions yet.</p>`; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>Leave Balance</h2><p>Your entitlement, carry-forward, approved usage, pending requests and projected balance for ${year()}.</p></div><button class="secondary-button" data-hr-action="refresh">Refresh</button></div>${panel(`Leave Balance — ${year()}`,renderBalanceCards(cache.config?.balances||[]),"Available = entitlement + carry-forward + adjustment − approved leave. Pending is shown separately.")}${panel("Leave Ledger",ledgerHtml,"A complete history of approved leave, cancellations and HR adjustments.")}</section>`; }
function calendarGrid(config, rows){
  const now=new Date(), y=now.getUTCFullYear(), m=now.getUTCMonth(), first=new Date(Date.UTC(y,m,1)), last=new Date(Date.UTC(y,m+1,0));
  const holidayMap=new Map((config.holidays||[]).map(h=>[String(h.holiday_date).slice(0,10),h])); const leaveMap=new Map();
  (rows||[]).forEach(r=>{ if(!r.start_date||!r.end_date) return; const s=new Date(`${String(r.start_date).slice(0,10)}T00:00:00Z`), e=new Date(`${String(r.end_date).slice(0,10)}T00:00:00Z`); for(let d=new Date(s);d<=e;d.setUTCDate(d.getUTCDate()+1)) leaveMap.set(d.toISOString().slice(0,10),r.status); });
  const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; let cells=names.map(n=>`<div class="hr-cal-head">${n}</div>`).join("");
  for(let i=0;i<first.getUTCDay();i++) cells+=`<div class="hr-cal-cell is-empty"></div>`;
  for(let d=1;d<=last.getUTCDate();d++){ const dt=new Date(Date.UTC(y,m,d)), key=dt.toISOString().slice(0,10), h=holidayMap.get(key), weekend=config.weekends?.includes(dt.getUTCDay()), st=leaveMap.get(key); cells+=`<div class="hr-cal-cell ${weekend?"is-weekend":""} ${h?.day_type==="PUBLIC_HOLIDAY"?"is-holiday":""} ${h?.day_type==="BLACKOUT"?"is-blackout":""} ${st?`is-leave-${String(st).toLowerCase()}`:""}"><strong>${d}</strong>${h?`<small>${esc(h.title)}</small>`:""}${st?`<small>${esc(st)}</small>`:""}</div>`; }
  return `<div class="hr-calendar-grid">${cells}</div>`;
}

async function extendLeave(no){
  const endDate=window.prompt("New leave end date (YYYY-MM-DD):","")||"";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return;
  const reason=window.prompt("Reason for the extension:","")||"";
  if(!reason.trim()) return;
  try{ await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(no)}/extension`,{method:"POST",body:JSON.stringify({endDate,reason})}); cache.requests=[]; await loadRequests(); await loadConfig(); requestCoreRender(); window.alert("Extension request submitted for HR approval."); }
  catch(e){ window.alert(e.message); }
}
function renderCalendar(){ const cfg=cache.config||{weekends:[],holidays:[]}; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Employee Portal</p><h2>Leave Calendar</h2><p>See weekends, public holidays and your leave dates in one calendar.</p></div></div>${panel("Calendar",calendarGrid(cfg,cache.requests))}${panel("Calendar Legend",`<div class="hr-legend"><span>Weekend</span><span>Public Holiday</span><span>My Leave</span><span>Blackout / Restricted</span></div>`)}${panel("Configured Public Holidays & Rules",cfg.holidays?.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Date</th><th>Type</th><th>Title</th><th>Notes</th></tr></thead><tbody>${cfg.holidays.map(h=>`<tr><td>${fmtDate(h.holiday_date)}</td><td>${esc(h.day_type)}</td><td>${esc(h.title)}</td><td>${esc(h.notes)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No special dates configured.</p>`)}</section>`; }
function leaveForm(){
  const cfg=cache.config||{leaveTypes:[]}, emp=cfg.employee||{};
  return `<div class="hr-modal-backdrop" data-hr-modal><div class="hr-modal hr-leave-application"><div class="hr-modal-head"><div><p class="eyebrow">Employee Portal</p><h2>Leave Application</h2><p>Complete all required information before submitting.</p></div><button type="button" class="secondary-button" data-hr-action="close-modal">Close</button></div>
  <form data-hr-form="leave-application" class="hr-form"><section class="hr-form-section"><h3>Employee Information</h3><div class="hr-form-grid"><label>Employee Name<input value="${esc(emp.full_name||hrUser())}" readonly></label><label>Employee Code<input value="${esc(emp.employee_code||"")}" readonly></label><label>Department<input value="${esc(emp.department||"")}" readonly></label><label>Designation<input value="${esc(emp.designation||"")}" readonly></label><label>Reporting Manager<input value="${esc(emp.reporting_manager||"")}" readonly></label></div></section>
  <section class="hr-form-section"><h3>Leave Details</h3><div class="hr-form-grid"><label>Kind of Leave<select name="leaveType" required>${cfg.leaveTypes.map(t=>`<option value="${esc(t.code)}">${esc(t.name)}${t.paid===false?" — Unpaid":""}</option>`).join("")}</select></label><label>Time Period<select name="halfDayType"><option value="">Full Day(s)</option><option value="FIRST_HALF">Half Day — First Half</option><option value="SECOND_HALF">Half Day — Second Half</option></select></label><label>Leave Start Date<input name="startDate" type="date" value="${today()}" required></label><label>Leave End Date<input name="endDate" type="date" value="${today()}" required></label><label>Rejoining Date<input name="rejoiningDate" type="date" required></label><label>Contact Number During Leave<input name="contactDuringLeave" type="tel" required></label><label class="hr-full">Address / Location During Leave<textarea name="leaveAddress" rows="2" required></textarea></label><label>Emergency Contact<input name="emergencyContact" type="tel"></label><label class="hr-full">Reason for Leave<textarea name="reason" rows="3" required placeholder="Please explain the reason for your leave."></textarea></label></div><div class="hr-calculation" data-hr-calculation>Choose dates to calculate actual leave days.</div></section>
  <section class="hr-form-section"><h3>Supporting Document</h3><p class="form-help">Optional unless the selected leave policy requires supporting documentation. PDF/JPG/PNG up to 10 MB.</p><input name="attachment" type="file" accept="application/pdf,.pdf,image/jpeg,image/png"><small data-hr-attachment-status></small></section>
  <section class="hr-form-section"><h3>Employee Self-Declaration</h3><label class="hr-declaration"><input type="checkbox" name="declarationAccepted" value="true" required><span>${esc(HR_DECLARATION)}</span></label></section>
  <p class="hr-form-message" data-hr-message></p><div class="dialog-actions"><button type="button" class="secondary-button" data-hr-action="close-modal">Cancel</button><button type="submit">Submit Leave Application</button></div></form></div></div>`;
}
function renderAdminApprovals(){ ensureAdminData(); const rows=cache.requests||[]; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Admin / HR</p><h2>Leave Approvals</h2><p>Admin is the HR authority for the Employee Portal. Review complete applications before approving or rejecting.</p></div><button class="secondary-button" data-hr-action="refresh">Refresh</button></div><div class="hr-kpi-grid">${kpi("Pending",rows.filter(r=>r.status==="Pending").length,"Requires HR action")}${kpi("Approved",rows.filter(r=>r.status==="Approved").length,"Approved requests")}${kpi("Rejected",rows.filter(r=>r.status==="Rejected").length,"Rejected requests")}${kpi("Employees",cache.summary?.employees?.length||0,"Employee records")}</div>${panel("Leave Applications",rows.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Request</th><th>Employee</th><th>Type</th><th>Period</th><th>Actual Leave</th><th>Rejoining</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.request_no)}</td><td>${esc(r.employee_name)}</td><td>${esc(r.leave_type)}</td><td>${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}</td><td>${esc(dateDiffText(r))}</td><td>${fmtDate(r.rejoining_date)}</td><td>${badge(r.status)}</td><td>${r.status==="Pending"?`<button class="ghost-button" data-hr-action="approve" data-id="${esc(r.request_no)}">Approve</button><button class="ghost-button" data-hr-action="reject" data-id="${esc(r.request_no)}">Reject</button>`:`<button class="ghost-button" data-hr-action="view-request" data-id="${esc(r.request_no)}">View</button>`}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No leave applications found.</p>`)}</section>`; }
function renderRequestDetails(r){ return `<div class="hr-detail-modal" data-hr-modal><div class="hr-modal"><div class="hr-modal-head"><h2>${esc(r.request_no)}</h2><button type="button" class="secondary-button" data-hr-action="close-modal">Close</button></div><div class="hr-detail-grid"><strong>Employee</strong><span>${esc(r.employee_name)}</span><strong>Leave Type</strong><span>${esc(r.leave_type)}</span><strong>Period</strong><span>${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}</span><strong>Calculation</strong><span>${esc(dateDiffText(r))}</span><strong>Reason</strong><span>${esc(r.reason)}</span><strong>Contact During Leave</strong><span>${esc(r.contact_during_leave)}</span><strong>Leave Address</strong><span>${esc(r.leave_address)}</span><strong>Emergency Contact</strong><span>${esc(r.emergency_contact||"—")}</span><strong>Rejoining</strong><span>${fmtDate(r.rejoining_date)}</span><strong>Declaration</strong><span>${r.declaration_accepted?"Accepted":"Not accepted"}</span><strong>Status</strong><span>${badge(r.status)}</span>${r.rejection_reason?`<strong>Rejection Reason</strong><span>${esc(r.rejection_reason)}</span>`:""}${r.attachment_url?`<strong>Supporting Document</strong><span><button class="ghost-button" data-hr-action="view-attachment" data-id="${esc(r.request_no)}">View Document</button></span>`:""}</div></div></div>`; }
function renderAdminCalendar(){
  ensureAdminData();
  const cfg=adminCalendarConfig||{weekends:[],holidays:[]};
  const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const employees=cache.summary?.employees||[];
  const branches=["Kuwait HO","Dubai"];
  const employeeOptions=employees.map(e=>`<option value="${esc(e.user_name)}">${esc(e.full_name||e.user_name)} — ${esc(e.employee_code||"")} (${esc(e.branch||"Kuwait HO")})</option>`).join("");
  return `<section class="hr-page">
    <div class="hr-hero"><div><p class="eyebrow">Admin / HR</p><h2>HR Calendar & Rules</h2><p>Configure separate weekends, public holidays and historical leave for Kuwait HO and Dubai.</p></div></div>
    ${panel("Calendar Branch",`<form data-hr-form="calendar-branch" class="hr-inline-form"><label>Branch<select name="branch">${branches.map(b=>`<option value="${esc(b)}" ${adminCalendarBranch===b?"selected":""}>${esc(b)}</option>`).join("")}</select></label><button type="submit">Load Branch Calendar</button></form>`)}
    ${panel("Weekend Configuration",`<form data-hr-form="weekends" class="hr-inline-form"><input type="hidden" name="branch" value="${esc(adminCalendarBranch)}"><div class="hr-weekend-checks">${names.map((n,i)=>`<label><input type="checkbox" name="weekday" value="${i}" ${cfg.weekends.includes(i)?"checked":""}>${esc(n)}</label>`).join("")}</div><button type="submit">Save Weekend Rules for ${esc(adminCalendarBranch)}</button></form>`)}
    ${panel("Add / Update Calendar Date",`<form data-hr-form="holiday" class="hr-form"><div class="hr-form-grid"><label>Branch<select name="branch">${branches.map(b=>`<option value="${esc(b)}" ${adminCalendarBranch===b?"selected":""}>${esc(b)}</option>`).join("")}</select></label><label>Date<input type="date" name="holidayDate" required></label><label>Type<select name="dayType"><option value="PUBLIC_HOLIDAY">Public Holiday</option><option value="BLACKOUT">Blackout / Restricted</option><option value="WORKING_DAY">Working Day Override</option></select></label><label class="hr-full">Title<input name="title" required></label><label class="hr-full">Notes<textarea name="notes" rows="2"></textarea></label></div><button type="submit">Save Calendar Rule</button></form>`)}
    ${panel("Employee Branch Assignment",`<form data-hr-form="employee-branch" class="hr-form"><div class="hr-form-grid"><label>Employee<select name="userName" required>${employeeOptions}</select></label><label>Branch<select name="branch" required>${branches.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select></label></div><button type="submit">Save Employee Branch</button></form><p class="form-help">The employee's branch controls their weekend and branch-specific public holidays when leave is calculated.</p>`)}
    ${panel("Historical Leave Entry",`<form data-hr-form="historical-leave" class="hr-form"><div class="hr-form-grid"><label>Employee<select name="userName" required>${employeeOptions}</select></label><label>Leave Type<select name="leaveType"><option value="ANNUAL">Annual Leave</option><option value="SICK">Sick Leave</option><option value="EMERGENCY">Emergency Leave</option><option value="UNPAID">Unpaid Leave</option></select></label><label>Start Date<input type="date" name="startDate" required></label><label>End Date<input type="date" name="endDate" required></label><label>Actual Leave Days (optional)<input type="number" name="actualLeaveDays" min="0" step="0.5" placeholder="Auto-calculate"></label><label>Rejoining Date<input type="date" name="rejoiningDate"></label><label class="hr-full">Reason / Reference<input name="reason" value="Historical leave entered by HR"></label></div><button type="submit">Record Historical Leave</button></form><p class="form-help">Use this for leave already taken before the portal went live. It is recorded as Approved and counts against the employee's annual balance.</p>`)}
    ${panel(`Configured Dates — ${esc(adminCalendarBranch)}`,cfg.holidays?.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Date</th><th>Branch</th><th>Type</th><th>Title</th><th>Notes</th><th>Action</th></tr></thead><tbody>${cfg.holidays.map(h=>`<tr><td>${fmtDate(h.holiday_date)}</td><td>${esc(h.branch)}</td><td>${esc(h.day_type)}</td><td>${esc(h.title)}</td><td>${esc(h.notes)}</td><td><button class="ghost-button" data-hr-action="delete-calendar" data-id="${esc(h.id)}">Remove</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No configured dates for this branch.</p>`)}
  </section>`;
}
function renderAdminBalance(){ ensureAdminData(); const rows=cache.adminBalances||[]; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Admin / HR</p><h2>HR Leave Balances</h2><p>Every employee’s entitlement, carry-forward, used, pending, available and projected balance.</p></div></div>${panel("Balance Rule",`<div class="hr-rule-box"><strong>Available = Entitlement + Carry Forward + Adjustment − Approved Leave</strong><br>Pending leave is not deducted until approved. Weekends and public holidays do not consume leave.</div>`)}${panel(`Employee Balances — ${year()}`,rows.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Employee</th><th>Department</th><th>Leave Type</th><th>Entitlement</th><th>Carry</th><th>Adjustment</th><th>Used</th><th>Pending</th><th>Available</th><th>Projected</th></tr></thead><tbody>${rows.flatMap(e=>e.balances.map(b=>`<tr><td>${esc(e.full_name)}</td><td>${esc(e.department)}</td><td>${esc(b.leaveTypeName)}</td><td>${esc(b.entitlement)}</td><td>${esc(b.carryForward)}</td><td>${esc(b.adjustment)}</td><td>${esc(b.used)}</td><td>${esc(b.pending)}</td><td><strong>${esc(b.available)}</strong></td><td>${esc(b.projected)}</td></tr>`)).join("")}</tbody></table></div>`:`<p class="empty-state">No employee balances available.</p>`)}</section>`; }
function renderAdminPolicies(){ ensureAdminData(); const data=cache.policies||{types:[],policies:[]}, employees=cache.summary?.employees||[]; return `<section class="hr-page"><div class="hr-hero"><div><p class="eyebrow">Admin / HR</p><h2>HR Leave Policies</h2><p>Manage leave types and employee-specific annual entitlements.</p></div></div>${panel("Leave Type Rules",`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Code</th><th>Name</th><th>Paid</th><th>Annual</th><th>Half Day</th><th>Probation</th><th>Carry Forward</th><th>Negative Balance</th></tr></thead><tbody>${(data.types||[]).map(t=>`<tr><td>${esc(t.code)}</td><td>${esc(t.name)}</td><td>${t.paid?"Yes":"No"}</td><td>${esc(t.annual_entitlement)}</td><td>${t.allow_half_day?"Yes":"No"}</td><td>${t.allow_during_probation?"Allowed":"Restricted"}</td><td>${t.allow_carry_forward?`Up to ${esc(t.max_carry_forward)}`:"No"}</td><td>${t.allow_negative_balance?"Yes":"No"}</td></tr>`).join("")}</tbody></table></div>`)}${panel("Add / Update Leave Type",`<form data-hr-form="leave-type" class="hr-form"><div class="hr-form-grid"><label>Code<input name="code" required placeholder="ANNUAL"></label><label>Name<input name="name" required placeholder="Annual Leave"></label><label>Annual Entitlement<input name="annualEntitlement" type="number" min="0" step="0.5" value="30"></label><label>Paid<select name="paid"><option value="true">Paid</option><option value="false">Unpaid</option></select></label><label>Half Day<select name="allowHalfDay"><option value="true">Allowed</option><option value="false">Not Allowed</option></select></label><label>Hourly<select name="allowHourly"><option value="false">Not Allowed</option><option value="true">Allowed</option></select></label><label>Require Attachment<select name="requireAttachment"><option value="false">No</option><option value="true">Yes</option></select></label><label>Attachment After Days<input name="attachmentAfterDays" type="number" min="0" step="0.5" value="0"></label><label>During Probation<select name="allowDuringProbation"><option value="false">Restricted</option><option value="true">Allowed</option></select></label><label>Carry Forward<select name="allowCarryForward"><option value="false">No</option><option value="true">Yes</option></select></label><label>Maximum Carry Forward<input name="maxCarryForward" type="number" min="0" step="0.5" value="0"></label><label>Allow Negative Balance<select name="allowNegativeBalance"><option value="false">No</option><option value="true">Yes</option></select></label><label>Allow Encashment<select name="allowEncashment"><option value="false">No</option><option value="true">Yes</option></select></label></div><button type="submit">Save Leave Type</button></form>`)}${panel("Employee Leave Policy / Balance Adjustment",`<form data-hr-form="policy" class="hr-form"><div class="hr-form-grid"><label>Employee<select name="userName" required>${employees.map(e=>`<option value="${esc(e.user_name)}">${esc(e.full_name||e.user_name)} — ${esc(e.employee_code||"")}</option>`).join("")}</select></label><label>Leave Type<select name="leaveTypeCode" required>${(data.types||[]).map(t=>`<option value="${esc(t.code)}">${esc(t.name)}</option>`).join("")}</select></label><label>Year<input name="year" type="number" value="${year()}" required></label><label>Entitlement<input name="entitlement" type="number" min="0" step="0.5" required></label><label>Carry Forward<input name="carryForward" type="number" min="0" step="0.5" value="0"></label><label>Adjustment<input name="adjustment" type="number" step="0.5" value="0"></label><label class="hr-full">Notes<textarea name="notes" rows="2"></textarea></label></div><button type="submit">Save Policy / Adjustment</button></form>`)}${panel(`Existing Employee Policies — ${year()}`,data.policies?.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Employee</th><th>Leave</th><th>Entitlement</th><th>Carry</th><th>Adjustment</th><th>Notes</th></tr></thead><tbody>${data.policies.map(p=>`<tr><td>${esc(p.user_name)}</td><td>${esc(p.leave_type_code)}</td><td>${esc(p.entitlement)}</td><td>${esc(p.carry_forward)}</td><td>${esc(p.adjustment)}</td><td>${esc(p.notes)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty-state">No employee-specific policies.</p>`)}</section>`; }
function renderDelegations(){ if(cache.delegations===null) loadDelegations().then(requestCoreRender).catch(()=>{}); const people=cache.summary?.employees||[], rows=cache.delegations||[]; const options=people.map(e=>`<option value="${esc(e.user_name)}">${esc(e.full_name||e.user_name)}</option>`).join(""); return panel("Delegated Leave Approval",`<form data-hr-form="delegation" class="hr-form"><div class="hr-form-grid"><label>Delegator<select name="delegatorUserName" required>${options}</select></label><label>Delegate<select name="delegateUserName" required>${options}</select></label><label>Start<input type="date" name="startDate" value="${today()}" required></label><label>End<input type="date" name="endDate" required></label><label class="hr-full">Notes<textarea name="notes" rows="2"></textarea></label></div><button type="submit">Save Delegation</button></form>${rows.length?`<div class="hr-table-wrap"><table class="hr-table"><thead><tr><th>Delegator</th><th>Delegate</th><th>Period</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.delegator_user_name)}</td><td>${esc(r.delegate_user_name)}</td><td>${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}</td><td>${r.active?"Active":"Ended"}</td><td>${r.active?`<button class="ghost-button" data-hr-action="remove-delegation" data-id="${esc(r.id)}">End</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:""}`,"A delegate can approve or reject requests only during the selected dates."); }
function renderRequestUploadStatus(){ return ""; }
function readFileBase64(file){ return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(new Error("The selected file could not be read."));r.readAsDataURL(file);}); }
async function submitLeave(form){
  const data=Object.fromEntries(new FormData(form).entries()); data.declarationAccepted=form.querySelector("[name=declarationAccepted]")?.checked===true;
  const file=form.querySelector("[name=attachment]")?.files?.[0]; const msg=form.querySelector("[data-hr-message]");
  const selectedType=(cache.config?.leaveTypes||[]).find(t=>String(t.code)===String(data.leaveType));
  try{
    if(selectedType?.require_attachment && file==null){ const start=data.startDate,end=data.endDate; const calc=await hrFetch(`/api/hr/calendar?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`); const s=new Date(`${start}T00:00:00Z`),e=new Date(`${end}T00:00:00Z`); let working=0; const hs=new Map((calc.holidays||[]).map(h=>[String(h.holiday_date).slice(0,10),h])); for(let d=new Date(s);d<=e;d.setUTCDate(d.getUTCDate()+1)){const k=d.toISOString().slice(0,10);if(!calc.weekends.includes(d.getUTCDay())&&!(["PUBLIC_HOLIDAY","BLACKOUT"].includes(String(hs.get(k)?.day_type||"").trim().toUpperCase().replace(/\s+/g,"_"))))working++;} if(working>=Number(selectedType.attachment_after_days||0)) throw new Error(`${selectedType.name} requires a supporting document for this leave period.`); }
    const result=await hrFetch("/api/hr/leave-requests",{method:"POST",body:JSON.stringify(data)});
    if(file){ if(file.size>10*1024*1024) throw new Error("Supporting document must be 10 MB or smaller."); const base64=await readFileBase64(file); await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(result.row.request_no)}/attachment`,{method:"POST",body:JSON.stringify({fileName:file.name,mimeType:file.type,contentBase64:base64})}); }
    if(msg) msg.textContent=`Submitted ${result.row.request_no}. Actual leave days: ${result.calculation.actualLeaveDays}.`;
    await loadConfig(); await loadRequests(); setTimeout(()=>document.querySelector("[data-hr-modal]")?.remove(),700); requestCoreRender();
  }catch(e){if(msg) msg.textContent=e.message;}
}
async function decide(no,decision){let reason="";if(decision==="reject"){reason=window.prompt("Enter rejection reason:","")||"";if(!reason.trim())return;}try{await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(no)}/decision`,{method:"PUT",body:JSON.stringify({decision,reason})});await loadRequests();await loadAdminBalances();requestCoreRender();}catch(e){window.alert(e.message);}}
async function cancel(no){const reason=window.prompt("Cancellation reason:","Cancelled by employee")||"";try{await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(no)}/cancel`,{method:"POST",body:JSON.stringify({reason})});await loadRequests();await loadConfig();requestCoreRender();}catch(e){window.alert(e.message);}}
async function rejoin(no){try{await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(no)}/rejoin`,{method:"POST",body:"{}"});await loadRequests();requestCoreRender();}catch(e){window.alert(e.message);}}
async function viewAttachment(no){try{const r=await hrFetch(`/api/hr/leave-requests/${encodeURIComponent(no)}/attachment`);window.open(r.url,"_blank","noopener");}catch(e){window.alert(e.message);}}
async function loadSelectedAdminCalendar(form){
  try{ await loadAdminCalendar(form.querySelector("[name=branch]")?.value||adminCalendarBranch); requestCoreRender(); }catch(e){window.alert(e.message);}
}
async function saveEmployeeBranch(form){
  try{
    await hrFetch("/api/hr/admin/employee-branch",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});
    cache.summary=null; await ensureAdminData(); requestCoreRender();
    window.alert("Employee branch updated.");
  }catch(e){window.alert(e.message);}
}
async function saveHistoricalLeave(form){
  try{
    const row=await hrFetch("/api/hr/admin/historical-leave",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});
    cache.adminBalances=null; cache.requests=null; cache.ledger=null; await ensureAdminData(); requestCoreRender();
    window.alert(`Historical leave recorded. Actual leave days: ${row.calculation.actualLeaveDays}.`);
    form.reset();
  }catch(e){window.alert(e.message);}
}
async function saveHoliday(form){try{const data=Object.fromEntries(new FormData(form).entries());await hrFetch("/api/hr/calendar/holiday",{method:"POST",body:JSON.stringify(data)});await loadAdminCalendar(data.branch);form.reset();requestCoreRender();}catch(e){window.alert(e.message);}}
async function saveWeekends(form){try{const weekdays=Array.from(form.querySelectorAll("[name=weekday]:checked")).map(x=>Number(x.value));const branch=form.querySelector("[name=branch]")?.value||adminCalendarBranch;await hrFetch("/api/hr/calendar/weekends",{method:"POST",body:JSON.stringify({branch,weekdays})});await loadAdminCalendar(branch);requestCoreRender();}catch(e){window.alert(e.message);}}
async function deleteCalendar(id){if(!window.confirm("Remove this calendar rule?"))return;try{await hrFetch(`/api/hr/calendar/holiday/${encodeURIComponent(id)}`,{method:"DELETE"});await loadAdminCalendar(adminCalendarBranch);requestCoreRender();}catch(e){window.alert(e.message);}}
async function savePolicy(form){try{await hrFetch("/api/hr/admin/policies",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});cache.policies=null;cache.adminBalances=null;await ensureAdminData();requestCoreRender();form.reset();}catch(e){window.alert(e.message);}}
async function saveLeaveType(form){try{await hrFetch("/api/hr/admin/leave-types",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});cache.config=null;cache.policies=null;cache.leaveTypes=null;await loadConfig();await loadPolicies();await loadLeaveTypes();requestCoreRender();form.reset();}catch(e){window.alert(e.message);}}
function openModal(html){document.querySelector("[data-hr-modal]")?.remove();document.body.insertAdjacentHTML("beforeend",html);bindHrEvents();}
function bindHrEvents(){if(bound)return;bound=true;
  document.addEventListener("click",async e=>{const b=e.target.closest("[data-hr-action]");if(!b)return;const a=b.dataset.hrAction,id=b.dataset.id;if(a==="open-leave-form")openModal(leaveForm());else if(a==="close-modal")b.closest("[data-hr-modal]")?.remove();else if(a==="approve")await decide(id,"approve");else if(a==="reject")await decide(id,"reject");else if(a==="cancel-leave")await cancel(id);else if(a==="rejoin")await rejoin(id);else if(a==="view-request"){const r=cache.requests.find(x=>x.request_no===id);if(r)openModal(renderRequestDetails(r));}else if(a==="view-attachment")await viewAttachment(id);else if(a==="delete-calendar")await deleteCalendar(id);else if(a==="refresh"){cache.config=null;cache.requests=[];cache.adminBalances=null;cache.policies=null;cache.leaveTypes=null;cache.ledger=null;await ensureLoaded();if(hrAdmin())await ensureAdminData();}});
  document.addEventListener("submit",async e=>{const f=e.target.closest("form[data-hr-form]");if(!f)return;e.preventDefault();if(f.dataset.hrForm==="leave-application")await submitLeave(f);else if(f.dataset.hrForm==="holiday")await saveHoliday(f);else if(f.dataset.hrForm==="weekends")await saveWeekends(f);else if(f.dataset.hrForm==="calendar-branch")await loadSelectedAdminCalendar(f);else if(f.dataset.hrForm==="employee-branch")await saveEmployeeBranch(f);else if(f.dataset.hrForm==="historical-leave")await saveHistoricalLeave(f);else if(f.dataset.hrForm==="policy")await savePolicy(f);else if(f.dataset.hrForm==="leave-type")await saveLeaveType(f);});
  document.addEventListener("change",async e=>{const f=e.target.closest("form[data-hr-form=leave-application]");if(!f)return;if(["startDate","endDate","halfDayType"].includes(e.target.name))await updateCalculation(f);});
}
async function updateCalculation(form){
  const start=form.querySelector("[name=startDate]")?.value;
  const end=form.querySelector("[name=endDate]")?.value;
  const half=form.querySelector("[name=halfDayType]")?.value;
  const calc=form.querySelector("[data-hr-calculation]");
  if(!start||!end){
    calc.textContent="Choose dates to calculate actual leave days.";
    return;
  }

  const normalizeType = value => String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const holidayKey = row => {
    const value = row?.holiday_date ?? row?.holidayDate ?? row?.date;
    if (!value) return "";
    return String(value).slice(0, 10);
  };

  try {
    // Get the calendar rules used by the employee portal.
    // Also fall back to leave-config because older deployments may expose
    // holidays there while the calendar endpoint is being updated.
    const [calendarResult, configResult] = await Promise.all([
      hrFetch(`/api/hr/calendar?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`),
      cache.config ? Promise.resolve(cache.config) : hrFetch(`/api/hr/leave-config?year=${encodeURIComponent(start.slice(0,4))}`)
    ]);

    const weekends = Array.isArray(calendarResult?.weekends)
      ? calendarResult.weekends.map(Number)
      : Array.isArray(configResult?.weekends)
        ? configResult.weekends.map(Number)
        : [];

    const calendarHolidays = Array.isArray(calendarResult?.holidays)
      ? calendarResult.holidays
      : [];

    const configHolidays = Array.isArray(configResult?.holidays)
      ? configResult.holidays
      : [];

    // Merge both sources. This also makes the calculation work when the
    // calendar API and leave-config API are on slightly different versions.
    const merged = new Map();
    for (const row of [...configHolidays, ...calendarHolidays]) {
      const key = holidayKey(row);
      if (key) merged.set(`${key}|${normalizeType(row.day_type ?? row.dayType)}`, row);
    }

    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    let weekend=0, holiday=0, working=0;

    for(let d=new Date(s);d<=e;d.setUTCDate(d.getUTCDate()+1)){
      const k=d.toISOString().slice(0,10);
      const holidayRows = [...merged.values()].filter(row => holidayKey(row) === k);
      const isPublicHoliday = holidayRows.some(row =>
        ["PUBLIC_HOLIDAY","BLACKOUT"].includes(normalizeType(row.day_type ?? row.dayType))
      );

      if(weekends.includes(d.getUTCDay())) {
        weekend++;
      } else if(isPublicHoliday) {
        holiday++;
      } else {
        working++;
      }
    }

    if(["FIRST_HALF","SECOND_HALF"].includes(half)){
      if(start!==end){
        calc.innerHTML=`<strong>Half-day leave must use the same start and end date.</strong>`;
        return;
      }
      working=Math.max(0,working-.5);
    }

    let rejoin=new Date(e);
    do{
      rejoin.setUTCDate(rejoin.getUTCDate()+1);
    }while(
      weekends.includes(rejoin.getUTCDay()) ||
      [...merged.values()].some(row =>
        holidayKey(row) === rejoin.toISOString().slice(0,10) &&
        ["PUBLIC_HOLIDAY","BLACKOUT"].includes(normalizeType(row.day_type ?? row.dayType))
      )
    );

    const rejoinField=form.querySelector("[name=rejoiningDate]");
    if(rejoinField&&!rejoinField.value) rejoinField.value=rejoin.toISOString().slice(0,10);

    calc.innerHTML=`<strong>Actual leave days: ${working}</strong> • Calendar: ${Math.round((e-s)/86400000)+1} • Weekend: ${weekend} • Public holiday/restricted: ${holiday} • Suggested rejoining: ${rejoin.toISOString().slice(0,10)}`;
  }catch(e){
    calc.textContent=e.message;
  }
}
window.ApolloHR={renderMyLeave:()=>{ensureLoaded();return renderMyLeave();},renderBalance:()=>{ensureLoaded();return renderBalance();},renderCalendar:()=>{ensureLoaded();return renderCalendar();},renderAdminApprovals:()=>{ensureAdminData();return renderAdminApprovals();},renderAdminCalendar:()=>{ensureAdminData();return renderAdminCalendar();},renderAdminPolicies:()=>{ensureAdminData();return renderAdminPolicies()+renderDelegations();},renderAdminBalance:()=>{ensureAdminData();return renderAdminBalance();}};
window.addEventListener("apollo-hr-refresh",requestCoreRender);
document.addEventListener("click",async event=>{const button=event.target.closest("[data-hr-action='extend-leave'],[data-hr-action='remove-delegation']");if(!button)return;if(button.dataset.hrAction==="extend-leave")return extendLeave(button.dataset.id);if(!window.confirm("End this delegated approval?"))return;try{await hrFetch(`/api/hr/admin/delegations/${encodeURIComponent(button.dataset.id)}`,{method:"DELETE"});cache.delegations=null;await loadDelegations();requestCoreRender();}catch(e){window.alert(e.message);}});
document.addEventListener("submit",async event=>{const form=event.target.closest("form[data-hr-form='delegation']");if(!form)return;event.preventDefault();try{await hrFetch("/api/hr/admin/delegations",{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});cache.delegations=null;await loadDelegations();form.reset();requestCoreRender();}catch(e){window.alert(e.message);}});
bindHrEvents();
ensureLoaded();
setTimeout(requestCoreRender,0);
