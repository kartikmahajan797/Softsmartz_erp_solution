"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Fingerprint, KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";

const ACCENT = "#e8891c";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"password" | "second">("password");
  const [method, setMethod] = React.useState<"key" | "totp">("key");
  const [email, setEmail] = React.useState("kartik@factoryerp.in");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@factoryerp\.in$/i.test(email.trim())) return setError("Use your @factoryerp.in staff account. Tenant users sign in at /login.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("second");
    }, 600);
  };

  const finish = () => {
    if (method === "totp" && !/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your authenticator app.");
    setError("");
    setLoading(true);
    setTimeout(() => router.push("/platform"), method === "key" ? 1100 : 600);
  };

  const input =
    "h-10 w-full rounded-md border border-white/12 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#e8891c] focus:ring-3 focus:ring-[#e8891c]/20";

  return (
    <div className="relative flex min-h-full flex-col bg-[#0b1216] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(232,137,28,0.14), transparent 45%), radial-gradient(circle at 90% 100%, rgba(13,115,119,0.18), transparent 45%)" }}
      />
      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
            <rect width="32" height="32" rx="8" fill={ACCENT} />
            <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
            <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#071c24" />
          </svg>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">Factory ERP</div>
            <div className="text-2xs font-medium tracking-wider text-[#f5b971] uppercase">Platform console</div>
          </div>
        </div>
        <Link href="/login" className="text-xs text-white/50 hover:text-white">Tenant sign-in →</Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur">
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border border-[#e8891c]/30 bg-[#e8891c]/10">
              <ShieldCheck className="size-5 text-[#f5b971]" />
            </div>

            {step === "password" ? (
              <form onSubmit={submitPassword} noValidate>
                <h1 className="text-xl font-semibold tracking-tight">Staff sign-in</h1>
                <p className="mt-1 text-sm text-white/55">Operate tenants, onboarding and billing.</p>

                <button
                  type="button"
                  onClick={() => { setError(""); setStep("second"); }}
                  className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white text-sm font-medium text-[#0b1216] hover:bg-white/90"
                >
                  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
                    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                  </svg>
                  Continue with company SSO
                </button>

                <div className="my-5 flex items-center gap-3 text-2xs tracking-wider text-white/35 uppercase">
                  <span className="h-px flex-1 bg-white/10" /> or with password <span className="h-px flex-1 bg-white/10" />
                </div>

                <label htmlFor="pe" className="mb-1.5 block text-sm font-medium text-white/80">Staff email</label>
                <input id="pe" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />

                <label htmlFor="pp" className="mt-4 mb-1.5 block text-sm font-medium text-white/80">Password</label>
                <div className="relative">
                  <input id="pp" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} pr-10`} placeholder="••••••••" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-white/45 hover:text-white" aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {error && <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/15 px-3 py-2 text-xs text-[#ffb4b4]">{error}</p>}

                <button type="submit" disabled={loading} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-[#0b1216] transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: ACCENT }}>
                  {loading && <Loader2 className="size-4 animate-spin" />} Continue
                </button>
              </form>
            ) : (
              <div>
                <button onClick={() => { setStep("password"); setError(""); setLoading(false); }} className="mb-3 flex items-center gap-1 text-xs text-white/50 hover:text-white">
                  <ArrowLeft className="size-3.5" /> Back
                </button>
                <h1 className="text-xl font-semibold tracking-tight">Verify it&apos;s you</h1>
                <p className="mt-1 text-sm text-white/55">Second factor for <span className="text-white/85">{email}</span></p>

                <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Second factor">
                  {([
                    { key: "key", label: "Security key", icon: <KeyRound className="size-4" /> },
                    { key: "totp", label: "Authenticator", icon: <Smartphone className="size-4" /> },
                  ] as const).map((m) => (
                    <button
                      key={m.key}
                      role="radio"
                      aria-checked={method === m.key}
                      onClick={() => { setMethod(m.key); setError(""); }}
                      className={`flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium ${method === m.key ? "border-[#e8891c] bg-[#e8891c]/10 text-[#f5b971]" : "border-white/12 text-white/60 hover:text-white"}`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {method === "key" ? (
                  <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-white/15 px-4 py-6 text-center">
                    <span className={`flex size-14 items-center justify-center rounded-full bg-[#e8891c]/12 ${loading ? "animate-pulse" : ""}`}>
                      <Fingerprint className="size-7 text-[#f5b971]" />
                    </span>
                    <p className="mt-3 text-sm text-white/80">{loading ? "Touch your security key…" : "Insert your FIDO2 key and press continue"}</p>
                    <p className="mt-1 text-xs text-white/40">Required for super admins</p>
                  </div>
                ) : (
                  <div className="mt-5">
                    <label htmlFor="tc" className="mb-1.5 block text-sm font-medium text-white/80">6-digit code</label>
                    <input
                      id="tc"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      className={`${input} text-center font-mono text-lg tracking-[0.5em]`}
                      placeholder="000000"
                    />
                    <p className="mt-1.5 text-xs text-white/40">Authenticator apps are allowed for onboarding, support and billing staff only.</p>
                  </div>
                )}

                {error && <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/15 px-3 py-2 text-xs text-[#ffb4b4]">{error}</p>}

                <button onClick={finish} disabled={loading} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-[#0b1216] transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: ACCENT }}>
                  {loading && <Loader2 className="size-4 animate-spin" />} {method === "key" ? "Use security key" : "Verify"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-2 px-1 text-xs text-white/45">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#7fd4b0]" />
            <p>Staff only. SSO + hardware 2FA. Sign-ins are logged with device and IP; tenant data opens only through consented support sessions.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
