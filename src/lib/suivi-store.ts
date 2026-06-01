// Local storage for Suivi (CRM léger) — prospects, ventes, produits, profil
export type ProspectStatus = "Nouveau" | "Relancé" | "Converti" | "Perdu";
export type SaleStatus = "Payée" | "En attente";
export type ExpenseCategory = "Stock" | "Livraison" | "Publicité" | "Autre";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface Prospect {
  id: string;
  name: string;
  whatsapp: string;
  productId: string;
  date: string; // ISO date (YYYY-MM-DD)
  note?: string;
  status: ProspectStatus;
  lastFollowUp?: string; // ISO date
}

export interface Sale {
  id: string;
  clientName: string;
  whatsapp: string;
  productId: string;
  amount: number;
  status: SaleStatus;
  amountRemaining?: number;
  date: string; // ISO date
}

export interface SuiviProfile {
  firstName: string;
  activityType: "produits" | "services";
  setupDone: boolean;
}

const KEY_PREFIX = "routinepost.suivi.v1";
const LEGACY_KEY = "routinepost.suivi.v1";

function keyFor(userId: string | null | undefined) {
  return userId ? `${KEY_PREFIX}:${userId}` : null;
}

export type Currency = "FCFA" | "XAF" | "EUR" | "USD";

export interface SuiviSettings {
  currency: Currency;
  alertsEnabled: boolean;
}

interface SuiviData {
  profile: SuiviProfile | null;
  products: Product[];
  prospects: Prospect[];
  sales: Sale[];
  expenses: Expense[];
  settings: SuiviSettings;
}

const DEFAULT: SuiviData = {
  profile: null,
  products: [],
  prospects: [],
  sales: [],
  expenses: [],
  settings: { currency: "FCFA", alertsEnabled: true },
};

export function loadSuivi(userId?: string | null): SuiviData {
  if (typeof window === "undefined") return DEFAULT;
  const k = keyFor(userId);
  if (!k) return DEFAULT;
  try {
    let raw = localStorage.getItem(k);
    // One-time migration: if user-scoped key is empty but a legacy global key exists,
    // adopt it for this user, then delete the legacy key so it never leaks to others.
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy && legacy !== "null") {
        localStorage.setItem(k, legacy);
        localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    const merged: SuiviData = { ...DEFAULT, ...parsed };
    // Backward-compat: normalize old SaleStatus values
    merged.sales = (merged.sales || []).map((s: Sale) => {
      const status = (s.status as string) === "Payé" ? "Payée"
        : (s.status as string) === "Doit encore" ? "En attente"
        : s.status;
      return { ...s, status: (status || "Payée") as SaleStatus };
    });
    return merged;
  } catch {
    return DEFAULT;
  }
}

export function saveSuivi(data: SuiviData, userId?: string | null) {
  if (typeof window === "undefined") return;
  const k = keyFor(userId);
  if (!k) return; // no user → don't persist
  localStorage.setItem(k, JSON.stringify(data));
  window.dispatchEvent(new Event("suivi-updated"));
}

export function clearAllLegacySuivi() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_KEY);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / 86400000);
}

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isCurrentMonth(iso: string) {
  return iso.slice(0, 7) === currentMonthKey();
}
