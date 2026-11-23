/* Opens a detail dialog for any [data-event-detail] control across the site. */
import { formatDay, formatTime } from '../lib/calendar';
import { ctx, esc, setupDialog, t } from '../lib/client';
import { directionsUrl, downloadIcs, googleCalUrl, type EventDetail } from '../lib/event-detail';

let dialog: HTMLDialogElement | null = null;
let api: ReturnType<typeof setupDialog> | null = null;
let current: EventDetail | null = null;

function ensure() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'dialog dialog--event';
  dialog.setAttribute('aria-labelledby', 'ev-detail-title');
  dialog.innerHTML = `<div class="dialog-inner">
  <button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="${esc(t('close'))}">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
  <div class="dialog-head">
    <p class="eyebrow" data-ev-when></p>
    <h2 class="dialog-title" id="ev-detail-title" data-ev-title></h2>
  </div>
  <dl class="ev-meta">
    <div><dt>${esc(t('eventDate'))}</dt><dd data-ev-date></dd></div>
    <div><dt>${esc(t('eventTime'))}</dt><dd data-ev-time></dd></div>
    <div><dt>${esc(t('gi.location'))}</dt><dd data-ev-place></dd></div>
  </dl>
  <p class="ev-note" data-ev-note></p>
  <div class="btn-row ev-actions">
    <button type="button" class="btn btn-burgundy" data-ev-ics>${esc(t('addToCalendar'))}</button>
    <a class="btn btn-outline" data-ev-gcal rel="noopener" target="_blank">${esc(t('googleCalendar'))}</a>
    <a class="btn btn-ghost" data-ev-dir rel="noopener" target="_blank">${esc(t('getDirections'))}</a>
    <a class="btn btn-gold" data-ev-live rel="noopener" target="_blank" hidden>${esc(t('watchLive'))}</a>
  </div>
</div>`;
  document.body.appendChild(dialog);
  api = setupDialog(dialog);
  dialog.querySelector('[data-ev-ics]')!.addEventListener('click', () => {
    if (!current) return;
    downloadIcs(current, ctx().parishName || current.title);
  });
}

function fromEl(el: HTMLElement): EventDetail {
  const c = ctx();
  const place =
    el.dataset.place ||
    `${c.address.street}, ${c.address.city}, ${c.address.region} ${c.address.postalCode}`;
  return {
    title: el.dataset.title || '',
    day: Number(el.dataset.day),
    start: Number(el.dataset.start),
    duration: Number(el.dataset.duration) || 60,
    place,
    note: el.dataset.note || t('eventNote'),
    streamed: el.dataset.streamed === '1',
    liveUrl: c.liveUrl,
  };
}

function paint(e: EventDetail) {
  const c = ctx();
  dialog!.querySelector('[data-ev-title]')!.textContent = e.title;
  dialog!.querySelector('[data-ev-when]')!.textContent = formatDay(e.day, c.locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  dialog!.querySelector('[data-ev-date]')!.textContent = formatDay(e.day, c.locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  dialog!.querySelector('[data-ev-time]')!.textContent = formatTime(e.start, c.locale, c.hourCycle);
  dialog!.querySelector('[data-ev-place]')!.textContent = e.place;
  dialog!.querySelector('[data-ev-note]')!.textContent = e.note || t('eventNote');
  const gcal = dialog!.querySelector<HTMLAnchorElement>('[data-ev-gcal]')!;
  gcal.href = googleCalUrl(e);
  const dir = dialog!.querySelector<HTMLAnchorElement>('[data-ev-dir]')!;
  dir.href = directionsUrl(c.directionsQuery || e.place);
  const live = dialog!.querySelector<HTMLAnchorElement>('[data-ev-live]')!;
  const showLive = !!e.streamed && !!e.liveUrl;
  live.hidden = !showLive;
  if (showLive) live.href = e.liveUrl!;
}

export function openEventDetail(el: HTMLElement) {
  ensure();
  current = fromEl(el);
  paint(current);
  api!.open(el);
}

document.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-event-detail]');
  if (!el) return;
  ev.preventDefault();
  openEventDetail(el);
});

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const el = (ev.target as HTMLElement).closest?.<HTMLElement>('[data-event-detail]');
  if (!el || el.tagName === 'BUTTON' || el.tagName === 'A') return;
  ev.preventDefault();
  openEventDetail(el);
});
