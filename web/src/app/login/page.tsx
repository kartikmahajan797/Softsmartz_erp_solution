"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Tablet } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form";
import { useApp } from "@/lib/store/app";
import { cn } from "@/lib/utils";

const T = {
  en: {
    welcome: "Welcome back",
    sub: "Sign in to Shakti Precision's workspace",
    email: "Work email",
    password: "Password",
    forgot: "Forgot password?",
    remember: "Keep me signed in on this device",
    signIn: "Sign in",
    operator: "Operator on a shop-floor terminal?",
    operatorCta: "Sign in with PIN",
    otpTitle: "Two-step verification",
    otpSub: "Enter the 6-digit code from your authenticator app.",
    verify: "Verify and continue",
    back: "Back",
    resend: "Use a backup code instead",
    noAccount: "New factory?",
    start: "Start onboarding",
  },
  hi: {
    welcome: "फिर से स्वागत है",
    sub: "शक्ति प्रिसिज़न के वर्कस्पेस में साइन इन करें",
    email: "ईमेल",
    password: "पासवर्ड",
    forgot: "पासवर्ड भूल गए?",
    remember: "इस डिवाइस पर साइन इन रखें",
    signIn: "साइन इन",
    operator: "शॉप-फ्लोर टर्मिनल पर ऑपरेटर?",
    operatorCta: "PIN से साइन इन",
    otpTitle: "दो-चरण सत्यापन",
    otpSub: "अपने ऑथेंटिकेटर ऐप से 6 अंकों का कोड डालें।",
    verify: "सत्यापित करें",
    back: "वापस",
    resend: "बैकअप कोड इस्तेमाल करें",
    noAccount: "नई फैक्ट्री?",
    start: "ऑनबोर्डिंग शुरू करें",
  },
};

const BULLETS = [
  "Order-to-dispatch in one place — sales, purchase, production, job-work",
  "GST invoices with e-invoice IRN and e-way bill, Tally export",
  "Offline operator app: 3-tap entries in Hindi or English",
];

