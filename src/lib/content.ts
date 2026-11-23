import siteJson from '../../content/site.json';
import pagesJson from '../../content/pages.json';
import uiJson from '../../content/ui.json';
import servicesJson from '../../content/services.json';
import feastsJson from '../../content/feasts.json';
import clergyJson from '../../content/clergy.json';
import historyJson from '../../content/history.json';
import galleryJson from '../../content/gallery.json';
import newsJson from '../../content/news.json';
import sermonsJson from '../../content/sermons.json';
import storeJson from '../../content/store.json';
import parishServicesJson from '../../content/parish-services.json';
import zapiskiJson from '../../content/zapiski.json';
import involvedJson from '../../content/get-involved.json';
import sourcesJson from '../../content/image-sources.json';

/** A field that is either one string for every language or a map of language code to string. */
export type Localized = string | Record<string, string>;

export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  hourCycle?: 'h12' | 'h23';
}

/** Site-level calendar: 'new' = Revised Julian, 'old' = Julian (Old Style). */
export type CalendarStyle = 'new' | 'old';
export type Paschalion = 'orthodox' | 'gregorian';
export type LogoStyle = 'seal' | 'kiot' | 'square' | 'wordmark';
export type FeatureKey = 'livestream' | 'store' | 'requestService' | 'zapiski' | 'getInvolved' | 'donations' | 'newsletter';

export interface Section {
  id: string;
  type: string;
  enabled?: boolean;
  requires?: FeatureKey;
  [key: string]: any;
}

export interface PageNode {
  id: string;
  slug: string;
  title: Localized;
  navLabel?: Localized;
  navOverviewLabel?: Localized;
  navOverview?: boolean;
  navButton?: boolean;
  nav?: boolean;
  requires?: FeatureKey;
  summary?: Localized;
  headerImage?: string;
  cardImage?: string;
  seo?: { description?: Localized };
  sections: Section[];
  children?: PageNode[];
}

export interface ServiceItem {
  id: string;
  day?: number;
  date?: string;
  offsetDays?: number;
  time: string;
  duration: number;
  type: string;
  streamed?: boolean;
  skipOnDays?: number[];
  title: Localized;
}

export interface Feast {
  id: string;
  month?: number;
  day?: number;
  offset?: number;
  rank: 'great' | 'major' | 'saint';
  name: Localized;
  image?: string;
  services?: ServiceItem[];
  suppressWeekly?: number[];
}

export const site = siteJson as any;
export const pagesData = pagesJson as { pages: PageNode[] };
export const ui = (uiJson as any).strings as Record<string, Localized>;
export const services = servicesJson as unknown as {
  weekly: ServiceItem[];
  feastServices: Record<string, ServiceItem[]>;
  special: ServiceItem[];
};
export const feasts = feastsJson as unknown as { fixed: Feast[]; movable: Feast[] };
export const clergy = clergyJson as any;
export const history = historyJson as any;
export const gallery = galleryJson as any;
export const news = newsJson as any;
export const sermons = sermonsJson as any;
export const store = storeJson as any;
export const parishServices = parishServicesJson as any;
export const zapiski = zapiskiJson as any;
export const involved = involvedJson as any;
export const imageSources = sourcesJson as any;

export const languages: Language[] = site.languages;
export const defaultLanguage: string = site.defaultLanguage;

export function featureOn(key?: FeatureKey): boolean {
  if (!key) return true;
  if (key === 'newsletter') return !!site.orthodoxConnect?.newsletter?.enabled;
  return site.features?.[key]?.enabled !== false && !!site.features?.[key];
}

export function galleryImage(id?: string) {
  if (!id) return undefined;
  return gallery.images.find((i: any) => i.id === id);
}
