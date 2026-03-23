/**
 * admin.js — Admin Dashboard Logic for Jivak Dental Clinic
 */

'use strict';

// ─── Auth ─────────────────────────────────────────────────────────────────────
const ADMIN_TOKEN = 'jivak2024-token';

(function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (token !== ADMIN_TOKEN) {
    window.location.href = '/admin';
  }
})();

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiRequest(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
  };
  const config = { ...defaults, ...options };
  if (options.headers) {
    config.headers = { ...defaults.headers, ...options.headers };
  }
  const res = await fetch(url, config);
  return res;
}

// ─── State ────────────────────────────────────────────────────────────────────
let allAppointments = [];
let allPatients     = [];
let currentPanel    = 'overview';

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Panel Navigation ─────────────────────────────────────────────────────────
function showPanel(panelName, linkEl) {
  // Hide all panels
  document.querySelectorAll('.dashboard-panel').forEach((p) => p.classList.remove('active'));

  // Show target panel
  const panel = document.getElementById('panel-' + panelName);
  if (panel) panel.classList.add('active');

  // Update active nav link
  document.querySelectorAll('.sidebar-nav a').forEach((a) => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  else {
    const matchingLink = document.querySelector(`[data-panel="${panelName}"]`);
    if (matchingLink) matchingLink.classList.add('active');
  }

  // Update page title
  const titles = {
    overview: 'Dashboard Overview',
    appointments: 'All Appointments',
    patients: 'Patient Records',
  };
  document.getElementById('pageTitle').textContent = titles[panelName] || 'Admin Dashboard';
  currentPanel = panelName;

  // Load data if needed
  if (panelName === 'appointments' && allAppointments.length === 0) {
    loadAppointments();
  }
  if (panelName === 'patients' && allPatients.length === 0) {
    loadPatients();
  }

  return false; // Prevent navigation
}

// ─── Load Overview Data ───────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const [apptRes, patientRes] = await Promise.all([
      apiRequest('/api/appointments'),
      apiRequest('/api/patients'),
    ]);

    const apptData    = await apptRes.json();
    const patientData = await patientRes.json();

    if (apptData.success) {
      allAppointments = apptData.appointments;
      updateStats(apptData.appointments, patientData.patients || []);
      renderRecentTable(apptData.appointments.slice(-10).reverse());
    }

    if (patientData.success) {
      allPatients = patientData.patients;
    }
  } catch (err) {
    console.error('Failed to load overview:', err);
    showToast('Failed to load dashboard data.', 'error');
  }
}

function updateStats(appointments, patients) {
  const total     = appointments.length;
  const pending   = appointments.filter((a) => a.status === 'Pending').length;
  const completed = appointments.filter((a) => a.status === 'Completed').length;

  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-patients').textContent  = patients.length;
}

function renderRecentTable(appointments) {
  const tbody = document.getElementById('recentTableBody');
  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="es-icon">📭</div>
          <p>No appointments yet.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map((a) => `
    <tr>
      <td><strong>#${String(a.id).padStart(4, '0')}</strong></td>
      <td>${escapeHtml(a.patient_name)}</td>
      <td>${escapeHtml(a.phone)}</td>
      <td>${escapeHtml(a.service)}</td>
      <td>${formatDate(a.preferred_date)}</td>
      <td>${escapeHtml(a.preferred_time)}</td>
      <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
    </tr>
  `).join('');
}

// ─── Appointments ─────────────────────────────────────────────────────────────
async function loadAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="10"><div class="spinner"></div></td></tr>`;

  try {
    const res  = await apiRequest('/api/appointments');
    const data = await res.json();

    if (data.success) {
      allAppointments = data.appointments;
      renderAppointmentsTable(allAppointments);
    } else {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red; padding:2rem;">Failed to load appointments.</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red; padding:2rem;">Network error. Please refresh.</td></tr>`;
  }
}

