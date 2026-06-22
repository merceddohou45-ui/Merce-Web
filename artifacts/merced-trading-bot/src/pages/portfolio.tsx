import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolioPositions,
  useGetPortfolioSummary,
  useClosePosition,
  getGetPortfolioPositionsQueryKey,
  getGetPortfolioSummaryQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Activity, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Target, Briefcase, Crosshair, History } from "lucide-react";

export default function Portfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [closeReason, setCloseReason] = useState("MANUAL");
  const [closePrice, setClosePrice] = useState("");

  const { data: positions, isLoading: loadingPositions } = useGetPortfolioPositions();
  const { data: summary, isLoading: loadingSummary } = useGetPortfolioSummary({ query: { refetchInterval: 10000 } });
  const closeMutation = useClosePosition();

  if (loadingPositions || loadingSummary) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  const openPositions = positions?.filter((p) => p.status === "open") || [];
  const closedPositions = positions?.filter((p) => p.status !== "open") || [];

  const handleCloseClick = (position: any) => {
    setSelectedPosition(position);
    setCloseReason("MANUAL");
    setClosePrice("");
    setCloseDialogOpen(true);
  };

  const handleCloseSubmit = async () => {
    if (!selectedPosition || !closePrice) return;
    
    try {
      await closeMutation.mutateAsync({
        id: selectedPosition.id,
        data: {
          closeReason,
          closePrice: Number(closePrice)
        }
      });
      
      toast({
        title: "Position Closed",
        description: `Closed ${selectedPosition.symbol} at ${closePrice}`,
      });
      
      setCloseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetPortfolioPositionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error closing position",
        description: "An unexpected error occurred",
      });
    }
  };

  const getReasonBadge = (reason?: string) => {
    if (!reason) return null;
    switch (reason) {
      case "TP1":
        return <Badge className="bg-accent text-accent-foreground">{reason}</Badge>;
      case "TP2":
      case "TP3":
        return <Badge className="bg-blue-500 text-white">{reason}</Badge>;
      case "SL":
        return <Badge className="bg-destructive text-destructive-foreground">{reason}</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Target Progress Banner */}
      {summary && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border p-6 rounded-xl shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-16 -mr-16 text-accent/5 pointer-events-none">
            <Target size={200} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
            <div className="w-full md:w-1/2">
              <h2 className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-1">Campaign Progress</h2>
              <div className="flex justify-between items-end mb-2">
                <span className="font-mono text-xl text-muted-foreground">${summary.startingCapital.toLocaleString()}</span>
                <span className="font-mono text-4xl font-bold tracking-tight">${summary.currentEquity.toLocaleString()}</span>
                <span className="font-mono text-xl text-accent">${summary.profitTarget.toLocaleString()}</span>
              </div>
              <Progress value={summary.targetProgress} className="h-3" />
              <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground">
                <span>Start</span>
                <span>Current ({summary.targetProgress.toFixed(1)}%)</span>
                <span>Target</span>
              </div>
            </div>
            
            <div className="flex gap-6 md:gap-8">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total P&L</div>
                <div className={`text-2xl font-bold flex items-center ${summary.totalPnl >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {summary.totalPnl >= 0 ? <TrendingUp className="mr-2 h-5 w-5" /> : <TrendingDown className="mr-2 h-5 w-5" />}
                  {summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Return</div>
                <div className={`text-2xl font-bold ${summary.totalPnlPercent >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {summary.totalPnlPercent >= 0 ? '+' : ''}{summary.totalPnlPercent.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Win Rate</div>
                <div className="text-2xl font-bold text-foreground">
                  {summary.winRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Equity Curve Chart */}
      {summary?.equityCurve && summary.equityCurve.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Equity Curve</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] p-0 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.equityCurve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(new Date(val), 'MMM dd')} 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickMargin={10}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tickFormatter={(val) => `$${val}`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickMargin={10}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                  labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                />
                <ReferenceLine y={summary.startingCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine y={summary.profitTarget} stroke="hsl(var(--accent))" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. Performance Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <h3 className="font-medium text-sm">Open Positions</h3>
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold">{summary.openPositions}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <h3 className="font-medium text-sm">Closed Positions</h3>
                <History className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold">{summary.closedPositions}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <h3 className="font-medium text-sm">Avg R:R</h3>
                <Crosshair className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold">1:{summary.avgRr?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <h3 className="font-medium text-sm">Best / Worst</h3>
                <Target className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold">
                <span className="text-accent">${summary.bestTrade?.toFixed(2) || '0.00'}</span>
                <span className="text-muted-foreground font-normal mx-2">/</span>
                <span className="text-destructive">-${Math.abs(summary.worstTrade || 0).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Open Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Stop Loss</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Open Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openPositions.length > 0 ? (
                openPositions.map((pos) => (
                  <TableRow key={pos.id} className={pos.direction === 'BUY' ? 'border-l-2 border-l-accent' : 'border-l-2 border-l-destructive'}>
                    <TableCell className="font-bold">{pos.symbol}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-bold ${pos.direction === 'BUY' ? 'text-accent' : 'text-destructive'}`}>
                        {pos.direction === 'BUY' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {pos.direction}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{pos.entry}</TableCell>
                    <TableCell className="font-mono text-sm text-destructive">{pos.stopLoss}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="text-accent">{pos.takeProfit1}</span>
                      {pos.takeProfit2 && <span className="text-muted-foreground"> / {pos.takeProfit2}</span>}
                      {pos.takeProfit3 && <span className="text-muted-foreground"> / {pos.takeProfit3}</span>}
                    </TableCell>
                    <TableCell>{pos.riskPercent}%</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(pos.openedAt), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleCloseClick(pos)}>
                        Close
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No open positions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Closed Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Closed Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Close Price</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Closed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closedPositions.length > 0 ? (
                closedPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-bold">{pos.symbol}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-bold ${pos.direction === 'BUY' ? 'text-accent' : 'text-destructive'}`}>
                        {pos.direction === 'BUY' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {pos.direction}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{pos.entry}</TableCell>
                    <TableCell className="font-mono text-sm">{pos.closePrice}</TableCell>
                    <TableCell className={`font-mono text-sm font-bold ${pos.realizedPnl && pos.realizedPnl >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {pos.realizedPnl && pos.realizedPnl >= 0 ? '+' : ''}${pos.realizedPnl?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getReasonBadge(pos.closeReason)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {pos.closedAt ? format(new Date(pos.closedAt), "MMM dd, HH:mm") : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No closed positions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position: {selectedPosition?.symbol}</DialogTitle>
            <DialogDescription>
              Record the closing details for this position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Close Reason</Label>
              <RadioGroup value={closeReason} onValueChange={setCloseReason} className="flex gap-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MANUAL" id="r1" />
                  <Label htmlFor="r1">Manual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TP1" id="r2" />
                  <Label htmlFor="r2">TP1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TP2" id="r3" />
                  <Label htmlFor="r3">TP2</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TP3" id="r4" />
                  <Label htmlFor="r4">TP3</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SL" id="r5" />
                  <Label htmlFor="r5">Stop Loss</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Close Price</Label>
              <Input 
                type="number" 
                step="any" 
                value={closePrice} 
                onChange={(e) => setClosePrice(e.target.value)} 
                placeholder="e.g. 150.25"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCloseSubmit} disabled={!closePrice || closeMutation.isPending}>
              {closeMutation.isPending ? "Closing..." : "Close Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}