export default function LoginPage() {
  const router = useRouter();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const t = T[lang];
  const [step, setStep] = React.useState<"password" | "otp">("password");
  const [email, setEmail] = React.useState("rajesh@shaktiprecision.in");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; otp?: string }>({});
  const [loading, setLoading] = React.useState(false);
  const [otp, setOtp] = React.useState<string[]>(Array(6).fill(""));
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) err.email = "Enter a valid email address";
    if (password.length < 8) err.password = "Password must be at least 8 characters";
    setErrors(err);
    if (Object.keys(err).length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }, 700);
  };

  const submitOtp = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return setErrors({ otp: "Enter all 6 digits" });
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      toast.success("Signed in", { description: "New sign-in recorded in the audit log" });
      router.push("/dashboard");
    }, 700);
  };

  const setDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = [...otp];
      digits.slice(0, 6 - i).split("").forEach((d, k) => (next[i + k] = d));
      setOtp(next);
      otpRefs.current[Math.min(i + digits.length, 5)]?.focus();
      return;
    }
    const next = [...otp];
    next[i] = digits;
    setOtp(next);
    if (digits && i < 5) otpRefs.current[i + 1]?.focus();
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative">
          <h1 className="max-w-md text-[32px] leading-tight font-semibold tracking-tight">
            Run your factory floor and your books from one place.
          </h1>
          <ul className="mt-6 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] text-white/75">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-500/30 text-[#7fe0d8]">
                  <Check className="size-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <FactoryArt />
        </div>
        <div className="relative flex items-center justify-between text-xs text-white/45">
          <span>Data hosted in India · AWS Mumbai</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> 2FA · audit-logged
          </span>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="lg:hidden">
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
                <rect width="32" height="32" rx="8" fill="#0d7377" />
                <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
                <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#e8891c" />
              </svg>
              <span className="text-[15px] font-semibold">Factory ERP</span>
            </div>
          </div>
          <div className="ml-auto flex rounded-md border border-line-strong p-0.5 text-xs" role="group" aria-label="Language">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn("h-6 rounded px-2.5 font-medium", lang === l ? "bg-primary-600 text-white" : "text-ink-2 hover:bg-surface-3")}
              >
                {l === "en" ? "EN" : "हिंदी"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
          <div className="w-full max-w-[380px]">
            {step === "password" ? (
              <form onSubmit={submitPassword} noValidate className="anim-fade">
                <h2 className="text-2xl font-semibold tracking-tight">{t.welcome}</h2>
                <p className="mt-1 text-sm text-ink-3">{t.sub}</p>

                <div className="mt-8 space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-2">{t.email}</label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="h-10"
                      value={email}
                      aria-invalid={!!errors.email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium text-ink-2">{t.password}</label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary-700 hover:underline"
                        onClick={() => toast("Reset link sent", { description: `Check ${email || "your inbox"}` })}
                      >
                        {t.forgot}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={show ? "text" : "password"}
                        autoComplete="current-password"
                        className="h-10 pr-10"
                        value={password}
                        aria-invalid={!!errors.password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink"
                        aria-label={show ? "Hide password" : "Show password"}
                      >
                        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink-2">
                    <Checkbox defaultChecked /> {t.remember}
                  </label>
                </div>

                <Button type="submit" variant="primary" size="lg" className="mt-6 w-full justify-center" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {t.signIn}
                </Button>

                <div className="my-6 flex items-center gap-3 text-xs text-ink-3">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>

                <Link
                  href="/shopfloor"
                  className="flex items-center gap-3 rounded-lg border border-line-strong px-4 py-3 shadow-xs transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-accent-100 text-accent-500">
                    <Tablet className="size-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs text-ink-3">{t.operator}</span>
                    <span className="block text-sm font-medium">{t.operatorCta}</span>
                  </span>
                  <KeyRound className="size-4 text-ink-3" />
                </Link>

                <p className="mt-8 text-center text-sm text-ink-3">
                  {t.noAccount}{" "}
                  <Link href="/onboarding" className="font-medium text-primary-700 hover:underline">{t.start}</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={submitOtp} className="anim-fade">
                <button
                  type="button"
                  onClick={() => { setStep("password"); setOtp(Array(6).fill("")); setErrors({}); }}
                  className="mb-6 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
                >
                  <ArrowLeft className="size-4" /> {t.back}
                </button>
                <span className="flex size-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <ShieldCheck className="size-5" />
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">{t.otpTitle}</h2>
                <p className="mt-1 text-sm text-ink-3">{t.otpSub}</p>
                <p className="mt-1 text-xs text-ink-3">Signing in as <span className="font-medium text-ink-2">{email}</span></p>

                <fieldset className="mt-7">
                  <legend className="sr-only">6-digit code</legend>
                  <div className="flex justify-between gap-2">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        value={d}
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={6}
                        aria-label={`Digit ${i + 1}`}
                        aria-invalid={!!errors.otp && !d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                        }}
                        className={cn(
                          "tabular h-12 w-full min-w-0 rounded-lg border border-line-strong bg-surface text-center text-xl font-semibold shadow-xs outline-none",
                          "focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15 aria-invalid:border-danger",
                        )}
                      />
                    ))}
                  </div>
                  {errors.otp && <p className="mt-2 text-xs text-danger">{errors.otp}</p>}
                </fieldset>

                <Button type="submit" variant="primary" size="lg" className="mt-6 w-full justify-center" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {t.verify}
                </Button>
                <button
                  type="button"
                  className="mt-4 w-full text-center text-sm font-medium text-primary-700 hover:underline"
                  onClick={() => toast("Enter one of your 10 backup codes")}
                >
                  {t.resend}
                </button>
                <p className="mt-8 rounded-lg bg-surface-3 px-3 py-2.5 text-xs text-ink-2">
                  2FA is mandatory for Owner and Accountant roles. Lost your device? Ask another admin to reset it from Users & roles.
                </p>
              </form>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-6 py-5 text-xs text-ink-3">
          <span>© 2026 Factory ERP</span>
          <a href="#" className="hover:text-ink">Privacy</a>
          <a href="#" className="hover:text-ink">Terms</a>
          <a href="#" className="hover:text-ink">Status</a>
        </footer>
      </main>
    </div>
  );
}

/** Subtle line illustration: a factory shed with a CNC machine and conveyor. */
function FactoryArt() {
  return (
    <svg viewBox="0 0 420 150" className="mt-10 w-full max-w-md text-white" fill="none" aria-hidden>
      <g stroke="currentColor" strokeOpacity=".22" strokeWidth="1.5">
        <path d="M10 140h400" />
        <path d="M30 140V70l50 30V70l50 30V70l50 30v40" />
        <path d="M170 140V40h18v60" />
        <rect x="58" y="112" width="18" height="28" />
        <rect x="100" y="112" width="40" height="14" />
        <rect x="230" y="88" width="76" height="52" rx="4" />
        <rect x="242" y="98" width="34" height="26" rx="2" />
        <circle cx="292" cy="104" r="4" />
        <path d="M286 118h12M286 126h12" />
        <path d="M320 128h80M320 140h80" />
        <circle cx="330" cy="134" r="5" />
        <circle cx="360" cy="134" r="5" />
        <circle cx="390" cy="134" r="5" />
      </g>
      <rect x="338" y="112" width="16" height="14" rx="2" fill="#e8891c" fillOpacity=".75" />
      <rect x="368" y="114" width="14" height="12" rx="2" fill="#5fd0c9" fillOpacity=".5" />
      <path d="M179 34c6-8 16-8 20-16" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
