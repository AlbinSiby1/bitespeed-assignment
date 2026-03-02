import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const dbFile = process.env.DB_FILE || "./bitespeed.db";

export const db = new Database(dbFile);

db.exec(`
CREATE TABLE IF NOT EXISTS Contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber TEXT,
  email TEXT,
  linkedId INTEGER,
  linkPrecedence TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME
);
`);

db.exec(`
CREATE INDEX IF NOT EXISTS idx_email ON Contact(email);
CREATE INDEX IF NOT EXISTS idx_phone ON Contact(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_linkedId ON Contact(linkedId);
`);