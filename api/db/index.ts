import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Database } from './types.js';
import { mockData } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'data.json');

const defaultData: Database = JSON.parse(JSON.stringify(mockData));

let db: LowSync<Database> | null = null;

export function getDb(): LowSync<Database> {
  if (!db) {
    const adapter = new JSONFileSync<Database>(dbFilePath);
    db = new LowSync<Database>(adapter, defaultData);
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  if (!fs.existsSync(dbFilePath)) {
    database.data = JSON.parse(JSON.stringify(mockData));
    database.write();
  } else {
    database.read();
    if (!database.data) {
      database.data = JSON.parse(JSON.stringify(mockData));
      database.write();
    }
  }
}
