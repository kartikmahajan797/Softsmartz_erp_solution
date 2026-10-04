"use client";

import * as React from "react";
import {
  Check,
  ChevronLeft,
  CircleDot,
  Clock3,
  CloudUpload,
  Coffee,
  Cog,
  Cylinder,
  Delete,
  Layers,
  ListChecks,
  LoaderCircle,
  LogOut,
  Package,
  PackageX,
  Pause,
  Play,
  QrCode,
  Ruler,
  ScanLine,
  Settings,
  Square,
  TriangleAlert,
  Undo2,
  Wifi,
  WifiOff,
  Wrench,
  X,
  ZapOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { itemById, operators, reasonCodes, workCentres } from "@/lib/data/masters";
import { type SfEvent, type SfJob, TERMINAL, useShopfloor } from "@/lib/store/shopfloor";
import { cn } from "@/lib/utils";
import { t } from "./i18n";

const REASON_ICON: Record<string, LucideIcon> = {
  ruler: Ruler,
  scan: ScanLine,
  "package-x": PackageX,
  settings: Settings,
  wrench: Wrench,
  "zap-off": ZapOff,
  "triangle-alert": TriangleAlert,
  package: Package,
  coffee: Coffee,
};

const ITEM_ICON: Record<string, LucideIcon> = { Shafts: Cylinder, "Semi-finished": Cylinder, Brackets: Layers, Assemblies: Cog, Couplings: CircleDot };

const noopSubscribe = () => () => {};

type Screen = { name: "jobs" } | { name: "job"; job: string } | { name: "qty"; job: string };

export function Terminal() {
  // false during SSR, true on the client: the terminal reads device-local storage, so it renders client-side only.
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const s = useShopfloor();
  const [screen, setScreen] = React.useState<Screen>({ name: "jobs" });
  const [drawer, setDrawer] = React.useState(false);

  useSync();

  // Follow the browser's real connectivity too.
  React.useEffect(() => {
    const on = () => useShopfloor.getState().setOnline(true);
    const off = () => useShopfloor.getState().setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!mounted) return <div className="min-h-dvh bg-brand-900" />;

  const lang = s.lang;
  const op = operators.find((o) => o.id === s.operatorId);
  const pending = s.events.filter((e) => e.status !== "synced").length;

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef0f3] text-ink select-none" lang={lang}>
      {/* Terminal header */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-brand-900 px-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#0d7377" />
            <path d="M8 23V12l5 3.2V12l5 3.2V9h6v14z" fill="#fff" />
            <rect x="19.5" y="11" width="3" height="3" rx=".6" fill="#e8891c" />
          </svg>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{TERMINAL.code}</div>
            <div className="truncate text-[11px] text-white/55">{lang === "hi" ? "सीएनसी बे" : "CNC bay"} · {t("shift", lang)}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              const next = !s.online;
              s.setOnline(next);
              toast(next ? t("online", lang) : t("offline", lang), { description: next ? undefined : t("savedOffline", lang) });
            }}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
              s.online ? "bg-[#1a7f50]/25 text-[#7fe0b0]" : "bg-[#e8891c]/25 text-[#ffc27a]",
            )}
            aria-label={`Network: ${s.online ? "online" : "offline"}. Tap to simulate the other state.`}
          >
            {s.online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            <span className="hidden sm:inline">{s.online ? t("online", lang) : t("offline", lang)}</span>
          </button>
          <button
            onClick={() => setDrawer(true)}
            className="relative flex size-9 items-center justify-center rounded-full bg-white/10"
            aria-label={`${t("entries", lang)}: ${pending} ${t("pending", lang)}`}
          >
            <ListChecks className="size-4" />
            {pending > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold">{pending}</span>}
          </button>
          <button
            onClick={() => s.setLang(lang === "hi" ? "en" : "hi")}
            className="flex h-9 min-w-12 items-center justify-center rounded-full bg-white/10 px-3 text-xs font-semibold"
            aria-label="Language"
          >
            {lang === "hi" ? "EN" : "हिं"}
          </button>
          {op && (
            <button
              onClick={() => {
                s.logout();
                setScreen({ name: "jobs" });
              }}
              className="flex size-9 items-center justify-center rounded-full bg-white/10"
              aria-label={t("logout", lang)}
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </header>

      {!s.online && (
        <div className="flex items-center gap-2 bg-[#fff3dc] px-4 py-2 text-sm text-warning">
          <WifiOff className="size-4 shrink-0" />
          <span className="text-ink">{t("savedOffline", lang)}</span>
          {pending > 0 && <span className="ml-auto shrink-0 font-semibold">{pending} {t("pending", lang)}</span>}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-3 sm:p-5">
        {!op ? (
          <PinLogin lang={lang} />
        ) : screen.name === "jobs" ? (
          <JobList lang={lang} opName={lang === "hi" ? op.nameHi : op.name} opWcs={op.workCentres} onPick={(job) => setScreen({ name: "job", job })} />
        ) : screen.name === "job" ? (
          <JobScreen lang={lang} jobNo={screen.job} onBack={() => setScreen({ name: "jobs" })} onStop={() => setScreen({ name: "qty", job: screen.job })} />
        ) : (
          <QtyScreen lang={lang} jobNo={screen.job} onBack={() => setScreen({ name: "job", job: screen.job })} onDone={() => setScreen({ name: "jobs" })} />
        )}
      </main>

      {drawer && <EventsDrawer lang={lang} onClose={() => setDrawer(false)} />}
    </div>
  );
}

/* ---------------- Sync loop: in order, one at a time, idempotent ---------------- */

function useSync() {
  const online = useShopfloor((s) => s.online);
  const pendingCount = useShopfloor((s) => s.events.filter((e) => e.status !== "synced").length);
  const running = React.useRef(false);
  React.useEffect(() => {
    if (!online || running.current || pendingCount === 0) return;
    running.current = true;
    const batch = pendingCount;
    (async () => {
      for (;;) {
        const st = useShopfloor.getState();
        if (!st.online) break;
        const next = st.events.filter((e) => e.status !== "synced").sort((a, b) => a.seq - b.seq)[0];
        if (!next) break;
        st.markStatus(next.eventId, "syncing");
        await new Promise((r) => setTimeout(r, 450));
        useShopfloor.getState().markStatus(next.eventId, "synced");
      }
      running.current = false;
      const st = useShopfloor.getState();
      // Went offline mid-sync: the in-flight event goes back to pending and is resent (idempotent by event id).
      st.events.filter((e) => e.status === "syncing").forEach((e) => st.markStatus(e.eventId, "pending"));
      if (batch > 1 && st.events.every((e) => e.status === "synced")) {
        toast.success(st.lang === "hi" ? "सारी एंट्री भेज दी गईं" : "All entries synced", { description: st.lang === "hi" ? "क्रम में, बिना दोहराव" : "In order, no duplicates" });
      }
    })();
  }, [online, pendingCount]);
}

/* ---------------- PIN login ---------------- */

function PinLogin({ lang }: { lang: "en" | "hi" }) {
  const login = useShopfloor((s) => s.login);
  const [pin, setPin] = React.useState("");
  const [err, setErr] = React.useState("");
  const [tries, setTries] = React.useState(0);
  const [shake, setShake] = React.useState(false);
  const locked = tries >= 5;

  const tryPin = React.useCallback(
    (p: string) => {
      const op = operators.find((o) => o.pin === p);
      if (!op) {
        setTries((n) => n + 1);
        setErr(t("wrongPin", lang));
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
        }, 400);
        return;
      }
      if (!op.workCentres.some((w) => TERMINAL.workCentres.includes(w))) {
        setErr(t("notAllowed", lang));
        setPin("");
        return;
      }
      login(op.id);
      toast.success(`${t("hello", lang)}, ${lang === "hi" ? op.nameHi : op.name}`);
    },
    [lang, login],
  );

  const press = (d: string) => {
    if (locked) return;
    setErr("");
    if (d === "del") return setPin((p) => p.slice(0, -1));
    if (d === "clr") return setPin("");
    const p = (pin + d).slice(0, 4);
    setPin(p);
    if (p.length === 4) setTimeout(() => tryPin(p), 120);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center py-4">
      <h1 className="text-2xl font-semibold">{t("operatorLogin", lang)}</h1>
      <p className="mt-1 text-base text-ink-2">{t("enterPin", lang)}</p>
      <div className={cn("my-6 flex gap-4", shake && "animate-[shake_0.35s]")} aria-live="polite" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-5 rounded-full border-2", i < pin.length ? "border-primary-600 bg-primary-600" : "border-ink-3/50")} />
        ))}
      </div>
      <div className="mb-4 h-6 text-center text-sm font-medium text-danger">{locked ? t("locked", lang) : err}</div>
      <div className="grid w-full grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            disabled={locked}
            className={cn(
              "flex h-[68px] items-center justify-center rounded-2xl text-3xl font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-40",
              d === "clr" || d === "del" ? "bg-surface-3 text-ink-2" : "bg-surface text-ink",
            )}
            aria-label={d === "del" ? "Delete" : d === "clr" ? "Clear" : d}
          >
            {d === "del" ? <Delete className="size-7" /> : d === "clr" ? <X className="size-7" /> : d}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          const op = operators.find((o) => o.id === "o1")!;
          useShopfloor.getState().login(op.id);
          toast.success(`${t("hello", lang)}, ${lang === "hi" ? op.nameHi : op.name}`, { description: "QR badge OP-101" });
        }}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-600 text-lg font-semibold text-primary-700 active:scale-[0.98]"
      >
        <QrCode className="size-6" /> {t("scanBadge", lang)}
      </button>
      <p className="mt-5 text-center text-xs text-ink-3">
        {t("demoPins", lang)}: 1234 {lang === "hi" ? "रमेश" : "Ramesh"} · 4567 {lang === "hi" ? "इमरान" : "Imran"} · 3456 {lang === "hi" ? "अनीता" : "Anita"} · 2345 {lang === "hi" ? "सुरेश" : "Suresh"}
      </p>
      <style>{`@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

/* ---------------- Job list ---------------- */

function ItemTile({ itemId, status, size = "md" }: { itemId: string; status: SfJob["status"]; size?: "md" | "lg" }) {
  const Icon = ITEM_ICON[itemById(itemId).category] ?? Cog;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl",
        size === "lg" ? "size-20" : "size-16",
        status === "running" ? "bg-success-bg text-success" : status === "paused" ? "bg-warning-bg text-warning" : "bg-primary-50 text-primary-700",
      )}
      aria-hidden
    >
      <Icon className={size === "lg" ? "size-10" : "size-8"} strokeWidth={1.6} />
    </span>
  );
}

function StatusPill({ status, lang }: { status: SfJob["status"]; lang: "en" | "hi" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold",
        status === "running" ? "bg-success-bg text-success" : status === "paused" ? "bg-warning-bg text-warning" : status === "completed" ? "bg-neutral-bg text-neutral" : "bg-info-bg text-info",
      )}
    >
      <span className={cn("size-2 rounded-full", status === "running" ? "animate-pulse bg-success" : status === "paused" ? "bg-warning" : status === "completed" ? "bg-neutral" : "bg-info")} />
      {t(status, lang)}
    </span>
  );
}

function JobList({ lang, opName, opWcs, onPick }: { lang: "en" | "hi"; opName: string; opWcs: string[]; onPick: (job: string) => void }) {
  const jobs = useShopfloor((s) => s.jobs).filter((j) => opWcs.includes(j.wcId) && j.status !== "completed");
  const order = { running: 0, paused: 1, open: 2, completed: 3 };
  return (
    <div>
      <div className="mb-4">
        <div className="text-base text-ink-2">{t("hello", lang)},</div>
        <h1 className="text-2xl font-semibold">{opName}</h1>
      </div>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-ink-3 uppercase">{t("yourJobs", lang)}</h2>
      {jobs.length === 0 && <p className="rounded-2xl bg-surface p-6 text-center text-ink-3">{t("noJobs", lang)}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...jobs].sort((a, b) => order[a.status] - order[b.status]).map((j) => {
          const it = itemById(j.itemId);
          const wc = workCentres.find((w) => w.id === j.wcId)!;
          return (
            <li key={j.number}>
              <button onClick={() => onPick(j.number)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-sm ring-primary-500 transition-transform active:scale-[0.98] focus-visible:ring-2">
                <ItemTile itemId={j.itemId} status={j.status} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg leading-tight font-semibold">{lang === "hi" ? it.nameHi : it.name}</span>
                  <span className="mt-0.5 block truncate text-sm text-ink-2">{lang === "hi" ? j.opNameHi : j.opName} · {lang === "hi" ? wc.nameHi : wc.name}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span className="block h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (j.good / j.qtyPlanned) * 100)}%` }} />
                    </span>
                    <span className="tabular text-sm font-semibold">{j.good}/{j.qtyPlanned}</span>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-3">{j.number}</span>
                    <StatusPill status={j.status} lang={lang} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Job screen ---------------- */

