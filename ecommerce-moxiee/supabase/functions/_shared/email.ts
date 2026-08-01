// Shared helper for sending transactional emails via Resend
// (https://resend.com). Used by stripe-webhook and send-order-email.

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set — skipping email send. See CLIENT_README.md.");
    return;
  }

  const from = Deno.env.get("EMAIL_FROM") ?? "Moxiee <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend email failed:", res.status, await res.text());
  }
}
