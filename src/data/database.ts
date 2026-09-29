import type { SQLiteDatabase } from 'expo-sqlite';

export type Schedule = {
  id: string;
  sort_order: number;
  pattern: string;
  is_continuous: number;
  total_run_seconds: number;
};

export const schedules = [
  ['schedule-01', 'Run 1:00 / Walk 3:30 × 6, then Run 1:00', 420, 0],
  ['schedule-02', 'Run 1:00 / Walk 1:30 × 7, then Run 1:00', 480, 0],
  ['schedule-03', 'Run 1:30 / Walk 2:00 × 5, then Run 1:30', 540, 0],
  ['schedule-04', 'Run 1:30, Walk 1:30, Run 3:00, Walk 3:00 × pattern twice', 540, 0],
  ['schedule-05', 'Run 2:30, Walk 1:30, Run 3:30, Walk 3:30 × pattern twice', 720, 0],
  ['schedule-06', 'Run 3:00, Walk 1:30, Run 5:00, Walk 2:30, Run 3:00, Walk 1:30, Run 5:00', 960, 0],
  ['schedule-07', 'Run 5:00 / Walk 3:00 / Run 5:00 / Walk 3:00 / Run 5:00', 900, 0],
  ['schedule-08', 'Run 8:00 / Walk 5:00 / Run 8:00', 960, 0],
  ['schedule-09', 'Run 10:00 / Walk 5:30 / Run 9:00', 1140, 0],
  ['schedule-10', 'Run 15:00 / Walk 5:00 / Run 10:00', 1500, 0],
  ['schedule-11', 'Run 18:00 continuously / Walk 4:00 / Run 8:00', 1560, 0],
  ['schedule-12', 'Run 20:00 / Walk 3:30 / Run 7:00', 1620, 0],
  ['schedule-13', 'Run 22:00 / Walk 3:00 / Run 5:00', 1620, 0],
  ['schedule-14', 'Run 25:00 continuously', 1500, 1],
  ['schedule-15', 'Run 26:30 continuously', 1590, 1],
  ['schedule-16', 'Run 28:00 continuously', 1680, 1],
  ['schedule-17', 'Run 30:00 continuously', 1800, 1],
] as const;

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY NOT NULL,
      sort_order INTEGER NOT NULL UNIQUE,
      pattern TEXT NOT NULL,
      is_continuous INTEGER NOT NULL DEFAULT 0,
      total_run_seconds INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL REFERENCES schedules(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL,
      rating TEXT,
      distance_value REAL,
      distance_unit TEXT NOT NULL DEFAULT 'mi',
      notes TEXT,
      modified INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );
  `);

  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM schedules');
  if ((existing?.count ?? 0) === 0) {
    await db.withTransactionAsync(async () => {
      for (const [id, pattern, totalRunSeconds, isContinuous] of schedules) {
        const sortOrder = Number(id.slice(-2));
        await db.runAsync(
          'INSERT INTO schedules (id, sort_order, pattern, is_continuous, total_run_seconds) VALUES (?, ?, ?, ?, ?)',
          id, sortOrder, pattern, isContinuous, totalRunSeconds,
        );
      }
      await db.runAsync("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('current_schedule_id', 'schedule-01')");
      await db.runAsync("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('schema_version', '1')");
    });
  }
}
