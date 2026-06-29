import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Activity,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Target,
  ArrowRight,
  CheckCircle2,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

const features = [
  {
    icon: Zap,
    title: "Signaux haute précision",
    desc: "Basés sur RSI, EMA 20/50, MACD et niveaux de support/résistance calculés en temps réel.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: TrendingUp,
    title: "Données de marché réelles",
    desc: "Prix live depuis Twelve Data — les mêmes cours que sur MT5, Binance et Exness.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Shield,
    title: "Gestion du risque intégrée",
    desc: "Stop Loss, TP1/TP2/TP3 et taille de position calculés automatiquement selon votre capital.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Globe2,
    title: "Multi-broker",
    desc: "Compatible MetaTrader 4/5, Exness, Binance, Bybit, cTrader et plus encore.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

const stats = [
  { value: "≥4", label: "Conditions requises par signal" },
  { value: "RSI", label: "14 périodes temps réel" },
  { value: "EMA", label: "20 & 50 croisement dynamique" },
  { value: "MACD", label: "12/26/9 confirmé" },
];

const checklist = [
  "Entrée = prix live du marché",
  "Stop Loss calculé selon votre profil de risque",
  "3 niveaux de Take Profit",
  "Confiance basée sur les conditions techniques réunies",
  "Historique complet de tous les signaux",
  "Portefeuille avec suivi P&L",
];

export default function Bienvenue() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading } = useGetMe();

  useEffect(() => {
    if (!isLoading && me) {
      setLocation(me.hasAccount ? "/dashboard" : "/compte-trading");
    }
  }, [me, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="bg-accent/15 border border-accent/20 rounded-xl p-2">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <span className="font-bold text-lg tracking-tight">Merced</span>
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest hidden sm:block">Intelligence</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/connexion")}
          >
            Se connecter
          </Button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg"
            onClick={() => setLocation("/inscription")}
          >
            S'inscrire
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono text-accent uppercase tracking-wider">Données live • Twelve Data</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Tradez avec
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-emerald-400 to-teal-400">
              précision réelle
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Signaux de trading calculés sur de vraies données OHLC — RSI, EMA, MACD, Support/Résistance.
            Le prix d'entrée correspond toujours au cours live visible sur MT5.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-lg shadow-accent/20 gap-2"
              onClick={() => setLocation("/inscription")}
            >
              Commencer gratuitement
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold rounded-xl border-border"
              onClick={() => setLocation("/connexion")}
            >
              Se connecter
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-card/50 border border-border rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-accent mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Dashboard preview mock */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/30"
        >
          <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-destructive/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <span className="h-3 w-3 rounded-full bg-accent/60" />
            </div>
            <div className="text-xs text-muted-foreground font-mono">Tableau de bord — Signaux en direct</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent font-mono">LIVE</span>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {/* Mock signal card BUY */}
            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> ACHAT
                  </span>
                  <span className="font-bold">XAUUSD</span>
                  <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">H1</span>
                </div>
                <span className="bg-accent/15 text-accent text-xs font-bold px-2.5 py-1 rounded-full">92% CONF</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Entrée</div>
                  <div className="font-mono font-semibold">2 354.18</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Stop</div>
                  <div className="font-mono font-semibold text-destructive">2 337.72</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">TP1</div>
                  <div className="font-mono font-semibold text-accent">2 378.91</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Risque</div>
                  <div className="font-mono font-semibold">1.0%</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground border-t border-border/40 pt-2">
                <span className="font-semibold text-foreground/70">ANALYSE :</span>{" "}
                EMA 20 au-dessus d'EMA 50 — tendance haussière confirmée
              </div>
            </div>

            {/* Mock signal card SELL */}
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> VENTE
                  </span>
                  <span className="font-bold">EURUSD</span>
                  <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">H1</span>
                </div>
                <span className="bg-destructive/15 text-destructive text-xs font-bold px-2.5 py-1 rounded-full">85% CONF</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Entrée</div>
                  <div className="font-mono font-semibold">1.08142</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Stop</div>
                  <div className="font-mono font-semibold text-destructive">1.08931</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">TP1</div>
                  <div className="font-mono font-semibold text-accent">1.07565</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Risque</div>
                  <div className="font-mono font-semibold">1.0%</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Analyse technique complète</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Chaque signal est validé par au moins 4 indicateurs techniques convergents.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/60 border border-border rounded-2xl p-6 hover:border-accent/30 transition-colors"
              >
                <div className={`${f.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* What's included */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 mb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Tout ce dont vous avez besoin pour trader
            </h2>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: "RSI 14 périodes", val: "Temps réel" },
              { icon: TrendingUp, label: "EMA 20/50", val: "Croisement live" },
              { icon: Activity, label: "MACD 12/26/9", val: "Histogramme" },
              { icon: Target, label: "Support & Résistance", val: "20 derniers bars" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-card/50 border border-border rounded-xl p-4">
                  <Icon className="h-5 w-5 text-accent mb-2" />
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.val}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-accent/10 via-card to-card border border-accent/20 rounded-3xl p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à trader avec des données réelles ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Créez votre compte en quelques secondes. Configurez votre profil de risque et commencez à recevoir des signaux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-lg shadow-accent/25 gap-2"
              onClick={() => setLocation("/inscription")}
            >
              Créer mon compte
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-base font-semibold rounded-xl"
              onClick={() => setLocation("/connexion")}
            >
              Déjà inscrit ? Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-accent" />
          <span className="font-semibold text-foreground">Merced Intelligence</span>
        </div>
        <p>Signaux de trading éducatifs. Le trading comporte des risques — tradez de manière responsable.</p>
      </footer>
    </div>
  );
}
