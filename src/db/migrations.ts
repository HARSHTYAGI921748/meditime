import { ALL_TABLES } from './schema';

// This module is called once at app start to ensure all tables exist.
// On Android it runs against the real SQLite DB.
// On web it's a no-op (Zustand/localStorage is used as fallback).

let db: any = null; // CapacitorSQLitePlugin instance

export async function initDatabase(): Promise<boolean> {
  try {
    // Dynamic import so web builds don't crash if plugin unavailable
    const { CapacitorSQLite, SQLiteConnection } = await import(
      '@capacitor-community/sqlite'
    );
    const sqlite = new SQLiteConnection(CapacitorSQLite);

    // Create or open the database
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection('meditime_db', false)).result;

    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection('meditime_db', false);
    } else {
      db = await sqlite.createConnection(
        'meditime_db',
        false,
        'no-encryption',
        1,
        false
      );
    }

    await db.open();

    // Run migrations (create tables if they don't exist)
    for (const sql of ALL_TABLES) {
      await db.execute(sql);
    }

    console.log('[MediTime] Database initialized');
    return true;
  } catch (e) {
    console.warn('[MediTime] SQLite unavailable (running in web mode):', e);
    return false;
  }
}

export async function dbQuery<T = any>(
  sql: string,
  values: any[] = []
): Promise<T[]> {
  if (!db) return [];
  try {
    const result = await db.query(sql, values);
    return (result.values ?? []) as T[];
  } catch (e) {
    console.error('[MediTime] DB query error:', e);
    return [];
  }
}

export async function dbExecute(
  sql: string,
  values: any[] = []
): Promise<boolean> {
  if (!db) return false;
  try {
    await db.run(sql, values);
    return true;
  } catch (e) {
    console.error('[MediTime] DB execute error:', e);
    return false;
  }
}

export function isDbAvailable(): boolean {
  return db !== null;
}
