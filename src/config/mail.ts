import { Resend } from "resend";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

// ─── Sender Address ───────────────────────────────────────────────────────────

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error(
      "[Mail] EMAIL_FROM is not set in .env. Example: EMAIL_FROM=CHATZO <onboarding@resend.dev>"
    );
  }
  return from;
}

// ─── Resend Client ────────────────────────────────────────────────────────────

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "[Mail] RESEND_API_KEY is not set in .env. Get your key at https://resend.com"
    );
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ─── Dev Log Box ─────────────────────────────────────────────────────────────

function printMailLog(params: {
  to: string;
  subject: string;
  provider: string;
  messageId?: string;
  status: "SUCCESS" | "FAILED";
  otp?: string;
  error?: string;
}): void {
  const line = "━".repeat(56);
  console.log(`\n${line}`);
  console.log(`📧  CHATZO MAIL — ${params.status}`);
  console.log(line);
  console.log(`  Recipient  : ${params.to}`);
  console.log(`  Subject    : ${params.subject}`);
  console.log(`  Provider   : ${params.provider}`);
  if (params.messageId) console.log(`  Message ID : ${params.messageId}`);
  if (params.otp)       console.log(`  OTP        : \x1b[33m\x1b[1m${params.otp}\x1b[0m  ← use this to verify`);
  if (params.error)     console.log(`  Error      : \x1b[31m${params.error}\x1b[0m`);
  if (params.status === "SUCCESS") {
    console.log(`  Delivery   : \x1b[32m✔ Accepted by provider\x1b[0m`);
  }
  console.log(`${line}\n`);
}

// ─── OTP Extractor (for dev log) ─────────────────────────────────────────────

function extractOtp(html: string): string | undefined {
  const match = html.match(/<div class="otp-code">(\d{6})<\/div>/);
  return match?.[1];
}

// ─── Main Send Function ───────────────────────────────────────────────────────

export async function sendMail(options: MailOptions): Promise<void> {
  console.log(
    `[Mail] sendMail() called → to="${options.to}" subject="${options.subject}"`
  );

  const from = getFromAddress(); // throws if EMAIL_FROM missing
  const client = getResendClient(); // throws if RESEND_API_KEY missing

  console.log(`[Mail] Using Resend provider. FROM="${from}"`);

  // ── Call Resend ───────────────────────────────────────────────────────────
  const result = await client.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  console.log("[Mail] Resend raw response:", JSON.stringify(result));

  // ── Handle Resend Error ───────────────────────────────────────────────────
  if (result.error) {
    printMailLog({
      to: options.to,
      subject: options.subject,
      provider: "Resend",
      status: "FAILED",
      error: `${result.error.name}: ${result.error.message}`,
    });

    if (process.env.NODE_ENV === "development") {
      const otp = extractOtp(options.html);
      console.log(`\n\x1b[33m\x1b[1m[Dev Fallback] Resend failed on localhost. Copy this OTP to test: ${otp}\x1b[0m\n`);
      return;
    }

    throw new Error(
      `[Mail] Resend rejected the email: ${result.error.name} — ${result.error.message}`
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  const otp = extractOtp(options.html);
  printMailLog({
    to: options.to,
    subject: options.subject,
    provider: "Resend",
    messageId: result.data?.id,
    status: "SUCCESS",
    otp,
  });
}
