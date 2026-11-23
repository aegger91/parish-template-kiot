import { featureOn, pagesData, type PageNode } from './content';
import { tr, withBase } from './i18n';

export interface FlatPage {
  page: PageNode;
  path: string;
  parents: PageNode[];
}

function isActive(p: PageNode) {
  return featureOn(p.requires);
}

function walk(nodes: PageNode[], parents: PageNode[], out: FlatPage[]) {
  for (const page of nodes) {
    if (!isActive(page)) continue;
    const segs = [...parents.map((p) => p.slug), page.slug].filter(Boolean);
    out.push({ page, path: segs.join('/'), parents });
    if (page.children?.length) walk(page.children, [...parents, page], out);
  }
}

export const flatPages: FlatPage[] = (() => {
  const out: FlatPage[] = [];
  walk(pagesData.pages, [], out);
  return out;
})();

const byId = new Map(flatPages.map((f) => [f.page.id, f]));

export function findPage(id: string): FlatPage | undefined {
  return byId.get(id);
}

export function pageExists(id?: string) {
  return !!id && byId.has(id);
}

export function pageHref(lang: string, id: string, extra = ''): string {
  const f = byId.get(id);
  const path = f?.path ?? '';
  const joined = [lang, path, extra].filter(Boolean).join('/');
  return withBase(`/${joined}/`);
}

export function pathHref(lang: string, path: string): string {
  return withBase(`/${[lang, path].filter(Boolean).join('/')}/`);
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  style: 'link' | 'button';
  children: NavItem[];
  overview?: { label: string; href: string };
}

function navChildren(nodes: PageNode[] | undefined, lang: string): NavItem[] {
  return (nodes ?? [])
    .filter((p) => isActive(p) && p.nav !== false)
    .map((p) => toNav(p, lang));
}

function toNav(p: PageNode, lang: string): NavItem {
  const children = navChildren(p.children, lang);
  const href = pageHref(lang, p.id);
  return {
    id: p.id,
    label: tr(p.navLabel ?? p.title, lang),
    href,
    style: p.navButton ? 'button' : 'link',
    children,
    overview:
      children.length && p.navOverview !== false
        ? { label: tr(p.navOverviewLabel ?? p.title, lang), href }
        : undefined,
  };
}

export function navTree(lang: string): NavItem[] {
  return navChildren(pagesData.pages, lang);
}

export function childrenOf(id: string): PageNode[] {
  const f = byId.get(id);
  return (f?.page.children ?? []).filter((p) => isActive(p) && p.nav !== false);
}
