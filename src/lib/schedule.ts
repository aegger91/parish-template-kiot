import type { Feast, Localized, ServiceItem } from './content';
import { feastsInRange, parseIsoDay, parseTime, weekday, type CalendarConfig } from './calendar';

export interface ScheduleData {
  weekly: ServiceItem[];
  feastServices: Record<string, ServiceItem[]>;
  special: ServiceItem[];
}

export interface Occurrence {
  key: string;
  day: number;
  start: number;
  duration: number;
  type: string;
  streamed: boolean;
  title: Localized;
  feast?: Feast;
}

/** Expand weekly, feast and dated services into concrete occurrences between two days (inclusive). */
export function occurrences(
  start: number,
  end: number,
  data: ScheduleData,
  feastData: { fixed: Feast[]; movable: Feast[] },
  cfg: CalendarConfig,
): { items: Occurrence[]; feasts: Map<number, Feast[]> } {
  const pad = 3;
  const feastMap = feastsInRange(start - pad, end + pad, feastData, cfg);
  const suppressed = new Set<number>();
  for (const [day, list] of feastMap) {
    for (const f of list) for (const off of f.suppressWeekly ?? []) suppressed.add(day + off);
  }

  const items: Occurrence[] = [];
  const add = (s: ServiceItem, day: number, feast?: Feast) =>
    items.push({
      key: `${s.id}-${day}`,
      day,
      start: parseTime(s.time),
      duration: s.duration,
      type: s.type,
      streamed: !!s.streamed,
      title: s.title,
      feast,
    });

  for (let day = start; day <= end; day++) {
    if (suppressed.has(day)) continue;
    const wd = weekday(day);
    for (const s of data.weekly) if (s.day === wd) add(s, day);
  }

  for (const [feastDay, list] of feastMap) {
    for (const f of list) {
      const templates = f.services ?? data.feastServices[f.rank] ?? [];
      for (const s of templates) {
        const target = feastDay + (s.offsetDays ?? 0);
        if (target < start || target > end) continue;
        if (s.skipOnDays?.includes(weekday(target))) continue;
        add(s, target, f);
      }
    }
  }

  for (const s of data.special) {
    if (!s.date) continue;
    const day = parseIsoDay(s.date);
    if (day >= start && day <= end) add(s, day);
  }

  items.sort((a, b) => a.day - b.day || a.start - b.start);
  const feasts = new Map([...feastMap].filter(([d]) => d >= start && d <= end));
  return { items, feasts };
}

export function upcoming(items: Occurrence[], now: { day: number; minutes: number }, count: number) {
  return items
    .filter((o) => o.day > now.day || (o.day === now.day && o.start + o.duration > now.minutes))
    .slice(0, count);
}

export function liveNow(items: Occurrence[], now: { day: number; minutes: number }) {
  return items.find((o) => o.streamed && o.day === now.day && o.start <= now.minutes && o.start + o.duration > now.minutes);
}
