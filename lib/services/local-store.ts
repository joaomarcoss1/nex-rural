import { isDemoMode } from "@/lib/env";

export type LocalRecord = Record<string, unknown> & { id: string; company_id?: string; created_at?: string; updated_at?: string };

export function listLocal<T extends LocalRecord>(key: string, fallback: T[] = []) {
  if (!isDemoMode) throw new Error("localStorage so pode ser usado com NEXT_PUBLIC_DEMO_MODE=true.");
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value ? (JSON.parse(value) as T[]) : fallback;
}

export function saveLocal<T extends LocalRecord>(key: string, rows: T[]) {
  if (!isDemoMode) throw new Error("localStorage so pode ser usado com NEXT_PUBLIC_DEMO_MODE=true.");
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(rows));
}

export function upsertLocal<T extends LocalRecord>(key: string, record: T, fallback: T[] = []) {
  const rows = listLocal<T>(key, fallback);
  const now = new Date().toISOString();
  const next = rows.some((row) => row.id === record.id)
    ? rows.map((row) => (row.id === record.id ? { ...row, ...record, updated_at: now } : row))
    : [{ ...record, created_at: now, updated_at: now }, ...rows];
  saveLocal(key, next as T[]);
  return record;
}

export function removeLocal<T extends LocalRecord>(key: string, id: string, fallback: T[] = []) {
  const next = listLocal<T>(key, fallback).filter((row) => row.id !== id);
  saveLocal(key, next);
}