function JobScreen({ lang, jobNo, onBack, onStop }: { lang: "en" | "hi"; jobNo: string; onBack: () => void; onStop: () => void }) {
  const job = useShopfloor((s) => s.jobs.find((j) => j.number === jobNo))!;
  const events = useShopfloor((s) => s.events).filter((e) => e.job === jobNo);
  const append = useShopfloor((s) => s.append);
  const online = useShopfloor((s) => s.online);
  const [pausing, setPausing] = React.useState(false);
  const [correcting, setCorrecting] = React.useState<SfEvent | null>(null);
  const it = itemById(job.itemId);
  const wc = workCentres.find((w) => w.id === job.wcId)!;
  const reported = events.filter((e) => e.type === "qty_report");
  const reversed = new Set(events.filter((e) => e.type === "correction").map((e) => e.reverses));

  const fire = (type: SfEvent["type"], extra: Partial<SfEvent> = {}) => {
    append({ type, job: jobNo, ...extra });
    if (!online) toast(t("savedOffline", lang));
  };

  return (
    <div className="flex flex-1 flex-col">
      <button onClick={onBack} className="mb-3 flex h-11 w-fit items-center gap-1 rounded-xl pr-3 text-base font-medium text-primary-700 active:bg-surface-3">
        <ChevronLeft className="size-6" /> {t("back", lang)}
      </button>

      <section className="rounded-3xl bg-surface p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <ItemTile itemId={job.itemId} status={job.status} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-semibold">{lang === "hi" ? it.nameHi : it.name}</h1>
            <p className="mt-1 text-base text-ink-2">{lang === "hi" ? job.opNameHi : job.opName}</p>
            <p className="mt-0.5 text-sm text-ink-3">{lang === "hi" ? wc.nameHi : wc.name} · <span className="font-mono">{job.number}</span></p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Counter label={t("good", lang)} value={job.good} tone="success" />
          <Counter label={t("reject", lang)} value={job.reject} tone="danger" />
          <Counter label={lang === "hi" ? "कुल काम" : "Job qty"} value={job.qtyPlanned} tone="neutral" />
        </div>
        <div className="mt-3 flex justify-center"><StatusPill status={job.status} lang={lang} /></div>
      </section>

      <div className="mt-4 grid gap-3">
        {job.status === "running" ? (
          <>
            <BigButton tone="primary" icon={Square} onClick={() => { fire("job_stop"); onStop(); }}>{t("stopReport", lang)}</BigButton>
            <BigButton tone="warning" icon={Pause} onClick={() => setPausing(true)}>{t("pause", lang)}</BigButton>
          </>
        ) : (
          <>
            <BigButton tone="success" icon={Play} onClick={() => { fire(job.status === "paused" ? "job_resume" : "job_start"); toast.success(t(job.status === "paused" ? "resume" : "start", lang)); }}>
              {job.status === "paused" ? t("resume", lang) : t("start", lang)}
            </BigButton>
            {job.status === "paused" && <BigButton tone="secondary" icon={ListChecks} onClick={onStop}>{t("reportQty", lang)}</BigButton>}
          </>
        )}
      </div>

      {reported.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-ink-3 uppercase">{t("recent", lang)}</h2>
          <ul className="space-y-2">
            {[...reported].reverse().slice(0, 4).map((e) => (
              <li key={e.eventId} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm">
                <span className="tabular text-lg font-semibold text-success">+{e.good}</span>
                {!!e.reject && <span className="tabular text-lg font-semibold text-danger">✕{e.reject}</span>}
                <span className="flex-1 text-sm text-ink-3">{new Date(e.deviceTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · #{e.seq}</span>
                {reversed.has(e.eventId) ? (
                  <span className="text-sm font-medium text-ink-3">{t("corrected", lang)}</span>
                ) : (
                  <button onClick={() => setCorrecting(e)} className="flex h-10 items-center gap-1.5 rounded-xl bg-surface-3 px-3 text-sm font-semibold text-ink-2 active:scale-95">
                    <Undo2 className="size-4" /> {t("correct", lang)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pausing && (
        <Overlay title={t("pauseReason", lang)} onClose={() => setPausing(false)}>
          <div className="grid grid-cols-2 gap-3">
            {reasonCodes.filter((r) => r.kind === "pause").map((r) => {
              const Icon = REASON_ICON[r.icon];
              return (
                <button
                  key={r.code}
                  onClick={() => {
                    fire("job_pause", { reason: r.code });
                    setPausing(false);
                    toast(t("paused", lang), { description: lang === "hi" ? r.nameHi : r.name });
                  }}
                  className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-warning-bg px-2 text-center text-warning active:scale-95"
                >
                  <Icon className="size-9" />
                  <span className="text-base font-semibold text-ink">{lang === "hi" ? r.nameHi : r.name}</span>
                </button>
              );
            })}
          </div>
        </Overlay>
      )}

      {correcting && (
        <Overlay title={t("correct", lang)} onClose={() => setCorrecting(null)}>
          <p className="text-base text-ink-2">{t("correctQ", lang)}</p>
          <p className="mt-3 text-lg font-semibold">
            <span className="text-success">+{correcting.good}</span> {correcting.reject ? <span className="text-danger">✕{correcting.reject}</span> : null} · #{correcting.seq}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <BigButton tone="secondary" onClick={() => setCorrecting(null)}>{t("no", lang)}</BigButton>
            <BigButton
              tone="danger"
              icon={Undo2}
              onClick={() => {
                fire("correction", { good: -(correcting.good ?? 0), reject: -(correcting.reject ?? 0), reverses: correcting.eventId });
                setCorrecting(null);
                toast.success(t("corrected", lang));
              }}
            >
              {t("yes", lang)}
            </BigButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "neutral" }) {
  return (
    <div className="rounded-2xl bg-surface-2 py-2.5">
      <div className={cn("tabular text-3xl font-semibold", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink")}>{value}</div>
      <div className="text-sm text-ink-3">{label}</div>
    </div>
  );
}

function BigButton({ tone, icon: Icon, children, onClick }: { tone: "primary" | "success" | "warning" | "danger" | "secondary"; icon?: LucideIcon; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-[72px] w-full items-center justify-center gap-3 rounded-2xl text-xl font-semibold shadow-sm transition-transform active:scale-[0.98]",
        tone === "primary" && "bg-primary-600 text-white",
        tone === "success" && "bg-[#1a7f50] text-white",
        tone === "warning" && "bg-[#f4b740] text-brand-950",
        tone === "danger" && "bg-danger text-white",
        tone === "secondary" && "bg-surface text-ink ring-1 ring-line-strong",
      )}
    >
      {Icon && <Icon className="size-7" />}
      {children}
    </button>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-brand-950/50 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="anim-pop max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#eef0f3] p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="flex size-11 items-center justify-center rounded-full bg-surface" aria-label="Close"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Quantity entry ---------------- */

function QtyScreen({ lang, jobNo, onBack, onDone }: { lang: "en" | "hi"; jobNo: string; onBack: () => void; onDone: () => void }) {
  const job = useShopfloor((s) => s.jobs.find((j) => j.number === jobNo))!;
  const append = useShopfloor((s) => s.append);
  const online = useShopfloor((s) => s.online);
  const [field, setField] = React.useState<"good" | "reject">("good");
  const [good, setGood] = React.useState("");
  const [reject, setReject] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [err, setErr] = React.useState("");
  const it = itemById(job.itemId);
  const remaining = Math.max(0, job.qtyPlanned - job.good);

  const setVal = field === "good" ? setGood : setReject;
  const press = (d: string) => {
    setErr("");
    if (d === "del") return setVal((v) => v.slice(0, -1));
    if (d === "clr") return setVal("");
    setVal((v) => (v + d).replace(/^0+(?=\d)/, "").slice(0, 5));
  };

  const save = () => {
    const g = Number(good || 0);
    const r = Number(reject || 0);
    if (g + r === 0) return setErr(t("enterQty", lang));
    if (r > 0 && !reason) {
      setField("reject");
      return setErr(t("pickReason", lang));
    }
    if (g > remaining * 1.01 + 0.5) return setErr(`${t("tooMany", lang)} (${remaining})`);
    append({ type: "qty_report", job: jobNo, good: g, reject: r, reason: r ? reason : undefined });
    toast.success(online ? t("saved", lang) : t("savedOffline", lang), { description: `${t("good", lang)} ${g} · ${t("reject", lang)} ${r}` });
    onDone();
  };

  return (
    <div className="flex flex-1 flex-col">
      <button onClick={onBack} className="mb-3 flex h-11 w-fit items-center gap-1 rounded-xl pr-3 text-base font-medium text-primary-700 active:bg-surface-3">
        <ChevronLeft className="size-6" /> {t("back", lang)}
      </button>
      <div className="mb-3 text-lg font-semibold">{lang === "hi" ? it.nameHi : it.name} <span className="font-mono text-sm font-normal text-ink-3">{jobNo}</span></div>

      <div className="grid grid-cols-2 gap-3">
        {(["good", "reject"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setField(f)}
            aria-pressed={field === f}
            className={cn(
              "rounded-2xl border-[3px] bg-surface px-4 py-3 text-left transition-colors",
              field === f ? (f === "good" ? "border-[#1a7f50]" : "border-danger") : "border-transparent",
            )}
          >
            <div className={cn("text-base font-semibold", f === "good" ? "text-success" : "text-danger")}>{t(f, lang)}</div>
            <div className="tabular h-12 text-[40px] leading-[48px] font-semibold">{(f === "good" ? good : reject) || "0"}</div>
          </button>
        ))}
      </div>

      {field === "reject" && Number(reject) > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-base font-semibold">{t("rejectReason", lang)}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {reasonCodes.filter((r) => r.kind === "reject").map((r) => {
              const Icon = REASON_ICON[r.icon];
              return (
                <button
                  key={r.code}
                  onClick={() => { setReason(r.code); setErr(""); }}
                  aria-pressed={reason === r.code}
                  className={cn("flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center active:scale-95", reason === r.code ? "bg-danger text-white" : "bg-surface text-danger")}
                >
                  <Icon className="size-7" />
                  <span className={cn("text-xs leading-tight font-semibold", reason === r.code ? "text-white" : "text-ink")}>{lang === "hi" ? r.nameHi : r.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 h-6 text-center text-sm font-medium text-danger" aria-live="polite">{err}</div>

      <div className="mt-1 grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className={cn("flex h-16 items-center justify-center rounded-2xl text-3xl font-semibold shadow-sm active:scale-95", d === "clr" || d === "del" ? "bg-surface-3 text-ink-2" : "bg-surface")}
            aria-label={d === "del" ? "Delete" : d === "clr" ? "Clear" : d}
          >
            {d === "del" ? <Delete className="size-7" /> : d === "clr" ? <X className="size-7" /> : d}
          </button>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-3 mt-3 bg-[#eef0f3]/95 px-3 pt-2 pb-3 backdrop-blur sm:-mx-5 sm:px-5">
        <BigButton tone="primary" icon={Check} onClick={save}>{t("save", lang)}</BigButton>
        <p className="mt-1.5 text-center text-xs text-ink-3">{lang === "hi" ? "बाकी" : "Remaining"}: {remaining}</p>
      </div>
    </div>
  );
}

/* ---------------- Events drawer ---------------- */

const EVENT_LABEL: Record<SfEvent["type"], { en: string; hi: string; icon: LucideIcon }> = {
  job_start: { en: "Started", hi: "शुरू किया", icon: Play },
  job_resume: { en: "Resumed", hi: "फिर शुरू", icon: Play },
  job_pause: { en: "Paused", hi: "रोका", icon: Pause },
  job_stop: { en: "Stopped", hi: "बंद किया", icon: Square },
  qty_report: { en: "Quantity", hi: "मात्रा", icon: ListChecks },
  correction: { en: "Correction", hi: "सुधार", icon: Undo2 },
};

function EventsDrawer({ lang, onClose }: { lang: "en" | "hi"; onClose: () => void }) {
  const events = useShopfloor((s) => s.events);
  const online = useShopfloor((s) => s.online);
  return (
    <Overlay title={t("entries", lang)} onClose={onClose}>
      <div className={cn("mb-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm", online ? "bg-success-bg text-success" : "bg-warning-bg text-warning")}>
        {online ? <CloudUpload className="size-4" /> : <WifiOff className="size-4" />}
        <span className="text-ink">{online ? (lang === "hi" ? "नेटवर्क चालू — एंट्री क्रम से भेजी जा रही हैं" : "Online — entries sync in order") : t("waiting", lang)}</span>
      </div>
      {events.length === 0 && <p className="py-8 text-center text-ink-3">{t("noEntries", lang)}</p>}
      <ul className="space-y-2">
        {[...events].reverse().map((e) => {
          const L = EVENT_LABEL[e.type];
          const reason = reasonCodes.find((r) => r.code === e.reason);
          return (
            <li key={e.eventId} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-2"><L.icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{L[lang]}</span>
                  {e.good !== undefined && <span className={cn("tabular text-sm font-semibold", e.good < 0 ? "text-danger" : "text-success")}>{e.good > 0 ? "+" : ""}{e.good}</span>}
                  {!!e.reject && <span className="tabular text-sm font-semibold text-danger">✕{e.reject}</span>}
                </div>
                <div className="truncate text-xs text-ink-3">
                  #{e.seq} · <span className="font-mono">{e.job}</span> · {new Date(e.deviceTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  {reason && ` · ${lang === "hi" ? reason.nameHi : reason.name}`}
                </div>
              </div>
              <span className={cn("flex items-center gap-1 text-xs font-semibold", e.status === "synced" ? "text-success" : e.status === "syncing" ? "text-info" : "text-warning")}>
                {e.status === "synced" ? <Check className="size-4" /> : e.status === "syncing" ? <LoaderCircle className="size-4 animate-spin" /> : <Clock3 className="size-4" />}
                {e.status === "synced" ? t("synced", lang) : e.status === "syncing" ? t("syncing", lang) : t("pending", lang)}
              </span>
            </li>
          );
        })}
      </ul>
      {events.length > 0 && (
        <button
          onClick={() => {
            if (events.some((e) => e.status !== "synced")) return toast.error(lang === "hi" ? "बाकी एंट्री पहले भेजें" : "Sync pending entries first");
            useShopfloor.getState().reset();
            onClose();
            toast("Demo reset");
          }}
          className="mt-4 w-full rounded-xl py-2 text-xs text-ink-3 underline"
        >
          Reset demo data
        </button>
      )}
    </Overlay>
  );
}
