'use client';
/**
 * Paddle's overlay checkout, loaded only when someone clicks Upgrade. The client token and price ids are public by
 * design (NEXT_PUBLIC_*); /api/billing/prepare decides on the server whether this user may buy.
 */
import type { Paddle } from '@paddle/paddle-js';
import { accountCall } from '@/lib/client/account';

export const PADDLE_PUBLIC = {
  token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '',
  environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? ('sandbox' as const) : ('production' as const),
};

export const billingLive = () => !!PADDLE_PUBLIC.token;

let paddle: Promise<Paddle | undefined> | null = null;

function loadPaddle() {
  paddle ??= import('@paddle/paddle-js').then(({ initializePaddle }) => initializePaddle({ token: PADDLE_PUBLIC.token, environment: PADDLE_PUBLIC.environment }));
  return paddle;
}

export type PlanChoice = 'monthly' | 'yearly' | 'lifetime';

export async function openCheckout(plan: PlanChoice): Promise<void> {
  const prep = await accountCall<{ priceId: string; email: string; customData: Record<string, string> }>('/api/billing/prepare', 'POST', { plan });
  const p = await loadPaddle();
  if (!p) throw new Error('The checkout could not load. Check your connection or ad blocker and try again.');
  p.Checkout.open({
    items: [{ priceId: prep.priceId, quantity: 1 }],
    customer: { email: prep.email },
    customData: prep.customData,
    settings: { displayMode: 'overlay', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', successUrl: `${window.location.origin}/account?purchased=1` },
  });
}
