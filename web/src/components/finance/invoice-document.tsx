"use client";

import { company, itemById, partyById } from "@/lib/data/masters";
import { type Invoice, invTotals } from "@/lib/store/finance";
import { useSettings } from "@/lib/store/settings";
import { amountInWords, cn, formatDate, formatDateTime, formatINR, formatNum } from "@/lib/utils";

/** Deterministic QR-like placeholder drawn from the IRN (the real one is the IRP-signed QR). */
export function QrPlaceholder({ seed, size = 96 }: { seed: string; size?: number }) {
  const n = 25;
  let h = 2166136261;
  const bits: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bits.push((h & 7) > 3);
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} className="text-ink" role="img" aria-label="e-Invoice signed QR code">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="white" />
      {bits.map((b, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        return b && !inFinder(x, y) ? <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor" /> : null;
      })}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

/** A rendered GST tax invoice, laid out like the printed PDF (FR-PL-07, FR-FI-03/04). */
export function InvoiceDocument({ inv }: { inv: Invoice }) {
  const profile = useSettings((s) => s.profile);
  const party = partyById(inv.customerId);
  const t = invTotals(inv);
  const draft = inv.status === "draft";

  return (
    <article className="relative mx-auto max-w-[860px] overflow-hidden rounded-lg border border-line bg-white text-[12.5px] text-ink shadow-sm">
      {draft && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 text-[88px] font-bold tracking-widest text-ink/5">DRAFT</span>
        </div>
      )}
      {inv.status === "cancelled" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 text-[80px] font-bold tracking-widest text-danger/10">CANCELLED</span>
        </div>
      )}
      <div className="h-1.5" style={{ background: profile.brandColour }} />
      <div className="p-6 sm:p-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-5">
          <div className="flex gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: profile.brandColour }}>
              SP
            </div>
            <div>
              <div className="text-base font-semibold">{profile.legalName}</div>
              <div className="mt-0.5 max-w-xs text-ink-2">{profile.address}</div>
              <div className="mt-1 font-mono text-[11.5px]">GSTIN {profile.gstin} · PAN {profile.pan}</div>
              <div className="text-ink-3">{profile.email} · {profile.phone}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tracking-wide">TAX INVOICE</div>
            <div className="text-2xs text-ink-3">Original for recipient</div>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-[12px]">
              <dt className="text-ink-3">Invoice no.</dt>
              <dd className="font-mono font-medium">{inv.number}</dd>
              <dt className="text-ink-3">Date</dt>
              <dd>{formatDate(inv.date)}</dd>
              <dt className="text-ink-3">Due date</dt>
              <dd>{formatDate(inv.dueDate)}</dd>
              <dt className="text-ink-3">Place of supply</dt>
              <dd>{party.stateCode} - {party.state}</dd>
              <dt className="text-ink-3">Reverse charge</dt>
              <dd>No</dd>
            </dl>
          </div>
        </header>

        {/* e-Invoice block */}
        <section className="flex flex-wrap items-center gap-4 border-b border-line py-4">
          <div className="min-w-0 flex-1">
            {inv.irnStatus === "irn_generated" || inv.irnStatus === "cancelled" ? (
              <dl className="grid grid-cols-[70px_1fr] gap-y-1 text-[11.5px]">
                <dt className="text-ink-3">IRN</dt>
                <dd className="font-mono break-all">{inv.irn}</dd>
                <dt className="text-ink-3">Ack no.</dt>
                <dd className="font-mono">{inv.ackNo}</dd>
                <dt className="text-ink-3">Ack date</dt>
                <dd>{inv.ackDate ? formatDateTime(inv.ackDate) : "—"}</dd>
                {inv.ewayBill && (
                  <>
                    <dt className="text-ink-3">e-Way bill</dt>
                    <dd className="font-mono">{inv.ewayBill}</dd>
                  </>
                )}
              </dl>
            ) : (
              <div className={cn("rounded-md px-3 py-2 text-[12px]", inv.irnStatus === "irn_failed" ? "bg-danger-bg text-danger" : "bg-surface-3 text-ink-2")}>
                {draft
                  ? "IRN and signed QR are obtained from the IRP when this invoice is posted."
                  : inv.irnStatus === "irn_failed"
                    ? "IRN not yet generated — GSP request failed. Do not dispatch on this copy."
                    : inv.irnStatus === "irn_pending"
                      ? "IRN request in progress…"
                      : "e-Invoice not applicable."}
              </div>
            )}
          </div>
          {inv.irnStatus === "irn_generated" ? (
            <QrPlaceholder seed={inv.irn ?? inv.number} />
          ) : (
            <div className="flex size-24 items-center justify-center rounded border border-dashed border-line-strong text-center text-2xs text-ink-3">QR after IRN</div>
          )}
        </section>

        {/* Parties */}
        <section className="grid gap-6 border-b border-line py-4 sm:grid-cols-2">
          <div>
            <div className="text-2xs font-semibold tracking-wider text-ink-3 uppercase">Bill to</div>
            <div className="mt-1 font-semibold">{party.name}</div>
            <div className="text-ink-2">{party.city}, {party.state}</div>
            <div className="mt-0.5 font-mono text-[11.5px]">GSTIN {party.gstin}</div>
            <div className="text-ink-3">State code {party.stateCode}</div>
          </div>
          <div>
            <div className="text-2xs font-semibold tracking-wider text-ink-3 uppercase">Ship to / dispatch</div>
            <div className="mt-1 font-semibold">{party.name}</div>
            <div className="text-ink-2">{party.city}, {party.state}</div>
            <div className="mt-0.5 text-ink-3">
              Order {inv.soNumber} · Challan {inv.dcNumber}
              {inv.vehicle && ` · Vehicle ${inv.vehicle}`}
            </div>
          </div>
        </section>

        {/* Lines */}
        <table className="mt-4 w-full">
          <thead>
            <tr className="border-y border-line bg-surface-2 text-left text-[11px] text-ink-2">
              <th className="px-2 py-1.5 font-semibold">#</th>
              <th className="px-2 py-1.5 font-semibold">Description</th>
              <th className="px-2 py-1.5 font-semibold">HSN</th>
              <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
              <th className="px-2 py-1.5 text-right font-semibold">Rate</th>
              <th className="px-2 py-1.5 text-right font-semibold">Disc</th>
              <th className="px-2 py-1.5 text-right font-semibold">GST</th>
              <th className="px-2 py-1.5 text-right font-semibold">Taxable</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => {
              const it = itemById(l.itemId);
              return (
                <tr key={l.id} className="border-b border-line align-top">
                  <td className="px-2 py-2 text-ink-3">{i + 1}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{it.name}</div>
                    <div className="font-mono text-2xs text-ink-3">{it.code}</div>
                  </td>
                  <td className="px-2 py-2 font-mono">{it.hsn}</td>
                  <td className="tabular px-2 py-2 text-right">{formatNum(l.qty)} {it.uom}</td>
                  <td className="tabular px-2 py-2 text-right">{formatNum(l.rate)}</td>
                  <td className="tabular px-2 py-2 text-right">{l.discountPct ? `${l.discountPct}%` : "—"}</td>
                  <td className="tabular px-2 py-2 text-right">{it.gstRate}%</td>
                  <td className="tabular px-2 py-2 text-right font-medium">{formatNum(l.qty * l.rate * (1 - l.discountPct / 100))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* HSN summary + totals */}
        <section className="mt-4 grid gap-6 md:grid-cols-[1fr_280px]">
          <div>
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="py-1 font-medium">HSN</th>
                  <th className="py-1 text-right font-medium">Taxable</th>
                  {t.interstate ? (
                    <th className="py-1 text-right font-medium">IGST</th>
                  ) : (
                    <>
                      <th className="py-1 text-right font-medium">CGST</th>
                      <th className="py-1 text-right font-medium">SGST</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {t.hsnSummary.map((h) => (
                  <tr key={h.hsn + h.rate} className="border-b border-line">
                    <td className="py-1 font-mono">{h.hsn} <span className="text-ink-3">@{h.rate}%</span></td>
                    <td className="tabular py-1 text-right">{formatNum(h.taxable)}</td>
                    {t.interstate ? (
                      <td className="tabular py-1 text-right">{formatNum(h.tax)}</td>
                    ) : (
                      <>
                        <td className="tabular py-1 text-right">{formatNum(h.tax / 2)}</td>
                        <td className="tabular py-1 text-right">{formatNum(h.tax / 2)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px]">
              <span className="text-ink-3">Amount in words: </span>
              <span className="font-medium">{amountInWords(t.total)}</span>
            </p>
          </div>
          <dl className="text-[12.5px]">
            <Row k="Taxable value" v={formatINR(t.taxable)} />
            {t.interstate ? (
              <Row k="IGST" v={formatINR(t.igst)} />
            ) : (
              <>
                <Row k="CGST" v={formatINR(t.cgst)} />
                <Row k="SGST" v={formatINR(t.sgst)} />
              </>
            )}
            <Row k="Round off" v={formatINR(t.roundOff)} muted />
            <div className="mt-1 flex justify-between border-t border-line-strong pt-2 text-[15px] font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatINR(t.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Footer */}
        <footer className="mt-6 grid gap-6 border-t border-line pt-4 sm:grid-cols-2">
          <div className="text-[11.5px]">
            <div className="text-2xs font-semibold tracking-wider text-ink-3 uppercase">Bank details</div>
            <div className="mt-1">{profile.bankName}</div>
            <div className="font-mono">A/c {profile.bankAccount} · IFSC {profile.ifsc}</div>
            <p className="mt-2 text-ink-3">{profile.invoiceFooter}</p>
          </div>
          <div className="text-right text-[11.5px]">
            <div>For {company.name}</div>
            <div className="mt-8 inline-block border-t border-line-strong pt-1 text-ink-3">Authorised signatory</div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between py-0.5", muted && "text-ink-3")}>
      <dt>{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
