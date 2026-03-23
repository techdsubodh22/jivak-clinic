const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'jivak2024';
const ADMIN_TOKEN    = 'jivak2024-token';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Admin auth middleware
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing admin token.' });
  }
  next();
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  }
  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// ─── Appointments ─────────────────────────────────────────────────────────────
app.post('/api/appointments', (req, res) => {
  try {
    const { patient_name, phone, email, service, preferred_date, preferred_time, notes } = req.body;

    if (!patient_name || !phone || !service || !preferred_date || !preferred_time) {
      return res.status(400).json({ error: 'Missing required fields: patient_name, phone, service, preferred_date, preferred_time' });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.' });
    }

    const appointment = db.createAppointment({
      patient_name:   patient_name.trim(),
      phone:          phone.trim(),
      email:          email ? email.trim() : null,
      service,
      preferred_date,
      preferred_time,
      notes:          notes ? notes.trim() : null,
    });

    return res.status(201).json({ success: true, appointment });
  } catch (err) {
    console.error('Error creating appointment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/appointments', requireAdmin, (req, res) => {
  try {
    const appointments = db.getAllAppointments();
    return res.json({ success: true, appointments });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/appointments/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status field is required' });
    }
    const updated = db.updateAppointmentStatus(Number(id), status);
    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    return res.json({ success: true, appointment: updated });
  } catch (err) {
    console.error('Error updating appointment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// ─── Patients ─────────────────────────────────────────────────────────────────
app.get('/api/patients', requireAdmin, (req, res) => {
  try {
    const patients = db.getAllPatients();
    return res.json({ success: true, patients });
  } catch (err) {
    console.error('Error fetching patients:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patients/:phone/history', requireAdmin, (req, res) => {
  try {
    const history = db.getPatientHistory(req.params.phone);
    return res.json({ success: true, history });
  } catch (err) {
    console.error('Error fetching patient history:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Excel Exports ────────────────────────────────────────────────────────────
app.get('/api/export/appointments', requireAdmin, (req, res) => {
  try {
    const appointments = db.getAllAppointments();

    const data = appointments.map((a) => ({
      'ID':             a.id,
      'Patient Name':   a.patient_name,
      'Phone':          a.phone,
      'Email':          a.email  || '',
      'Service':        a.service,
      'Preferred Date': a.preferred_date,
      'Preferred Time': a.preferred_time,
      'Notes':          a.notes  || '',
      'Status':         a.status,
      'Created At':     a.created_at,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 28 },
      { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
      { wch: 12 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Appointments');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="appointments.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting appointments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/export/patients', requireAdmin, (req, res) => {
  try {
    const patients = db.getAllPatients();

    const data = patients.map((p) => ({
      'Patient Name':        p.patient_name,
      'Phone':               p.phone,
      'Email':               p.email || '',
      'Total Appointments':  p.total_appointments,
      'Services Used':       p.services_used || '',
      'First Visit':         p.first_visit,
      'Last Visit':          p.last_visit,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 }, { wch: 14 }, { wch: 28 },
      { wch: 18 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="patients.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting patients:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin route aliases ──────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// ─── Start (async to allow DB initialisation) ─────────────────────────────────
async function start() {
  try {
    await db.init();
    console.log('Database initialised successfully.');

    app.listen(PORT, () => {
      console.log(`\n  Jivak Dental Clinic server running at http://localhost:${PORT}`);
      console.log(`  Admin portal: http://localhost:${PORT}/admin`);
      console.log(`\n  Press Ctrl+C to stop.\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
