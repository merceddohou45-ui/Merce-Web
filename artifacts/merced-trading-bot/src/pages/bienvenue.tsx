import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  BarChart3,
  Target,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Lock,
  ChevronRight,
  Activity,
  Loader2,
} from "lucide-react";
import { MtbLogo } from "@/components/mtb-logo";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const features = [
  {
    icon: Zap,
    title: "Signaux haute précision",
    desc: "5 timeframes analysés en simultané: M1, M5, M15, H1 et H4. Chaque signal exige ≥88% de confiance.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: TrendingUp,
    title: "Données de marché réelles",
    desc: "Prix live depuis Twelve Data — les mêmes cours que sur MT5, Binance et Exness. Zéro donnée simulée.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    icon: Shield,
    title: "Gestion du risque intégrée",
    desc: "Stop Loss basé sur l'ATR H4, TP1/TP2/TP3 automatiques. Risk-reward minimum 1:1.6.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Globe2,
    title: "Multi-broker & multi-actif",
    desc: "Compatible MetaTrader 4/5, Exness, Binance, Bybit. Forex, métaux, crypto et indices.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];

const stats = [
  { value: "5 TF", label: "M1·M5·M15·H1·H4" },
  { value: "≥88%", label: "Confiance minimale" },
  { value: "1:1.6+", label: "Risk-reward minimum" },
  { value: "Live", label: "Prix Twelve Data" },
];

const checklist = [
  "Prix d'entrée = cours live du marché (Twelve Data)",
  "Filtre macro H4 — signaux alignés avec la tendance long terme",
  "Stop Loss calculé via ATR — adapté à la volatilité réelle",
  "3 niveaux de Take Profit (TP1/TP2/TP3)",
  "Confiance basée sur 11 conditions techniques pondérées",
  "Historique complet des signaux avec P&L",
  "Notifications push en temps réel (PWA)",
  "Portefeuille avec suivi de positions ouvertes",
];

const indicators = [
  { icon: BarChart3, label: "RSI 14 périodes", val: "Survendu / suracheté" },
  { icon: TrendingUp, label: "EMA 9/20/50", val: "Alignement multi-TF" },
  { icon: Activity, label: "MACD 12/26/9", val: "Croisements + histogramme" },
  { icon: Target, label: "Support & Résistance", val: "Swing points H1/H4" },
  { icon: Shield, label: "ATR 14 périodes", val: "Volatilité adaptative" },
  { icon: Globe2, label: "Structure de marché", val: "HH/HL · LH/LL" },
];

// ─── Mock signal card ─────────────────────────────────────────────────────────
function MockSignalCard({
  pair,
  dir,
  conf,
  entry,
  sl,
  tp1,
  tf,
  reason,
}: {
  pair: string;
  dir: "BUY" | "SELL";
  conf: number;
  entry: string;
  sl: string;
  tp1: string;
  tf: string;
  reason: string;
}) {
  const isBuy = dir === "BUY";
  return (
    <div
      className={`p-4 rounded-xl border ${
        isBuy ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              isBuy
                ? "bg-accent text-accent-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isBuy ? "ACHAT" : "VENTE"}
          </span>
          <span className="font-bold text-sm">{pair}</span>
          <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
            {tf}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            isBuy ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
          }`}
        >
          {conf}% CONF
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <div className="text-muted-foreground text-xs mb-1">Entrée</div>
          <div className="font-mono font-semibold text-sm">{entry}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Stop</div>
          <div className="font-mono font-semibold text-sm text-destructive">{sl}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">TP1</div>
          <div className={`font-mono font-semibold text-sm ${isBuy ? "text-accent" : "text-accent"}`}>{tp1}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Risque</div>
          <div className="font-mono font-semibold text-sm">1.0%</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground border-t border-border/40 pt-2 leading-relaxed">
        <span className="font-semibold text-foreground/60">ANALYSE :</span>{" "}
        {reason}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <div className="absolute top-[-10%] left-1/4 w-[700px] h-[700px] bg-accent/6 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-5%] right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-purple-500/4 rounded-full blur-[120px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <MtbLogo size={38} showWordmark />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-sm"
            onClick={() => setLocation("/connexion")}
          >
            Se connecter
          </Button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg text-sm font-semibold shadow-md shadow-accent/20 gap-1.5"
            onClick={() => setLocation("/inscription")}
          >
            S'inscrire
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent/10 border border-accent/25 mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono text-accent uppercase tracking-widest">
              Données live · Twelve Data API
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto">
            Tradez avec
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-emerald-400 to-teal-500">
              précision réelle
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Signaux calculés sur de vraies données OHLC multi-timeframe (M1→H4) — 
            RSI, EMA, MACD, ATR et structure de marché. 
            L'entrée correspond toujours au cours live visible sur MT5.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-xl shadow-accent/25 gap-2"
              onClick={() => setLocation("/inscription")}
            >
              Commencer gratuitement
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-base font-semibold rounded-xl border-border/60 text-muted-foreground hover:text-foreground"
              onClick={() => setLocation("/connexion")}
            >
              Se connecter
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-card/60 border border-border/50 rounded-xl p-4 text-center backdrop-blur-sm"
              >
                <div className="text-2xl font-bold text-accent mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Dashboard preview ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-28">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
        >
          {/* Browser chrome */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="border-b border-border bg-muted/40 px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-destructive/50" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/50" />
                <span className="h-3 w-3 rounded-full bg-accent/50" />
              </div>
              <div className="text-xs text-muted-foreground font-mono flex-1 text-center">
                merced-trading-bot.replit.app/dashboard
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs text-accent font-mono">LIVE</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <MockSignalCard
                pair="XAUUSD"
                dir="BUY"
                conf={93}
                entry="2 354.18"
                sl="2 336.50"
                tp1="2 383.35"
                tf="M1/M5/M15/H1/H4"
                reason="Macro-tendance H4 haussière + croisement MACD H1 + englobement M1 — alignement parfait EMA9>EMA20>EMA50"
              />
              <MockSignalCard
                pair="EURUSD"
                dir="SELL"
                conf={89}
                entry="1.08142"
                sl="1.08621"
                tp1="1.07565"
                tf="M1/M5/M15/H1/H4"
                reason="Régime H4 baissier confirmé — résistance H1 atteinte + RSI suracheté + momentum M5 baissier"
              />
            </div>
          </div>

          {/* Caption */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Signaux illustratifs — les vrais signaux utilisent le prix live du marché
          </p>
        </motion.div>
      </section>

      {/* ── Features grid ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mb-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 mb-4">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Moteur MTB</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Analyse technique complète
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Chaque signal est validé par au moins 5 indicateurs techniques convergents sur 5 timeframes.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`bg-card/60 border ${f.border} rounded-2xl p-6 hover:border-accent/30 transition-colors`}
              >
                <div className={`${f.bg} border ${f.border} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold mb-2 text-sm leading-snug">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mb-28">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 mb-6">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Tout inclus</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight leading-tight">
              Tout ce dont vous avez besoin pour trader intelligemment
            </h2>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Indicators grid */}
          <div className="grid grid-cols-2 gap-3">
            {indicators.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="bg-card/50 border border-border/50 rounded-xl p-4 hover:border-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-accent/10 rounded-lg p-1.5">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </div>
                  </div>
                  <div className="text-sm font-semibold leading-snug">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.val}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Comment ça fonctionne</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            MTB analyse les marchés en continu et ne publie un signal que lorsque toutes les conditions sont réunies.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Surveillance continue",
              desc: "Le moteur analyse chaque actif toutes les 45 secondes sur les 5 timeframes en parallèle.",
              color: "text-accent",
            },
            {
              step: "02",
              title: "Validation multi-critères",
              desc: "Un signal n'est généré que si la confiance atteint ≥88% — soit 5+ conditions techniques validées simultanément.",
              color: "text-blue-400",
            },
            {
              step: "03",
              title: "Notification instantanée",
              desc: "Vous recevez une notification push avec l'entrée, le stop loss et les 3 niveaux de take profit.",
              color: "text-purple-400",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-card/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="text-5xl font-black text-muted-foreground/10 absolute top-4 right-5 leading-none select-none">
                {item.step}
              </div>
              <div className={`text-sm font-mono font-bold mb-3 ${item.color}`}>
                ÉTAPE {item.step}
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="bg-gradient-to-br from-accent/12 via-card/80 to-card border border-accent/20 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.06),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono text-accent uppercase tracking-widest">Prêt à trader</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Prêt à trader avec des données réelles ?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
              Créez votre compte en quelques secondes. Configurez votre profil de risque et commencez à recevoir des signaux de qualité institutionnelle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-12 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-2xl shadow-accent/30 gap-2"
                onClick={() => setLocation("/inscription")}
              >
                Créer mon compte gratuit
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-base font-semibold rounded-xl border-border/60"
                onClick={() => setLocation("/connexion")}
              >
                Déjà inscrit ? Se connecter
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="bg-accent/10 rounded-lg p-1.5">
            <Activity className="h-4 w-4 text-accent" />
          </div>
          <span className="font-bold text-foreground">Merced Trading Bot</span>
          <span className="font-mono text-xs text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 uppercase tracking-wider">
            MTB
          </span>
        </div>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Signaux de trading éducatifs basés sur l'analyse technique.
          Le trading comporte des risques — tradez de manière responsable.
        </p>
      </footer>
    </div>
  );
}
