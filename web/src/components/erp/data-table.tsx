"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";
import { Checkbox } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting and grouping. */
  value?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
  sortable?: boolean;
  /** Hidden by field rules when the role cannot see cost (arch §5.2). */
  cost?: boolean;
  /** Sum shown in the footer (numeric columns). */
  total?: (rows: T[]) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  href,
  onRowClick,
  selectable = true,
  selected,
  onSelectedChange,
  sort,
  onSort,
  groupBy,
  groupLabel,
  empty,
  dense,
  footer = true,
}: {
  rows: T[];
  columns: Column<T>[];
  href?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  sort?: { key: string; dir: "asc" | "desc" } | null;
  onSort?: (s: { key: string; dir: "asc" | "desc" } | null) => void;
  groupBy?: ((row: T) => string) | null;
  groupLabel?: (group: string) => React.ReactNode;
  empty?: React.ReactNode;
  dense?: boolean;
  footer?: boolean;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState<string[]>([]);
  const sel = selected ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const hasTotals = footer && columns.some((c) => c.total);

  const groups = React.useMemo(() => {
    if (!groupBy) return null;
    const m = new Map<string, T[]>();
    rows.forEach((r) => {
      const g = groupBy(r);
      m.set(g, [...(m.get(g) ?? []), r]);
    });
    return [...m.entries()];
  }, [rows, groupBy]);

  const clickRow = (r: T) => {
    if (onRowClick) onRowClick(r);
    else if (href) router.push(href(r));
  };

  const headerCell = (c: Column<T>) => {
    const active = sort?.key === c.key;
    const canSort = c.sortable !== false && !!c.value && !!onSort;
    return (
      <th
        key={c.key}
        style={{ width: c.width }}
        className={cn(
          "sticky top-0 z-[1] h-10 border-b border-line bg-surface-2 px-3 text-xs font-semibold whitespace-nowrap text-ink-3",
          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
        )}
        aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
      >
        {canSort ? (
          <button
            className={cn("inline-flex items-center gap-1 hover:text-ink", c.align === "right" && "flex-row-reverse")}
            onClick={() =>
              onSort!(active ? (sort!.dir === "asc" ? { key: c.key, dir: "desc" } : null) : { key: c.key, dir: "asc" })
            }
          >
            {c.header}
            {active ? (
              sort!.dir === "asc" ? <ArrowUp className="size-3 text-primary-600" /> : <ArrowDown className="size-3 text-primary-600" />
            ) : (
              <ChevronsUpDown className="size-3 opacity-40" />
            )}
          </button>
        ) : (
          c.header
        )}
      </th>
    );
  };

  const renderRow = (r: T) => {
    const isSel = sel.includes(r.id);
    return (
      <tr
        key={r.id}
        onClick={() => clickRow(r)}
        onKeyDown={(e) => e.key === "Enter" && clickRow(r)}
        tabIndex={href || onRowClick ? 0 : undefined}
        className={cn(
          "group border-b border-line transition-colors last:border-b-0",
          (href || onRowClick) && "cursor-pointer hover:bg-primary-50/50 focus-visible:bg-primary-50/60 focus-visible:outline-none",
          isSel && "bg-primary-50/70",
        )}
      >
        {selectable && (
          <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSel}
              aria-label="Select row"
              onChange={() => onSelectedChange?.(isSel ? sel.filter((x) => x !== r.id) : [...sel, r.id])}
            />
          </td>
        )}
        {columns.map((c) => (
          <td
            key={c.key}
            className={cn(
              dense ? "h-9 py-1" : "h-11 py-2",
              "px-3 text-sm leading-snug text-ink",
              c.align === "right" ? "tabular text-right" : c.align === "center" ? "text-center" : "text-left",
              c.className,
            )}
          >
            {c.cell(r)}
          </td>
        ))}
      </tr>
    );
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-3">
          <Inbox className="size-5 text-ink-3" />
        </span>
        {empty ?? (
          <>
            <div className="text-sm font-medium">No records match</div>
            <div className="text-xs text-ink-3">Try a different search or clear filters.</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {selectable && (
              <th className="sticky top-0 z-[1] h-10 w-10 border-b border-line bg-surface-2 px-3 text-left">
                <Checkbox
                  checked={allSelected}
                  aria-label="Select all"
                  onChange={() => onSelectedChange?.(allSelected ? [] : rows.map((r) => r.id))}
                />
              </th>
            )}
            {columns.map(headerCell)}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map(([g, gr]) => {
                const isCollapsed = collapsed.includes(g);
                return (
                  <React.Fragment key={g}>
                    <tr
                      className="cursor-pointer bg-surface-3/70 hover:bg-surface-3"
                      onClick={() => setCollapsed((c) => (isCollapsed ? c.filter((x) => x !== g) : [...c, g]))}
                    >
                      <td colSpan={columns.length + (selectable ? 1 : 0)} className="h-9 border-b border-line px-3 text-sm font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <ChevronDown className={cn("size-4 text-ink-3 transition-transform", isCollapsed && "-rotate-90")} />
                          {groupLabel ? groupLabel(g) : g}
                          <span className="ml-1 rounded-full bg-surface px-1.5 text-xs font-medium text-ink-3">{gr.length}</span>
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed && gr.map(renderRow)}
                  </React.Fragment>
                );
              })
            : rows.map(renderRow)}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr>
              {selectable && <td className="border-t border-line-strong bg-surface-2" />}
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cn(
                    "h-9 border-t border-line-strong bg-surface-2 px-3 text-sm font-semibold",
                    c.align === "right" && "tabular text-right",
                  )}
                >
                  {c.total ? c.total(rows) : i === 0 ? <span className="text-ink-3">Total</span> : null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
