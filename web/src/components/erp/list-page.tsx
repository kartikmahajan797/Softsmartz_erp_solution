"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColumnsMenu, ControlPanel, type Crumb } from "./control-panel";
import { type Column, DataTable } from "./data-table";
import { useRole } from "@/lib/store/app";
import { cn } from "@/lib/utils";

export interface ListFilter<T> {
  key: string;
  label: string;
  group?: string;
  test: (row: T) => boolean;
}

export interface ListGroup<T> {
  key: string;
  label: string;
  by: (row: T) => string;
}

export interface KanbanConfig<T> {
  columns: { key: string; label: string; tone?: string }[];
  columnOf: (row: T) => string;
  card: (row: T) => React.ReactNode;
}

export interface ListStat {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  /** Optional filter key toggled when the stat is clicked. */
  filter?: string;
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  run: (rows: T[]) => void;
  variant?: "primary" | "secondary" | "danger";
}

/**
 * Standard ERP list screen: control panel + list/kanban + bulk bar.
 * Search, filters (OR within a group, AND across groups), group-by, sort and paging all work client-side.
 */
export function ListPage<T extends { id: string }>({
  title,
  subtitle,
  stats,
  crumbs,
  rows,
  columns,
  search,
  filters = [],
  defaultFilters = [],
  groups = [],
  kanban,
  defaultView = "list",
  href,
  onRowClick,
  newHref,
  onNew,
  newLabel = "New",
  bulkActions = [],
  extraActions,
  banner,
  pageSize = 20,
  placeholder,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** KPI strip shown between the header and the table. */
  stats?: ListStat[];
  crumbs?: Crumb[];
  rows: T[];
  columns: Column<T>[];
  search: (row: T) => string;
  filters?: ListFilter<T>[];
  defaultFilters?: string[];
  groups?: ListGroup<T>[];
  kanban?: KanbanConfig<T>;
  defaultView?: "list" | "kanban";
  href?: (row: T) => string;
  onRowClick?: (row: T) => void;
  newHref?: string;
  onNew?: () => void;
  newLabel?: string;
  bulkActions?: BulkAction<T>[];
  extraActions?: React.ReactNode;
  banner?: React.ReactNode;
  pageSize?: number;
  placeholder?: string;
}) {
  const role = useRole();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<string[]>(defaultFilters);
  const [groupBy, setGroupBy] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"list" | "kanban">(defaultView);
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = React.useState<string[]>([]);

  const visibleColumns = columns.filter((c) => !(c.cost && !role.seesCost) && !hiddenCols.includes(c.key));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => !q || search(r).toLowerCase().includes(q));
    const activeDefs = filters.filter((f) => active.includes(f.key));
    const byGroup = new Map<string, ListFilter<T>[]>();
    activeDefs.forEach((f) => byGroup.set(f.group ?? "", [...(byGroup.get(f.group ?? "") ?? []), f]));
    byGroup.forEach((fs) => {
      out = out.filter((r) => fs.some((f) => f.test(r)));
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        out = [...out].sort((a, b) => {
          const va = col.value!(a);
          const vb = col.value!(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, active, filters, sort, columns, search]);

  React.useEffect(() => setPage(0), [query, active, groupBy]);

  const grouping = groups.find((g) => g.key === groupBy);
  const paged = grouping || view === "kanban" ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);
  const from = filtered.length ? page * pageSize + 1 : 0;
  const to = Math.min((page + 1) * pageSize, filtered.length);
  const selectedRows = rows.filter((r) => selected.includes(r.id));

  const exportCsv = () => {
    const cols = visibleColumns.filter((c) => c.value);
    const csv = [cols.map((c) => c.header).join(","), ...filtered.map((r) => cols.map((c) => JSON.stringify(c.value!(r) ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    toast.success(`Exported ${filtered.length} rows`);
  };

  const newButton =
    newHref || onNew ? (
      newHref ? (
        <Button variant="primary" onClick={() => router.push(newHref)}>
          <Plus /> {newLabel}
        </Button>
      ) : (
        <Button variant="primary" onClick={onNew}>
          <Plus /> {newLabel}
        </Button>
      )
    ) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ControlPanel
        crumbs={crumbs ?? [{ label: title }]}
        title={title}
        subtitle={subtitle}
        count={rows.length}
        actions={
          <div className="flex items-center gap-2">
            {newButton}
            {extraActions}
          </div>
        }
        query={query}
        onQuery={setQuery}
        placeholder={placeholder}
        filters={filters}
        activeFilters={active}
        onToggleFilter={(k) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]))}
        groups={groups}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        view={view}
        onView={setView}
        views={kanban ? ["list", "kanban"] : ["list"]}
        pager={
          grouping || view === "kanban"
            ? undefined
            : {
                from,
                to,
                total: filtered.length,
                onPrev: () => setPage((p) => Math.max(0, p - 1)),
                onNext: () => setPage((p) => (to < filtered.length ? p + 1 : p)),
              }
        }
        onExport={exportCsv}
        columnsMenu={
          view === "list" ? (
            <ColumnsMenu
              columns={columns.filter((c) => !(c.cost && !role.seesCost))}
              hidden={hiddenCols}
              onToggle={(k) => setHiddenCols((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))}
            />
          ) : null
        }
      />

      {banner}

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-3 pt-3 sm:px-5 sm:pt-5 md:grid-cols-4">
          {stats.map((st) => {
            const on = st.filter && active.includes(st.filter);
            const Tag = st.filter ? "button" : "div";
            return (
              <Tag
                key={st.label}
                {...(st.filter
                  ? { onClick: () => setActive((a) => (a.includes(st.filter!) ? a.filter((x) => x !== st.filter) : [...a, st.filter!])), "aria-pressed": !!on }
                  : {})}
                className={cn(
                  "rounded-xl border bg-surface px-4 py-3 text-left shadow-xs transition-colors",
                  on ? "border-primary-500 ring-3 ring-primary-500/15" : "border-line",
                  st.filter && !on && "hover:border-line-strong",
                )}
              >
                <div className="text-xs font-medium text-ink-3">{st.label}</div>
                <div
                  className={cn(
                    "tabular mt-1 text-xl font-semibold tracking-tight",
                    st.tone === "success" && "text-success",
                    st.tone === "warning" && "text-warning",
                    st.tone === "danger" && "text-danger",
                    st.tone === "info" && "text-info",
                  )}
                >
                  {st.value}
                </div>
                {st.hint && <div className="mt-0.5 truncate text-xs text-ink-3">{st.hint}</div>}
              </Tag>
            );
          })}
        </div>
      )}

      {selected.length > 0 && view === "list" && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 sm:mx-5">
          <span className="text-sm font-medium text-primary-800">{selected.length} selected</span>
          <button className="text-xs text-primary-700 hover:underline" onClick={() => setSelected(filtered.map((r) => r.id))}>
            Select all {filtered.length}
          </button>
          <div className="ml-3 flex flex-wrap gap-2">
            {bulkActions.map((a) => (
              <Button
                key={a.label}
                size="sm"
                variant={a.variant ?? "secondary"}
                onClick={() => {
                  a.run(selectedRows);
                  setSelected([]);
                }}
              >
                {a.icon}
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              Export
            </Button>
          </div>
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setSelected([])} aria-label="Clear selection">
            <X />
          </Button>
        </div>
      )}

      <div className={cn("flex-1", view === "list" && "p-3 sm:p-5")}>
        {view === "list" ? (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <DataTable
            rows={paged}
            columns={visibleColumns}
            href={href}
            onRowClick={onRowClick}
            selected={selected}
            onSelectedChange={setSelected}
            sort={sort}
            onSort={setSort}
            groupBy={grouping?.by ?? null}
          />
          </div>
        ) : (
          kanban && <KanbanBoard rows={filtered} config={kanban} href={href} onCardClick={onRowClick} />
        )}
      </div>
    </div>
  );
}

