import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'pm-management.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
    migrate()
    initCalendarSchema()
    initFinancialSchema()
    initWorkExceptionsSchema()
    seedDefaultSettings()
    seedHolidays()
  }
  return db
}

function initSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      seniority TEXT NOT NULL DEFAULT 'mid',
      email TEXT DEFAULT '',
      daily_rate REAL DEFAULT 0,
      fte REAL DEFAULT 1,
      color TEXT DEFAULT '#3B82F6',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client TEXT DEFAULT '',
      description TEXT DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      budget_total REAL DEFAULT 0,
      color TEXT DEFAULT '#10B981',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      percentage REAL NOT NULL DEFAULT 100,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

// Migrations — aggiunte colonne senza perdere dati esistenti
function migrate() {
  const columns = (getDb().prepare("PRAGMA table_info(people)").all() as { name: string }[]).map(c => c.name)
  if (!columns.includes('hourly_rate')) {
    getDb().exec('ALTER TABLE people ADD COLUMN hourly_rate REAL DEFAULT 0')
  }
  if (!columns.includes('inquadramento')) {
    getDb().exec("ALTER TABLE people ADD COLUMN inquadramento TEXT DEFAULT ''")
  }
  if (!columns.includes('appartenenza')) {
    getDb().exec("ALTER TABLE people ADD COLUMN appartenenza TEXT DEFAULT ''")
  }
  // Allocations migrations
  const allocCols = (getDb().prepare("PRAGMA table_info(allocations)").all() as { name: string }[]).map(c => c.name)
  if (!allocCols.includes('allocation_type')) {
    getDb().exec("ALTER TABLE allocations ADD COLUMN allocation_type TEXT DEFAULT 'percentage'")
  }
  if (!allocCols.includes('allocated_days')) {
    getDb().exec('ALTER TABLE allocations ADD COLUMN allocated_days REAL DEFAULT 0')
  }
  // Projects migrations
  const projCols = (getDb().prepare("PRAGMA table_info(projects)").all() as { name: string }[]).map(c => c.name)
  if (!projCols.includes('wbs_opx')) {
    getDb().exec("ALTER TABLE projects ADD COLUMN wbs_opx TEXT DEFAULT ''")
  }
  if (!projCols.includes('tipo_attivita')) {
    getDb().exec("ALTER TABLE projects ADD COLUMN tipo_attivita TEXT DEFAULT ''")
  }
}

// ── Schema festività e assenze ───────────────────────────────────────────────

function initWorkExceptionsSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS work_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(person_id, date),
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `)
}

function initFinancialSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS monthly_revenue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      stima REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      aop REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, year, month),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `)
}

function initCalendarSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'national',
      recurring INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ferie',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `)
}

function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function pad(n: number) { return String(n).padStart(2, '0') }

function seedHolidays() {
  const count = (getDb().prepare('SELECT COUNT(*) as n FROM holidays').get() as { n: number }).n
  if (count > 0) return

  const fixed = [
    ['Capodanno', '01-01'],
    ['Epifania', '01-06'],
    ['Festa della Liberazione', '04-25'],
    ['Festa del Lavoro', '05-01'],
    ['Festa della Repubblica', '06-02'],
    ['Ferragosto', '08-15'],
    ['Ognissanti', '11-01'],
    ['Immacolata Concezione', '12-08'],
    ['Natale', '12-25'],
    ['Santo Stefano', '12-26'],
  ]
  const stmt = getDb().prepare(
    "INSERT INTO holidays (name, date, type, recurring, active) VALUES (?, ?, 'national', 1, 1)"
  )
  const year = new Date().getFullYear()
  for (const [name, mmdd] of fixed) {
    stmt.run(name, `${year}-${mmdd}`)
  }
  // Pasqua e Pasquetta per anno corrente e successivo
  const stmtFixed = getDb().prepare(
    "INSERT INTO holidays (name, date, type, recurring, active) VALUES (?, ?, 'national', 0, 1)"
  )
  for (const y of [year, year + 1]) {
    const easter = easterDate(y)
    const pasqua = `${y}-${pad(easter.getMonth() + 1)}-${pad(easter.getDate())}`
    const mon = new Date(easter); mon.setDate(mon.getDate() + 1)
    const pasquetta = `${y}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`
    stmtFixed.run(`Pasqua ${y}`, pasqua)
    stmtFixed.run(`Pasquetta ${y}`, pasquetta)
  }
}

function seedDefaultSettings() {
  const defaults = [
    ['overallocation_threshold', '100'],
    ['budget_warning_threshold', '80'],
    ['deadline_warning_days', '14'],
    ['working_days_per_week', '5'],
    ['working_hours_per_day', '8']
  ]
  const stmt = getDb().prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [k, v] of defaults) stmt.run(k, v)
}

// ── People ──────────────────────────────────────────────────────────────────

