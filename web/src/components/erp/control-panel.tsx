"use client";

import Link from "next/link";
import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  Kanban,
  Layers,
  List,
  Search,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuCheckItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  Tip,
} from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-ink-3">/</span>}
            {c.href && !last ? (
              <Link href={c.href} className="truncate text-primary-700 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className={cn("truncate", last ? "font-semibold text-ink" : "text-ink-2")}>{c.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export interface FilterDef {
  key: string;
  label: string;
  group?: string;
}

export interface GroupDef {
  key: string;
  label: string;
}

/**
 * Odoo-style control panel: breadcrumbs + primary action on the left,
 * search with facet chips, Filters / Group by / Favourites, view switcher and pager on the right.
 */
export function ControlPanel({
  crumbs,
  title,
  subtitle,
  count,
  actions,
  query,
  onQuery,
  filters,
  activeFilters,
  onToggleFilter,
  groups,
  groupBy,
  onGroupBy,
  view,
  onView,
  views = ["list"],
  pager,
  onExport,
  columnsMenu,
  placeholder = "Search…",
}: {
  crumbs: Crumb[];
  /** When set, renders a SaaS-style page header (title, count, subtitle) above the toolbar. */
  title?: string;
  subtitle?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
  query: string;
  onQuery: (q: string) => void;
  filters?: FilterDef[];
  activeFilters?: string[];
  onToggleFilter?: (key: string) => void;
  groups?: GroupDef[];
  groupBy?: string | null;
  onGroupBy?: (key: string | null) => void;
  view?: "list" | "kanban";
  onView?: (v: "list" | "kanban") => void;
  views?: ("list" | "kanban")[];
  pager?: { from: number; to: number; total: number; onPrev: () => void; onNext: () => void };
  onExport?: () => void;
  columnsMenu?: React.ReactNode;
  placeholder?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const facetFilters = (activeFilters ?? []).map((k) => filters?.find((f) => f.key === k)).filter(Boolean) as FilterDef[];
  const groupLabel = groups?.find((g) => g.key === groupBy)?.label;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea,select")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filterGroups = [...new Set((filters ?? []).map((f) => f.group ?? ""))];

  const parents = crumbs.slice(0, -1);

  return (
    <div className="border-b border-line bg-surface px-4 sm:px-6">
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-3 pt-4 pb-3">
          <div className="min-w-0">
            {parents.length > 0 && (
              <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-ink-3">
                {parents.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="size-3" />}
                    {c.href ? <Link href={c.href} className="hover:text-primary-700 hover:underline">{c.label}</Link> : <span>{c.label}</span>}
                  </React.Fragment>
                ))}
                <ChevronRight className="size-3" />
              </nav>
            )}
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
              {count !== undefined && <span className="tabular rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">{count}</span>}
            </div>
            {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", title ? "pb-3" : "py-2.5")}>
        {!title && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {actions}
            <Breadcrumbs items={crumbs} />
          </div>
        )}

        {/* Search with facets */}
        <div className={cn("flex items-center", title ? "w-full flex-1 sm:max-w-xl" : "order-3 w-full lg:order-none lg:w-auto lg:min-w-[420px]")}>
          <div className="flex h-8 flex-1 items-center gap-1 rounded-l-md border border-line-strong bg-surface pl-2 shadow-xs focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-500/15">
            <Search className="size-4 shrink-0 text-ink-3" />
            {facetFilters.length > 0 && (
              <span className="flex h-6 items-center gap-1 rounded bg-primary-50 pr-1 pl-1.5 text-xs text-primary-700">
                <Filter className="size-3" />
                <span className="max-w-40 truncate">{facetFilters.map((f) => f.label).join(" or ")}</span>
                <button
                  aria-label="Clear filters"
                  onClick={() => facetFilters.forEach((f) => onToggleFilter?.(f.key))}
                  className="rounded p-0.5 hover:bg-primary-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {groupLabel && (
              <span className="flex h-6 items-center gap-1 rounded bg-progress-bg pr-1 pl-1.5 text-xs text-progress">
                <Layers className="size-3" />
                {groupLabel}
                <button aria-label="Clear grouping" onClick={() => onGroupBy?.(null)} className="rounded p-0.5 hover:bg-progress/10">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={placeholder}
              className="h-full min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
              aria-label="Search records"
            />
            {query && (
              <button onClick={() => onQuery("")} className="mr-1 rounded p-0.5 text-ink-3 hover:bg-surface-3" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Menu>
            <MenuTrigger asChild>
              <button
                className="flex h-8 items-center gap-1 rounded-r-md border border-l-0 border-line-strong bg-surface px-2.5 text-sm text-ink-2 shadow-xs hover:bg-surface-3"
                aria-label="Filters and grouping"
              >
                <Filter className="size-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </MenuTrigger>
            <MenuContent className="w-[min(560px,calc(100vw-24px))] p-0">
              <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold text-ink"><Filter className="size-3.5 text-primary-600" /> Filters</div>
                  {filterGroups.map((g, gi) => (
                    <React.Fragment key={g}>
                      {gi > 0 && <MenuSeparator />}
                      {(filters ?? [])
                        .filter((f) => (f.group ?? "") === g)
                        .map((f) => (
                          <MenuCheckItem key={f.key} checked={!!activeFilters?.includes(f.key)} onCheckedChange={() => onToggleFilter?.(f.key)}>
                            {f.label}
                          </MenuCheckItem>
                        ))}
                    </React.Fragment>
                  ))}
                  {!filters?.length && <div className="px-2 py-1 text-xs text-ink-3">No filters</div>}
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold text-ink"><Layers className="size-3.5 text-progress" /> Group by</div>
                  {(groups ?? []).map((g) => (
                    <MenuCheckItem key={g.key} checked={groupBy === g.key} onCheckedChange={(c) => onGroupBy?.(c ? g.key : null)}>
                      {g.label}
                    </MenuCheckItem>
                  ))}
                  {!groups?.length && <div className="px-2 py-1 text-xs text-ink-3">No grouping</div>}
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold text-ink"><Star className="size-3.5 text-accent-500" /> Favourites</div>
                  <MenuItem onSelect={() => toast.success("Search saved to favourites")}>Save current search</MenuItem>
                  {onExport && <MenuItem icon={<Download />} onSelect={onExport}>Export to Excel</MenuItem>}
                </div>
              </div>
            </MenuContent>
          </Menu>
        </div>

        <div className={cn("flex items-center gap-2", title && "ml-auto")}>
          {pager && (
            <div className="flex items-center gap-1 text-sm text-ink-2">
              <span className="tabular whitespace-nowrap">
                {pager.total === 0 ? "0" : `${pager.from}-${pager.to}`} / {pager.total}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={pager.onPrev} disabled={pager.from <= 1} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={pager.onNext} disabled={pager.to >= pager.total} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          )}
          {columnsMenu}
          {onExport && (
            <Tip label="Export to Excel">
              <Button variant="ghost" size="icon-sm" onClick={onExport} aria-label="Export">
                <Download />
              </Button>
            </Tip>
          )}
          {views.length > 1 && onView && (
            <div className="flex rounded-md border border-line-strong p-0.5 shadow-xs" role="group" aria-label="View">
              {views.map((v) => (
                <Tip key={v} label={v === "list" ? "List" : "Kanban"}>
                  <button
                    onClick={() => onView(v)}
                    aria-pressed={view === v}
                    className={cn("flex size-6 items-center justify-center rounded", view === v ? "bg-primary-600 text-white" : "text-ink-3 hover:bg-surface-3")}
                  >
                    {v === "list" ? <List className="size-3.5" /> : <Kanban className="size-3.5" />}
                  </button>
                </Tip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Column visibility menu for DataTable. */
export function ColumnsMenu({
  columns,
  hidden,
  onToggle,
}: {
  columns: { key: string; header: string }[];
  hidden: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <Menu>
      <Tip label="Columns">
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Choose columns">
            <Columns3 />
          </Button>
        </MenuTrigger>
      </Tip>
      <MenuContent className="w-56">
        <MenuLabel>Columns</MenuLabel>
        {columns.map((c) => (
          <MenuCheckItem key={c.key} checked={!hidden.includes(c.key)} onCheckedChange={() => onToggle(c.key)}>
            {c.header}
          </MenuCheckItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
