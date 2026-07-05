"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "email" | "otp" | "role" | "redirect";

interface AuthStatus {
  configured: boolean;
  provider: string;
  mode: string;
  otpLength: number;
  ttlSeconds: number;
}

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"creator" | "supporter" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    checkConfigured();
  }, []);

  async function checkConfigured() {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const r = await fetch("/api/auth/status");
      if (!r.ok) {
        setStatusError("Authentication service is unreachable.");
        setStatus(null);
        return;
      }
      const d = await r.json();
      setStatus(d);
    } catch {
      setStatusError("Cannot reach the authentication service. The backend may still be deploying.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    setInfo(null);
    // eslint-disable-next-line no-console
    console.log("[sign-in] sendOtp click", { email, status });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      // eslint-disable-next-line no-console
      console.log("[sign-in] sendOtp response", { status: r.status, body: d });
      if (!r.ok || !d.ok) {
        setError(d.error || "Failed to send OTP");
        setErrorHint(d.hint || null);
        return;
      }
      setInfo(`A 6-digit code has been sent to ${email}. It expires in ${Math.floor((d.ttl || 300) / 60)} minutes.`);
      setStep("otp");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[sign-in] sendOtp threw", err);
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.error || "Verification failed");
        setErrorHint(d.hint || null);
        return;
      }
      // Store session + user info
      localStorage.setItem("nanoproof-session", JSON.stringify(d.session));
      if (d.user) {
        localStorage.setItem("nanoproof-user", JSON.stringify(d.user));
        localStorage.setItem("nanoproof-role", d.user.role);
        setStep("redirect");
        setTimeout(() => {
          // Existing user → if they haven't saved their wallet yet, send
          // them through the reveal flow first. Otherwise → dashboard.
          const route =
            d.user.walletRevealed
              ? d.user.role === "creator"
                ? "/creator"
                : "/supporter"
              : "/onboarding/wallet";
          router.push(route);
        }, 600);
      } else {
        // New user → role selection
        setStep("role");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function onboardAndContinue(selectedRole: "creator" | "supporter") {
    setLoading(true);
    setError(null);
    try {
      // Create user record via backend
      const r = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: selectedRole, displayName: email.split("@")[0] }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.error || "Failed to create profile");
        return;
      }
      localStorage.setItem("nanoproof-user", JSON.stringify(d.user));
      localStorage.setItem("nanoproof-role", selectedRole);
      setRole(selectedRole);
      setStep("redirect");
      setTimeout(() => {
        // Route new users through the wallet reveal flow so they can save
        // their private key before reaching the dashboard.
        router.push("/onboarding/wallet");
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setLoading(false);
    }
  }

  // selectRole removed - use onboardAndContinue instead which creates the user record

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-slate-900">NanoProof</span>
          </Link>
          <Link href="/landing" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-16">
        {/* Auth status banner — real, not a fake demo banner */}
        {!statusLoading && (statusError || !status) && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <div className="font-semibold">Authentication service unavailable</div>
            <p className="mt-1 text-rose-800">
              {statusError || "Cannot reach the auth service."}
            </p>
            <p className="mt-2 text-xs text-rose-700">
              The backend may still be deploying. Check Railway → nanoproof-api → Deployments.
            </p>
          </div>
        )}

        {!statusLoading && status && !status.configured && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Email provider not configured</div>
            <p className="mt-1 text-amber-800">
              Authentication is not yet ready. Set the following Railway environment variables on the{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">nanoproof-api</code> service:
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-amber-900">
              <li>• <code>AUTH_PROVIDER=resend</code></li>
              <li>• <code>RESEND_API_KEY=re_xxx...</code></li>
              <li>• <code>EMAIL_FROM=onboarding@resend.dev</code></li>
              <li>• <code>JWT_SECRET=&lt;64-char random string&gt;</code></li>
            </ul>
            <p className="mt-3 text-xs text-amber-800">
              After saving, wait 2-3 minutes for Railway to redeploy, then refresh this page.
            </p>
          </div>
        )}

        {!statusLoading && status && status.configured && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Email OTP ready</span>
              <span className="text-emerald-700">— provider: {status.provider}</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div data-tour-id="signin-cta" />
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
            {statusLoading
              ? "Checking auth status…"
              : statusError
                ? `⚠ ${statusError}`
                : status?.configured
                  ? `✓ Auth ready · provider=${status.provider} · mode=${status.mode}`
                  : "⚠ Auth not configured"}
            {loading ? " · sending…" : ""}
          </div>
          {step === "email" && (
            <EmailStep
              email={email}
              setEmail={setEmail}
              onSubmit={sendOtp}
              loading={loading}
              error={error}
              errorHint={errorHint}
              disabled={false}
            />
          )}
          {step === "otp" && (
            <OtpStep
              email={email}
              otp={otp}
              setOtp={setOtp}
              onSubmit={verifyOtp}
              loading={loading}
              error={error}
              errorHint={errorHint}
              info={info}
              onChangeEmail={() => setStep("email")}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onResend={() => sendOtp({ preventDefault: () => {} } as any)}
            />
          )}
          {step === "role" && (
            <div data-tour-id="role-step">
              <RoleStep role={role} onSelect={onboardAndContinue} />
            </div>
          )}
          {step === "redirect" && (
            <RedirectStep role={role} />
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't want to sign in?{" "}
          <Link href="/demo" className="font-medium text-indigo-600 hover:text-indigo-500">
            Try the demo →
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmailStep({
  email,
  setEmail,
  onSubmit,
  loading,
  error,
  errorHint,
  disabled,
}: {
  email: string;
  setEmail: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  errorHint: string | null;
  disabled: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          We'll email you a 6-digit code. No password required.
        </p>
      </div>
      <div className="mt-6">
        <label htmlFor="email" className="block text-sm font-medium text-slate-900">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div>{error}</div>
          {errorHint && <div className="mt-1 text-xs text-rose-600">{errorHint}</div>}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || disabled}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner /> Sending code…
          </>
        ) : (
          <>Send sign-in code →</>
        )}
      </button>
      <p className="mt-4 text-center text-xs text-slate-500">
        By signing in you agree to receive an authentication code by email.
      </p>
    </form>
  );
}