export function getPeople() {
  return getDb().prepare('SELECT * FROM people ORDER BY name').all()
}

export function createPerson(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO people (name,role,seniority,inquadramento,appartenenza,email,hourly_rate,daily_rate,fte,color) VALUES (@name,@role,@seniority,@inquadramento,@appartenenza,@email,@hourly_rate,@daily_rate,@fte,@color)')
    .run(data)
  return getDb().prepare('SELECT * FROM people WHERE id=?').get(r.lastInsertRowid)
}

export function updatePerson(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE people SET name=@name,role=@role,seniority=@seniority,inquadramento=@inquadramento,appartenenza=@appartenenza,email=@email,hourly_rate=@hourly_rate,daily_rate=@daily_rate,fte=@fte,color=@color WHERE id=@id')
    .run({ ...data, id })
  return getDb().prepare('SELECT * FROM people WHERE id=?').get(id)
}

export function deletePerson(id: number) {
  getDb().prepare('DELETE FROM people WHERE id=?').run(id)
  return { success: true }
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function getProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY start_date DESC').all()
}

export function createProject(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO projects (name,client,wbs_opx,tipo_attivita,description,start_date,end_date,status,budget_total,color) VALUES (@name,@client,@wbs_opx,@tipo_attivita,@description,@start_date,@end_date,@status,@budget_total,@color)')
    .run(data)
  return getDb().prepare('SELECT * FROM projects WHERE id=?').get(r.lastInsertRowid)
}

export function updateProject(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE projects SET name=@name,client=@client,wbs_opx=@wbs_opx,tipo_attivita=@tipo_attivita,description=@description,start_date=@start_date,end_date=@end_date,status=@status,budget_total=@budget_total,color=@color WHERE id=@id')
    .run({ ...data, id })
  return getDb().prepare('SELECT * FROM projects WHERE id=?').get(id)
}

export function deleteProject(id: number) {
  getDb().prepare('DELETE FROM projects WHERE id=?').run(id)
  return { success: true }
}

// ── Allocations ───────────────────────────────────────────────────────────────

const ALLOC_JOIN = `
  SELECT a.*, p.name as person_name, p.color as person_color, p.daily_rate,
    pr.name as project_name, pr.color as project_color
  FROM allocations a
  JOIN people p ON a.person_id = p.id
  JOIN projects pr ON a.project_id = pr.id`

export function getAllocations() {
  return getDb().prepare(`${ALLOC_JOIN} ORDER BY a.start_date`).all()
}

export function createAllocation(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO allocations (person_id,project_id,start_date,end_date,percentage,allocation_type,allocated_days,notes) VALUES (@person_id,@project_id,@start_date,@end_date,@percentage,@allocation_type,@allocated_days,@notes)')
    .run(data)
  return getDb().prepare(`${ALLOC_JOIN} WHERE a.id=?`).get(r.lastInsertRowid)
}

export function updateAllocation(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE allocations SET person_id=@person_id,project_id=@project_id,start_date=@start_date,end_date=@end_date,percentage=@percentage,allocation_type=@allocation_type,allocated_days=@allocated_days,notes=@notes WHERE id=@id')
    .run({ ...data, id })
  return getDb().prepare(`${ALLOC_JOIN} WHERE a.id=?`).get(id)
}

export function deleteAllocation(id: number) {
  getDb().prepare('DELETE FROM allocations WHERE id=?').run(id)
  return { success: true }
}

// ── Milestones ────────────────────────────────────────────────────────────────

const MS_JOIN = `
  SELECT m.*, p.name as project_name, p.color as project_color
  FROM milestones m JOIN projects p ON m.project_id = p.id`

export function getMilestones(projectId?: number) {
  if (projectId) {
    return getDb().prepare(`${MS_JOIN} WHERE m.project_id=? ORDER BY m.due_date`).all(projectId)
  }
  return getDb().prepare(`${MS_JOIN} ORDER BY m.due_date`).all()
}

export function createMilestone(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO milestones (project_id,name,due_date,completed,description) VALUES (@project_id,@name,@due_date,@completed,@description)')
    .run({ ...data, completed: data.completed ? 1 : 0 })
  return getDb().prepare(`${MS_JOIN} WHERE m.id=?`).get(r.lastInsertRowid)
}

export function updateMilestone(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE milestones SET project_id=@project_id,name=@name,due_date=@due_date,completed=@completed,description=@description WHERE id=@id')
    .run({ ...data, completed: data.completed ? 1 : 0, id })
  return getDb().prepare(`${MS_JOIN} WHERE m.id=?`).get(id)
}

