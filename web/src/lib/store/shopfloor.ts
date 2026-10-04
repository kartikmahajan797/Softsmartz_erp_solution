"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMfg } from "@/lib/store/manufacturing";

/**
 * Operator terminal state (arch §13). Lives only on this device (localStorage stands in for IndexedDB).
 * Every action is an append-only event with a client-generated id and a gap-free device sequence.
 */

export type SfEventType = "job_start" | "job_pause" | "job_resume" | "job_stop" | "qty_report" | "correction";

export interface SfEvent {
  eventId: string;
  seq: number;
  deviceTime: string;
  type: SfEventType;
  job: string;
  operatorId: string;
  good?: number;
  reject?: number;
  reason?: string;
  reverses?: string;
  status: "pending" | "syncing" | "synced";
}

export interface SfJob {
  number: string;
  woNumber: string;
  itemId: string;
  opName: string;
  opNameHi: string;
  wcId: string;
  qtyPlanned: number;
  good: number;
  reject: number;
  status: "open" | "running" | "paused" | "completed";
}

export const TERMINAL = { code: "TAB-CNC-01", name: "CNC bay tablet", workCentres: ["wc1", "wc2", "wc6"] };

function seedJobs(): SfJob[] {
  const { jcs, wos, boms } = useMfg.getState();
  return jcs
    .filter((j) => TERMINAL.workCentres.includes(j.wcId) && j.status !== "completed")
    .map((j) => {
      const wo = wos.find((w) => w.id === j.woId)!;
      const op = boms.find((b) => b.id === wo.bomId)?.routing.find((r) => r.seq === j.seq);
      return {
        number: j.number,
        woNumber: wo.number,
        itemId: wo.itemId,
        opName: op?.name ?? `Operation ${j.seq}`,
        opNameHi: op?.nameHi ?? `ऑपरेशन ${j.seq}`,
        wcId: j.wcId,
        qtyPlanned: j.qtyPlanned,
        good: j.good,
        reject: j.reject,
        status: j.status,
      };
    });
}

/** UUIDv7-style id: time-ordered, so the server's primary key stays index-friendly. */
function uuidv7() {
  const ts = Date.now().toString(16).padStart(12, "0");
  const rnd = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${rnd().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${rnd().slice(1)}-${rnd()}${rnd()}${rnd()}`;
}

interface SfState {
  online: boolean;
  lang: "en" | "hi";
  operatorId: string | null;
  nextSeq: number;
  events: SfEvent[];
  jobs: SfJob[];
  setOnline: (o: boolean) => void;
  setLang: (l: "en" | "hi") => void;
  login: (operatorId: string) => void;
  logout: () => void;
  append: (e: Omit<SfEvent, "eventId" | "seq" | "deviceTime" | "status" | "operatorId">) => SfEvent;
  markStatus: (eventId: string, status: SfEvent["status"]) => void;
  reset: () => void;
}

export const useShopfloor = create<SfState>()(
  persist(
    (set, get) => ({
      online: true,
      lang: "hi",
      operatorId: null,
      nextSeq: 1201,
      events: [],
      jobs: seedJobs(),
      setOnline: (online) => set({ online }),
      setLang: (lang) => set({ lang }),
      login: (operatorId) => set({ operatorId }),
      logout: () => set({ operatorId: null }),
      append: (e) => {
        const ev: SfEvent = {
          ...e,
          eventId: uuidv7(),
          seq: get().nextSeq,
          deviceTime: new Date().toISOString(),
          operatorId: get().operatorId ?? "",
          status: "pending",
        };
        // Apply locally first (optimistic, < 1 s confirmation per NFR); server re-validates on sync.
        set((s) => ({
          nextSeq: s.nextSeq + 1,
          events: [...s.events, ev],
          jobs: s.jobs.map((j) => {
            if (j.number !== e.job) return j;
            switch (e.type) {
              case "job_start":
              case "job_resume":
                return { ...j, status: "running" };
              case "job_pause":
                return { ...j, status: "paused" };
              case "job_stop":
                return { ...j, status: "paused" };
              case "qty_report":
              case "correction":
                return { ...j, good: Math.max(0, j.good + (e.good ?? 0)), reject: Math.max(0, j.reject + (e.reject ?? 0)) };
              default:
                return j;
            }
          }),
        }));
        return ev;
      },
      markStatus: (eventId, status) => set((s) => ({ events: s.events.map((e) => (e.eventId === eventId ? { ...e, status } : e)) })),
      reset: () => set({ events: [], jobs: seedJobs(), nextSeq: 1201, operatorId: null }),
    }),
    { name: "factory-erp-shopfloor" },
  ),
);
