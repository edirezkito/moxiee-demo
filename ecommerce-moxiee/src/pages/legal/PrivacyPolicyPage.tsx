import { LegalLayout } from "./LegalLayout";
import { Seo } from "@/components/Seo";

// EDITABLE TEMPLATE — replace the bracketed placeholders with your store's
// real details, and have this reviewed by a lawyer for your jurisdiction
// (privacy law requirements vary a lot by country/state, e.g. GDPR in the
// EU, CCPA in California, UU PDP in Indonesia).

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="[Month DD, YYYY]">
      <Seo title="Privacy Policy" description="Read Moxiee's Privacy Policy to learn how we collect, use, and protect your information." />
      <p>
        Moxiee ("we", "us", "our") operates this website (the "Site"). This Privacy Policy
        explains what personal information we collect, how we use it, and the choices you have.
        By using the Site, you agree to the collection and use of information as described here.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly to us, including:</p>
      <ul>
        <li>Account information: name, email address, and password when you create an account.</li>
        <li>Order information: shipping address, phone number, and items purchased.</li>
        <li>Payment information: payments are processed by Stripe; we do not store your full
          card number on our servers — see Section 4.</li>
        <li>Communications: messages you send us via email or contact forms.</li>
      </ul>
      <p>We also automatically collect some information when you use the Site, such as your
        browser type, device information, and pages viewed, to help us improve the Site.</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To process and fulfill your orders, including sending order confirmations and
          shipping updates.</li>
        <li>To create and manage your account.</li>
        <li>To respond to your questions and provide customer support.</li>
        <li>To improve and personalize your experience on the Site.</li>
        <li>To send you marketing communications, where you have opted in (you can unsubscribe
          at any time).</li>
        <li>To detect, prevent, and address fraud or security issues.</li>
      </ul>

      <h2>3. How We Share Your Information</h2>
      <p>We do not sell your personal information. We share information only with:</p>
      <ul>
        <li>Service providers who help us operate the Site, such as our database/hosting
          provider (Supabase) and payment processor (Stripe).</li>
        <li>Shipping carriers, to deliver your orders.</li>
        <li>Law enforcement or regulators, where required by law.</li>
      </ul>

      <h2>4. Payment Information</h2>
      <p>All payments are processed securely by Stripe. We never receive or store your full
        card number, expiry date, or CVC — these are sent directly to Stripe over an encrypted
        connection. Please see{" "}
        <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="underline">
          Stripe's Privacy Policy
        </a>{" "}
        for details on how they handle your payment data.</p>

      <h2>5. Data Retention</h2>
      <p>We retain your account and order information for as long as your account is active or
        as needed to comply with legal, tax, and accounting obligations.</p>

      <h2>6. Your Rights</h2>
      <p>Depending on where you live, you may have the right to access, correct, delete, or
        export your personal information, and to object to or restrict certain processing. To
        exercise these rights, contact us using the details in Section 9.</p>

      <h2>7. Cookies</h2>
      <p>We use essential cookies/local storage to keep you signed in and remember your cart.
        We do not currently use third-party advertising cookies.</p>

      <h2>8. Children's Privacy</h2>
      <p>The Site is not directed at children under 16, and we do not knowingly collect
        personal information from children.</p>

      <h2>9. Contact Us</h2>
      <p>If you have questions about this Privacy Policy, contact us at{" "}
        <a href="mailto:support@moxiee.store" className="underline">support@moxiee.store</a>.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will post the updated version
        on this page with a new "Last updated" date.</p>
    </LegalLayout>
  );
}