export function deleteMilestone(id: number) {
  getDb().prepare('DELETE FROM milestones WHERE id=?').run(id)
  return { success: true }
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings() {
  const rows = getDb().prepare('SELECT * FROM settings').all() as { key: string; value: string }[]
  return rows.reduce((acc, { key, value }) => {
    acc[key] = isNaN(Number(value)) ? value : Number(value)
    return acc
  }, {} as Record<string, string | number>)
}

export function updateSettings(data: Record<string, string | number>) {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)')
  for (const [k, v] of Object.entries(data)) stmt.run(k, String(v))
  return getSettings()
}

// ── Holidays ──────────────────────────────────────────────────────────────────

export function getHolidays() {
  return getDb().prepare('SELECT * FROM holidays ORDER BY date').all()
}

export function createHoliday(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO holidays (name,date,type,recurring,active) VALUES (@name,@date,@type,@recurring,@active)')
    .run({ ...data, recurring: data.recurring ? 1 : 0, active: data.active !== false ? 1 : 0 })
  return getDb().prepare('SELECT * FROM holidays WHERE id=?').get(r.lastInsertRowid)
}

export function updateHoliday(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE holidays SET name=@name,date=@date,type=@type,recurring=@recurring,active=@active WHERE id=@id')
    .run({ ...data, recurring: data.recurring ? 1 : 0, active: data.active ? 1 : 0, id })
  return getDb().prepare('SELECT * FROM holidays WHERE id=?').get(id)
}

export function deleteHoliday(id: number) {
  getDb().prepare('DELETE FROM holidays WHERE id=?').run(id)
  return { success: true }
}

// ── Leaves ────────────────────────────────────────────────────────────────────

export function getLeaves() {
  return getDb().prepare(`
    SELECT l.*, p.name as person_name, p.color as person_color
    FROM leaves l JOIN people p ON l.person_id = p.id
    ORDER BY l.start_date DESC
  `).all()
}

export function createLeave(data: Record<string, unknown>) {
  const r = getDb()
    .prepare('INSERT INTO leaves (person_id,start_date,end_date,type,notes) VALUES (@person_id,@start_date,@end_date,@type,@notes)')
    .run(data)
  return getDb().prepare(`
    SELECT l.*, p.name as person_name, p.color as person_color
    FROM leaves l JOIN people p ON l.person_id = p.id WHERE l.id=?
  `).get(r.lastInsertRowid)
}

export function updateLeave(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE leaves SET person_id=@person_id,start_date=@start_date,end_date=@end_date,type=@type,notes=@notes WHERE id=@id')
    .run({ ...data, id })
  return getDb().prepare(`
    SELECT l.*, p.name as person_name, p.color as person_color
    FROM leaves l JOIN people p ON l.person_id = p.id WHERE l.id=?
  `).get(id)
}

export function deleteLeave(id: number) {
  getDb().prepare('DELETE FROM leaves WHERE id=?').run(id)
  return { success: true }
}

// ── Monthly Revenue ───────────────────────────────────────────────────────────

export function getMonthlyRevenues() {
  return getDb().prepare('SELECT * FROM monthly_revenue ORDER BY year, month, project_id').all()
}

export function upsertMonthlyRevenue(data: Record<string, unknown>) {
  getDb()
    .prepare(`
      INSERT INTO monthly_revenue (project_id, year, month, stima, revenue, aop, notes)
      VALUES (@project_id, @year, @month, @stima, @revenue, @aop, @notes)
      ON CONFLICT(project_id, year, month) DO UPDATE SET
        stima=@stima, revenue=@revenue, aop=@aop, notes=@notes
    `)
    .run(data)
  return getDb()
    .prepare('SELECT * FROM monthly_revenue WHERE project_id=? AND year=? AND month=?')
    .get(data.project_id as number, data.year as number, data.month as number)
}

export function deleteMonthlyRevenue(projectId: number, year: number, month: number) {
  getDb().prepare('DELETE FROM monthly_revenue WHERE project_id=? AND year=? AND month=?').run(projectId, year, month)
  return { success: true }
}

// ── Work Exceptions ───────────────────────────────────────────────────────────

export function getWorkExceptions() {
  return getDb().prepare(`
    SELECT we.*, p.name as person_name, p.color as person_color
    FROM work_exceptions we JOIN people p ON we.person_id = p.id
    ORDER BY we.date, p.name
  `).all()
}

export function upsertWorkException(data: Record<string, unknown>) {
  getDb()
    .prepare(`INSERT INTO work_exceptions (person_id, date, notes)
              VALUES (@person_id, @date, @notes)
              ON CONFLICT(person_id, date) DO UPDATE SET notes=@notes`)
    .run(data)
  return getDb().prepare(`
    SELECT we.*, p.name as person_name, p.color as person_color
    FROM work_exceptions we JOIN people p ON we.person_id = p.id
    WHERE we.person_id=? AND we.date=?
  `).get(data.person_id as number, data.date as string)
}

export function deleteWorkException(personId: number, date: string) {
  getDb().prepare('DELETE FROM work_exceptions WHERE person_id=? AND date=?').run(personId, date)
  return { success: true }
}
