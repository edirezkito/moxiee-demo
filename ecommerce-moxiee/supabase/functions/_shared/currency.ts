// supabase/functions/_shared/currency.ts
//
// Server-side mirror of src/lib/currency.ts — MUST be kept in sync so a
// real Stripe charge always matches what the customer saw on-site. If you
// update rates on one side, update the other too.
//
// ⚠️ These are static example rates, not live market rates. Replace with
// a live FX API call (cached a few hours) before going live for real.

export interface CurrencyConfig {
  code: string;
  /** Units of this currency per 1 USD. */
  rate: number;
  /** Stripe requires zero-decimal currencies (e.g. JPY, IDR) to be passed
   *  as whole units, not "cents". None of the defaults below need this,
   *  but if you add one (e.g. JPY, KRW), set this to true for it. */
  zeroDecimal?: boolean;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", rate: 1 },
  EUR: { code: "EUR", rate: 0.92 },
  GBP: { code: "GBP", rate: 0.78 },
  CAD: { code: "CAD", rate: 1.36 },
  AUD: { code: "AUD", rate: 1.52 },
  SGD: { code: "SGD", rate: 1.34 },
  IDR: { code: "IDR", rate: 16200, zeroDecimal: true },
};

export const DEFAULT_CURRENCY = "USD";

export function getCurrency(code: string | undefined): CurrencyConfig {
  return CURRENCIES[code ?? DEFAULT_CURRENCY] ?? CURRENCIES[DEFAULT_CURRENCY];
}

/** Converts a USD amount into the smallest unit Stripe expects for the
 *  given currency (cents for USD/EUR/etc, whole units for zero-decimal
 *  currencies like IDR). */
export function usdToStripeAmount(amountUSD: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode);
  const converted = amountUSD * currency.rate;
  return currency.zeroDecimal ? Math.round(converted) : Math.round(converted * 100);
}
