/*
  Placeholder integration points. Every form and payment in the template goes through here,
  so the builder can swap in real providers without touching components.
*/

export type PaymentProvider = 'none' | 'stripe' | 'authorize-net';

export interface PaymentLine {
  kind: 'product' | 'commemoration' | 'donation';
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  meta?: Record<string, unknown>;
}

export interface PaymentRequest {
  purpose: 'donation' | 'order' | 'commemoration';
  currency: string;
  recurring?: 'monthly';
  lines: PaymentLine[];
  total: number;
  customer?: { name?: string; email?: string; phone?: string };
  fulfillment?: { method: 'ship' | 'pickup'; address?: Record<string, string> };
}

export interface HandlerResult {
  ok: boolean;
  reference: string;
  message?: string;
}

function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One entry point for donations, store orders and commemoration offerings. */
export async function submitPayment(req: PaymentRequest, provider: PaymentProvider): Promise<HandlerResult> {
  switch (provider) {
    case 'stripe':
      // TODO(builder): create a Stripe Checkout Session server-side (mode "payment", or "subscription"
      // when req.recurring is set) and redirect to session.url.
      break;
    case 'authorize-net':
      // TODO(builder): request an Accept Hosted token from Authorize.net server-side and post the
      // hosted payment form; use ARB for recurring gifts.
      break;
    default:
      break;
  }
  console.info('[kiot] payment placeholder', provider, req);
  await wait(500);
  return { ok: true, reference: reference(req.purpose === 'order' ? 'ORD' : req.purpose === 'donation' ? 'GIFT' : 'NAMES') };
}

/** Contact form, service requests and other messages to the parish office. */
export async function submitOfficeForm(kind: string, data: Record<string, unknown>): Promise<HandlerResult> {
  // TODO(builder): POST to the OrthodoxConnect parish inbox or an email relay.
  console.info('[kiot] office form placeholder', kind, data);
  await wait(400);
  return { ok: true, reference: reference('MSG') };
}

/** Newsletter sign-up through OrthodoxConnect. */
export async function subscribeNewsletter(email: string, listId: string, parishId: string): Promise<HandlerResult> {
  // TODO(builder): POST to the OrthodoxConnect newsletter API with parishId and listId.
  console.info('[kiot] newsletter placeholder', { email, listId, parishId });
  await wait(400);
  return { ok: true, reference: reference('NL') };
}

/** RSVP or volunteer sign-up. Real sign-ups require an OrthodoxConnect account. */
export async function connectSignup(kind: 'event' | 'need', itemId: string, parishId: string): Promise<HandlerResult> {
  // TODO(builder): open OrthodoxConnect sign-in (OAuth) then POST the sign-up for itemId.
  console.info('[kiot] OrthodoxConnect sign-up placeholder', { kind, itemId, parishId });
  await wait(400);
  return { ok: true, reference: reference('OC') };
}

/** Deep link that hands off to the OrthodoxConnect app. */
export function connectDeepLink(base: string, action: 'events/new' | 'needs/new', parishId: string): string {
  const url = new URL(`${base.replace(/\/$/, '')}/${action}`);
  url.searchParams.set('parish', parishId);
  return url.toString();
}