export function KanbanBoard<T extends { id: string }>({
  rows,
  config,
  href,
  onCardClick,
}: {
  rows: T[];
  config: KanbanConfig<T>;
  href?: (row: T) => string;
  onCardClick?: (row: T) => void;
}) {
  return (
    <div className="scroll-thin flex h-full gap-3 overflow-x-auto p-3 sm:p-5">
      {config.columns.map((col) => {
        const cards = rows.filter((r) => config.columnOf(r) === col.key);
        return (
          <div key={col.key} className="flex w-[290px] shrink-0 flex-col">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className={cn("size-2 rounded-full", col.tone ?? "bg-ink-3")} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="rounded-full bg-surface-3 px-1.5 text-xs text-ink-3">{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cards.map((r) => {
                const content = (
                  <div className="rounded-lg border border-line bg-surface p-3 shadow-xs transition-shadow hover:border-line-strong hover:shadow-sm">
                    {config.card(r)}
                  </div>
                );
                return href ? (
                  <Link key={r.id} href={href(r)} className="block focus-visible:rounded-lg">
                    {content}
                  </Link>
                ) : (
                  <button key={r.id} className="text-left" onClick={() => onCardClick?.(r)}>
                    {content}
                  </button>
                );
              })}
              {cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-3">
                  Nothing here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
