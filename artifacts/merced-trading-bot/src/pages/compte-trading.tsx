import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, Building2, Hash, Lock, DollarSign, Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useSaveTradingAccount } from "@workspace/api-client-react";

const PLATFORMS = ["MetaTrader 4", "MetaTrader 5", "cTrader", "Exness", "Binance", "Bybit", "TradingView", "Autre"];

const TIMEFRAMES = [
  { value: "M5", label: "5 min" },
  { value: "M15", label: "15 min" },
  { value: "H1", label: "1 heure" },
  { value: "H4", label: "4 heures" },
];

const RISK_LEVELS = [
  { value: "LOW", label: "Faible", desc: "0,5% par trade" },
  { value: "MEDIUM", label: "Moyen", desc: "1% par trade" },
  { value: "HIGH", label: "Élevé", desc: "1,5% par trade" },
];

export default function ComptéTrading() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const save = useSaveTradingAccount();

  const [step, setStep] = useState(1);
  const [platformName, setPlatformName] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [capital, setCapital] = useState("");
  const [profitTarget, setProfitTarget] = useState("");
  const [riskLevel, setRiskLevel] = useState("MEDIUM");
  const [timeframe, setTimeframe] = useState("H1");

  const finalPlatform = platformName === "Autre" ? customPlatform : platformName;

  const handleSubmit = async () => {
    if (!finalPlatform || !accountId || !capital || !profitTarget) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir tous les champs obligatoires." });
      return;
    }
    try {
      await save.mutateAsync({
        data: {
          platformName: finalPlatform,
          accountId,
          accountPassword: accountPassword || null,
          capital: parseFloat(capital),
          profitTarget: parseFloat(profitTarget),
          riskLevel,
          timeframe,
        },
      });
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Une erreur est survenue.";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-background pointer-events-none" />

      <div className="relative flex flex-col flex-1 px-6 py-safe-top max-w-md mx-auto w-full">
        {/* Header */}
        <div className="pt-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
              <Activity className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configuration du compte</h1>
              <p className="text-xs text-muted-foreground">Étape {step} sur 2</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-bold mb-1">Votre plateforme</h2>
              <p className="text-sm text-muted-foreground">Sélectionnez votre plateforme de trading.</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Plateforme de trading</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatformName(p)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                      platformName === p
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card/50 text-foreground hover:border-accent/40"
                    }`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {platformName === "Autre" && (
              <div className="space-y-2">
                <Label htmlFor="custom" className="text-sm font-medium">Nom de la plateforme</Label>
                <Input
                  id="custom"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="ex: FTMO, FundedNext..."
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="accountId" className="text-sm font-medium">
                Identifiant du compte <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Numéro ou ID de compte"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountPwd" className="text-sm font-medium">
                Mot de passe du compte <span className="text-muted-foreground text-xs">(optionnel)</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accountPwd"
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Mot de passe du compte trader"
                  className="pl-10 h-12 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              size="lg"
              disabled={!finalPlatform || !accountId}
              onClick={() => setStep(2)}
              className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              Suivant
              <ChevronRight className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-bold mb-1">Capital & Objectifs</h2>
              <p className="text-sm text-muted-foreground">Configurez votre profil de risque.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital" className="text-sm font-medium">
                Capital actuel (USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="capital"
                  type="number"
                  min="100"
                  step="100"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="ex: 10000"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target" className="text-sm font-medium">
                Objectif de profit (USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="target"
                  type="number"
                  min="100"
                  step="100"
                  value={profitTarget}
                  onChange={(e) => setProfitTarget(e.target.value)}
                  placeholder="ex: 12000"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Niveau de risque</Label>
              <RadioGroup value={riskLevel} onValueChange={setRiskLevel} className="flex flex-col gap-2">
                {RISK_LEVELS.map((r) => (
                  <div
                    key={r.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      riskLevel === r.value ? "border-accent bg-accent/10" : "border-border bg-card/50 hover:border-accent/40"
                    }`}
                    onClick={() => setRiskLevel(r.value)}
                  >
                    <RadioGroupItem value={r.value} id={r.value} />
                    <div>
                      <div className="font-medium text-sm">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Unité de temps principale</Label>
              <div className="grid grid-cols-4 gap-2">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTimeframe(t.value)}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                      timeframe === t.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card/50 text-foreground hover:border-accent/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(1)}
                className="h-14 px-6 rounded-xl"
              >
                Retour
              </Button>
              <Button
                size="lg"
                disabled={!capital || !profitTarget || save.isPending}
                onClick={handleSubmit}
                className="flex-1 h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl"
              >
                {save.isPending ? (
                  <Activity className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                {save.isPending ? "Enregistrement…" : "Commencer à trader"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
