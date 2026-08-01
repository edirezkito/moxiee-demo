import { LegalLayout } from "./LegalLayout";
import { Seo } from "@/components/Seo";

// EDITABLE TEMPLATE — adjust the return window, conditions, and process to
// match your actual store policy and local consumer protection law.

export function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund & Return Policy" lastUpdated="[Month DD, YYYY]">
      <Seo title="Refund & Return Policy" description="Learn about Moxiee's return window, refund process, and exchange policy." />
      <p>
        We want you to be happy with your purchase. If something isn't right, here's how returns
        and refunds work at Moxiee.
      </p>

      <h2>1. Return Window</h2>
      <p>You may request a return within [30] days of the delivery date. Items returned after
        this window may not be eligible for a refund.</p>

      <h2>2. Eligibility</h2>
      <p>To be eligible for a return, items must be:</p>
      <ul>
        <li>Unused, unworn, and in the same condition you received them.</li>
        <li>In the original packaging, with tags attached where applicable.</li>
        <li>Accompanied by proof of purchase (order number or confirmation email).</li>
      </ul>
      <p>The following items are not eligible for return unless faulty: [personal care/beauty
        products, final sale/clearance items, gift cards].</p>

      <h2>3. How to Start a Return</h2>
      <ul>
        <li>Go to <a href="/account/orders" className="underline">My Orders</a> in your account
          and select the order.</li>
        <li>Or email us at{" "}
          <a href="mailto:support@moxiee.store" className="underline">support@moxiee.store</a>{" "}
          with your order number and reason for return.</li>
        <li>We'll confirm your return and provide instructions on where to send the item.</li>
      </ul>

      <h2>4. Refunds</h2>
      <p>Once we receive and inspect your returned item, we'll notify you of the approval status
        of your refund. If approved, your refund will be issued to your original payment method
        (via Stripe for card payments) within [5–10] business days. Shipping fees are
        non-refundable unless the return is due to our error (wrong or defective item).</p>

      <h2>5. Exchanges</h2>
      <p>If you need a different size or color, the fastest way is to return the original item
        and place a new order for the item you want.</p>

      <h2>6. Damaged or Incorrect Items</h2>
      <p>If you receive a damaged, defective, or incorrect item, contact us within [7] days of
        delivery with photos of the item, and we'll arrange a free replacement or full refund,
        including shipping costs.</p>

      <h2>7. Return Shipping Costs</h2>
      <p>Unless the item is damaged, defective, or incorrect, return shipping costs are the
        customer's responsibility.</p>

      <h2>8. Cash on Delivery Orders</h2>
      <p>For orders paid via Cash on Delivery, refunds for approved returns are issued via bank
        transfer or store credit, as agreed with our support team.</p>

      <h2>9. Contact Us</h2>
      <p>Questions about a return or refund? Email{" "}
        <a href="mailto:support@moxiee.store" className="underline">support@moxiee.store</a>.</p>
    </LegalLayout>
  );
}
