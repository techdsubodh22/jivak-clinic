/**
 * database.js — SQLite via sql.js (pure-JS, no native compilation needed)
 *
 * sql.js keeps the database in memory while the server is running.
 * We load from / save to a file (clinic.db as binary) on each write operation
 * so data is persisted across restarts.
 */

const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'clinic.db');

let db       = null;   // sql.js Database instance
let SQL      = null;   // sql.js module

// ─── Initialise ──────────────────────────────────────────────────────────────

async function init() {
  if (db) return db;

  SQL = await require('sql.js')();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name  TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      email         TEXT,
      service       TEXT    NOT NULL,
      preferred_date TEXT   NOT NULL,
      preferred_time TEXT   NOT NULL,
      notes         TEXT,
      status        TEXT    NOT NULL DEFAULT 'Pending',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  persist();
  return db;
}

/** Write the in-memory DB back to disk. */
function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Run a SELECT and return all rows as plain objects.
 * sql.js returns { columns: [...], values: [[...], ...] }
 */
function query(sql, params = []) {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const cols   = stmt.getColumnNames();
  const rows   = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row);
  }
  stmt.free();
  return rows;
}

/**
 * Run an INSERT / UPDATE / DELETE.
 * Returns { lastInsertRowid, changes }.
 */
function run(sql, params = []) {
  db.run(sql, params);
  const lastId  = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] ?? null;
  const changes = db.exec('SELECT changes() AS c')[0]?.values[0][0] ?? 0;
  persist();
  return { lastInsertRowid: lastId, changes };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

function createAppointment(data) {
  const { lastInsertRowid } = run(
    `INSERT INTO appointments
       (patient_name, phone, email, service, preferred_date, preferred_time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.patient_name,
      data.phone,
      data.email   || null,
      data.service,
      data.preferred_date,
      data.preferred_time,
      data.notes   || null,
    ]
  );
  return getAppointmentById(lastInsertRowid);
}

function getAllAppointments() {
  return query(
    `SELECT * FROM appointments ORDER BY preferred_date ASC, preferred_time ASC`
  );
}

function getAppointmentById(id) {
  const rows = query(`SELECT * FROM appointments WHERE id = ?`, [id]);
  return rows[0] || null;
}

function updateAppointmentStatus(id, status) {
  const valid = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  if (!valid.includes(status)) throw new Error('Invalid status value');

  const { changes } = run(
    `UPDATE appointments SET status = ? WHERE id = ?`,
    [status, id]
  );
  if (changes === 0) return null;
  return getAppointmentById(id);
}

// ─── Patients ─────────────────────────────────────────────────────────────────

function getAllPatients() {
  return query(`
    SELECT
      phone,
      MAX(patient_name)              AS patient_name,
      MAX(email)                     AS email,
      COUNT(*)                       AS total_appointments,
      MIN(created_at)                AS first_visit,
      MAX(created_at)                AS last_visit,
      GROUP_CONCAT(DISTINCT service) AS services_used
    FROM appointments
    GROUP BY phone
    ORDER BY last_visit DESC
  `);
}

function getPatientHistory(phone) {
  return query(
    `SELECT * FROM appointments WHERE phone = ? ORDER BY preferred_date DESC`,
    [phone]
  );
}

module.exports = {
  init,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAllPatients,
  getPatientHistory,
};