function renderAppointmentsTable(appointments) {
  const tbody = document.getElementById('appointmentsTableBody');

  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state">
          <div class="es-icon">📭</div>
          <p>No appointments found.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = appointments.map((a) => `
    <tr id="appt-row-${a.id}">
      <td><strong>#${String(a.id).padStart(4, '0')}</strong></td>
      <td>${escapeHtml(a.patient_name)}</td>
      <td>${escapeHtml(a.phone)}</td>
      <td>${a.email ? escapeHtml(a.email) : '<span style="color:#aaa">—</span>'}</td>
      <td>${escapeHtml(a.service)}</td>
      <td>${formatDate(a.preferred_date)}</td>
      <td>${escapeHtml(a.preferred_time)}</td>
      <td title="${a.notes ? escapeHtml(a.notes) : ''}" style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${a.notes ? escapeHtml(a.notes) : '<span style="color:#aaa">—</span>'}
      </td>
      <td>
        <select class="status-select" data-id="${a.id}" onchange="updateStatus(${a.id}, this)">
          <option value="Pending"   ${a.status === 'Pending'   ? 'selected' : ''}>⏳ Pending</option>
          <option value="Confirmed" ${a.status === 'Confirmed' ? 'selected' : ''}>✅ Confirmed</option>
          <option value="Completed" ${a.status === 'Completed' ? 'selected' : ''}>🏁 Completed</option>
          <option value="Cancelled" ${a.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
        </select>
      </td>
      <td style="white-space:nowrap; font-size:0.8rem; color:var(--gray-text);">${formatDateTime(a.created_at)}</td>
    </tr>
  `).join('');
}

function filterAppointments() {
  const search = document.getElementById('apptSearch').value.toLowerCase();
  const status = document.getElementById('apptStatusFilter').value;

  const filtered = allAppointments.filter((a) => {
    const matchSearch =
      !search ||
      a.patient_name.toLowerCase().includes(search) ||
      a.phone.includes(search) ||
      (a.email && a.email.toLowerCase().includes(search)) ||
      a.service.toLowerCase().includes(search);

    const matchStatus = !status || a.status === status;

    return matchSearch && matchStatus;
  });

  renderAppointmentsTable(filtered);
}

async function updateStatus(id, selectEl) {
  const newStatus = selectEl.value;
  const originalStatus = selectEl.dataset.originalStatus || selectEl.value;
  selectEl.disabled = true;

  try {
    const res  = await apiRequest(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      // Update in-memory data
      const appt = allAppointments.find((a) => a.id === id);
      if (appt) appt.status = newStatus;

      showToast(`Appointment #${String(id).padStart(4,'0')} updated to "${newStatus}".`);

      // Update the badge in recent table if visible
      const recentRow = document.querySelector(`#recentTableBody [data-id="${id}"]`);
      if (recentRow) {
        const badge = recentRow.closest('tr').querySelector('.badge');
        if (badge) {
          badge.className = `badge badge-${newStatus.toLowerCase()}`;
          badge.textContent = newStatus;
        }
      }
    } else {
      showToast(data.error || 'Failed to update status.', 'error');
      selectEl.value = originalStatus;
    }
  } catch (err) {
    showToast('Network error. Could not update status.', 'error');
    selectEl.value = originalStatus;
  } finally {
    selectEl.disabled = false;
  }
}

