import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSignalHistory,
  useOpenPositionFromSignal,
  getGetPortfolioPositionsQueryKey,
  getGetPortfolioSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Activity, ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type HistoryRecord = {
  id: number;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
  confidence: number;
  status: string;
  riskPercent: number;
  profitLoss?: number | null;
  generatedAt: string;
};

export default function Signals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmRecord, setConfirmRecord] = useState<HistoryRecord | null>(null);

  const { data: history, isLoading } = useGetSignalHistory();
  const openPosition = useOpenPositionFromSignal();

  const handleOpenedTrade = async () => {
    if (!confirmRecord) return;
    try {
      await openPosition.mutateAsync({ data: { signalId: confirmRecord.id } });
      toast({
        title: "Trade added to portfolio",
        description: `${confirmRecord.symbol} ${confirmRecord.direction} is now being tracked.`,
      });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioPositionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Could not add trade", description: "Please try again." });
    } finally {
      setConfirmRecord(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "won":
        return <Badge className="bg-accent text-accent-foreground">WON</Badge>;
      case "lost":
        return <Badge className="bg-destructive text-destructive-foreground">LOST</Badge>;
      case "active":
        return <Badge className="bg-blue-500 text-white">ACTIVE</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signal History</h1>
        <p className="text-muted-foreground mt-1">
          Complete log of all generated trading opportunities. Click "I opened this trade" on any active signal to track it in your portfolio.
        </p>
      </div>

      <Card className="border-card-border bg-card/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Stop Loss</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Conf.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history && history.length > 0 ? (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(record.generatedAt), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="font-bold">{record.symbol}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-bold ${record.direction === "BUY" ? "text-accent" : "text-destructive"}`}>
                        {record.direction === "BUY"
                          ? <ArrowUpRight className="mr-1 h-3 w-3" />
                          : <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {record.direction}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.entry}</TableCell>
                    <TableCell className="font-mono text-sm text-destructive">{record.stopLoss}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="text-accent">{record.takeProfit1}</span>
                      {record.takeProfit2 && (
                        <span className="text-muted-foreground"> / {record.takeProfit2}</span>
                      )}
                    </TableCell>
                    <TableCell>{record.confidence}%</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-right">
                      {record.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
                          onClick={() => setConfirmRecord(record as HistoryRecord)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          I opened this
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No signal history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmRecord} onOpenChange={(open) => { if (!open) setConfirmRecord(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm trade entry</DialogTitle>
            <DialogDescription>
              This adds the position to your portfolio tracker so you can record the outcome when you close it.
            </DialogDescription>
          </DialogHeader>

          {confirmRecord && (
            <div className="space-y-3 py-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${confirmRecord.direction === "BUY" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                {confirmRecord.direction === "BUY"
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                {confirmRecord.symbol} — {confirmRecord.direction}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Entry</div>
                  <div className="font-mono font-semibold">{confirmRecord.entry}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Stop Loss</div>
                  <div className="font-mono font-semibold text-destructive">{confirmRecord.stopLoss}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Target 1</div>
                  <div className="font-mono font-semibold text-accent">{confirmRecord.takeProfit1}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lot size and P&L will be calculated from your risk profile ({confirmRecord.riskPercent}% risk).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRecord(null)}>Cancel</Button>
            <Button
              onClick={handleOpenedTrade}
              disabled={openPosition.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {openPosition.isPending
                ? <Activity className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Yes, I opened this trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
