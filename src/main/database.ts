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
    seedDefaultSettings()
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
  // Projects migrations
  const projCols = (getDb().prepare("PRAGMA table_info(projects)").all() as { name: string }[]).map(c => c.name)
  if (!projCols.includes('wbs_opx')) {
    getDb().exec("ALTER TABLE projects ADD COLUMN wbs_opx TEXT DEFAULT ''")
  }
  if (!projCols.includes('tipo_attivita')) {
    getDb().exec("ALTER TABLE projects ADD COLUMN tipo_attivita TEXT DEFAULT ''")
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
    .prepare('INSERT INTO allocations (person_id,project_id,start_date,end_date,percentage,notes) VALUES (@person_id,@project_id,@start_date,@end_date,@percentage,@notes)')
    .run(data)
  return getDb().prepare(`${ALLOC_JOIN} WHERE a.id=?`).get(r.lastInsertRowid)
}

export function updateAllocation(id: number, data: Record<string, unknown>) {
  getDb()
    .prepare('UPDATE allocations SET person_id=@person_id,project_id=@project_id,start_date=@start_date,end_date=@end_date,percentage=@percentage,notes=@notes WHERE id=@id')
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
