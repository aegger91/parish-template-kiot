/* RSVP and volunteer sign-up through OrthodoxConnect (placeholder). */
import { announce, ctx, esc, setupDialog, t } from '../lib/client';
import { connectSignup } from '../lib/handlers';
import { crossSvg } from '../lib/cross';

const KEY = 'kiot-connect-signups';

export function signedUp(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function remember(id: string) {
  const s = signedUp();
  s.add(id);
  localStorage.setItem(KEY, JSON.stringify([...s]));
}

let dialog: HTMLDialogElement | null = null;
let api: ReturnType<typeof setupDialog> | null = null;

function ensureDialog() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'dialog dialog--sm';
  dialog.setAttribute('aria-labelledby', 'oc-title');
  dialog.innerHTML = `<div class="dialog-inner">
  <div class="dialog-head">
    <span class="text-gold">${crossSvg('byzantine', 26)}</span>
    <p class="eyebrow">${esc(t('gi.onConnect'))}</p>
    <h2 class="dialog-title" id="oc-title">${esc(t('gi.connectTitle'))}</h2>
  </div>
  <p class="oc-item" data-oc-item></p>
  <p class="form-note">${esc(t('gi.connectText'))}</p>
  <div class="btn-row">
    <button type="button" class="btn btn-gold" data-oc-confirm>${esc(t('gi.confirm'))}</button>
    <button type="button" class="btn btn-ghost" data-dialog-close>${esc(t('gi.cancel'))}</button>
  </div>
</div>`;
  document.body.appendChild(dialog);
  api = setupDialog(dialog);
}

/** Wire every [data-signup] button inside root. */
export function initSignups(root: ParentNode, onChange?: () => void) {
  const mine = signedUp();
  root.querySelectorAll<HTMLButtonElement>('[data-signup]').forEach((btn) => {
    const id = btn.dataset.signup!;
    if (mine.has(id)) markDone(btn);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      ensureDialog();
      dialog!.querySelector('[data-oc-item]')!.textContent = btn.dataset.title ?? '';
      const confirm = dialog!.querySelector<HTMLButtonElement>('[data-oc-confirm]')!;
      const fresh = confirm.cloneNode(true) as HTMLButtonElement;
      confirm.replaceWith(fresh);
      fresh.addEventListener('click', async () => {
        fresh.disabled = true;
        await connectSignup(btn.dataset.kind === 'need' ? 'need' : 'event', id, ctx().parishId);
        remember(id);
        api!.close();
        markDone(btn);
        onChange?.();
        announce(t('gi.signedUp'));
      });
      api!.open(btn);
      fresh.focus();
    });
  });
}

/** Refresh the capacity text, bar and full state of a [data-capacity] card. */
export function paintCapacity(card: HTMLElement) {
  const cap = Number(card.dataset.capacity);
  const n = Math.min(Number(card.dataset.signups), cap);
  const left = cap - n;
  const text = card.dataset.kind === 'event' ? `${t('gi.going', { count: n })} · ${left > 0 ? t('gi.spotsLeft', { count: left }) : t('gi.full')}` : `${t('gi.spots', { signups: n, capacity: cap })}`;
  const spots = card.querySelector('[data-spots]');
  if (spots) spots.textContent = text;
  const bar = card.querySelector<HTMLElement>('[data-bar]');
  if (bar) bar.style.inlineSize = `${Math.round((n / cap) * 100)}%`;
  card.classList.toggle('is-full', left <= 0);
  const btn = card.querySelector<HTMLButtonElement>('[data-signup]');
  if (btn && left <= 0 && !btn.classList.contains('is-done')) {
    btn.disabled = true;
    btn.textContent = t('gi.full');
  }
}

function markDone(btn: HTMLButtonElement) {
  btn.disabled = true;
  btn.classList.add('is-done');
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> ${esc(t('gi.signedUp'))}`;
  const card = btn.closest<HTMLElement>('[data-capacity]');
  if (card && !card.dataset.counted) {
    card.dataset.counted = '1';
    const signups = Number(card.dataset.signups) + 1;
    card.dataset.signups = String(signups);
    card.dispatchEvent(new CustomEvent('kiot:signups', { bubbles: true }));
  }
}
