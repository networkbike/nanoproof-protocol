import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomInt } from "crypto";
import type {
  AuthProviderConfig,
  AuthStatus,
  OtpSendResult,
  OtpVerifyResult,
} from "./auth.types";

interface OtpRecord {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Provider-agnostic email OTP service.
 *
 * Supported providers (select via AUTH_PROVIDER env):
 *   - "demo"      — no email sent, OTP returned in response (DEFAULT if no creds)
 *   - "smtp"      — generic SMTP via nodemailer (if installed)
 *   - "sendgrid"  — SendGrid v3 API
 *   - "mailgun"   — Mailgun v3 API
 *   - "resend"    — Resend.com API
 *   - "postmark"  — Postmark API
 *
 * For HTTP providers we only require an API key. SMTP requires apiUrl + apiSecret.
 *
 * OTP records are stored in-process for simplicity (5-min TTL). For multi-instance
 * deployments, swap `store` with Redis.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private store = new Map<string, OtpRecord>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly OTP_LENGTH = 6;
  private readonly MAX_ATTEMPTS = 5;

  constructor(private config: ConfigService) {
    // Sweep expired entries every minute.
    setInterval(() => this.sweep(), 60_000).unref?.();
  }

  getStatus(): AuthStatus {
    const cfg = this.getProviderConfig();
    return {
      configured: cfg.provider !== "demo",
      provider: cfg.provider,
      mode: cfg.provider === "demo" ? "demo" : "production",
      otpLength: this.OTP_LENGTH,
      ttlSeconds: this.TTL_MS / 1000,
    } as AuthStatus;
  }

