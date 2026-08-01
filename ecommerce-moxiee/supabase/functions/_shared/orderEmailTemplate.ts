// Builds the HTML body for the "order confirmed" email. Kept as plain
// inline-styled HTML (not Tailwind) because most email clients strip
// <style> blocks and external stylesheets.

import { getCurrency } from "./currency.ts";

interface OrderItemLike {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderLike {
  id: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax?: number;
  total: number;
  currency?: string;
  fx_rate?: number;
  shipping_address: {
    full_name?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", SGD: "S$", IDR: "Rp ",
};

/** Formats a USD amount (as stored on the order) converted into the
 *  order's charge currency, for a receipt that matches what was billed. */
function makeMoneyFormatter(order: OrderLike) {
  const code = order.currency ?? "USD";
  const rate = order.fx_rate ?? getCurrency(code).rate ?? 1;
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const decimals = getCurrency(code).zeroDecimal ? 0 : 2;
  return (amountUSD: number) => `${symbol}${(amountUSD * rate).toFixed(decimals)}`;
}

export function buildOrderConfirmationEmail(order: OrderLike, items: OrderItemLike[]): string {
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  const orderUrl = siteUrl ? `${siteUrl}/account/orders/${order.id}` : "#";
  const addr = order.shipping_address;
  const money = makeMoneyFormatter(order);

  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.product_name} × ${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(i.unit_price * i.quantity)}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
    <div style="background:#0f2743;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">Moxiee</span>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
      <h2 style="margin:0 0 8px;">Thanks for your order!</h2>
      <p style="color:#555;margin:0 0 20px;">
        Order <strong>#${order.id.slice(0, 8)}</strong> has been confirmed. We'll let you know
        once it ships.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows}
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr><td style="padding:4px 0;color:#555;">Subtotal</td><td style="padding:4px 0;text-align:right;">${money(order.subtotal)}</td></tr>
        ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#555;">Discount</td><td style="padding:4px 0;text-align:right;">-${money(order.discount)}</td></tr>` : ""}
        <tr><td style="padding:4px 0;color:#555;">Shipping</td><td style="padding:4px 0;text-align:right;">${order.shipping === 0 ? "Free" : money(order.shipping)}</td></tr>
        ${order.tax && order.tax > 0 ? `<tr><td style="padding:4px 0;color:#555;">Tax</td><td style="padding:4px 0;text-align:right;">${money(order.tax)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #eee;">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:1px solid #eee;">${money(order.total)}</td></tr>
      </table>

      ${
        addr
          ? `<h3 style="margin:20px 0 6px;font-size:14px;">Shipping to</h3>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.5;">
        ${addr.full_name ?? ""}<br/>
        ${addr.street ?? ""}<br/>
        ${addr.city ?? ""} ${addr.postal_code ?? ""}<br/>
        ${addr.country ?? ""}
      </p>`
          : ""
      }

      <div style="text-align:center;margin-top:28px;">
        <a href="${orderUrl}" style="background:#0f2743;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;">
          View your order
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
      © ${new Date().getFullYear()} Moxiee. Need help? Reply to this email.
    </p>
  </div>`;
}
