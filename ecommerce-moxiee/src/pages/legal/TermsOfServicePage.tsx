import { LegalLayout } from "./LegalLayout";
import { Seo } from "@/components/Seo";

// EDITABLE TEMPLATE — replace bracketed placeholders (governing law,
// contact details, business address) and have this reviewed by a lawyer
// before relying on it for a real store.

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="[Month DD, YYYY]">
      <Seo title="Terms of Service" description="Read the Terms of Service for shopping at Moxiee." />
      <p>
        These Terms of Service ("Terms") govern your use of the Moxiee website (the "Site") and
        any purchases you make through it. By using the Site, you agree to these Terms. If you
        do not agree, please do not use the Site.
      </p>

      <h2>1. Using the Site</h2>
      <ul>
        <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to
          make a purchase.</li>
        <li>You are responsible for keeping your account credentials secure and for all
          activity under your account.</li>
        <li>You agree not to misuse the Site, including attempting to interfere with its normal
          operation or accessing it using unauthorized methods.</li>
      </ul>

      <h2>2. Products and Pricing</h2>
      <ul>
        <li>We make reasonable efforts to display product details and pricing accurately, but
          errors may occasionally occur. We reserve the right to correct pricing errors and to
          cancel orders placed at an incorrect price.</li>
        <li>Product images are for illustration; actual color/packaging may vary slightly.</li>
        <li>All prices are listed in USD unless stated otherwise, and do not include applicable
          taxes or duties unless stated at checkout.</li>
      </ul>

      <h2>3. Orders and Payment</h2>
      <ul>
        <li>When you place an order, you are making an offer to purchase. We may accept or
          decline any order at our discretion (for example, in cases of suspected fraud or
          stock unavailability).</li>
        <li>Card and digital wallet payments are processed securely through Stripe. By placing
          an order with these methods, you authorize us to charge your chosen payment method for
          the total order amount.</li>
        <li>For Cash on Delivery orders, payment is collected at the time of delivery.</li>
      </ul>

      <h2>4. Shipping and Delivery</h2>
      <p>Estimated delivery times are provided at checkout and are not guaranteed. Risk of loss
        and title for items pass to you upon delivery to the shipping carrier, unless required
        otherwise by law in your jurisdiction.</p>

      <h2>5. Returns and Refunds</h2>
      <p>Please see our <a href="/refund-policy" className="underline">Refund/Return Policy</a>{" "}
        for details on returns, exchanges, and refunds.</p>

      <h2>6. Account Termination</h2>
      <p>We may suspend or terminate your account if we reasonably believe you have violated
        these Terms.</p>

      <h2>7. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Moxiee is not liable for any indirect,
        incidental, or consequential damages arising from your use of the Site or products
        purchased through it. Our total liability for any claim is limited to the amount you
        paid for the relevant order.</p>

      <h2>8. Governing Law</h2>
      <p>These Terms are governed by the laws of [Your Country/State], without regard to its
        conflict of law principles.</p>

      <h2>9. Changes to These Terms</h2>
      <p>We may update these Terms from time to time. Continued use of the Site after changes
        take effect means you accept the updated Terms.</p>

      <h2>10. Contact Us</h2>
      <p>Questions about these Terms? Contact us at{" "}
        <a href="mailto:support@moxiee.store" className="underline">support@moxiee.store</a>.</p>
    </LegalLayout>
  );
}
