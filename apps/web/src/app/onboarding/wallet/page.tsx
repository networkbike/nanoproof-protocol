"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface User {
  email: string;
  role: "creator" | "supporter";
  displayName?: string;
  walletAddress?: string;
  walletRevealed?: boolean;
}

export default function WalletOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reveal, setReveal] = useState<{
    address?: string;
    privateKey?: string;
    alreadyRevealed?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState<"address" | "key" | null>(null);

  // Read user from localStorage
  useEffect(() => {
    const userStored = localStorage.getItem("nanoproof-user");
    if (!userStored) {
      router.push("/sign-in");
      return;
    }
    try {
      const u = JSON.parse(userStored) as User;
      setUser(u);
      // If they've already revealed, send them straight to dashboard
      if (u.walletRevealed) {
        router.push(u.role === "creator" ? "/creator" : "/supporter");
        return;
      }
      // Otherwise fetch the wallet
      void fetchReveal(u.email);
    } catch {
      router.push("/sign-in");
    }
  }, [router]);

  async function fetchReveal(email: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/wallet-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.error || "Failed to load wallet");
        setLoading(false);
        return;
      }
      if (d.alreadyRevealed) {
        // Update localStorage + redirect to dashboard
        const stored = localStorage.getItem("nanoproof-user");
        if (stored) {
          const u = JSON.parse(stored);
          u.walletRevealed = true;
          localStorage.setItem("nanoproof-user", JSON.stringify(u));
        }
        router.push(user?.role === "creator" ? "/creator" : "/supporter");
        return;
      }
      setReveal({ address: d.address, privateKey: d.privateKey });
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  }

  async function copy(text: string, kind: "address" | "key") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    } catch {
      // ignore
    }
  }

  async function confirmSaved() {
    if (!user) return;
    setError(null);
    try {
      const r = await fetch("/api/auth/wallet-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.error || "Failed to confirm");
        return;
      }
      setConfirmed(true);
      // Update localStorage to mark walletRevealed = true
      const stored = localStorage.getItem("nanoproof-user");
      if (stored) {
        const u = JSON.parse(stored);
        u.walletRevealed = true;
        localStorage.setItem("nanoproof-user", JSON.stringify(u));
      }
      setTimeout(() => {
        router.push(user.role === "creator" ? "/creator" : "/supporter");
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  function downloadKey() {
    if (!reveal?.privateKey || !user) return;
    const blob = new Blob(
      [
        `NanoProof wallet — ${user.email}\n` +
          `network: ARC_TESTNET\n` +
          `address: ${reveal.address}\n` +
          `privateKey: ${reveal.privateKey}\n\n` +
          `Import into MetaMask:\n` +
          `  1. Open MetaMask → Account menu → Import account\n` +
          `  2. Select "Private key" → paste the privateKey line above\n` +
          `  3. Network: Arc testnet (chain id 5042002) — see https://testnet.arcscan.app\n\n` +
          `Once you've imported and saved this key, click "I've saved my key" ` +
          `below to wipe the plaintext key from NanoProof. After that, only you ` +
          `can access funds at this address.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nanoproof-wallet-${user.email.split("@")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 max-w-lg w-full">
          <div className="animate-pulse">Loading your wallet...</div>
        </div>
      </div>
    );
  }

  if (error || !reveal) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-amber-700/60 bg-amber-950/30 p-8 max-w-lg w-full">
          <h2 className="text-xl font-bold text-amber-100">Setting up your wallet…</h2>
          <p className="mt-2 text-sm text-amber-200/90">
            {error || "We couldn't load your saved wallet."} For security, we just minted you a fresh key and saved it.
            Sign in again to continue onboarding.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Sign in again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 border border-indigo-500/20">
            Step 1 of 1 — Save your wallet
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.displayName || user?.email}
          </h1>
          <p className="text-slate-400">
            NanoProof just minted a real Arc-testnet wallet for you so your earnings have somewhere to live.
            <br />
            Save this key now — it's the only way to access your USDC.
          </p>
        </header>

        {/* Address card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Your wallet address</div>
              <div className="mt-2 font-mono text-sm break-all text-slate-100">{reveal.address}</div>
            </div>
            <button
              onClick={() => copy(reveal.address!, "address")}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700"
            >
              {copied === "address" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Private key card */}
        <div className="rounded-2xl border border-amber-700/60 bg-amber-950/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-amber-400">⚠ Private key — never share</div>
              <div className="mt-2 font-mono text-sm break-all text-amber-100">{reveal.privateKey}</div>
              <div className="mt-2 text-xs text-amber-200/80">
                Anyone with this key controls the wallet. NanoProof will erase this copy as soon as you click "I've saved my key".
              </div>
            </div>
            <button
              onClick={() => copy(reveal.privateKey!, "key")}
              className="ml-3 rounded-md border border-amber-700 bg-amber-900/60 px-3 py-1.5 text-xs font-medium hover:bg-amber-800"
            >
              {copied === "key" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={downloadKey}
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            Download as .txt
          </button>
          <button
            onClick={confirmSaved}
            disabled={confirmed}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
          >
            {confirmed ? "✓ Saved — redirecting..." : "I've saved my key"}
          </button>
        </div>

        {/* MetaMask instructions */}
        <details className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-300">
            How to import this key into MetaMask
          </summary>
          <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal pl-5">
            <li>Open MetaMask → click the account icon (top right) → <strong>Import account</strong></li>
            <li>Select type <strong>Private key</strong></li>
            <li>Paste the private key from above</li>
            <li>Click <strong>Import</strong>. You'll now see a new account with USDC balance once you receive payments.</li>
            <li>
              To see Arc testnet balances, enable it in MetaMask:
              <ul className="mt-1 ml-5 list-disc">
                <li>Settings → Networks → Add a network manually</li>
                <li>RPC URL: <code className="font-mono text-xs">https://rpc.testnet.arcscan.app</code></li>
                <li>Chain ID: <code className="font-mono">5042002</code></li>
                <li>Currency symbol: <code className="font-mono">USDC</code></li>
              </ul>
            </li>
          </ol>
        </details>

        <p className="text-xs text-slate-500 text-center">
          Lost your key after confirming? You can always create a new account from the sign-in flow,
          but funds at this address will be permanently inaccessible. Treat it like a real password.
        </p>
      </div>
    </div>
  );
}
