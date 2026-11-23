/* Shared cart for store products, commemoration notes and donations, kept in localStorage. */
import type { PaymentLine } from './handlers';

export interface CartLine extends PaymentLine {
  key: string;
  image?: string;
  detail?: string;
  maxQuantity?: number;
}

const KEY = 'kiot-cart-v1';

export function readCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent('kiot:cart', { detail: lines }));
}

export function addLine(line: CartLine) {
  const lines = readCart();
  const existing = line.kind === 'product' ? lines.find((l) => l.key === line.key) : undefined;
  if (existing) {
    existing.quantity = Math.min(existing.quantity + line.quantity, line.maxQuantity ?? 99);
  } else {
    lines.push(line);
  }
  write(lines);
}

export function setQuantity(key: string, quantity: number) {
  const lines = readCart()
    .map((l) => (l.key === key ? { ...l, quantity: Math.max(0, Math.min(quantity, l.maxQuantity ?? 99)) } : l))
    .filter((l) => l.quantity > 0);
  write(lines);
}

export function removeLine(key: string) {
  write(readCart().filter((l) => l.key !== key));
}

export function clearCart() {
  write([]);
}

export function cartCount(lines = readCart()) {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function subtotal(lines = readCart()) {
  return lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0);
}

export function needsShipping(lines = readCart()) {
  return lines.some((l) => l.kind === 'product');
}
