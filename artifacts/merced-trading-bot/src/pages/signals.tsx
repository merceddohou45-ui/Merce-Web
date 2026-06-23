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
import { fr } from "date-fns/locale";
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
        title: "Trade ajouté au portefeuille",
        description: `${confirmRecord.symbol} ${confirmRecord.direction === "BUY" ? "ACHAT" : "VENTE"} est maintenant suivi.`,
      });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioPositionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Impossible d'ajouter le trade", description: "Veuillez réessayer." });
    } finally {
      setConfirmRecord(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "won":
        return <Badge className="bg-accent text-accent-foreground">GAGNÉ</Badge>;
      case "lost":
        return <Badge className="bg-destructive text-destructive-foreground">PERDU</Badge>;
      case "active":
        return <Badge className="bg-blue-500 text-white">ACTIF</Badge>;
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Historique des signaux</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Journal complet de toutes les opportunités générées. Cliquez sur "J'ai ouvert ce trade" pour tout signal actif afin de le suivre dans votre portefeuille.
        </p>
      </div>

      <Card className="border-card-border bg-card/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Actif</TableHead>
                  <TableHead className="text-xs">Direction</TableHead>
                  <TableHead className="text-xs">Entrée</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Stop Loss</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Objectifs</TableHead>
                  <TableHead className="text-xs">Conf.</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history && history.length > 0 ? (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(record.generatedAt), "dd MMM, HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-bold text-sm">{record.symbol}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-bold ${record.direction === "BUY" ? "text-accent" : "text-destructive"}`}>
                          {record.direction === "BUY"
                            ? <ArrowUpRight className="mr-1 h-3 w-3" />
                            : <ArrowDownRight className="mr-1 h-3 w-3" />}
                          {record.direction === "BUY" ? "ACHAT" : "VENTE"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.entry}</TableCell>
                      <TableCell className="font-mono text-sm text-destructive hidden md:table-cell">{record.stopLoss}</TableCell>
                      <TableCell className="font-mono text-sm hidden md:table-cell">
                        <span className="text-accent">{record.takeProfit1}</span>
                        {record.takeProfit2 && (
                          <span className="text-muted-foreground"> / {record.takeProfit2}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record.confidence}%</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        {record.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent h-7"
                            onClick={() => setConfirmRecord(record as HistoryRecord)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">J'ai ouvert ce trade</span>
                            <span className="sm:hidden">Ouvrir</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-sm">
                      Aucun signal dans l'historique.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmRecord} onOpenChange={(open) => { if (!open) setConfirmRecord(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'ouverture du trade</DialogTitle>
            <DialogDescription>
              Cette action ajoute la position à votre portefeuille pour enregistrer le résultat à la fermeture.
            </DialogDescription>
          </DialogHeader>

          {confirmRecord && (
            <div className="space-y-3 py-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${confirmRecord.direction === "BUY" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                {confirmRecord.direction === "BUY"
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                {confirmRecord.symbol} — {confirmRecord.direction === "BUY" ? "ACHAT" : "VENTE"}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Entrée</div>
                  <div className="font-mono font-semibold">{confirmRecord.entry}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Stop Loss</div>
                  <div className="font-mono font-semibold text-destructive">{confirmRecord.stopLoss}</div>
                </div>
                <div className="bg-muted/50 rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Objectif 1</div>
                  <div className="font-mono font-semibold text-accent">{confirmRecord.takeProfit1}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                La taille de lot et le P&L seront calculés selon votre profil de risque ({confirmRecord.riskPercent}% de risque).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRecord(null)}>Annuler</Button>
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
