"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/erp/list-page";
import type { Column } from "@/components/erp/data-table";
import { AttBadge, EmpCell, TypeBadge } from "@/components/hr/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/overlay";
import { workCentres } from "@/lib/data/masters";
import { useRole } from "@/lib/store/app";
import { attendanceFor, type Employee, type EmpType, isActive, useHr } from "@/lib/store/hr";
import { formatDate, formatINR, TODAY } from "@/lib/utils";

const DEPTS: Employee["department"][] = ["Production", "Quality", "Stores", "Maintenance", "Accounts", "Sales", "Admin"];

export default function EmployeesPage() {
  const router = useRouter();
  const role = useRole();
  const employees = useHr((s) => s.employees);
  const overrides = useHr((s) => s.overrides);
  const [open, setOpen] = React.useState(false);

  const today = (e: Employee) => attendanceFor(e, TODAY, overrides);
  const onShift = (e: Employee) => {
    const r = today(e);
    return !!r && (r.status === "present" || r.status === "late") && !r.out;
  };
  const active = employees.filter(isActive);
  const exitedYear = employees.filter((e) => e.exitOn && e.exitOn > "2025-10-02" && e.exitOn <= TODAY).length;
  const attrition = (exitedYear / Math.max(active.length + exitedYear / 2, 1)) * 100;

  const columns: Column<Employee>[] = [
    { key: "name", header: "Employee", value: (e) => e.name, cell: (e) => <EmpCell e={e} link={false} /> },
    { key: "dept", header: "Department", value: (e) => e.department, cell: (e) => e.department },
    {
      key: "type",
      header: "Type",
      value: (e) => e.type,
      cell: (e) => (
        <span className="flex flex-col items-start gap-0.5">
          <TypeBadge type={e.type} />
          {e.agency && <span className="text-2xs text-ink-3">{e.agency}</span>}
        </span>
      ),
    },
    { key: "shift", header: "Shift", align: "center", value: (e) => e.defaultShift, cell: (e) => <span className="font-mono text-xs font-semibold">{e.defaultShift}</span> },
    {
      key: "wc",
      header: "Work centres",
      value: (e) => e.workCentres.length,
      cell: (e) =>
        e.workCentres.length ? (
          <span className="flex flex-wrap gap-1">
            {e.workCentres.map((w) => (
              <span key={w} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-ink-2">{workCentres.find((x) => x.id === w)?.code}</span>
            ))}
          </span>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: "today",
      header: "Today",
      value: (e) => today(e)?.status ?? "",
      cell: (e) => {
        const r = today(e);
        if (!isActive(e)) return <Badge tone="neutral" dot={false}>Exited {formatDate(e.exitOn)}</Badge>;
        if (!r) return <span className="text-ink-3">—</span>;
        return (
          <span className="flex items-center gap-2">
            <AttBadge status={r.status} />
            {r.in && <span className="tabular text-xs text-ink-3">{r.in}{r.out ? `-${r.out}` : " →"}</span>}
          </span>
        );
      },
    },
    { key: "joined", header: "Joined", value: (e) => e.joinedOn, cell: (e) => formatDate(e.joinedOn) },
    { key: "rate", header: "Labour ₹/h", align: "right", cost: true, value: (e) => e.labourRate, cell: (e) => (e.labourRate ? formatINR(e.labourRate) : <span className="text-ink-3">Indirect</span>) },
  ];

  return (
    <>
      <ListPage
        title="Employees"
        subtitle="Employee master — operators sign in on shop-floor terminals; labour rate feeds order costing"
        crumbs={[{ label: "People", href: "/hr/employees" }, { label: "Employees" }]}
        rows={employees}
        columns={columns}
        href={(e) => `/hr/employees/${e.id}`}
        search={(e) => `${e.name} ${e.nameHi} ${e.code} ${e.designation} ${e.department} ${e.agency ?? ""}`}
        placeholder="Search name (English / हिन्दी), code, designation…"
        defaultFilters={["active"]}
        onNew={() => setOpen(true)}
        newLabel="New employee"
        stats={[
          { label: "Headcount", value: active.length, hint: `${active.filter((e) => e.department === "Production").length} in production`, filter: "active" },
          { label: "On shift now", value: active.filter(onShift).length, hint: "Shift A · clocked in, not out", tone: "success", filter: "onshift" },
          { label: "Contract labour", value: active.filter((e) => e.type === "contract").length, hint: `${new Set(active.map((e) => e.agency).filter(Boolean)).size} agencies · CLRA register`, tone: "warning", filter: "contract" },
          { label: "Attrition (12 mo)", value: `${attrition.toFixed(1)}%`, hint: `${exitedYear} exit${exitedYear === 1 ? "" : "s"} since Oct 2025`, tone: attrition > 10 ? "danger" : "default", filter: "exited" },
        ]}
        filters={[
          { key: "active", label: "Active", group: "s", test: isActive },
          { key: "exited", label: "Exited", group: "s", test: (e) => !isActive(e) },
          { key: "onshift", label: "On shift now", group: "t", test: onShift },
          { key: "absent", label: "Absent today", group: "t", test: (e) => today(e)?.status === "absent" },
          { key: "permanent", label: "Permanent", group: "type", test: (e) => e.type === "permanent" },
          { key: "contract", label: "Contract", group: "type", test: (e) => e.type === "contract" },
          { key: "trainee", label: "Trainee", group: "type", test: (e) => e.type === "trainee" },
          { key: "operator", label: "Has terminal PIN", group: "o", test: (e) => !!e.operatorId },
        ]}
        groups={[
          { key: "dept", label: "Department", by: (e) => e.department },
          { key: "type", label: "Employment type", by: (e) => e.type },
          { key: "shift", label: "Shift", by: (e) => `Shift ${e.defaultShift}` },
          { key: "agency", label: "Contractor agency", by: (e) => e.agency ?? "Direct (on payroll)" },
        ]}
        bulkActions={[
          { label: "Send WhatsApp", icon: <MessageCircle className="size-3.5" />, run: (rows) => toast.success(`Message queued to ${rows.length} employees`, { description: "Approved template: shift_update" }) },
        ]}
      />
      <NewEmployeeDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => {
          toast.success("Employee created", { description: role.seesCost ? "Set labour rate and statutory IDs on the record" : "HR will complete pay details" });
          router.push(`/hr/employees/${id}`);
        }}
      />
    </>
  );
}

function NewEmployeeDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const employees = useHr((s) => s.employees);
  const [f, setF] = React.useState({ name: "", department: "Production" as Employee["department"], designation: "", type: "permanent" as EmpType, agency: "", shift: "A" as Employee["defaultShift"], joinedOn: TODAY, phone: "" });
  const [err, setErr] = React.useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Required";
    if (!f.designation.trim()) e.designation = "Required";
    if (f.type === "contract" && !f.agency.trim()) e.agency = "Contract labour must name the contractor (CLRA)";
    if (f.phone && !/^\+?[\d ]{10,14}$/.test(f.phone)) e.phone = "Enter a 10-digit mobile number";
    setErr(e);
    if (Object.keys(e).length) return;
    const n = employees.length + 1;
    const base = employees[0];
    const emp: Employee = {
      ...base,
      id: `e${Date.now()}`,
      code: `EMP-${1000 + n}`,
      name: f.name.trim(),
      nameHi: "",
      operatorId: undefined,
      department: f.department,
      designation: f.designation.trim(),
      type: f.type,
      agency: f.type === "contract" ? f.agency.trim() : undefined,
      joinedOn: f.joinedOn,
      exitOn: undefined,
      phone: f.phone || "—",
      uan: undefined,
      esic: undefined,
      payBasis: f.type === "contract" ? "daily" : "monthly",
      payRate: 0,
      labourRate: 0,
      defaultShift: f.shift,
      workCentres: [],
      skills: {},
      documents: [],
      activities: [{ id: `c${Date.now()}`, at: `${TODAY}T14:05:00`, user: "Rajesh Agarwal", kind: "created", text: "Employee created", device: "Chrome · Windows" }],
    };
    useHr.setState((s) => ({ employees: [...s.employees, emp], roster: { ...s.roster, [emp.id]: Array.from({ length: 7 }, (_, d) => (d === 6 ? "O" : f.shift)) } }));
    onOpenChange(false);
    setF({ name: "", department: "Production", designation: "", type: "permanent", agency: "", shift: "A", joinedOn: TODAY, phone: "" });
    onCreated(emp.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New employee"
      description="Basic details now — statutory IDs, bank and skills can be added on the record."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}><UserPlus /> Create employee</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field layout="vertical" label="Full name" required error={err.name} htmlFor="ne-name"><Input id="ne-name" aria-invalid={!!err.name} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="As per Aadhaar" /></Field>
        <Field layout="vertical" label="Mobile" error={err.phone} htmlFor="ne-ph"><Input id="ne-ph" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXX XXXXX" /></Field>
        <Field layout="vertical" label="Department" htmlFor="ne-dept">
          <Select id="ne-dept" value={f.department} onChange={(e) => set("department", e.target.value as Employee["department"])}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</Select>
        </Field>
        <Field layout="vertical" label="Designation" required error={err.designation} htmlFor="ne-des"><Input id="ne-des" aria-invalid={!!err.designation} value={f.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. CNC operator" /></Field>
        <Field layout="vertical" label="Employment type" htmlFor="ne-type">
          <Select id="ne-type" value={f.type} onChange={(e) => set("type", e.target.value as EmpType)}>
            <option value="permanent">Permanent (on payroll)</option>
            <option value="contract">Contract labour (via agency)</option>
            <option value="trainee">Trainee / apprentice</option>
          </Select>
        </Field>
        <Field layout="vertical" label="Contractor agency" required={f.type === "contract"} error={err.agency} htmlFor="ne-ag">
          <Input id="ne-ag" disabled={f.type !== "contract"} aria-invalid={!!err.agency} value={f.agency} onChange={(e) => set("agency", e.target.value)} placeholder={f.type === "contract" ? "e.g. Sai Manpower Services" : "Only for contract labour"} />
        </Field>
        <Field layout="vertical" label="Default shift" htmlFor="ne-sh">
          <Select id="ne-sh" value={f.shift} onChange={(e) => set("shift", e.target.value as Employee["defaultShift"])}>
            <option value="A">Shift A · 07:00-15:30</option>
            <option value="B">Shift B · 15:30-00:00</option>
            <option value="C">Shift C · 23:30-07:00</option>
          </Select>
        </Field>
        <Field layout="vertical" label="Date of joining" htmlFor="ne-doj"><Input id="ne-doj" type="date" value={f.joinedOn} onChange={(e) => set("joinedOn", e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}
