/* HTML renderers for schedule views, shared by the build and the browser. */
import { dayNum, formatDay, formatFeastCivilDate, formatTime, fromDayNum, resolveCalendarStyle, weekday } from './calendar';
import type { Feast } from './content';
import { detailAttrs } from './event-detail';
import type { Fmt } from './format';
import type { Occurrence } from './schedule';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type Occ = { items: Occurrence[]; feasts: Map<number, Feast[]> };

const streamIcon = `<svg class="chip-stream" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>`;

function feastTags(list: Feast[] | undefined, f: Fmt, day: number, max = 2) {
  if (!list?.length) return '';
  const style = resolveCalendarStyle(f.calendar ?? { calendarStyle: 'new' });
  return list
    .slice(0, max)
    .map((x) => {
      const name = esc(f.tr(x.name));
      const date =
        style === 'old' && x.month != null
          ? ` <span class="feast-os">${esc(formatFeastCivilDate(day, x, style, f.locale, f.t('oldStyleAbbrev')))}</span>`
          : '';
      return `<span class="feast-tag feast-tag--${x.rank}">${x.rank === 'great' ? `<span class="visually-hidden">${esc(f.t('greatFeast'))}: </span>` : ''}${name}${date}</span>`;
    })
    .join('');
}

function chip(o: Occurrence, f: Fmt) {
  const title = f.tr(o.title);
  const attrs = detailAttrs({
    title,
    day: o.day,
    start: o.start,
    duration: o.duration,
    streamed: o.streamed,
  });
  return `<li><button type="button" class="svc-chip svc-chip--${esc(o.type)}${o.feast ? ' is-feast' : ''}" ${attrs}>
  <span class="chip-time">${esc(formatTime(o.start, f.locale, f.hourCycle))}</span>
  <span class="chip-title">${esc(title)}</span>
  ${o.streamed ? `${streamIcon}<span class="visually-hidden">${esc(f.t('streamed'))}</span>` : ''}
</button></li>`;
}

function dayClass(day: number, today: number, feasts?: Feast[]) {
  const c = [];
  if (day === today) c.push('is-today');
  if (day < today) c.push('is-past');
  if (feasts?.some((x) => x.rank === 'great')) c.push('has-great');
  else if (feasts?.length) c.push('has-feast');
  return c.join(' ');
}

export function weekPreview(start: number, days: number, occ: Occ, today: number, f: Fmt) {
  let html = '';
  for (let d = start; d < start + days; d++) {
    const items = occ.items.filter((o) => o.day === d);
    const fe = occ.feasts.get(d);
    html += `<li class="ws-day ${dayClass(d, today, fe)}">
  <p class="ws-date"><span class="ws-dow">${esc(d === today ? f.t('today') : formatDay(d, f.locale, { weekday: 'short' }))}</span><span class="ws-num">${esc(formatDay(d, f.locale, { day: 'numeric' }))}</span><span class="ws-mon">${esc(formatDay(d, f.locale, { month: 'short' }))}</span></p>
  ${fe ? `<div class="ws-feasts">${feastTags(fe, f, d, 1)}</div>` : ''}
  ${items.length ? `<ul class="chip-list">${items.map((o) => chip(o, f)).join('')}</ul>` : `<p class="ws-empty">${esc(f.t('noServices'))}</p>`}
</li>`;
  }
  return html;
}

export function weekView(start: number, occ: Occ, today: number, f: Fmt) {
  let html = '<ol class="week-grid">';
  for (let d = start; d < start + 7; d++) {
    const items = occ.items.filter((o) => o.day === d);
    const fe = occ.feasts.get(d);
    html += `<li class="wk-day ${dayClass(d, today, fe)}">
  <h3 class="wk-head"><span class="wk-dow">${esc(formatDay(d, f.locale, { weekday: 'long' }))}</span><span class="wk-date">${esc(formatDay(d, f.locale, { month: 'short', day: 'numeric' }))}</span>${d === today ? `<span class="today-pill">${esc(f.t('today'))}</span>` : ''}</h3>
  ${fe ? `<div class="wk-feasts">${feastTags(fe, f, d, 3)}</div>` : ''}
  ${items.length ? `<ul class="chip-list">${items.map((o) => chip(o, f)).join('')}</ul>` : `<p class="wk-empty">${esc(f.t('noServices'))}</p>`}
</li>`;
  }
  return html + '</ol>';
}

export function monthView(year: number, month: number, occ: Occ, today: number, f: Fmt, weekStartsOn = 0) {
  const first = dayNum(year, month, 1);
  const last = dayNum(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) - 1;
  const lead = (weekday(first) - weekStartsOn + 7) % 7;
  const gridStart = first - lead;
  const weeks = Math.ceil((lead + (last - first + 1)) / 7);
  let head = '<tr>';
  for (let i = 0; i < 7; i++) head += `<th scope="col"><abbr title="${esc(formatDay(gridStart + i, f.locale, { weekday: 'long' }))}">${esc(formatDay(gridStart + i, f.locale, { weekday: 'short' }))}</abbr></th>`;
  head += '</tr>';
  let body = '';
  for (let w = 0; w < weeks; w++) {
    body += '<tr>';
    for (let i = 0; i < 7; i++) {
      const d = gridStart + w * 7 + i;
      const inMonth = d >= first && d <= last;
      const items = inMonth ? occ.items.filter((o) => o.day === d) : [];
      const fe = inMonth ? occ.feasts.get(d) : undefined;
      body += `<td class="mo-cell ${inMonth ? '' : 'is-outside'} ${dayClass(d, today, fe)}">${
        inMonth
          ? `<span class="mo-num">${fromDayNum(d).d}</span>${fe ? `<div class="mo-feasts">${feastTags(fe, f, d, 1)}</div>` : ''}${items.length ? `<ul class="chip-list chip-list--tight">${items.map((o) => chip(o, f)).join('')}</ul>` : ''}`
          : ''
      }</td>`;
    }
    body += '</tr>';
  }
  const caption = formatDay(first, f.locale, { month: 'long', year: 'numeric' });
  const table = `<table class="month-grid"><caption class="visually-hidden">${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;

  let list = '<ol class="month-list">';
  for (let d = first; d <= last; d++) {
    const items = occ.items.filter((o) => o.day === d);
    const fe = occ.feasts.get(d);
    if (!items.length && !fe) continue;
    list += `<li class="ml-day ${dayClass(d, today, fe)}"><p class="ml-date"><span class="ml-num">${fromDayNum(d).d}</span><span class="ml-dow">${esc(formatDay(d, f.locale, { weekday: 'short' }))}</span></p><div class="ml-body">${fe ? `<div class="wk-feasts">${feastTags(fe, f, d, 3)}</div>` : ''}${items.length ? `<ul class="chip-list">${items.map((o) => chip(o, f)).join('')}</ul>` : ''}</div></li>`;
  }
  list += '</ol>';
  return table + list;
}