// ─── Patients ─────────────────────────────────────────────────────────────────
async function loadPatients() {
  const tbody = document.getElementById('patientsTableBody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="8"><div class="spinner"></div></td></tr>`;

  try {
    const res  = await apiRequest('/api/patients');
    const data = await res.json();

    if (data.success) {
      allPatients = data.patients;
      renderPatientsTable(allPatients);
    } else {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red; padding:2rem;">Failed to load patients.</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red; padding:2rem;">Network error. Please refresh.</td></tr>`;
  }
}

function renderPatientsTable(patients) {
  const tbody = document.getElementById('patientsTableBody');

  if (!patients || patients.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="es-icon">👥</div>
          <p>No patient records yet.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.patient_name)}</strong></td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${p.email ? escapeHtml(p.email) : '<span style="color:#aaa">—</span>'}</td>
      <td style="text-align:center;">
        <span style="background:var(--teal-light); color:var(--teal-dark); padding:0.2rem 0.6rem; border-radius:50px; font-weight:700; font-size:0.82rem;">
          ${p.total_appointments}
        </span>
      </td>
      <td style="max-width:200px; font-size:0.82rem; color:var(--gray-text);">
        ${escapeHtml(p.services_used || '—')}
      </td>
      <td style="font-size:0.82rem; white-space:nowrap;">${formatDateTime(p.first_visit)}</td>
      <td style="font-size:0.82rem; white-space:nowrap;">${formatDateTime(p.last_visit)}</td>
      <td>
        <button
          class="btn btn-sm"
          style="background:var(--teal-light); color:var(--teal-dark); border:none; cursor:pointer; font-weight:600;"
          onclick="viewPatientHistory('${escapeHtml(p.phone)}', '${escapeHtml(p.patient_name)}')"
        >
          📋 History
        </button>
      </td>
    </tr>
  `).join('');
}

function filterPatients() {
  const search = document.getElementById('patientSearch').value.toLowerCase();
  const filtered = allPatients.filter((p) =>
    !search ||
    p.patient_name.toLowerCase().includes(search) ||
    p.phone.includes(search) ||
    (p.email && p.email.toLowerCase().includes(search))
  );
  renderPatientsTable(filtered);
}

// ─── Patient History Modal ────────────────────────────────────────────────────
async function viewPatientHistory(phone, name) {
  const modal   = document.getElementById('historyModal');
  const content = document.getElementById('historyContent');
  const title   = document.getElementById('historyTitle');

  title.textContent = `History — ${name} (${phone})`;
  content.innerHTML = `<div class="spinner"></div>`;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';

  try {
    const res  = await apiRequest(`/api/patients/${encodeURIComponent(phone)}/history`);
    const data = await res.json();

    if (data.success && data.history.length > 0) {
      content.innerHTML = `
        <table style="font-size:0.85rem;">
          <thead>
            <tr>
              <th>#ID</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.history.map((a) => `
              <tr>
                <td><strong>#${String(a.id).padStart(4,'0')}</strong></td>
                <td>${escapeHtml(a.service)}</td>
                <td style="white-space:nowrap;">${formatDate(a.preferred_date)}</td>
                <td style="white-space:nowrap;">${escapeHtml(a.preferred_time)}</td>
                <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
                <td style="max-width:180px; font-size:0.8rem; color:var(--gray-text);">
                  ${a.notes ? escapeHtml(a.notes) : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      content.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><p>No history found.</p></div>`;
    }
  } catch (err) {
    content.innerHTML = `<p style="color:red; text-align:center; padding:1rem;">Failed to load history.</p>`;
  }
}

window.closeHistoryModal = function () {
  document.getElementById('historyModal').classList.remove('show');
  document.body.style.overflow = '';
};

document.getElementById('historyModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('historyModal')) window.closeHistoryModal();
});

// ─── Excel Export ─────────────────────────────────────────────────────────────
async function exportData(type) {
  showToast(`Generating ${type} Excel file...`);
  try {
    const res = await apiRequest(`/api/export/${type}`);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Export failed.', 'error');
      return;
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${type}_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`);
  } catch (err) {
    showToast('Export failed. Please try again.', 'error');
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function adminLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin';
  }
}

// ─── Mobile Sidebar Toggle ────────────────────────────────────────────────────
(function () {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('adminSidebar');

  if (toggleBtn && sidebar) {
    // Show toggle on mobile
    if (window.innerWidth <= 768) toggleBtn.style.display = 'block';

    window.addEventListener('resize', () => {
      toggleBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
      if (window.innerWidth > 768) sidebar.classList.remove('open');
    });

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar on link click (mobile)
    sidebar.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
      });
    });
  }
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
}

// ─── Expose globals ───────────────────────────────────────────────────────────
window.showPanel          = showPanel;
window.updateStatus       = updateStatus;
window.filterAppointments = filterAppointments;
window.filterPatients     = filterPatients;
window.viewPatientHistory = viewPatientHistory;
window.exportData         = exportData;
window.adminLogout        = adminLogout;

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  loadOverview();
})();
