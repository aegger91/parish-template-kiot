/* Shared helpers for schedule/event detail panels: .ics download and Google Calendar links. */
import { DAY_MS, formatDay, formatTime, fromDayNum, isoDay } from './calendar';

export interface EventDetail {
  title: string;
  day: number;
  start: number;
  duration: number;
  place: string;
  note?: string;
  streamed?: boolean;
  liveUrl?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Local wall time as YYYYMMDDTHHMMSS (no Z) for floating parish-local events. */
export function localStamp(day: number, minutes: number): string {
  const { y, m, d } = fromDayNum(day);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

export function icsContent(e: EventDetail, parishName: string): string {
  const uid = `${isoDay(e.day)}-${e.start}-${e.title.replace(/\W+/g, '').slice(0, 24)}@parish`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = e.start + Math.max(e.duration || 60, 15);
  const endDay = e.day + Math.floor(end / (24 * 60));
  const endMin = end % (24 * 60);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Parish Template Kiot//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${localStamp(e.day, e.start)}`,
    `DTEND:${localStamp(endDay, endMin)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `LOCATION:${escapeIcs(e.place)}`,
    `DESCRIPTION:${escapeIcs(e.note || parishName)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function googleCalUrl(e: EventDetail): string {
  const end = e.start + Math.max(e.duration || 60, 15);
  const endDay = e.day + Math.floor(end / (24 * 60));
  const endMin = end % (24 * 60);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${localStamp(e.day, e.start)}/${localStamp(endDay, endMin)}`,
    details: e.note || '',
    location: e.place,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function downloadIcs(e: EventDetail, parishName: string) {
  const blob = new Blob([icsContent(e, parishName)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${isoDay(e.day)}-${e.title.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function formatPlace(address: { street: string; city: string; region: string; postalCode: string }): string {
  return `${address.street}, ${address.city}, ${address.region} ${address.postalCode}`;
}

export function directionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function detailAttrs(o: {
  title: string;
  day: number;
  start: number;
  duration: number;
  streamed?: boolean;
  place?: string;
  note?: string;
}): string {
  const esc = (s: unknown) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return [
    `data-event-detail`,
    `data-title="${esc(o.title)}"`,
    `data-day="${o.day}"`,
    `data-start="${o.start}"`,
    `data-duration="${o.duration}"`,
    o.streamed ? `data-streamed="1"` : '',
    o.place ? `data-place="${esc(o.place)}"` : '',
    o.note ? `data-note="${esc(o.note)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export { formatDay, formatTime, DAY_MS };
