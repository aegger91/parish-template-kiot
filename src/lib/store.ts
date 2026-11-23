import { store } from './content';

export function minPrice(p: any): number {
  return Math.min(...p.variants.map((v: any) => v.price));
}

export function totalStock(p: any): number {
  return p.variants.reduce((n: number, v: any) => n + (v.stock ?? 0), 0);
}

export function categoryOf(p: any) {
  return store.categories.find((c: any) => c.id === p.category);
}
