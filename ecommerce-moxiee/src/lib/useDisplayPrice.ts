import { useCurrencyStore } from "@/store/currencyStore";
import { formatMoney } from "@/lib/currency";

/**
 * Returns a function that formats a USD amount into the shopper's
 * currently-selected display currency. Use this on customer-facing pages
 * (product cards, product detail, cart, checkout) instead of the plain
 * formatCurrency() helper, which always shows USD — that's intentional
 * for admin-side pages, which stay in the store's base currency.
 *
 *   const money = useDisplayPrice();
 *   <span>{money(product.price)}</span>
 */
export function useDisplayPrice() {
  const currency = useCurrencyStore((s) => s.currency);
  return (amountUSD: number) => formatMoney(amountUSD, currency);
}
