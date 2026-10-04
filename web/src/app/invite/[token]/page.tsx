"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, KeyRound, Loader2, MailX, ShieldCheck, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form";
import { PLANS, TEMPLATES, usePlatform } from "@/lib/store/platform";
import { cn, formatDate } from "@/lib/utils";

const STEPS = [
  { key: "password", label: "Password", icon: KeyRound },
  { key: "twofa", label: "2FA", icon: Smartphone },
  { key: "terms", label: "Terms", icon: ShieldCheck },
] as const;

const RULES = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "Upper and lower case letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  { label: "At least one symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Too weak", tone: "bg-danger" },
  { label: "Weak", tone: "bg-danger" },
  { label: "Fair", tone: "bg-warning" },
  { label: "Good", tone: "bg-info" },
  { label: "Strong", tone: "bg-success" },
];

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const tenant = usePlatform((s) => s.tenants.find((t) => t.id === token));
  const updateTenant = usePlatform((s) => s.updateTenant);
  const [hydrated, setHydrated] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [code, setCode] = React.useState<string[]>(Array(6).fill(""));
  const [terms, setTerms] = React.useState(false);
  const [dpa, setDpa] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const codeRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Platform store is persisted in localStorage; render after mount to avoid hydration mismatch.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center bg-bg">
        <Loader2 className="size-5 animate-spin text-ink-3" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Frame>
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
            <MailX className="size-5" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">This invitation link isn&apos;t valid</h1>
          <p className="mt-2 text-sm text-ink-2">
            The link may have been mistyped, or the invitation was withdrawn. Ask your Factory ERP onboarding manager to send a new one.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/login"><Button>Go to sign in</Button></Link>
            <a href="mailto:onboarding@factoryerp.in"><Button variant="primary">Contact onboarding</Button></a>
          </div>
        </div>
      </Frame>
    );
  }

  const accepted = tenant.inviteStatus === "accepted";
  const passed = RULES.filter((r) => r.test(password)).length;
  const strength = password ? STRENGTH[passed] : null;

  const next = () => {
    setError("");
    if (step === 0) {
      if (passed < RULES.length) return setError("Your password must meet all the rules below.");
      if (password !== confirm) return setError("The two passwords don't match.");
    }
    if (step === 1 && code.join("").length !== 6) return setError("Enter the 6-digit code from your authenticator app.");
    if (step === 2) {
      if (!terms || !dpa) return setError("Please accept both to continue.");
      setLoading(true);
      setTimeout(() => {
        updateTenant(
          tenant.id,
          { inviteStatus: "accepted", checklist: tenant.checklist.map((c) => (c.key === "invite" ? { ...c, done: true } : c)), lastActive: new Date().toISOString().slice(0, 19) },
          tenant.owner.name,
          "tenant.invite.accepted",
          `${tenant.owner.name} accepted the owner invite and enabled 2FA`,
        );
        toast.success("Your account is ready", { description: "Let's set up your factory" });
        router.push("/onboarding");
      }, 700);
      return;
    }
    setStep((s) => s + 1);
  };

  const setDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length > 1) {
      const arr = Array(6).fill("").map((_, k) => digits[k] ?? "");
      setCode(arr);
      codeRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    setCode((c) => c.map((d, k) => (k === i ? digits : d)));
    if (digits && i < 5) codeRefs.current[i + 1]?.focus();
  };

  return (
    <Frame>
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Invitation summary */}
        <section className="rounded-2xl bg-brand-900 p-7 text-white shadow-pop">
          <div className="text-xs font-semibold tracking-wider text-[#5fd0c9] uppercase">You&apos;re invited</div>
          <h1 className="mt-2 text-2xl leading-snug font-semibold tracking-tight">
            Set up <span className="text-[#f5b971]">{tenant.name}</span> on Factory ERP
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {tenant.onboardingManager} from the Factory ERP onboarding team created your workspace. As the Owner you&apos;ll control users, approvals and company settings.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Info label="Your role" value="Owner / Admin" />
            <Info label="Sign-in email" value={tenant.owner.email} />
            <Info label="Plan" value={`${PLANS[tenant.plan].name} · ${tenant.cycle === "annual" ? "annual" : "monthly"}`} />
            <Info label="Industry template" value={TEMPLATES[tenant.template].label} />
            <Info label="GSTIN" value={tenant.gstin} mono />
            <Info label="Go-live target" value={formatDate(tenant.goLiveTarget)} />
          </dl>
          <div className="mt-6 rounded-xl bg-white/6 p-4 text-sm">
            <div className="font-medium">What happens next</div>
            <ol className="mt-2 space-y-1.5 text-white/70">
              <li className="flex gap-2"><span className="text-[#5fd0c9]">1.</span> Secure your account (password + 2FA)</li>
              <li className="flex gap-2"><span className="text-[#5fd0c9]">2.</span> Confirm company, plant, shifts and opening balances</li>
              <li className="flex gap-2"><span className="text-[#5fd0c9]">3.</span> Invite your team and go live — usually within 14 days</li>
            </ol>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/45">
            <ShieldCheck className="size-3.5 text-[#7fd4b0]" /> Data hosted in India (AWS Mumbai) · isolated per company
          </div>
        </section>

        {/* Steps */}
        <section className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
          {accepted ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success-bg text-success"><Check className="size-6" /></span>
              <h2 className="mt-4 text-lg font-semibold">This invitation has already been accepted</h2>
              <p className="mt-1 max-w-sm text-sm text-ink-2">Sign in with {tenant.owner.email} to continue setting up {tenant.shortName}.</p>
              <div className="mt-5 flex gap-2">
                <Link href="/login"><Button variant="primary">Sign in</Button></Link>
                <Link href="/onboarding"><Button>Continue onboarding</Button></Link>
              </div>
            </div>
          ) : (
            <>
              <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
                {STEPS.map((s, i) => (
                  <li key={s.key} className="flex flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        i < step ? "bg-primary-600 text-white" : i === step ? "bg-primary-50 text-primary-700 ring-2 ring-primary-500" : "bg-surface-3 text-ink-3",
                      )}
                      aria-current={i === step ? "step" : undefined}
                    >
                      {i < step ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className={cn("hidden text-xs font-medium whitespace-nowrap sm:block", i === step ? "text-ink" : "text-ink-3")}>{s.label}</span>
                    {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-primary-500" : "bg-line")} />}
                  </li>
                ))}
              </ol>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <Heading title={`Welcome, ${tenant.owner.name.split(" ")[0]}`} desc="Create a password for your Owner account." />
                    <div>
                      <label htmlFor="pw" className="mb-1.5 block text-sm font-medium text-ink-2">Password</label>
                      <div className="relative">
                        <Input id="pw" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10" autoComplete="new-password" autoFocus />
                        <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-3 hover:bg-surface-3" aria-label={show ? "Hide password" : "Show password"}>
                          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={cn("h-1.5 flex-1 rounded-full", strength && i < passed ? strength.tone : "bg-surface-3")} />
                          ))}
                        </div>
                        <span className="w-16 text-right text-xs text-ink-3">{strength?.label ?? ""}</span>
                      </div>
                      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {RULES.map((r) => {
                          const ok = r.test(password);
                          return (
                            <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-ink-3")}>
                              {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {r.label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <label htmlFor="pw2" className="mb-1.5 block text-sm font-medium text-ink-2">Confirm password</label>
                      <Input id="pw2" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-10" autoComplete="new-password" />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <Heading title="Turn on two-factor sign-in" desc="Owners must use 2FA. Scan the code with Google Authenticator, Microsoft Authenticator or similar." />
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                      <QrPlaceholder />
                      <div className="text-sm">
                        <div className="text-ink-2">Can&apos;t scan? Enter this key:</div>
                        <div className="mt-1 rounded-md bg-surface-3 px-2.5 py-1.5 font-mono text-[13px] tracking-wider">JBSW Y3DP EHPK 3PXP</div>
                        <div className="mt-3 text-xs text-ink-3">Account: {tenant.owner.email}</div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-sm font-medium text-ink-2">6-digit code</div>
                      <div className="flex gap-2">
                        {code.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => { codeRefs.current[i] = el; }}
                            value={d}
                            inputMode="numeric"
                            maxLength={6}
                            aria-label={`Digit ${i + 1}`}
                            onChange={(e) => setDigit(i, e.target.value)}
                            onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && codeRefs.current[i - 1]?.focus()}
                            className="tabular h-11 w-11 rounded-md border border-line-strong text-center text-lg font-semibold shadow-xs outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <Heading title="Review and accept" desc="Required under the Digital Personal Data Protection Act, 2023." />
                    <label className="flex items-start gap-3 rounded-lg border border-line p-3.5 text-sm hover:bg-surface-2">
                      <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
                      <span>
                        I accept the <a href="#" className="text-primary-700 hover:underline">Terms of Service</a> on behalf of {tenant.name}.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-line p-3.5 text-sm hover:bg-surface-2">
                      <Checkbox checked={dpa} onChange={(e) => setDpa(e.target.checked)} className="mt-0.5" />
                      <span>
                        I accept the <a href="#" className="text-primary-700 hover:underline">Data Processing Agreement</a>. Factory ERP staff can access our data only when we grant time-boxed support access.
                      </span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg bg-surface-3 px-3 py-2.5 text-xs text-ink-2">
                      <Building2 className="size-4 text-ink-3" /> Workspace: {tenant.code.toLowerCase()}.factoryerp.in · region ap-south-1
                    </div>
                  </div>
                )}

                {error && <p role="alert" className="mt-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <Button variant="ghost" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0 || loading}>
                    <ArrowLeft /> Back
                  </Button>
                  <Button type="submit" variant="primary" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : null}
                    {step === 2 ? "Accept & start setup" : "Continue"}
                    {!loading && <ArrowRight />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-line bg-brand-900 px-4 sm:px-6">
        <Logo />
        <Link href="/login" className="text-sm text-white/70 hover:text-white">Already have an account? Sign in</Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">{children}</main>
      <footer className="pb-6 text-center text-xs text-ink-3">© 2026 Factory ERP · Need help? onboarding@factoryerp.in</footer>
    </div>
  );
}

function Heading({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-ink-3">{desc}</p>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <dt className="text-2xs tracking-wide text-white/45 uppercase">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-sm font-medium", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

function QrPlaceholder() {
  const cells = React.useMemo(() => {
    const out: [number, number][] = [];
    let seed = 7;
    for (let y = 0; y < 21; y++)
      for (let x = 0; x < 21; x++) {
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        seed = (seed * 9301 + 49297) % 233280;
        if (!finder && seed / 233280 > 0.52) out.push([x, y]);
      }
    return out;
  }, []);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#17202a" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#17202a" />
    </g>
  );
  return (
    <svg viewBox="-1 -1 23 23" className="size-36 shrink-0 rounded-lg border border-line bg-white p-1.5" role="img" aria-label="QR code for authenticator app">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#17202a" />)}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}
