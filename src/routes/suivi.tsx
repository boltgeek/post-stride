import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Plus, AlertTriangle, Trophy, MessageCircle, Phone, X, Trash2, Wallet, Settings, LogOut, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useSuivi } from "@/hooks/use-suivi";
import {
  type Prospect, type Sale, type Product, type ProspectStatus, type SaleStatus,
  type Expense, type ExpenseCategory, type Currency, type SuiviSettings,
  uid, todayISO, daysBetween, isCurrentMonth,
} from "@/lib/suivi-store";
import { toast } from "sonner";

export const Route = createFileRoute("/suivi")({
  component: SuiviPage,
  head: () => ({
    meta: [
      { title: "Suivi — Routine Post" },
      { name: "description", content: "Suivi de tes prospects, ventes et bénéfices" },
    ],
  }),
});

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;
const waLink = (num: string, msg: string) =>
  `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

const STATUS_COLORS: Record<ProspectStatus, string> = {
  Nouveau: "bg-blue-100 text-blue-800",
  Relancé: "bg-amber-100 text-amber-800",
  Converti: "bg-emerald-100 text-emerald-800",
  Perdu: "bg-neutral-200 text-neutral-700",
};

function SuiviPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data, update } = useSuivi();
  const [showSetup, setShowSetup] = useState(false);
  const [showProspect, setShowProspect] = useState<Prospect | "new" | null>(null);
  const [showSale, setShowSale] = useState<Sale | "new" | null>(null);
  const [showExpense, setShowExpense] = useState<Expense | "new" | null>(null);
  const [showList, setShowList] = useState<"prospects" | "sales" | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!data.profile?.setupDone) setShowSetup(true);
  }, [data.profile?.setupDone]);

  const firstName = data.profile?.firstName || user?.email?.split("@")[0] || "";

  // Calculs auto
  const stats = useMemo(() => {
    const monthSales = data.sales.filter(s => isCurrentMonth(s.date));
    const paidSales = monthSales.filter(s => s.status === "Payée");
    const encaisse = paidSales.reduce((sum, s) => sum + s.amount, 0);
    const aRecuperer = monthSales
      .filter(s => s.status === "En attente")
      .reduce((sum, s) => sum + s.amount, 0);
    const depenses = data.expenses.filter(e => isCurrentMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const benefice = encaisse - depenses;
    const salesCount = monthSales.length;
    const avgSale = paidSales.length > 0 ? Math.round(encaisse / paidSales.length) : 0;

    // Produit star
    const productCount: Record<string, number> = {};
    monthSales.forEach(s => { productCount[s.productId] = (productCount[s.productId] || 0) + 1; });
    const starId = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const star = data.products.find(p => p.id === starId);

    // Prospects sans suivi 3+ jours (Nouveau ou Relancé)
    const today = todayISO();
    const stale = data.prospects.filter(p => {
      if (p.status === "Converti" || p.status === "Perdu") return false;
      const last = p.lastFollowUp || p.date;
      return daysBetween(last, today) >= 3;
    });

    // Prospects sans vente associée (match par whatsapp normalisé)
    const norm = (w: string) => (w || "").replace(/\D/g, "");
    const saleWhatsapps = new Set(data.sales.map(s => norm(s.whatsapp)).filter(Boolean));
    const monthProspects = data.prospects.filter(p => isCurrentMonth(p.date));
    const prospectsCount = monthProspects.length;
    const toFollowUp = monthProspects.filter(p =>
      p.status !== "Converti" && !saleWhatsapps.has(norm(p.whatsapp))
    ).length;

    // 5 dernières ventes (toutes)
    const recentSales = [...data.sales]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);

    return { encaisse, aRecuperer, depenses, benefice, star, stale,
             salesCount, avgSale, prospectsCount, toFollowUp, recentSales };
  }, [data]);

  const productById = (id: string) => data.products.find(p => p.id === id);

  return (
    <div className="min-h-screen bg-[hsl(40,40%,96%)] pb-32">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Greeting */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Bonjour {firstName} 👋
            </h1>
            <p className="text-sm text-neutral-600 mt-1">Voici ton suivi du mois</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Paramètres"
            className="shrink-0 mt-1 w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 active:scale-95 transition shadow-sm"
          >
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {/* Financial cards */}
        <div className="grid grid-cols-2 gap-3">
          <FinCard label="Encaissé ce mois" value={stats.encaisse} bg="bg-emerald-500" />
          <FinCard label="À récupérer" value={stats.aRecuperer} bg="bg-orange-500" />
          <FinCard label="Dépenses ce mois" value={stats.depenses} bg="bg-red-500" />
          <FinCard label="Bénéfice réel" value={stats.benefice} bg="bg-[hsl(220,40%,20%)]" />
        </div>

        {/* Smart alert */}
        {stats.stale.length > 0 && (
          <button
            onClick={() => setShowList("prospects")}
            className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-left active:scale-[0.98] transition"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">
                {stats.stale.length} prospect{stats.stale.length > 1 ? "s" : ""} sans réponse depuis 3 jours
              </p>
              <p className="text-xs text-amber-700 mt-0.5">→ Relancer maintenant</p>
            </div>
          </button>
        )}

        {/* Produit star */}
        {stats.star && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-neutral-800">
              <span className="text-amber-700">{stats.star.name}</span> — ton produit le plus vendu ce mois
            </p>
          </div>
        )}

        {/* Quick stats / lists */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowList("prospects")}
            className="bg-white rounded-2xl p-4 text-left shadow-sm border border-neutral-100 active:scale-95 transition"
          >
            <div className="text-2xl font-bold text-neutral-900">{data.prospects.length}</div>
            <div className="text-xs text-neutral-600 mt-1">Prospects</div>
          </button>
          <button
            onClick={() => setShowList("sales")}
            className="bg-white rounded-2xl p-4 text-left shadow-sm border border-neutral-100 active:scale-95 transition"
          >
            <div className="text-2xl font-bold text-neutral-900">{data.sales.filter(s => isCurrentMonth(s.date)).length}</div>
            <div className="text-xs text-neutral-600 mt-1">Ventes ce mois</div>
          </button>
        </div>

      </div>

      {/* Bottom CTAs */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-3 pt-3 bg-gradient-to-t from-[hsl(40,40%,96%)] via-[hsl(40,40%,96%)]/95 to-transparent">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-2">
          <Button
            onClick={() => {
              if (!data.products.length) { toast.error("Ajoute d'abord un produit"); setShowProducts(true); return; }
              setShowProspect("new");
            }}
            className="h-12 rounded-xl font-semibold text-sm px-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Prospect</span>
          </Button>
          <Button
            onClick={() => {
              if (!data.products.length) { toast.error("Ajoute d'abord un produit"); setShowProducts(true); return; }
              setShowSale("new");
            }}
            className="h-12 rounded-xl font-semibold text-sm px-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Vente</span>
          </Button>
          <Button
            onClick={() => setShowExpense("new")}
            className="h-12 rounded-xl font-semibold text-sm px-2 bg-red-500 hover:bg-red-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Dépense</span>
          </Button>
        </div>
      </div>

      <BottomNav />

      {/* Modals */}
      <SetupModal
        open={showSetup}
        onClose={() => setShowSetup(false)}
        onSave={(profile, products) => {
          update(d => ({ ...d, profile: { ...profile, setupDone: true }, products: [...d.products, ...products] }));
          setShowSetup(false);
        }}
      />

      <ProspectModal
        open={showProspect !== null}
        prospect={showProspect === "new" ? null : showProspect}
        products={data.products}
        onClose={() => setShowProspect(null)}
        onSave={(p) => {
          update(d => {
            const exists = d.prospects.find(x => x.id === p.id);
            return { ...d, prospects: exists ? d.prospects.map(x => x.id === p.id ? p : x) : [...d.prospects, p] };
          });
          setShowProspect(null);
          toast.success("Prospect enregistré");
        }}
        onDelete={(id) => {
          update(d => ({ ...d, prospects: d.prospects.filter(x => x.id !== id) }));
          setShowProspect(null);
        }}
      />

      <SaleModal
        open={showSale !== null}
        sale={showSale === "new" ? null : showSale}
        products={data.products}
        onClose={() => setShowSale(null)}
        onSave={(s) => {
          update(d => {
            const exists = d.sales.find(x => x.id === s.id);
            return { ...d, sales: exists ? d.sales.map(x => x.id === s.id ? s : x) : [...d.sales, s] };
          });
          setShowSale(null);
          toast.success("Vente enregistrée");
        }}
        onDelete={(id) => {
          update(d => ({ ...d, sales: d.sales.filter(x => x.id !== id) }));
          setShowSale(null);
        }}
      />

      <ExpenseModal
        open={showExpense !== null}
        expense={showExpense === "new" ? null : showExpense}
        onClose={() => setShowExpense(null)}
        onSave={(e) => {
          update(d => {
            const exists = d.expenses.find(x => x.id === e.id);
            return { ...d, expenses: exists ? d.expenses.map(x => x.id === e.id ? e : x) : [...d.expenses, e] };
          });
          setShowExpense(null);
          toast.success("Dépense enregistrée");
        }}
        onDelete={(id) => {
          update(d => ({ ...d, expenses: d.expenses.filter(x => x.id !== id) }));
          setShowExpense(null);
        }}
      />

      <ListModal
        type={showList}
        prospects={data.prospects}
        sales={data.sales}
        productById={productById}
        onClose={() => setShowList(null)}
        onOpenProspect={(p) => { setShowList(null); setShowProspect(p); }}
        onOpenSale={(s) => { setShowList(null); setShowSale(s); }}
        onMarkFollowUp={(id) => {
          update(d => ({
            ...d,
            prospects: d.prospects.map(p => p.id === id ? { ...p, status: "Relancé", lastFollowUp: todayISO() } : p),
          }));
        }}
      />

      <ProductsModal
        open={showProducts}
        products={data.products}
        activityType={data.profile?.activityType || "produits"}
        onClose={() => setShowProducts(false)}
        onAdd={(p) => update(d => ({ ...d, products: [...d.products, p] }))}
        onRemove={(id) => update(d => ({ ...d, products: d.products.filter(p => p.id !== id) }))}
      />

      <SettingsModal
        open={showSettings}
        firstName={data.profile?.firstName || ""}
        activityType={data.profile?.activityType || "produits"}
        settings={data.settings}
        onClose={() => setShowSettings(false)}
        onSaveProfile={(firstName, activityType) => {
          update(d => ({ ...d, profile: { ...(d.profile || { setupDone: true }), firstName, activityType, setupDone: true } }));
          toast.success("Profil mis à jour");
        }}
        onSaveSettings={(s) => {
          update(d => ({ ...d, settings: s }));
        }}
        onManageProducts={() => { setShowSettings(false); setShowProducts(true); }}
        onLogout={async () => {
          await signOut();
          navigate({ to: "/login" });
        }}
      />
    </div>
  );
}

function FinCard({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} text-white rounded-2xl p-4 shadow-md min-w-0`}>
      <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wide truncate">{label}</div>
      <div className="text-2xl font-extrabold mt-2 leading-none tracking-tight truncate">{fmt(value)}</div>
    </div>
  );
}

