"use client";

import * as React from "react";
import { CheckCircle2, Download, FileCode2, Info, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/erp/control-panel";
import { Card } from "@/components/erp/form-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { useRole } from "@/lib/store/app";
import { useFinance } from "@/lib/store/finance";
import { cn, formatDateTime } from "@/lib/utils";

const PERIODS = ["Oct 2026", "Sep 2026", "Aug 2026", "Jul 2026", "Q2 FY 2026-27 (Jul-Sep)"];

/* Voucher counts per period (mock aggregates). */
const COUNTS: Record<string, Record<string, number>> = {
  "Oct 2026": { Sales: 3, Purchase: 2, Receipt: 3, Payment: 1, "Credit note": 1, "Debit note": 0, "Stock journal": 46 },
  "Sep 2026": { Sales: 64, Purchase: 58, Receipt: 41, Payment: 39, "Credit note": 6, "Debit note": 6, "Stock journal": 412 },
  "Aug 2026": { Sales: 61, Purchase: 52, Receipt: 38, Payment: 37, "Credit note": 5, "Debit note": 5, "Stock journal": 388 },
  "Jul 2026": { Sales: 57, Purchase: 49, Receipt: 36, Payment: 35, "Credit note": 6, "Debit note": 4, "Stock journal": 371 },
  "Q2 FY 2026-27 (Jul-Sep)": { Sales: 182, Purchase: 159, Receipt: 115, Payment: 111, "Credit note": 17, "Debit note": 15, "Stock journal": 1171 },
};

export default function TallyPage() {
  const role = useRole();
  const runs = useFinance((s) => s.tally);
  const addRun = useFinance((s) => s.addTallyRun);
  const [mode, setMode] = React.useState<"commercial" | "full">("commercial");
  const [period, setPeriod] = React.useState("Sep 2026");
  const [masters, setMasters] = React.useState(true);
  const [progress, setProgress] = React.useState<number | null>(null);

  const counts = COUNTS[period];
  const types = Object.keys(counts).filter((t) => mode === "full" || t !== "Stock journal");
  const total = types.reduce((a, t) => a + counts[t], 0);

  const run = () => {
    setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => {
        const n = (p ?? 0) + 20;
        if (n >= 100) {
          clearInterval(iv);
          const file = `factoryerp_tally_${period.replace(/\s|\(|\)/g, "_").toLowerCase()}.xml`;
          addRun({ at: `2026-10-02T${new Date().toTimeString().slice(0, 8)}`, period, mode, vouchers: total, masters: masters ? 9 : 0, user: role.user, status: "completed", file });
          toast.success(`Tally export ready · ${total} vouchers`, { description: file, action: { label: "Download", onClick: () => download(file, total) } });
          setTimeout(() => setProgress(null), 300);
          return 100;
        }
        return n;
      });
    }, 280);
  };

  const download = (file: string, n: number) => {
    const xml = `<?xml version="1.0"?>\n<ENVELOPE>\n <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n <BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>\n  <REQUESTDATA><!-- ${n} vouchers exported from Factory ERP --></REQUESTDATA>\n </IMPORTDATA></BODY>\n</ENVELOPE>\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    a.download = file;
    a.click();
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Breadcrumbs items={[{ label: "Finance & GST", href: "/finance/invoices" }, { label: "Tally export" }]} />
      </div>
      <div className="mx-auto w-full max-w-[1200px] space-y-4 p-3 sm:p-5">
        <div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-bg px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <div className="text-ink">
            <span className="font-medium">Coexistence mode.</span> Factory ERP keeps the factory books; your CA keeps statutory books in Tally. Export XML and import it in Tally (Gateway → Import → Vouchers). A live sync connector is planned for R2.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card title="New export">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Period" layout="vertical" htmlFor="tp">
                <Select id="tp" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIODS.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Tally company" layout="vertical">
                <div className="flex h-8 items-center text-sm">Shakti Precision Components (2026-27)</div>
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-ink-2">Export mode</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { k: "commercial" as const, t: "Commercial vouchers only", d: "Sales, purchase, receipts, payments, credit and debit notes. Recommended when Tally does not run perpetual inventory.", rec: true },
                  { k: "full" as const, t: "Full, incl. stock journals", d: "Also exports material issues, production receipts and transfers. Only if your CA maintains inventory in Tally." },
                ].map((o) => (
                  <label key={o.k} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors", mode === o.k ? "border-primary-500 bg-primary-50/60 ring-3 ring-primary-500/10" : "border-line hover:border-line-strong")}>
                    <input type="radio" name="mode" className="mt-0.5 accent-primary-600" checked={mode === o.k} onChange={() => setMode(o.k)} />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium">{o.t}{o.rec && <Badge tone="brand" dot={false}>Default</Badge>}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">{o.d}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs text-ink-2">
                  <tr><th className="px-3 py-2 text-left font-semibold">Voucher type</th><th className="px-3 py-2 text-right font-semibold">Count</th></tr>
                </thead>
                <tbody>
                  {Object.keys(counts).map((t) => {
                    const off = !types.includes(t);
                    return (
                      <tr key={t} className={cn("border-t border-line", off && "text-ink-3")}>
                        <td className="px-3 py-1.5">{t}{off && <span className="ml-2 text-xs">(excluded)</span>}</td>
                        <td className="tabular px-3 py-1.5 text-right">{off ? "—" : counts[t]}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-surface-2 font-semibold"><td className="px-3 py-2">Total vouchers</td><td className="tabular px-3 py-2 text-right">{total}</td></tr>
                </tfoot>
              </table>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <Checkbox checked={masters} onChange={(e) => setMasters(e.target.checked)} />
              Include new and changed masters (ledgers for customers, vendors, stock items)
            </label>

            <div className="mt-5 flex items-center gap-3">
              <Button variant="primary" onClick={run} disabled={progress !== null}>
                {progress !== null ? <Loader2 className="animate-spin" /> : <FileCode2 />} {progress !== null ? "Exporting…" : "Run export"}
              </Button>
              {progress !== null && (
                <div className="flex flex-1 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="tabular text-xs text-ink-3">{progress}%</span>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card title="Masters only">
              <p className="text-sm text-ink-2">Export ledgers and stock items without vouchers — useful at go-live.</p>
              <Button className="mt-3" onClick={() => { download("factoryerp_tally_masters.xml", 0); toast.success("Masters XML downloaded", { description: "11 parties · 13 stock items · 6 GST ledgers" }); }}>
                <Download /> Export masters
              </Button>
            </Card>
            <Card title="Ledger mapping">
              <ul className="space-y-1.5 text-sm">
                {[["Sales @18%", "Sales - GST 18%"], ["Sales @28%", "Sales - GST 28%"], ["Output CGST", "Output CGST"], ["Output IGST", "Output IGST"], ["HDFC Bank ··4417", "HDFC Bank OD"]].map(([a, b]) => (
                  <li key={a} className="flex justify-between gap-2"><span className="text-ink-3">{a}</span><span className="truncate">{b}</span></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <Card title="Export history" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-2 text-xs text-ink-2">
                <tr>
                  {["Run at", "Period", "Mode", "Vouchers", "Masters", "By", "Status", ""].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-3 py-2">{formatDateTime(r.at)}</td>
                    <td className="px-3 py-2">{r.period}</td>
                    <td className="px-3 py-2">{r.mode === "commercial" ? "Commercial" : "Full"}</td>
                    <td className="tabular px-3 py-2">{r.vouchers}</td>
                    <td className="tabular px-3 py-2">{r.masters}</td>
                    <td className="px-3 py-2">{r.user}</td>
                    <td className="px-3 py-2">
                      {r.status === "completed" ? (
                        <span className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" /> Completed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger" title="Ledger 'Stock in hand' missing in Tally"><XCircle className="size-3.5" /> Failed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.status === "completed" && <Button size="xs" variant="subtle" onClick={() => download(r.file, r.vouchers)}><Download className="!size-3" /> XML</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
