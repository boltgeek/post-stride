import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Lightbulb, Target, PenLine, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { createPurchase } from "@/lib/payments.functions";
import { toast } from "sonner";
import julienPhoto from "@/assets/julien-biloa.png";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Ton coach business — Routine Post" },
      { name: "description", content: "Julien Biloa, ton coach pour vendre sur Facebook et Instagram" },
    ],
  }),
});

const COACH_WHATSAPP = "237655948452";
const WA_MESSAGE = "Bonjour Julien, je suis intéressé(e) par ton coaching Facebook et Instagram 🙂";
const WA_LINK = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(WA_MESSAGE)}`;

// Pays utilisant le FCFA (XOF/XAF)
const FCFA_COUNTRIES = ["CM", "CI", "SN", "BF", "ML", "NE", "TG", "BJ", "GA", "CG", "CD", "TD", "CF", "GQ", "GW"];

type Currency = { code: string; symbol: string; rate: number; suffix: string };

function getCurrency(country: string): Currency {
  if (FCFA_COUNTRIES.includes(country)) return { code: "FCFA", symbol: "", rate: 1, suffix: " FCFA" };
  if (country === "MA") return { code: "MAD", symbol: "", rate: 0.0165, suffix: " MAD" };
  if (country === "TN") return { code: "TND", symbol: "", rate: 0.0052, suffix: " TND" };
  if (country === "DZ") return { code: "DZD", symbol: "", rate: 0.225, suffix: " DZD" };
  // EUR par défaut hors zone FCFA
  return { code: "EUR", symbol: "€", rate: 0.00152, suffix: "€" };
}

function formatPrice(fcfa: number, c: Currency): string {
  if (c.code === "FCFA") return `${fcfa.toLocaleString("fr-FR")} FCFA`;
  const value = fcfa * c.rate;
  const rounded = value < 10 ? value.toFixed(1) : Math.round(value).toString();
  return c.code === "EUR" ? `${rounded}${c.suffix}` : `${rounded}${c.suffix}`;
}

function CoachPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>({ code: "FCFA", symbol: "", rate: 1, suffix: " FCFA" });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    // Détection pays via API gratuite
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        if (d?.country_code) setCurrency(getCurrency(d.country_code));
      })
      .catch(() => {});
  }, []);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const services = [
    { icon: Lightbulb, title: "Idées de posts", desc: "Je t'aide à trouver les bons angles pour parler à ta cliente." },
    { icon: Target, title: "Stratégie & conversion", desc: "J'analyse ta page et te donne un plan concret pour vendre." },
    { icon: PenLine, title: "Rédaction à ta place", desc: "Tu n'écris plus rien, je le fais pour toi." },
  ];

  const testimonials = [
    { name: "Aïcha", initial: "A", text: "En 3 semaines, mes ventes ont doublé. Julien a complètement changé ma façon de poster." },
    { name: "Mariam", initial: "M", text: "Je n'avais plus d'idées. Maintenant j'ai un plan clair et mes clientes me répondent enfin." },
    { name: "Fatou", initial: "F", text: "Sa rédaction est magique. Mes posts ressemblent enfin à ce que je voulais dire." },
  ];

  const plans = [
    {
      name: "Starter",
      priceFcfa: 12500,
      desc: "Conseils et idées de posts, réponse sous 24h",
      features: ["Conseils personnalisés", "Idées de posts", "Réponse sous 24h"],
      highlight: false,
    },
    {
      name: "Essentielle",
      priceFcfa: 25000,
      desc: "Starter + audit page Facebook/Instagram + stratégie de conversion",
      features: ["Tout du Starter", "Audit Facebook & Instagram", "Stratégie de conversion"],
      highlight: true,
    },
    {
      name: "Premium",
      priceFcfa: 50000,
      desc: "Essentielle + rédaction de posts à ta place + suivi hebdomadaire",
      features: ["Tout de l'Essentielle", "Rédaction de tes posts", "Suivi hebdomadaire"],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* 1. En-tête */}
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Ton coach business</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ensemble, on transforme ta présence Facebook et Instagram en machine à ventes.
          </p>
        </header>

        {/* 2. Photo & présentation */}
        <section className="bg-card rounded-3xl p-6 shadow-card border border-border text-center mb-6 animate-slide-up">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full gradient-primary blur-xl opacity-30" />
            <img
              src={julienPhoto}
              alt="Julien Biloa, coach business"
              className="relative w-32 h-32 rounded-full object-cover border-4 border-card shadow-primary"
            />
          </div>
          <h2 className="text-xl font-bold text-foreground">Julien Biloa</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-3 max-w-xs mx-auto">
            J'aide les entrepreneures à vendre sur Facebook et Instagram
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-accent px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Disponible sous 24h
          </span>
        </section>

        {/* 3. Ce que je peux faire pour toi */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide px-1">
            Ce que je peux faire pour toi
          </h3>
          <div className="space-y-3">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-3 items-start">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-primary">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-0.5">{s.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Témoignages */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide px-1">
            Elles ont essayé
          </h3>
          <div className="space-y-3">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold text-sm">
                  {t.initial}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-1">{t.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Tarifs */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wide px-1">
            Tarifs
          </h3>
          <p className="text-xs text-muted-foreground mb-3 px-1">
            Affichés en {currency.code} selon ton pays
          </p>
          <div className="space-y-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-5 border ${
                  p.highlight
                    ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary shadow-primary"
                    : "bg-card border-border shadow-card"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Le + populaire
                  </span>
                )}
                <div className="flex items-baseline justify-between mb-1">
                  <h4 className="text-base font-bold text-foreground">{p.name}</h4>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary leading-none">{formatPrice(p.priceFcfa, currency)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/mois</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{p.desc}</p>
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 6. Bouton WhatsApp fixe */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full rounded-2xl h-14 text-base font-semibold bg-[#25D366] hover:bg-[#1fbb59] text-white shadow-2xl">
              <MessageCircle className="w-5 h-5 mr-2" />
              Contacter Julien sur WhatsApp
            </Button>
          </a>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
