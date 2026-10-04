"use client";

import { Truck } from "lucide-react";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DueChip, PartyCell, useItemName } from "@/components/inventory/shared";
import { partyById } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { ALERT_DAYS, type Challan, challanState, dueDate, isInterstate, useJobwork } from "@/lib/store/jobwork";
import { formatDate, formatINR, formatLakh, formatNum } from "@/lib/utils";

export default function ChallansPage() {
  const role = useRole();
  const challans = useJobwork((s) => s.challans);
  const name = useItemName();
  const value = (c: Challan) => c.lines.reduce((a, l) => a + (l.qty - l.returned - l.loss) * l.valuePerUnit, 0);

  const columns: Column<Challan>[] = [
    { key: "number", header: "Challan", value: (c) => c.number, cell: (c) => <span className="font-mono text-[12.5px] font-medium whitespace-nowrap">{c.number}</span> },
    { key: "date", header: "Sent", value: (c) => c.date, cell: (c) => (c.status === "draft" ? <span className="text-ink-3">—</span> : <span className="whitespace-nowrap">{formatDate(c.date)}</span>) },
    {
      key: "jw",
      header: "Job-worker · process",
      value: (c) => partyById(c.jobWorkerId).name,
      cell: (c) => (
        <PartyCell
          id={c.jobWorkerId}
          sub={
            <span className="line-clamp-1">
              {c.process} · {c.lines.map((l) => l.description ?? name(l.itemId)).join(", ")}
              {c.goodsClass === "capital" && <Badge tone="progress" dot={false} className="ml-1.5 h-4 px-1.5 text-[10px]">Capital goods</Badge>}
            </span>
          }
        />
      ),
    },
    {
      key: "qty",
      header: "Sent / back / pending",
      align: "right",
      value: (c) => challanState(c).pending,
      cell: (c) => {
        const sent = c.lines.reduce((a, l) => a + l.qty, 0);
        const back = c.lines.reduce((a, l) => a + l.returned + l.loss, 0);
        return (
          <span className="tabular whitespace-nowrap">
            <span className="text-ink-3">{formatNum(sent)} / {formatNum(back)} / </span>
            <span className="font-semibold">{formatNum(sent - back)}</span>
          </span>
        );
      },
    },
    { key: "value", header: "Pending value", align: "right", cost: true, value, cell: (c) => formatINR(value(c)), total: (rs) => formatLakh(rs.reduce((a, c) => a + value(c), 0)) },
    {
      key: "eway",
      header: "e-Way bill",
      sortable: false,
      cell: (c) =>
        isInterstate(c) ? (
          c.ewayBill ? (
            <div className="text-xs"><Badge tone="info" dot={false}><Truck className="size-3" /> Inter-state</Badge><div className="mt-0.5 font-mono text-2xs text-ink-3">{c.ewayBill.number}</div></div>
          ) : (
            <Badge tone="warning" dot={false}>Required on issue</Badge>
          )
        ) : (
          <span className="text-xs text-ink-3">Intra-state</span>
        ),
    },
    {
      key: "due",
      header: "Return due",
      value: (c) => dueDate(c),
      cell: (c) => {
        const st = challanState(c);
        if (c.status === "closed" || c.status === "draft" || st.pending <= 0) return <span className="text-xs text-ink-3">—</span>;
        return (
          <div>
            <DueChip days={st.days} alertDays={ALERT_DAYS} />
            <div className="mt-0.5 text-2xs text-ink-3">{formatDate(dueDate(c))} · {c.goodsClass === "capital" ? "3 yr" : "1 yr"}</div>
          </div>
        );
      },
    },
    { key: "status", header: "Status", value: (c) => c.status, cell: (c) => <StatusBadge status={challanState(c).overdue ? "overdue" : c.status} /> },
  ];

  return (
    <ListPage
      title="Job-work challans"
      subtitle="Goods sent to job-workers under Sec 143 — 1-year (inputs) and 3-year (capital goods) return limits"
      stats={[
        { label: "Open challans", value: challans.filter((c) => ["issued", "partially_returned"].includes(c.status)).length, hint: "Goods at job-workers", filter: "open" },
        { label: `Due within ${ALERT_DAYS} days`, value: challans.filter((c) => { const s = challanState(c); return s.pending > 0 && c.status !== "draft" && s.days <= ALERT_DAYS; }).length, hint: "Return or pay GST", tone: "warning", filter: "near" },
        { label: "Inter-state", value: challans.filter(isInterstate).length, hint: "e-Way bill mandatory", tone: "info", filter: "inter" },
        { label: "Closed", value: challans.filter((c) => c.status === "closed").length, hint: "Fully returned", tone: "success", filter: "closed" },
      ]}
      crumbs={[{ label: "Job-work", href: "/jobwork/challans" }, { label: "Job-work challans" }]}
      rows={challans}
      columns={columns}
      search={(c) => `${c.number} ${partyById(c.jobWorkerId).name} ${c.process} ${c.lines.map((l) => name(l.itemId)).join(" ")} ${c.ewayBill?.number ?? ""}`}
      placeholder="Search challan, job-worker, process, item, e-way bill…"
      href={(c) => `/jobwork/challans/${c.id}`}
      newHref="/jobwork/challans/new"
      newLabel="New challan"
      filters={[
        { key: "open", label: "Open (goods at job-worker)", group: "s", test: (c) => ["issued", "partially_returned"].includes(c.status) },
        { key: "near", label: `Due within ${ALERT_DAYS} days`, group: "d", test: (c) => { const s = challanState(c); return s.pending > 0 && c.status !== "draft" && s.days <= ALERT_DAYS; } },
        { key: "closed", label: "Closed", group: "s", test: (c) => c.status === "closed" },
        { key: "draft", label: "Drafts", group: "s", test: (c) => c.status === "draft" },
        { key: "inter", label: "Inter-state", group: "g", test: isInterstate },
        { key: "capital", label: "Capital goods", group: "c", test: (c) => c.goodsClass === "capital" },
      ]}
      groups={[
        { key: "jw", label: "Job-worker", by: (c) => partyById(c.jobWorkerId).name },
        { key: "process", label: "Process", by: (c) => c.process },
        { key: "status", label: "Status", by: (c) => c.status.replace(/_/g, " ") },
      ]}
      kanban={{
        columns: [
          { key: "draft", label: "Draft", tone: "bg-neutral" },
          { key: "issued", label: "At job-worker", tone: "bg-info" },
          { key: "partially_returned", label: "Partly returned", tone: "bg-progress" },
          { key: "closed", label: "Closed", tone: "bg-success" },
        ],
        columnOf: (c) => c.status,
        card: (c) => {
          const st = challanState(c);
          return (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">{c.number}</span>
                {st.pending > 0 && c.status !== "draft" && <DueChip days={st.days} alertDays={ALERT_DAYS} />}
              </div>
              <div className="mt-1 text-sm font-medium">{partyById(c.jobWorkerId).name}</div>
              <div className="text-xs text-ink-3">{c.process}</div>
              <div className="mt-2 flex justify-between text-xs text-ink-3">
                <span>{formatNum(st.pending)} pending</span>
                {role.seesCost && <span className="tabular font-medium text-ink">{formatLakh(value(c))}</span>}
              </div>
            </div>
          );
        },
      }}
    />
  );
}