  async sendOtp(email: string): Promise<OtpSendResult> {
    const code = this.generateCode();
    const expiresAt = Date.now() + this.TTL_MS;

    // Invalidate any existing code for this email.
    this.store.delete(email.toLowerCase());
    this.store.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      code,
      expiresAt,
      attempts: 0,
    });

    const cfg = this.getProviderConfig();
    let providerMessageId: string | undefined;
    let devOtp: string | undefined;

    if (cfg.provider === "demo") {
      // Demo mode: don't actually send. Return the code so judges can sign in.
      devOtp = code;
      this.logger.warn(
        `[OTP-DEMO] would send OTP ${code} to ${email} — configure AUTH_PROVIDER to enable real email.`,
      );
    } else {
      try {
        providerMessageId = await this.dispatchEmail(email, code, cfg);
      } catch (e) {
        this.logger.error(
          `Email dispatch failed for ${email}: ${e instanceof Error ? e.message : e}`,
        );
        // Don't reveal dispatch failure to user. Code is still valid.
      }
    }

    return {
      ok: true,
      providerMessageId,
      devOtp,
      ttl: this.TTL_MS / 1000,
    };
  }

  async verifyOtp(email: string, otp: string): Promise<OtpVerifyResult> {
    const key = email.toLowerCase();
    const record = this.store.get(key);

    if (!record) {
      return { ok: false, error: "No pending code for this email. Request a new one." };
    }
    if (Date.now() > record.expiresAt) {
      this.store.delete(key);
      return { ok: false, error: "Code expired. Request a new one." };
    }
    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(key);
      return { ok: false, error: "Too many attempts. Request a new code." };
    }
    if (record.code !== otp) {
      record.attempts += 1;
      return { ok: false, error: "Incorrect code." };
    }

    // Success — burn the code and issue a session.
    this.store.delete(key);

    const session = this.issueSession(email);
    return { ok: true, session };
  }

  private generateCode(): string {
    // Avoid leading zeros becoming unreadable: pad to 6 chars.
    return randomInt(0, 1_000_000).toString().padStart(this.OTP_LENGTH, "0");
  }

  private getProviderConfig(): AuthProviderConfig {
    const provider = (this.config.get<string>("AUTH_PROVIDER") || "demo").toLowerCase();
    // Support both naming conventions: OTP_SENDER/EMAIL_FROM and OTP_API_KEY/RESEND_API_KEY
    const sender = this.config.get<string>("OTP_SENDER")
      || this.config.get<string>("EMAIL_FROM")
      || "no-reply@nanoproof.dev";
    const senderName = this.config.get<string>("OTP_SENDER_NAME")
      || this.config.get<string>("EMAIL_FROM_NAME")
      || "NanoProof Protocol";

    if (provider === "demo") {
      return { provider: "demo", sender, senderName };
    }

    // Per-provider canonical names, with sensible aliases for compatibility.
    // - resend:     RESEND_API_KEY     (alias: OTP_API_KEY)
    // - sendgrid:   SENDGRID_API_KEY   (alias: OTP_API_KEY)
    // - mailgun:    MAILGUN_API_KEY    (alias: OTP_API_KEY)
    // - postmark:   POSTMARK_API_TOKEN (alias: OTP_API_KEY)
    // - smtp:       SMTP_PASSWORD      (alias: OTP_API_SECRET)
    const aliasesByProvider: Record<string, string[]> = {
      resend:   ["RESEND_API_KEY", "OTP_API_KEY"],
      sendgrid: ["SENDGRID_API_KEY", "OTP_API_KEY"],
      mailgun:  ["MAILGUN_API_KEY", "OTP_API_KEY"],
      postmark: ["POSTMARK_API_TOKEN", "OTP_API_KEY"],
      smtp:     ["SMTP_PASSWORD", "OTP_API_SECRET"],
    };
    const keys = aliasesByProvider[provider] || ["OTP_API_KEY"];
    let apiKey: string | undefined;
    for (const k of keys) {
      const v = this.config.get<string>(k);
      if (v) { apiKey = v; break; }
    }
    const apiSecret = this.config.get<string>("OTP_API_SECRET");
    const apiUrl = this.config.get<string>("OTP_API_URL");

    if (!apiKey) {
      const expectedKey = keys[0] || "OTP_API_KEY";
      this.logger.warn(
        `AUTH_PROVIDER=${provider} but ${expectedKey} is missing — falling back to demo mode.`,
      );
      return { provider: "demo", sender, senderName };
    }

    return { provider: provider as any, apiKey, apiSecret, apiUrl, sender, senderName };
  }

  private async dispatchEmail(
    to: string,
    code: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    const subject = "Your NanoProof sign-in code";
    const html = this.renderOtpHtml(code);
    const text = `Your NanoProof sign-in code is: ${code}\n\nThis code expires in 5 minutes. If you didn't request this, ignore this email.`;

    switch (cfg.provider) {
      case "sendgrid":
        return this.dispatchSendGrid(to, subject, html, text, cfg);
      case "mailgun":
        return this.dispatchMailgun(to, subject, html, text, cfg);
      case "resend":
        return this.dispatchResend(to, subject, html, text, cfg);
      case "postmark":
        return this.dispatchPostmark(to, subject, html, text, cfg);
      case "smtp":
        return this.dispatchSmtp(to, subject, html, text, cfg);
      default:
        throw new Error(`Unsupported auth provider: ${cfg.provider}`);
    }
  }

  private async dispatchSendGrid(
    to: string,
    subject: string,
    html: string,
    text: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: cfg.sender, name: cfg.senderName },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });
    if (!r.ok) throw new Error(`SendGrid ${r.status}: ${await r.text()}`);
    return r.headers.get("x-message-id") || undefined;
  }

  private async dispatchMailgun(
    to: string,
    subject: string,
    html: string,
    text: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    const url = cfg.apiUrl || `https://api.mailgun.net/v3/${cfg.sender.split("@")[1]}/messages`;
    const auth = Buffer.from(`api:${cfg.apiKey}`).toString("base64");
    const form = new URLSearchParams();
    form.append("from", `${cfg.senderName} <${cfg.sender}>`);
    form.append("to", to);
    form.append("subject", subject);
    form.append("text", text);
    form.append("html", html);
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!r.ok) throw new Error(`Mailgun ${r.status}: ${await r.text()}`);
    const j = await r.json().catch(() => ({}));
    return j.id || j.message?.split(" ")?.pop()?.replace(/[<>]/g, "");
  }

  private async dispatchResend(
    to: string,
    subject: string,
    html: string,
    text: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.senderName} <${cfg.sender}>`,
        to,
        subject,
        html,
        text,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.id;
  }

  private async dispatchPostmark(
    to: string,
    subject: string,
    html: string,
    text: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    const r = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": cfg.apiKey!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: `${cfg.senderName} <${cfg.sender}>`,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
      }),
    });
    if (!r.ok) throw new Error(`Postmark ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.MessageID;
  }

  private async dispatchSmtp(
    to: string,
    subject: string,
    html: string,
    text: string,
    cfg: AuthProviderConfig,
  ): Promise<string | undefined> {
    // Generic SMTP via raw fetch is not portable; recommend using a provider.
    // We throw a clear error so users know to install nodemailer or use a provider.
    throw new Error(
      "AUTH_PROVIDER=smtp requires nodemailer. Use sendgrid, mailgun, resend, or postmark instead.",
    );
  }

  private renderOtpHtml(code: string): string {
    return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0;">
  <div style="max-width: 480px; margin: 40px auto; padding: 32px; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom: 24px;">
      <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 8px;"></div>
      <strong style="font-size: 18px; color: #0f172a;">NanoProof</strong>
    </div>
    <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 8px 0;">Your sign-in code</h1>
    <p style="color: #475569; margin: 0 0 24px 0;">Enter this code to access NanoProof. It expires in 5 minutes.</p>
    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; font-family: 'SF Mono', Monaco, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6366f1;">${code}</div>
    <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0 0;">If you didn't request this code, you can safely ignore this email.</p>
  </div>
</body></html>`;
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt < now) {
        this.store.delete(k);
        removed++;
      }
    }
    if (removed > 0) this.logger.debug(`OTP sweep removed ${removed} expired entries`);
  }

  /**
   * Issue a JWT-style session token. The "JWT" is signed with HMAC-SHA256 and
   * includes email + exp + iat claims. For production, switch to RS256 with a
   * proper JWT library (jose, jsonwebtoken).
   */
  private issueSession(email: string): OtpVerifyResult["session"] {
    const secret = this.config.get<string>("JWT_SECRET") || "dev-only-secret-do-not-use-in-prod";
    const expiresIn = this.config.get<string>("JWT_EXPIRES_IN") || "7d";
    const ttlMs = this.parseTtl(expiresIn);
    const now = Date.now();
    const exp = now + ttlMs;
    const userId = this.deriveUserId(email);

    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: userId,
      email,
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
    };
    const enc = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const signingInput = `${enc(header)}.${enc(payload)}`;
    const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
    const token = `${signingInput}.${sig}`;

    return {
      token,
      email,
      userId,
      expiresAt: new Date(exp).toISOString(),
      issuedAt: new Date(now).toISOString(),
    };
  }

  private parseTtl(s: string): number {
    const m = s.match(/^(\d+)([smhdw])$/);
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case "s": return n * 1000;
      case "m": return n * 60 * 1000;
      case "h": return n * 60 * 60 * 1000;
      case "d": return n * 24 * 60 * 60 * 1000;
      case "w": return n * 7 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private deriveUserId(email: string): string {
    // Deterministic, non-PII user id from email.
    return "usr_" + createHmac("sha256", "nanoproof-user-salt").update(email).digest("hex").slice(0, 16);
  }
}