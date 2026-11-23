import { defaultLanguage, languages, ui, type Language, type Localized } from './content';

/** Resolve a localized field: requested language, then the default language, then the first value present. */
export function tr(value: Localized | undefined | null, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value[defaultLanguage] ?? Object.values(value)[0] ?? '';
}

export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`).toString());
}

export function t(key: string, lang: string, vars?: Record<string, string | number>): string {
  const entry = ui[key];
  if (entry == null) return key;
  return fill(tr(entry, lang), vars);
}

/** All UI strings resolved for one language, for client scripts. */
export function uiFor(lang: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(ui)) out[key] = tr(ui[key], lang);
  return out;
}

export function getLanguage(code: string): Language {
  return languages.find((l) => l.code === code) ?? languages[0];
}

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function asset(path?: string): string {
  if (!path) return '';
  return withBase(path);
}