function ExpenseModal({ open, expense, onClose, onSave, onDelete }: {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Expense>(expense || {
    id: uid(), category: "Stock", amount: 0, date: todayISO(), note: "",
  });

  useEffect(() => {
    setForm(expense || { id: uid(), category: "Stock", amount: 0, date: todayISO(), note: "" });
  }, [expense, open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-500" />
            {expense ? "Dépense" : "Nouvelle dépense"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Catégorie">
            <Select value={form.category} onValueChange={(v: ExpenseCategory) => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Stock", "Livraison", "Publicité", "Autre"] as ExpenseCategory[]).map(c =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Montant (F)">
            <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="h-11" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-11" />
          </Field>
          <Field label="Note (optionnelle)">
            <Textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
          </Field>
        </div>
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose} className="h-11 rounded-xl">Annuler</Button>
            <Button onClick={() => onSave(form)} disabled={!form.amount} className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white">Enregistrer</Button>
          </div>
          {expense && (
            <Button variant="ghost" onClick={() => onDelete(expense.id)} className="w-full text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- SETUP MODAL ----------
function SetupModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (profile: { firstName: string; activityType: "produits" | "services" }, products: Product[]) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [activityType, setActivityType] = useState<"produits" | "services">("produits");
  const [items, setItems] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const addItem = () => {
    if (!name.trim() || !price) return;
    setItems([...items, { id: uid(), name: name.trim(), price: Number(price) }]);
    setName(""); setPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && firstName && items.length && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Bienvenue dans Suivi 👋</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ton prénom</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Aïcha" className="h-11" />
          </div>
          <div>
            <Label>Tu vends...</Label>
            <Select value={activityType} onValueChange={(v: any) => setActivityType(v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="produits">Des produits</SelectItem>
                <SelectItem value="services">Des services</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-3">
            <Label>Ajoute tes {activityType} (au moins 1)</Label>
            <div className="flex gap-2 mt-2">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom" className="h-11" />
              <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Prix" className="h-11 w-24" />
              <Button onClick={addItem} size="icon" className="h-11 w-11 shrink-0 bg-emerald-600"><Plus className="w-4 h-4" /></Button>
            </div>
            {items.length > 0 && (
              <ul className="mt-3 space-y-1">
                {items.map(p => (
                  <li key={p.id} className="flex justify-between text-sm bg-neutral-50 px-3 py-2 rounded-lg">
                    <span>{p.name}</span><span className="font-semibold">{fmt(p.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!firstName.trim() || items.length === 0}
            onClick={() => onSave({ firstName: firstName.trim(), activityType }, items)}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            Commencer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- PROSPECT MODAL ----------
function ProspectModal({ open, prospect, products, onClose, onSave, onDelete }: {
  open: boolean;
  prospect: Prospect | null;
  products: Product[];
  onClose: () => void;
  onSave: (p: Prospect) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Prospect>(prospect || {
    id: uid(), name: "", whatsapp: "", productId: products[0]?.id || "",
    date: todayISO(), note: "", status: "Nouveau",
  });

  useEffect(() => {
    setForm(prospect || {
      id: uid(), name: "", whatsapp: "", productId: products[0]?.id || "",
      date: todayISO(), note: "", status: "Nouveau",
    });
  }, [prospect, open]);

  const product = products.find(p => p.id === form.productId);
  const relance = () => {
    if (!form.whatsapp || !product) return;
    const msg = `Bonjour ${form.name} 😊 Je voulais juste te recontacter au sujet de ${product.name}. Est-ce que tu es toujours intéressée ?`;
    window.open(waLink(form.whatsapp, msg), "_blank");
    onSave({ ...form, status: "Relancé", lastFollowUp: todayISO() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prospect ? "Prospect" : "Nouveau prospect"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nom"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11" /></Field>
          <Field label="Numéro WhatsApp"><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="237..." className="h-11" /></Field>
          <Field label="Produit demandé">
            <Select value={form.productId} onValueChange={v => setForm({ ...form, productId: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-11" /></Field>
          <Field label="Note (optionnelle)"><Textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} /></Field>
          <Field label="Statut">
            <Select value={form.status} onValueChange={(v: ProspectStatus) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Nouveau", "Relancé", "Converti", "Perdu"] as ProspectStatus[]).map(s =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="space-y-2 pt-2">
          <Button onClick={relance} disabled={!form.whatsapp || !form.name} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <MessageCircle className="w-4 h-4 mr-2" /> Relancer sur WhatsApp
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose} className="h-11 rounded-xl">Annuler</Button>
            <Button onClick={() => onSave(form)} disabled={!form.name || !form.productId} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600">Enregistrer</Button>
          </div>
          {prospect && (
            <Button variant="ghost" onClick={() => onDelete(prospect.id)} className="w-full text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- SALE MODAL ----------
function SaleModal({ open, sale, products, onClose, onSave, onDelete }: {
  open: boolean;
  sale: Sale | null;
  products: Product[];
  onClose: () => void;
  onSave: (s: Sale) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Sale>(sale || {
    id: uid(), clientName: "", whatsapp: "", productId: products[0]?.id || "",
    amount: products[0]?.price || 0, status: "Payé", date: todayISO(),
  });

  useEffect(() => {
    setForm(sale || {
      id: uid(), clientName: "", whatsapp: "", productId: products[0]?.id || "",
      amount: products[0]?.price || 0, status: "Payé", date: todayISO(),
    });
  }, [sale, open]);

  const product = products.find(p => p.id === form.productId);
  const relancePaiement = () => {
    if (!form.whatsapp || !product) return;
    const msg = `Bonjour ${form.clientName} 😊 Il reste ${form.amountRemaining || 0}F pour ton ${product.name}. Quand est-ce que ça t'arrange ?`;
    window.open(waLink(form.whatsapp, msg), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? "Vente" : "Nouvelle vente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nom du client"><Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} className="h-11" /></Field>
          <Field label="Numéro WhatsApp"><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="237..." className="h-11" /></Field>
          <Field label="Produit vendu">
            <Select value={form.productId} onValueChange={v => {
              const p = products.find(x => x.id === v);
              setForm({ ...form, productId: v, amount: p?.price || form.amount });
            }}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Montant (F)"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="h-11" /></Field>
          <Field label="Statut">
            <Select value={form.status} onValueChange={(v: SaleStatus) => setForm({ ...form, status: v, amountRemaining: v === "Doit encore" ? (form.amountRemaining || form.amount) : undefined })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Payé">Payé</SelectItem>
                <SelectItem value="Doit encore">Doit encore</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.status === "Doit encore" && (
            <Field label="Montant restant (F)">
              <Input type="number" value={form.amountRemaining || 0} onChange={e => setForm({ ...form, amountRemaining: Number(e.target.value) })} className="h-11" />
            </Field>
          )}
          <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-11" /></Field>
        </div>
        <div className="space-y-2 pt-2">
          {form.status === "Doit encore" && (
            <Button onClick={relancePaiement} disabled={!form.whatsapp} className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600">
              <Phone className="w-4 h-4 mr-2" /> Relancer le paiement
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose} className="h-11 rounded-xl">Annuler</Button>
            <Button onClick={() => onSave(form)} disabled={!form.clientName || !form.productId} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700">Enregistrer</Button>
          </div>
          {sale && (
            <Button variant="ghost" onClick={() => onDelete(sale.id)} className="w-full text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- LIST MODAL ----------
function ListModal({ type, prospects, sales, productById, onClose, onOpenProspect, onOpenSale, onMarkFollowUp }: {
  type: "prospects" | "sales" | null;
  prospects: Prospect[];
  sales: Sale[];
  productById: (id: string) => Product | undefined;
  onClose: () => void;
  onOpenProspect: (p: Prospect) => void;
  onOpenSale: (s: Sale) => void;
  onMarkFollowUp: (id: string) => void;
}) {
  return (
    <Dialog open={type !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === "prospects" ? "Mes prospects" : "Mes ventes"}</DialogTitle>
        </DialogHeader>
        {type === "prospects" && (
          <div className="space-y-2">
            {prospects.length === 0 && <p className="text-sm text-neutral-500 text-center py-6">Aucun prospect</p>}
            {prospects.map(p => {
              const prod = productById(p.productId);
              const stale = p.status !== "Converti" && p.status !== "Perdu" && daysBetween(p.lastFollowUp || p.date, todayISO()) >= 3;
              return (
                <button key={p.id} onClick={() => onOpenProspect(p)} className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-left active:scale-[0.98] transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900 truncate">{p.name}</div>
                      <div className="text-xs text-neutral-600 truncate">{prod?.name || "—"}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  </div>
                  {stale && <div className="text-xs text-amber-700 font-medium mt-2">⚠ Sans suivi depuis 3+ jours</div>}
                </button>
              );
            })}
          </div>
        )}
        {type === "sales" && (
          <div className="space-y-2">
            {sales.length === 0 && <p className="text-sm text-neutral-500 text-center py-6">Aucune vente</p>}
            {sales.map(s => {
              const prod = productById(s.productId);
              return (
                <button key={s.id} onClick={() => onOpenSale(s)} className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-left active:scale-[0.98] transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900 truncate">{s.clientName}</div>
                      <div className="text-xs text-neutral-600 truncate">{prod?.name || "—"} · {s.date}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-neutral-900">{fmt(s.amount)}</div>
                      <div className={`text-[10px] font-semibold ${s.status === "Payé" ? "text-emerald-600" : "text-orange-600"}`}>
                        {s.status === "Payé" ? "Payé" : `Reste ${fmt(s.amountRemaining || 0)}`}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- PRODUCTS MODAL ----------
function ProductsModal({ open, products, activityType, onClose, onAdd, onRemove }: {
  open: boolean;
  products: Product[];
  activityType: "produits" | "services";
  onClose: () => void;
  onAdd: (p: Product) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const add = () => {
    if (!name.trim() || !price) return;
    onAdd({ id: uid(), name: name.trim(), price: Number(price) });
    setName(""); setPrice("");
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Mes {activityType}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom" className="h-11" />
          <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Prix" className="h-11 w-24" />
          <Button onClick={add} size="icon" className="h-11 w-11 shrink-0 bg-emerald-600"><Plus className="w-4 h-4" /></Button>
        </div>
        <ul className="space-y-1 max-h-72 overflow-y-auto">
          {products.map(p => (
            <li key={p.id} className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg">
              <span className="text-sm">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{fmt(p.price)}</span>
                <button onClick={() => onRemove(p.id)} className="text-neutral-400 hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-neutral-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ---------- SETTINGS MODAL ----------
function SettingsModal({
  open, firstName, activityType, settings, onClose,
  onSaveProfile, onSaveSettings, onManageProducts, onLogout,
}: {
  open: boolean;
  firstName: string;
  activityType: "produits" | "services";
  settings: SuiviSettings;
  onClose: () => void;
  onSaveProfile: (firstName: string, activityType: "produits" | "services") => void;
  onSaveSettings: (s: SuiviSettings) => void;
  onManageProducts: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const [name, setName] = useState(firstName);
  const [type, setType] = useState<"produits" | "services">(activityType);
  const [currency, setCurrency] = useState<Currency>(settings.currency);
  const [alerts, setAlerts] = useState<boolean>(settings.alertsEnabled);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (open) {
      setName(firstName);
      setType(activityType);
      setCurrency(settings.currency);
      setAlerts(settings.alertsEnabled);
    }
  }, [open, firstName, activityType, settings]);

  const profileDirty = name.trim() !== firstName || type !== activityType;
  const settingsDirty = currency !== settings.currency || alerts !== settings.alertsEnabled;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paramètres</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Mon profil */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Mon profil</h3>
              <Field label="Prénom">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              </Field>
              <Field label="Type d'activité">
                <Select value={type} onValueChange={(v: "produits" | "services") => setType(v)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produits">Produits</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button
                disabled={!name.trim() || !profileDirty}
                onClick={() => onSaveProfile(name.trim(), type)}
                className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
              >
                Enregistrer le profil
              </Button>
            </section>

            {/* Mes produits / services */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Mes {type}
              </h3>
              <button
                onClick={onManageProducts}
                className="w-full flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 h-12 text-sm font-medium text-neutral-800 active:scale-[0.98] transition"
              >
                <span>Gérer mes {type}</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            </section>

            {/* Préférences */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Préférences</h3>
              <Field label="Devise">
                <Select value={currency} onValueChange={(v: Currency) => setCurrency(v)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FCFA">FCFA</SelectItem>
                    <SelectItem value="XAF">XAF</SelectItem>
                    <SelectItem value="EUR">€ (Euro)</SelectItem>
                    <SelectItem value="USD">$ (Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 h-12">
                <div>
                  <div className="text-sm font-medium text-neutral-800">Alertes relance</div>
                  <div className="text-[11px] text-neutral-500">Prospects sans suivi 3+ jours</div>
                </div>
                <Switch checked={alerts} onCheckedChange={setAlerts} />
              </div>
              <Button
                disabled={!settingsDirty}
                onClick={() => onSaveSettings({ currency, alertsEnabled: alerts })}
                className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
              >
                Enregistrer les préférences
              </Button>
            </section>

            {/* Marketing — bientôt disponible */}
            <section className="space-y-2 opacity-60">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Marketing</h3>
              {["SMS Marketing", "WhatsApp Marketing"].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between bg-neutral-100 border border-neutral-200 rounded-xl px-4 h-12 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                    <Lock className="w-3.5 h-3.5" /> {label}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    Bientôt
                  </span>
                </div>
              ))}
            </section>

            {/* Compte */}
            <section className="pt-4 border-t border-neutral-200">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">Compte</h3>
              <button
                onClick={() => setConfirmLogout(true)}
                className="w-full h-12 rounded-xl bg-transparent text-red-600 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment vous déconnecter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { setConfirmLogout(false); await onLogout(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
