/* Browser helpers shared by client scripts. */

export interface KiotContext {
  lang: string;
  locale: string;
  hourCycle?: string;
  dir: string;
  timeZone: string;
  currency: string;
  calendar: { style: any; paschalion?: any; weekStartsOn: number };
  base: string;
  ui: Record<string, string>;
  paymentProvider: any;
  parishId: string;
  appLinkBase: string;
  links: Record<string, string>;
}

let cached: KiotContext | undefined;
export function ctx(): KiotContext {
  if (!cached) cached = JSON.parse(document.getElementById('kiot-ctx')!.textContent || '{}');
  return cached!;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const s = ctx().ui[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s;
}

export function tr(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[ctx().lang] ?? Object.values(v)[0] ?? '';
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function money(n: number): string {
  const c = ctx();
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

export function readJson<T = any>(id: string): T {
  const el = document.getElementById(id);
  return JSON.parse(el?.textContent || 'null');
}

export function announce(msg: string) {
  const live = document.getElementById('kiot-live');
  if (live) {
    live.textContent = '';
    setTimeout(() => (live.textContent = msg), 30);
  }
}

/** Format a US phone number as (000)-000-0000 while typing. */
export function maskPhone(input: HTMLInputElement) {
  const format = () => {
    const d = input.value.replace(/\D/g, '').slice(0, 10);
    let out = '';
    if (d.length > 0) out = '(' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += '-' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6);
    input.value = out;
  };
  input.addEventListener('input', format);
  format();
}

export function phoneValid(v: string) {
  return v === '' || /^\(\d{3}\)-\d{3}-\d{4}$/.test(v);
}

/** Native <dialog> with focus return and click-outside close. */
export function setupDialog(dialog: HTMLDialogElement) {
  let opener: HTMLElement | null = null;
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('scroll-lock');
    opener?.focus();
  });
  dialog.querySelectorAll<HTMLElement>('[data-dialog-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  return {
    open(from?: HTMLElement | null) {
      opener = from ?? (document.activeElement as HTMLElement);
      document.documentElement.classList.add('scroll-lock');
      dialog.showModal();
    },
    close: () => dialog.close(),
  };
}

export function validateForm(form: HTMLFormElement): boolean {
  let ok = true;
  form.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((el) => {
    const field = el.closest('.field');
    let valid = el.checkValidity();
    if (valid && el.dataset.phone !== undefined) valid = phoneValid(el.value);
    field?.classList.toggle('is-invalid', !valid);
    el.setAttribute('aria-invalid', String(!valid));
    if (!valid) ok = false;
  });
  if (!ok) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  return ok;
}
