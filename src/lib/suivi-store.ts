// Local storage for Suivi (CRM léger) — prospects, ventes, produits, profil
export type ProspectStatus = "Nouveau" | "Relancé" | "Converti" | "Perdu";
export type SaleStatus = "Payé" | "Doit encore";
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

const KEY = "routinepost.suivi.v1";

interface SuiviData {
  profile: SuiviProfile | null;
  products: Product[];
  prospects: Prospect[];
  sales: Sale[];
}

const DEFAULT: SuiviData = {
  profile: null,
  products: [],
  prospects: [],
  sales: [],
};

export function loadSuivi(): SuiviData {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function saveSuivi(data: SuiviData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("suivi-updated"));
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
