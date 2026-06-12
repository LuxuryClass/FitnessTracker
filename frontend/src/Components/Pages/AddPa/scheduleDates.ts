import { addDays, format } from 'date-fns';

// Максимум дат в одном batch (синхронизировано с бэкендом max_length=100).
export const MAX_SCHEDULE_DATES = 100;
// Горизонт раскрытия повтора без явной даты окончания («На 3 месяца»).
const HORIZON_DAYS = 90;

export const WEEKDAY_UI_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export interface ScheduleDateEntry {
  date: string;
  time: string;
}

export type RepeatEnd =
  | { type: 'forever' }
  | { type: 'until'; untilDate: string }
  | { type: 'count'; count: number };

export interface SchedulePreview {
  mode: 'multi' | 'repeat';
  count: number;
  nearestDate: string | null;
  time: string;
  weekdays: number[];
  endLabel: string;
  dates: ScheduleDateEntry[];
}

const toKey = (d: Date): string => format(d, 'yyyy-MM-dd');

const startOfToday = (): Date => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};

// Локальные дата+время → ISO
export const toPlannedForIso = (dateStr: string, timeStr: string): string =>
  new Date(`${dateStr}T${timeStr}:00`).toISOString();

export const parseDateKey = (dateStr: string): Date => new Date(`${dateStr}T00:00:00`);

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const formatDateLabel = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = parseDateKey(dateStr);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
};

export const formatRepeatEndLabel = (end: RepeatEnd): string => {
  if (end.type === 'forever') return 'На 3 месяца';
  if (end.type === 'until') return `До ${formatDateLabel(end.untilDate)}`;
  return `После ${end.count} повторений`;
};

export const generateRecurringDates = (weekdays: number[], end: RepeatEnd): string[] => {
  if (weekdays.length === 0) return [];
  const wd = new Set(weekdays);
  const from = startOfToday();
  const result: string[] = [];
  let cursor = from;

  if (end.type === 'count') {
    const target = Math.min(end.count, MAX_SCHEDULE_DATES);
    let guard = 0;
    while (result.length < target && guard < 366 * 10) {
      if (wd.has(cursor.getDay())) result.push(toKey(cursor));
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    return result;
  }

  const upper =
    end.type === 'until' ? parseDateKey(end.untilDate) : addDays(from, HORIZON_DAYS);

  while (cursor <= upper && result.length < MAX_SCHEDULE_DATES) {
    if (wd.has(cursor.getDay())) result.push(toKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
};