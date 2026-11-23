/* Markup for commemoration slips, shared by the server render and the browser. */
import { crossSvg } from './cross';

export interface ZapData {
  maxNames: number;
  noteTypes: { id: string; label: string }[];
  commemorations: { id: string; appliesTo: string[]; suggested: number; label: string; description: string }[];
  candles: { id: string; label: string; price: number }[];
  donationPresets: number[];
  prefixes: { id: string; label: string; short: string }[];
}

export interface ZapFmt {
  t: (key: string, vars?: Record<string, string | number>) => string;
  money: (n: number) => string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function nameRow(slip: number, n: number, d: ZapData, f: ZapFmt): string {
  const id = `z${slip}-n${n}`;
  return `<li class="name-row">
  <span class="name-num" aria-hidden="true">${n}</span>
  <label class="visually-hidden" for="${id}-p">${esc(f.t('zap.prefixFor', { n }))}</label>
  <select id="${id}-p" class="name-prefix" data-prefix>
    <option value="">${esc(f.t('zap.prefix'))}</option>
    ${d.prefixes.map((p) => `<option value="${esc(p.id)}">${esc(p.short)} (${esc(p.label)})</option>`).join('')}
  </select>
  <label class="visually-hidden" for="${id}">${esc(f.t('zap.nameN', { n }))}</label>
  <input id="${id}" class="name-input" data-name autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${esc(f.t('zap.nameN', { n }))}" />
  <button type="button" class="icon-btn name-remove" data-remove-name aria-label="${esc(f.t('zap.removeName', { n }))}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
</li>`;
}

export function slip(idx: number, type: string, d: ZapData, f: ZapFmt): string {
  const name = (k: string) => `z${idx}-${k}`;
  const typeLabel = d.noteTypes.find((x) => x.id === type)?.label ?? '';
  const comms = d.commemorations
    .map(
      (c, i) => `<label class="opt-row" data-applies="${esc(c.appliesTo.join(' '))}" ${c.appliesTo.includes(type) ? '' : 'hidden'}>
    <input type="radio" name="${name('comm')}" value="${esc(c.id)}" data-price="${c.suggested}" ${i === 0 ? 'checked' : ''} ${c.appliesTo.includes(type) ? '' : 'disabled'} />
    <span class="opt-main"><span class="opt-label">${esc(c.label)}</span>${c.description ? `<span class="opt-desc">${esc(c.description)}</span>` : ''}</span>
    <span class="opt-price">${esc(f.t('zap.suggested', { amount: f.money(c.suggested) }))}</span>
  </label>`,
    )
    .join('');
  const candles = [`<label class="pill"><input type="radio" name="${name('candle')}" value="" data-price="0" checked /><span>${esc(f.t('zap.noCandle'))}</span></label>`]
    .concat(d.candles.map((c) => `<label class="pill"><input type="radio" name="${name('candle')}" value="${esc(c.id)}" data-price="${c.price}" /><span>${esc(c.label)} · ${esc(f.money(c.price))}</span></label>`))
    .join('');
  const presets = [0, ...d.donationPresets]
    .map((a) => `<label class="pill"><input type="radio" name="${name('gift')}" value="${a}" ${a === 0 ? 'checked' : ''} /><span>${a === 0 ? esc(f.t('zap.noExtra')) : esc(f.money(a))}</span></label>`)
    .join('');
  return `<article class="slip slip--${esc(type)}" data-slip="${idx}" data-type="${esc(type)}">
  <header class="slip-head">
    <span class="slip-cross">${crossSvg('byzantine', 34)}</span>
    <p class="slip-type" data-slip-type>${esc(typeLabel)}</p>
    <p class="slip-num">${esc(f.t('zap.slip', { n: idx }))}</p>
    <button type="button" class="icon-btn slip-remove" data-remove-slip aria-label="${esc(f.t('zap.removeSlip'))}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
  </header>
  <fieldset class="slip-section">
    <legend>${esc(f.t('zap.noteType'))}</legend>
    <div class="seg seg--full slip-types">
      ${d.noteTypes.map((nt) => `<label class="seg-radio seg-radio--${esc(nt.id)}"><input type="radio" name="${name('type')}" value="${esc(nt.id)}" ${nt.id === type ? 'checked' : ''} data-type-input /><span>${esc(nt.label)}</span></label>`).join('')}
    </div>
  </fieldset>
  <fieldset class="slip-section">
    <legend>${esc(f.t('zap.names'))}</legend>
    <ol class="name-list" data-names>${nameRow(idx, 1, d, f)}</ol>
    <div class="name-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-add-name>+ ${esc(f.t('zap.addName'))}</button>
      <span class="name-count" data-name-count>1 / ${d.maxNames}</span>
    </div>
    <p class="slip-hint" data-max-hint hidden>${esc(f.t('zap.maxNames', { max: d.maxNames }))}</p>
  </fieldset>
  <fieldset class="slip-section">
    <legend>${esc(f.t('zap.commemoration'))}</legend>
    <div class="opt-list">${comms}</div>
  </fieldset>
  <fieldset class="slip-section">
    <legend>${esc(f.t('zap.candle'))}</legend>
    <div class="pill-list">${candles}</div>
  </fieldset>
  <fieldset class="slip-section">
    <legend>${esc(f.t('zap.extraDonation'))}</legend>
    <div class="pill-list">${presets}
      <label class="pill pill--input"><span class="visually-hidden">${esc(f.t('otherAmount'))}</span><input type="number" min="0" step="1" inputmode="decimal" placeholder="${esc(f.t('otherAmount'))}" data-gift-other /></label>
    </div>
  </fieldset>
  <footer class="slip-foot"><span>${esc(f.t('store.subtotal'))}</span><strong data-slip-total></strong></footer>
</article>`;
}