function OtpStep({
  email,
  otp,
  setOtp,
  onSubmit,
  loading,
  error,
  errorHint,
  info,
  onResend,
  onChangeEmail,
}: {
  email: string;
  otp: string;
  setOtp: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  errorHint: string | null;
  info: string | null;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
        <p className="mt-1 text-sm text-slate-600">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>
      <div className="mt-6">
        <label htmlFor="otp" className="block text-sm font-medium text-slate-900">
          6-digit code
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoFocus
          required
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      {info && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div>{error}</div>
          {errorHint && <div className="mt-1 text-xs text-rose-600">{errorHint}</div>}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner /> Verifying…
          </>
        ) : (
          <>Sign in →</>
        )}
      </button>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-slate-600 hover:text-slate-900"
        >
          ← Change email
        </button>
        <button type="button" onClick={onResend} className="text-indigo-600 hover:text-indigo-500">
          Resend code
        </button>
      </div>
    </form>
  );
}

function RoleStep({ onSelect }: { role: "creator" | "supporter" | null; onSelect: (r: "creator" | "supporter") => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome 👋</h1>
      <p className="mt-1 text-sm text-slate-600">Tell us a little about you.</p>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-500">I am a</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <RoleCard
          emoji="💎"
          title="Creator"
          body="Publish content. Earn USDC per citation."
          onClick={() => onSelect("creator")}
        />
        <RoleCard
          emoji="🤖"
          title="Supporter"
          body="Pay creators when their work is cited."
          onClick={() => onSelect("supporter")}
        />
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">You can switch roles later in settings.</p>
    </div>
  );
}

function RoleCard({ emoji, title, body, onClick }: { emoji: string; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="text-3xl">{emoji}</div>
      <div className="mt-2 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{body}</div>
    </button>
  );
}

function RedirectStep({ role }: { role: "creator" | "supporter" | null }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">You're signed in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Redirecting to your <strong>{role}</strong> dashboard…
      </p>
      <div className="mt-6">
        <Spinner />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l4-7 4 7-4 7-4-7zm10 0l4-7 4 7-4 7-4-7z" fill="currentColor" />
      </svg>
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}