/* Formatting shared by server-rendered markup and client re-renders, so both produce identical HTML. */
import { formatDay, formatFeastCivilDate, formatTime, resolveCalendarStyle, type CalendarConfig } from './calendar';
import type { Occurrence } from './schedule';
import type { Feast } from './content';
import { detailAttrs } from './event-detail';

export interface Fmt {
  lang: string;
  locale: string;
  hourCycle?: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tr: (v: any) => string;
  calendar?: CalendarConfig;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function relDay(day: number, today: number, f: Fmt, long = false): string {
  if (day === today) return f.t('today');
  if (day === today + 1) return f.t('tomorrow');
  return formatDay(day, f.locale, long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' });
}

export function serviceRows(items: Occurrence[], today: number, f: Fmt): string {
  if (!items.length) return `<li class="svc-empty">${esc(f.t('noServices'))}</li>`;
  return items
    .map((o) => {
      const title = f.tr(o.title);
      const attrs = detailAttrs({ title, day: o.day, start: o.start, duration: o.duration, streamed: o.streamed });
      return `<li>
  <button type="button" class="svc-row${o.feast ? ' svc-row--feast' : ''}" ${attrs}>
    <span class="svc-when"><span class="svc-day">${esc(relDay(o.day, today, f))}</span><span class="svc-time">${esc(formatTime(o.start, f.locale, f.hourCycle))}</span></span>
    <span class="svc-what"><span class="svc-title">${esc(title)}</span>${o.feast ? `<span class="svc-feast">${esc(f.tr(o.feast.name))}</span>` : ''}</span>
    ${o.streamed ? `<span class="svc-stream" title="${esc(f.t('streamed'))}"><span class="visually-hidden">${esc(f.t('streamed'))}</span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg></span>` : ''}
  </button>
</li>`;
    })
    .join('');
}

export function feastBlock(today: number, todays: Feast[], next: { day: number; feast: Feast } | undefined, f: Fmt): string {
  const style = resolveCalendarStyle(f.calendar ?? { calendarStyle: 'new' });
  const main = todays[0];
  const others = todays.slice(1);
  let html = '';
  if (main) {
    const dateNote =
      style === 'old' && main.month != null
        ? `<p class="feast-date">${esc(formatFeastCivilDate(today, main, style, f.locale, f.t('oldStyleAbbrev')))}</p>`
        : '';
    html += `<p class="feast-label">${esc(f.t('todayWeCommemorate'))}</p>
<p class="feast-name${main.rank === 'great' ? ' is-great' : ''}">${esc(f.tr(main.name))}</p>${dateNote}`;
    if (others.length) html += `<p class="feast-also">${others.map((o) => esc(f.tr(o.name))).join(' · ')}</p>`;
  } else {
    html += `<p class="feast-label">${esc(f.t('today'))}, ${esc(formatDay(today, f.locale, { weekday: 'long', month: 'long', day: 'numeric' }))}</p>
<p class="feast-none">${esc(f.t('noFeastToday'))}</p>`;
  }
  if (next && next.day !== today) {
    const nextDate =
      style === 'old' && next.feast.month != null
        ? formatFeastCivilDate(next.day, next.feast, style, f.locale, f.t('oldStyleAbbrev'))
        : relDay(next.day, today, f, true);
    html += `<p class="feast-next"><span>${esc(f.t('upcomingFeast'))}</span> ${esc(f.tr(next.feast.name))}, ${esc(nextDate)}</p>`;
  }
  return html;
}
