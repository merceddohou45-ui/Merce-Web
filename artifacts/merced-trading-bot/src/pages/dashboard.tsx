import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, ArrowUpRight, ArrowDownRight, Target, 
  TrendingUp, BarChart3, AlertTriangle, Clock,
  Crosshair, Shield
} from "lucide-react";
import { 
  useGetSignalStats, 
  useGetAssets, 
  useScanMarkets,
  useGetProfile,
  useGetBrokerStatus,
  type Signal 
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useLocation } from "wouter";

// Mock data for the chart since the API doesn't provide historical equity curve
const mockEquityData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 1000 + Math.random() * 200 + (i * 15)
}));

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [liveSignals, setLiveSignals] = useState<Signal[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const { data: brokerStatus, isLoading: loadingBroker } = useGetBrokerStatus();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: stats } = useGetSignalStats({ query: { enabled: !!brokerStatus?.connected }});
  const { data: assets } = useGetAssets({ query: { enabled: !!brokerStatus?.connected }});
  const scanMarkets = useScanMarkets({ query: { enabled: false } }); // manual trigger

  useEffect(() => {
    if (!loadingBroker && !loadingProfile) {
      if (!brokerStatus?.connected) {
        setLocation("/connect");
      } else if (!profile?.capital) {
        setLocation("/setup");
      }
    }
  }, [brokerStatus, profile, loadingBroker, loadingProfile, setLocation]);

  useEffect(() => {
    // Connect WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-signals`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => setIsWsConnected(true);
    ws.onclose = () => setIsWsConnected(false);
    
    ws.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data) as Signal;
        setLiveSignals(prev => [signal, ...prev].slice(0, 10));
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    return () => ws.close();
  }, []);

  const handleManualScan = () => {
    scanMarkets.refetch().then(res => {
      if (res.data && res.data.length > 0) {
        setLiveSignals(prev => [...res.data, ...prev].slice(0, 10));
      }
    });
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return "bg-accent text-accent-foreground";
    if (conf >= 70) return "bg-yellow-500 text-yellow-950";
    return "bg-destructive text-destructive-foreground";
  };

  if (loadingBroker || loadingProfile || !brokerStatus?.connected) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">War Room</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isWsConnected ? 'bg-accent animate-pulse' : 'bg-destructive'}`}></span>
              {isWsConnected ? 'LIVE FEED CONNECTED' : 'FEED DISCONNECTED'}
            </span>
            <span>•</span>
            <span>{brokerStatus.broker}</span>
            {brokerStatus.accountId && (
              <>
                <span>•</span>
                <span className="font-mono">{brokerStatus.accountId}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManualScan} disabled={scanMarkets.isFetching}>
            {scanMarkets.isFetching ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
            Scan Markets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-muted-foreground">Win Rate</h3>
              <Target className="h-4 w-4 text-accent" />
            </div>
            <div className="text-3xl font-bold">{stats?.winRate ? `${stats.winRate}%` : '--'}</div>
            <Progress value={stats?.winRate || 0} className="h-1 mt-3" />
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-muted-foreground">Est. Profit</h3>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500">${stats?.estimatedProfit?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-muted-foreground mt-2">Current session</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-muted-foreground">Active Signals</h3>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-3xl font-bold">{stats?.activeSignals || 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Out of {stats?.totalSignals || 0} total</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-muted-foreground">Avg Confidence</h3>
              <BarChart3 className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold">{stats?.avgConfidence ? `${stats.avgConfidence.toFixed(1)}%` : '--'}</div>
            <Progress value={stats?.avgConfidence || 0} className="h-1 mt-3" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Live Intelligence Feed</span>
                <span className="text-muted-foreground font-mono font-normal">T-{new Date().toISOString().split('T')[1].substring(0,8)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 min-h-[400px]">
              <div className="p-4 flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {liveSignals.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p>Waiting for high-probability setups...</p>
                    </div>
                  ) : (
                    liveSignals.map((signal, idx) => {
                      const isBuy = signal.direction === "BUY";
                      return (
                        <motion.div
                          key={`${signal.symbol}-${signal.generatedAt}-${idx}`}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`p-4 rounded-lg border ${isBuy ? 'border-accent/30 bg-accent/5 glow-green' : 'border-destructive/30 bg-destructive/5 glow-red'}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className={`${isBuy ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground'} font-bold`}>
                                {isBuy ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                {signal.direction}
                              </Badge>
                              <span className="font-bold text-lg tracking-tight">{signal.symbol}</span>
                              <Badge variant="outline" className="font-mono text-xs">{signal.timeframe}</Badge>
                            </div>
                            <Badge className={`${getConfidenceColor(signal.confidence)}`}>
                              {signal.confidence}% CONF
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Entry</div>
                              <div className="font-mono font-medium">{signal.entry}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Stop
                              </div>
                              <div className="font-mono font-medium text-destructive">{signal.stopLoss}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Target className="h-3 w-3" /> Target 1
                              </div>
                              <div className="font-mono font-medium text-accent">{signal.takeProfit1}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Risk
                              </div>
                              <div className="font-mono font-medium">{signal.riskPercent}%</div>
                            </div>
                          </div>
                          
                          {signal.reason && (
                            <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground/70 mr-1">RATIONALE:</span> {signal.reason}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assets?.slice(0, 8).map(asset => (
                  <div key={asset.symbol} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground">{asset.type}</div>
                    </div>
                    <div className="text-right font-mono text-sm">
                      <div className="text-muted-foreground">{asset.spread ? `Spr: ${asset.spread}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-xs text-muted-foreground p-3 bg-secondary rounded-md">
                "These are official trading symbols provided by your connected broker."
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Equity Curve (Est)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockEquityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
