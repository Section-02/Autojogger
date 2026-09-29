import type { SQLiteDatabase } from 'expo-sqlite';

export type Schedule = {
  id: string;
  sort_order: number;
  pattern: string;
  is_continuous: number;
  total_run_seconds: number;
};

export type WorkoutInterval = { id: number; phase: 'warmup' | 'jog' | 'walk' | 'cooldown'; duration_seconds: number };
type IntervalDefinition = Omit<WorkoutInterval, 'id'>;

export async function getCurrentSchedule(db: SQLiteDatabase) {
  const preference = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'current_schedule_id'");
  return db.getFirstAsync<Schedule>('SELECT * FROM schedules WHERE id = ?', preference?.value ?? 'schedule-01');
}

export async function setCurrentSchedule(db: SQLiteDatabase, scheduleId: string) {
  await db.runAsync("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('current_schedule_id', ?)", scheduleId);
}

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

const repeat = (items: IntervalDefinition[], count: number) => Array.from({ length: count }, () => items).flat();
export const scheduleIntervals: Record<string, IntervalDefinition[]> = {
  'schedule-01': [{ phase: 'warmup', duration_seconds: 300 }, ...repeat([{ phase: 'jog', duration_seconds: 60 }, { phase: 'walk', duration_seconds: 210 }], 6), { phase: 'jog', duration_seconds: 60 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-02': [{ phase: 'warmup', duration_seconds: 300 }, ...repeat([{ phase: 'jog', duration_seconds: 60 }, { phase: 'walk', duration_seconds: 90 }], 7), { phase: 'jog', duration_seconds: 60 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-03': [{ phase: 'warmup', duration_seconds: 300 }, ...repeat([{ phase: 'jog', duration_seconds: 90 }, { phase: 'walk', duration_seconds: 120 }], 5), { phase: 'jog', duration_seconds: 90 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-04': [{ phase: 'warmup', duration_seconds: 300 }, ...repeat([{ phase: 'jog', duration_seconds: 90 }, { phase: 'walk', duration_seconds: 90 }, { phase: 'jog', duration_seconds: 180 }, { phase: 'walk', duration_seconds: 180 }], 2), { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-05': [{ phase: 'warmup', duration_seconds: 300 }, ...repeat([{ phase: 'jog', duration_seconds: 150 }, { phase: 'walk', duration_seconds: 90 }, { phase: 'jog', duration_seconds: 210 }, { phase: 'walk', duration_seconds: 210 }], 2), { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-06': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 180 }, { phase: 'walk', duration_seconds: 90 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'walk', duration_seconds: 150 }, { phase: 'jog', duration_seconds: 180 }, { phase: 'walk', duration_seconds: 90 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-07': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'walk', duration_seconds: 180 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'walk', duration_seconds: 180 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-08': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 480 }, { phase: 'walk', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 480 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-09': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 600 }, { phase: 'walk', duration_seconds: 330 }, { phase: 'jog', duration_seconds: 540 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-10': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 900 }, { phase: 'walk', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 600 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-11': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1080 }, { phase: 'walk', duration_seconds: 240 }, { phase: 'jog', duration_seconds: 480 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-12': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1200 }, { phase: 'walk', duration_seconds: 210 }, { phase: 'jog', duration_seconds: 420 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-13': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1320 }, { phase: 'walk', duration_seconds: 180 }, { phase: 'jog', duration_seconds: 300 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-14': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1500 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-15': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1590 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-16': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1680 }, { phase: 'cooldown', duration_seconds: 300 }],
  'schedule-17': [{ phase: 'warmup', duration_seconds: 300 }, { phase: 'jog', duration_seconds: 1800 }, { phase: 'cooldown', duration_seconds: 300 }],
};

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
    CREATE TABLE IF NOT EXISTS schedule_intervals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id TEXT NOT NULL REFERENCES schedules(id),
      position INTEGER NOT NULL,
      phase TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      UNIQUE(schedule_id, position)
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
  await db.runAsync('UPDATE schedules SET pattern = ? WHERE id = ?', schedules[3][1], schedules[3][0]);
  await db.runAsync('UPDATE schedules SET pattern = ? WHERE id = ?', schedules[4][1], schedules[4][0]);
  const intervalCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM schedule_intervals');
  if ((intervalCount?.count ?? 0) === 0) {
    await db.withTransactionAsync(async () => {
      for (const [scheduleId, intervals] of Object.entries(scheduleIntervals)) {
        for (const [position, interval] of intervals.entries()) {
          await db.runAsync('INSERT INTO schedule_intervals (schedule_id, position, phase, duration_seconds) VALUES (?, ?, ?, ?)', scheduleId, position, interval.phase, interval.duration_seconds);
        }
      }
    });
  }
}
