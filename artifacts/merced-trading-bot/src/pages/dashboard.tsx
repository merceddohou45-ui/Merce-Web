import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity, ArrowUpRight, ArrowDownRight, Target,
  TrendingUp, BarChart3, AlertTriangle,
  Crosshair, Shield, CheckCircle2, Clock, Bell, BellOff,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  useGetSignalStats,
  useGetAssets,
  useScanMarkets,
  useGetTradingAccount,
  useOpenPositionFromSignal,
  getGetPortfolioPositionsQueryKey,
  getGetPortfolioSummaryQueryKey,
  type Signal,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type LiveSignal = Signal & { dbId?: number };

function useEquityData(account: { capital?: number } | undefined) {
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const { data: stats } = useGetSignalStats();

  useEffect(() => {
    if (!account?.capital) return;
    const capital = Number(account.capital);
    const estimatedProfit = stats?.estimatedProfit ?? 0;
    const now = Date.now();
    const points = Array.from({ length: 12 }, (_, i) => {
      const fraction = i / 11;
      const value = capital + estimatedProfit * fraction;
      const d = new Date(now - (11 - i) * 60 * 60 * 1000);
      return {
        time: `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`,
        value: parseFloat(value.toFixed(2)),
      };
    });
    setEquityData(points);
  }, [account?.capital, stats?.estimatedProfit]);

  return equityData;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [confirmSignal, setConfirmSignal] = useState<LiveSignal | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: account, isLoading: loadingAccount } = useGetTradingAccount({ query: { retry: false } as any });
  const { data: stats } = useGetSignalStats({ query: { enabled: !!account } as any });
  const { data: assets } = useGetAssets({ query: { enabled: !!account } as any });
  const scanMarkets = useScanMarkets({ query: { enabled: false } as any });
  const openPosition = useOpenPositionFromSignal();
  const equityData = useEquityData(account);
  const { state: pushState, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();

  useEffect(() => {
    if (!loadingAccount && !account) {
      setLocation("/compte-trading");
    }
  }, [account, loadingAccount, setLocation]);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws/live-signals`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; data?: LiveSignal };
          if (msg.type === "signal" && msg.data) {
            setLiveSignals((prev) => [msg.data!, ...prev].slice(0, 10));
            setLastUpdate(new Date());
          }
        } catch {
          /* ignore malformed */
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleManualScan = () => {
    scanMarkets.refetch().then((res) => {
      if (res.data && res.data.length > 0) {
        setLiveSignals((prev) => [...(res.data as LiveSignal[]), ...prev].slice(0, 10));
        setLastUpdate(new Date());
      }
    });
  };

  const handleOpenedTrade = async () => {
    if (!confirmSignal) return;
    if (!confirmSignal.dbId) {
      toast({
        variant: "destructive",
        title: "Signal non enregistré",
        description: "Patientez un instant et réessayez.",
      });
      setConfirmSignal(null);
      return;
    }
    try {
      await openPosition.mutateAsync({ data: { signalId: confirmSignal.dbId } });
      toast({
        title: "Trade ajouté au portefeuille",
        description: `${confirmSignal.symbol} ${confirmSignal.direction === "BUY" ? "ACHAT" : "VENTE"} est maintenant suivi.`,
      });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioPositionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter le trade." });
    } finally {
      setConfirmSignal(null);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return "bg-accent text-accent-foreground";
    if (conf >= 70) return "bg-yellow-500 text-yellow-950";
    return "bg-destructive text-destructive-foreground";
  };

  if (loadingAccount || !account) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isWsConnected ? "bg-accent animate-pulse" : "bg-destructive"}`} />
              {isWsConnected ? "FLUX EN DIRECT" : "RECONNEXION…"}
            </span>
            <span>•</span>
            <span className="font-mono">{account.platformName}</span>
            <span>•</span>
            <span className="font-mono">{account.accountId}</span>
            {lastUpdate && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Màj {lastUpdate.toLocaleTimeString("fr-FR")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Push notification toggle */}
          {pushState !== "unsupported" && pushState !== "denied" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushState === "granted" ? unsubscribePush() : subscribePush()}
              disabled={pushState === "loading"}
              title={pushState === "granted" ? "Désactiver les alertes" : "Activer les alertes signal"}
              className={pushState === "granted" ? "border-accent/50 text-accent" : ""}
            >
              {pushState === "loading"
                ? <Activity className="h-4 w-4 animate-spin" />
                : pushState === "granted"
                ? <Bell className="h-4 w-4" />
                : <BellOff className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">
                {pushState === "granted" ? "Alertes actives" : "Alertes"}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualScan}
            disabled={scanMarkets.isFetching}
          >
            {scanMarkets.isFetching
              ? <Activity className="mr-2 h-4 w-4 animate-spin" />
              : <Crosshair className="mr-2 h-4 w-4" />}
            Analyser les marchés
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-xs text-muted-foreground">Taux de réussite</h3>
              <Target className="h-4 w-4 text-accent" />
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats?.winRate ? `${stats.winRate}%` : "--"}</div>
            <Progress value={stats?.winRate || 0} className="h-1 mt-3" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-xs text-muted-foreground">Profit estimé</h3>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className={`text-2xl md:text-3xl font-bold ${(stats?.estimatedProfit ?? 0) >= 0 ? "text-accent" : "text-destructive"}`}>
              {stats?.estimatedProfit !== undefined
                ? `${stats.estimatedProfit >= 0 ? "+" : ""}$${stats.estimatedProfit.toFixed(2)}`
                : "$0.00"}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Session en cours</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-xs text-muted-foreground">Signaux actifs</h3>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats?.activeSignals || 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Sur {stats?.totalSignals || 0} au total</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-xs text-muted-foreground">Confiance moy.</h3>
              <BarChart3 className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats?.avgConfidence ? `${stats.avgConfidence.toFixed(1)}%` : "--"}</div>
            <Progress value={stats?.avgConfidence || 0} className="h-1 mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Feed + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card className="border-card-border overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                <span>Flux de signaux en direct</span>
                <span className="text-muted-foreground font-mono font-normal text-xs">
                  {new Date().toISOString().split("T")[1]?.substring(0, 8)} UTC
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 min-h-[400px]">
              <div className="p-3 flex flex-col gap-2.5">
                <AnimatePresence initial={false}>
                  {liveSignals.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">En attente de setups haute probabilité…</p>
                      <p className="text-xs mt-1 opacity-60">Les signaux apparaissent quand ≥4 conditions techniques sont réunies</p>
                      <p className="text-xs mt-1 opacity-60">Analyse automatique toutes les 30 secondes via Twelve Data</p>
                    </div>
                  ) : (
                    liveSignals.map((signal, idx) => {
                      const isBuy = signal.direction === "BUY";
                      const analysis = (signal as any).analysisDetails;
                      return (
                        <motion.div
                          key={`${signal.symbol}-${signal.generatedAt ?? ""}-${idx}`}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`p-3 md:p-4 rounded-xl border ${isBuy ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}
                        >
                          {/* Header row */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${isBuy ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"} font-bold text-sm px-3`}>
                                {isBuy ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                                {isBuy ? "ACHAT" : "VENTE"}
                              </Badge>
                              <span className="font-bold text-base tracking-tight">{signal.symbol}</span>
                              <Badge variant="outline" className="font-mono text-xs">{signal.timeframe}</Badge>
                            </div>
                            <Badge className={getConfidenceColor(signal.confidence)}>
                              {signal.confidence}% CONF
                            </Badge>
                          </div>

                          {/* Price grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Entrée live</div>
                              <div className="font-mono font-bold text-foreground">{signal.entry}</div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Stop
                              </div>
                              <div className="font-mono font-medium text-destructive">{signal.stopLoss}</div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Target className="h-3 w-3" /> TP1
                              </div>
                              <div className="font-mono font-medium text-accent">{signal.takeProfit1}</div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">TP2</div>
                              <div className="font-mono font-medium text-accent/80">{signal.takeProfit2}</div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Risque
                              </div>
                              <div className="font-mono font-medium">{signal.riskPercent}%</div>
                            </div>
                          </div>

                          {/* Analysis details */}
                          {analysis && (
                            <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>RSI: <span className="font-mono text-foreground">{analysis.rsi}</span></div>
                              <div>EMA20: <span className="font-mono text-foreground">{analysis.ema20}</span></div>
                              <div>EMA50: <span className="font-mono text-foreground">{analysis.ema50}</span></div>
                              <div>Support: <span className="font-mono text-foreground">{analysis.supportLevel}</span></div>
                              <div>Résistance: <span className="font-mono text-foreground">{analysis.resistanceLevel}</span></div>
                              <div>Tendance: <span className={`font-mono ${analysis.trendDirection === "HAUSSE" ? "text-accent" : analysis.trendDirection === "BAISSE" ? "text-destructive" : "text-foreground"}`}>{analysis.trendDirection}</span></div>
                            </div>
                          )}

                          {/* Rationale */}
                          {signal.reason && (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground/70 mr-1">ANALYSE :</span>
                              {signal.reason}
                            </div>
                          )}

                          {/* Confirm button */}
                          <div className="mt-3 pt-3 border-t border-border/30 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent h-8"
                              onClick={() => setConfirmSignal(signal)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              J'ai ouvert ce trade
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Live prices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Prix live
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assets?.slice(0, 8).map((asset) => (
                  <div key={asset.symbol} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground">{asset.type}</div>
                    </div>
                    <div className="text-right font-mono text-sm font-semibold">
                      {(asset as any).livePrice
                        ? Number((asset as any).livePrice).toLocaleString("fr-FR", { maximumFractionDigits: 5 })
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </div>
                ))}
              </div>
              {assets && (assets as any[])[0]?.livePrice ? (
                <div className="mt-3 text-xs text-accent p-2 bg-accent/5 rounded-lg border border-accent/20">
                  ✅ Prix réels depuis Twelve Data
                </div>
              ) : (
                <div className="mt-3 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                  Actifs de votre plateforme de trading
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equity curve */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Courbe d'équité</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-4 h-[180px]">
              {equityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Capital"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Données insuffisantes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Profil de risque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital</span>
                <span className="font-mono font-semibold">${Number(account.capital).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risque</span>
                <span className="font-mono font-semibold">
                  {account.riskLevel === "LOW" ? "Faible (0.5%)" : account.riskLevel === "HIGH" ? "Élevé (1.5%)" : "Moyen (1%)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unité de temps</span>
                <span className="font-mono font-semibold">{account.timeframe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objectif</span>
                <span className="font-mono font-semibold">${Number(account.profitTarget).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmSignal} onOpenChange={(open) => { if (!open) setConfirmSignal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'ouverture du trade</DialogTitle>
            <DialogDescription>
              Ajoutez cette position à votre portefeuille pour suivre son résultat.
            </DialogDescription>
          </DialogHeader>

          {confirmSignal && (
            <div className="space-y-3 py-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${confirmSignal.direction === "BUY" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                {confirmSignal.direction === "BUY"
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                {confirmSignal.symbol} — {confirmSignal.direction === "BUY" ? "ACHAT" : "VENTE"}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Entrée live</div>
                  <div className="font-mono font-semibold">{confirmSignal.entry}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Stop Loss</div>
                  <div className="font-mono font-semibold text-destructive">{confirmSignal.stopLoss}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Objectif 1</div>
                  <div className="font-mono font-semibold text-accent">{confirmSignal.takeProfit1}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Risque : {confirmSignal.riskPercent}% du capital selon votre profil.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSignal(null)}>Annuler</Button>
            <Button
              onClick={handleOpenedTrade}
              disabled={openPosition.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {openPosition.isPending
                ? <Activity className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Oui, j'ai ouvert ce trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
