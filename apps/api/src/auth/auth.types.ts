// Email OTP authentication types
// Provider-agnostic — supports any SMTP-compatible or HTTP-based email API.

export interface OtpSendResult {
  ok: boolean;
  providerMessageId?: string;
  /** In dev/demo mode, the OTP itself (NEVER in production). */
  devOtp?: string;
  /** Time-to-live in seconds. */
  ttl: number;
  error?: string;
}

export interface OtpVerifyResult {
  ok: boolean;
  /** JWT-shaped session token (signed with JWT_SECRET). */
  session?: {
    token: string;
    email: string;
    userId: string;
    expiresAt: string;
    /** ISO timestamp of when the session was issued. */
    issuedAt: string;
  };
  /** The persisted user record, if any. Undefined when this is a brand-new email. */
  user?: unknown;
  error?: string;
}

export interface AuthProviderConfig {
  provider: "smtp" | "sendgrid" | "mailgun" | "resend" | "postmark" | "demo";
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  sender: string;
  senderName?: string;
}

export interface AuthStatus {
  /** True if a real email provider is configured. */
  configured: boolean;
  provider: string;
  /** In dev/demo mode, OTPs are returned in the response and emails are not sent. */
  mode: "production" | "demo" | "fallback";
  otpLength: number;
  ttlSeconds: number;
}