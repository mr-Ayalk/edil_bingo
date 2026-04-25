import sqlite3 from 'sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'vouchers.db')

export function initDb() {
  const db = new sqlite3.Database(dbPath)

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      )
    `)
  })

  db.close()
}