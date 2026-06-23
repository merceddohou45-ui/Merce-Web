import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

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

  const features = [
    { icon: Zap, label: "Signaux haute précision" },
    { icon: TrendingUp, label: "Analyse technique complète" },
    { icon: Shield, label: "Gestion du risque intégrée" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-background pointer-events-none" />

      <div className="relative flex flex-col flex-1 items-center justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-12"
        >
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-5 mb-6 shadow-lg shadow-accent/10">
            <Activity className="h-14 w-14 text-accent" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Merced</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-widest">Intelligence</p>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-semibold leading-tight mb-3">
            Tradez avec précision,<br />pas avec émotion.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Signaux de trading basés sur l'analyse technique complète — RSI, EMA, MACD et plus encore.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3 w-full mb-10"
        >
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 bg-card/50 border border-border rounded-xl px-4 py-3">
              <div className="bg-accent/10 rounded-lg p-1.5">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3 w-full"
        >
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl shadow-lg shadow-accent/20"
            onClick={() => setLocation("/inscription")}
          >
            S'inscrire
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base font-semibold rounded-xl border-border"
            onClick={() => setLocation("/connexion")}
          >
            Se connecter
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
