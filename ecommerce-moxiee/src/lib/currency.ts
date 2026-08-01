// All prices in the database/cart/orders are stored in USD — this is the
// store's single source of truth ("base currency"). Everything in this
// file is purely a DISPLAY/CHECKOUT convenience layer that converts USD
// amounts into the shopper's chosen currency using a fixed rate table.
//
// ⚠️ IMPORTANT — READ BEFORE GOING LIVE:
// The rates below are static examples, not live market rates. For a real
// store, replace RATES with either:
//   (a) a periodic fetch from a live FX API (e.g. exchangerate-api.com,
//       Open Exchange Rates, or your bank's API) cached for a few hours, or
//   (b) Stripe's built-in "Adaptive Pricing" (Dashboard > Settings >
//       Payments), which auto-shows local currency on the HOSTED Stripe
//       Checkout page with zero code changes — a good complement to this
//       file even if you also want on-site browsing in other currencies.
// Keep this file and supabase/functions/_shared/currency.ts in sync — the
// checkout Edge Function uses its own copy so a real charge always
// matches what the customer saw on-site.

export interface CurrencyConfig {
  code: string;
  symbol: string;
  label: string;
  /** Units of this currency per 1 USD. Example: eur: 0.92 means $1 = €0.92 */
  rate: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", label: "US Dollar", rate: 1, locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", label: "Euro", rate: 0.92, locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", label: "British Pound", rate: 0.78, locale: "en-GB" },
  CAD: { code: "CAD", symbol: "CA$", label: "Canadian Dollar", rate: 1.36, locale: "en-CA" },
  AUD: { code: "AUD", symbol: "A$", label: "Australian Dollar", rate: 1.52, locale: "en-AU" },
  SGD: { code: "SGD", symbol: "S$", label: "Singapore Dollar", rate: 1.34, locale: "en-SG" },
  IDR: { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah", rate: 16200, locale: "id-ID" },
};

export const DEFAULT_CURRENCY = "USD";

export function convertFromUSD(amountUSD: number, currencyCode: string): number {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return amountUSD * currency.rate;
}

export function formatMoney(amountUSD: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const converted = convertFromUSD(amountUSD, currencyCode);
  // Zero-decimal-style currencies (like IDR) look wrong with cents — round
  // to whole units for those, keep 2 decimals for the rest.
  const maximumFractionDigits = currency.rate >= 100 ? 0 : 2;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits,
  }).format(converted);
}
