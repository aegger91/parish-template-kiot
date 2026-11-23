/*
  Liturgical calendar helpers. Pure functions shared by the build and the browser.
  Days are integers counted from 1970-01-01 in the parish's local calendar ("day numbers"),
  so no time zone arithmetic leaks into date logic.
*/
import type { CalendarStyle, Feast, Paschalion } from './content';

const JDN_EPOCH = 2440588;
export const DAY_MS = 86400000;

export function dayNum(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNum(n: number) {
  const dt = new Date(n * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function isoDay(n: number): string {
  const { y, m, d } = fromDayNum(n);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseIsoDay(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return dayNum(y, m, d);
}

export function weekday(n: number): number {
  return new Date(n * DAY_MS).getUTCDay();
}

function julianToDayNum(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
  return jdn - JDN_EPOCH;
}

/** Orthodox Pascha (Julian computus), returned as a civil (Gregorian) day number. */
export function orthodoxPascha(year: number): number {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return julianToDayNum(year, month, day);
}

/** Gregorian computus, used by parishes that keep the Gregorian Paschalion. */
export function gregorianPascha(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNum(year, month, day);
}

export function paschaFor(year: number, paschalion: Paschalion): number {
  return paschalion === 'gregorian' ? gregorianPascha(year) : orthodoxPascha(year);
}

/** Resolve calendarStyle ('new' | 'old'); accepts legacy style names from older content. */
export function resolveCalendarStyle(cfg: CalendarConfig | { calendarStyle?: string; style?: string }): CalendarStyle {
  const raw = (cfg as any).calendarStyle ?? (cfg as any).style;
  if (raw === 'old' || raw === 'julian') return 'old';
  return 'new';
}

/** Civil day on which a fixed church-calendar date falls in a given church year. */
export function fixedFeastDay(style: CalendarStyle, year: number, month: number, day: number): number {
  return style === 'old' ? julianToDayNum(year, month, day) : dayNum(year, month, day);
}

export interface CalendarConfig {
  /** 'new' = Revised Julian; 'old' = Julian (Old Style). */
  calendarStyle?: CalendarStyle;
  /** @deprecated Use calendarStyle. Kept for reading older content. */
  style?: CalendarStyle | 'julian' | 'revised-julian' | 'gregorian';
  paschalion?: Paschalion;
}

export function defaultPaschalion(cfg: CalendarConfig): Paschalion {
  return cfg.paschalion ?? 'orthodox';
}

/** Format a civil feast day; on Old Calendar include the church date, e.g. "Dec 19 (Dec 6 O.S.)". */
export function formatFeastCivilDate(
  civilDay: number,
  feast: Feast,
  style: CalendarStyle,
  locale: string,
  osAbbrev: string,
): string {
  const civil = formatDay(civilDay, locale, { month: 'short', day: 'numeric' });
  if (style !== 'old' || feast.month == null || feast.day == null) return civil;
  const os = formatDay(dayNum(2000, feast.month, feast.day), locale, { month: 'short', day: 'numeric' });
  return `${civil} (${os} ${osAbbrev})`;
}

/** All feasts falling between two day numbers (inclusive), keyed by day number. */
export function feastsInRange(
  start: number,
  end: number,
  data: { fixed: Feast[]; movable: Feast[] },
  cfg: CalendarConfig,
): Map<number, Feast[]> {
  const out = new Map<number, Feast[]>();
  const push = (n: number, f: Feast) => {
    if (n < start || n > end) return;
    const list = out.get(n) ?? [];
    list.push(f);
    out.set(n, list);
  };
  const y0 = fromDayNum(start).y - 1;
  const y1 = fromDayNum(end).y + 1;
  const style = resolveCalendarStyle(cfg);
  const paschalion = defaultPaschalion(cfg);
  for (let y = y0; y <= y1; y++) {
    for (const f of data.fixed) push(fixedFeastDay(style, y, f.month!, f.day!), f);
    const pascha = paschaFor(y, paschalion);
    for (const f of data.movable) push(pascha + (f.offset ?? 0), f);
  }
  const rankOrder = { great: 0, major: 1, saint: 2 } as const;
  for (const list of out.values()) list.sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank]);
  return out;
}

export function nextFeast(
  from: number,
  data: { fixed: Feast[]; movable: Feast[] },
  cfg: CalendarConfig,
  minRank: 'great' | 'major' | 'saint' = 'major',
): { day: number; feast: Feast } | undefined {
  const ok = minRank === 'great' ? ['great'] : minRank === 'major' ? ['great', 'major'] : ['great', 'major', 'saint'];
  const map = feastsInRange(from, from + 120, data, cfg);
  const days = [...map.keys()].sort((a, b) => a - b);
  for (const d of days) {
    const f = map.get(d)!.find((x) => ok.includes(x.rank));
    if (f) return { day: d, feast: f };
  }
  return undefined;
}

/** Current wall-clock day number and minutes in a time zone. */
export function nowIn(timeZone: string, now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: dayNum(get('year'), get('month'), get('day')), minutes: (get('hour') % 24) * 60 + get('minute') };
}

export function formatDay(n: number, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(n * DAY_MS));
}

export function formatDayRange(a: number, b: number, locale: string): string {
  const f = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return f.formatRange(new Date(a * DAY_MS), new Date(b * DAY_MS));
}

export function formatTime(minutes: number, locale: string, hourCycle?: string): string {
  const d = new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    ...(hourCycle ? { hourCycle: hourCycle as any } : {}),
  }).format(d);
}

export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
