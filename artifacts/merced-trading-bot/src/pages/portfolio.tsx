import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolioPositions,
  useGetPortfolioSummary,
  useClosePosition,
  useGetJournalEntries,
  useCreateJournalEntry,
  useDeleteJournalEntry,
  getGetPortfolioPositionsQueryKey,
  getGetPortfolioSummaryQueryKey,
  getGetJournalEntriesQueryKey,
  type JournalEntry,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Activity, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Target, Briefcase, Crosshair, History, BookOpen, Plus, Trash2,
} from "lucide-react";

const EMOTIONS = [
  "CONFIDENT",
  "DISCIPLINED",
  "PATIENT",
  "NEUTRAL",
  "NERVOUS",
  "FOMO",
  "GREEDY",
  "FEARFUL",
] as const;

const EMOTION_LABELS: Record<string, string> = {
  CONFIDENT: "Confiant",
  DISCIPLINED: "Discipliné",
  PATIENT: "Patient",
  NEUTRAL: "Neutre",
  NERVOUS: "Nerveux",
  FOMO: "FOMO",
  GREEDY: "Cupide",
  FEARFUL: "Craintif",
};

const EMOTION_COLORS: Record<string, string> = {
  CONFIDENT: "bg-accent/15 text-accent border-accent/30",
  DISCIPLINED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PATIENT: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  NEUTRAL: "bg-muted text-muted-foreground border-border",
  NERVOUS: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  FOMO: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  GREEDY: "bg-red-500/15 text-red-400 border-red-500/30",
  FEARFUL: "bg-destructive/15 text-destructive border-destructive/30",
};

const ENTRY_TYPES = ["note", "open", "close"] as const;
const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  open: "Analyse d'ouverture",
  close: "Analyse de clôture",
};

type PositionAny = {
  id: number;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskPercent: number;
  status: string;
  openedAt: string;
  closePrice?: number | null;
  closedAt?: string | null;
  closeReason?: string | null;
  realizedPnl?: number | null;
};

function JournalPanel({ position, onClose }: { position: PositionAny; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [entryType, setEntryType] = useState<string>("note");
  const [emotion, setEmotion] = useState<string>("NEUTRAL");
  const [reasoning, setReasoning] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: entries, isLoading } = useGetJournalEntries(position.id);
  const createEntry = useCreateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const handleSubmit = async () => {
    if (!reasoning.trim() && !notes.trim()) {
      toast({ variant: "destructive", title: "Contenu requis", description: "Renseignez l'analyse ou les notes avant de sauvegarder." });
      return;
    }
    setSubmitting(true);
    try {
      await createEntry.mutateAsync({
        data: {
          positionId: position.id,
          entryType,
          emotion: emotion || null,
          reasoning: reasoning.trim() || null,
          notes: notes.trim() || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey(position.id) });
      setReasoning("");
      setNotes("");
      setEmotion("NEUTRAL");
      setEntryType("note");
      toast({ title: "Entrée enregistrée" });
    } catch {
      toast({ variant: "destructive", title: "Impossible de sauvegarder" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync({ positionId: position.id, id: entryId });
      queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey(position.id) });
    } catch {
      toast({ variant: "destructive", title: "Impossible de supprimer" });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Position summary */}
      <div className={`mb-4 p-3 rounded-xl border ${position.direction === "BUY" ? "border-accent/20 bg-accent/5" : "border-destructive/20 bg-destructive/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${position.direction === "BUY" ? "text-accent" : "text-destructive"}`}>
              {position.direction === "BUY"
                ? <ArrowUpRight className="inline h-4 w-4 mr-1" />
                : <ArrowDownRight className="inline h-4 w-4 mr-1" />}
              {position.symbol} — {position.direction === "BUY" ? "ACHAT" : "VENTE"}
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {position.status === "open" ? "OUVERT" : (position.closeReason ?? "CLÔTURÉ")}
            </Badge>
          </div>
          <span className="font-mono text-sm text-muted-foreground">{position.entry}</span>
        </div>
      </div>

      {/* New entry form */}
      <div className="border border-border rounded-xl p-4 mb-4 space-y-4 bg-card/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nouvelle entrée</h3>

        <div>
          <Label className="text-xs mb-2 block">Type d'entrée</Label>
          <RadioGroup value={entryType} onValueChange={setEntryType} className="flex gap-3 flex-wrap">
            {ENTRY_TYPES.map((t) => (
              <div key={t} className="flex items-center space-x-1.5">
                <RadioGroupItem value={t} id={`type-${t}`} />
                <Label htmlFor={`type-${t}`} className="text-xs cursor-pointer">{ENTRY_TYPE_LABELS[t]}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-xs mb-2 block">État émotionnel</Label>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmotion(e)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${emotion === e ? EMOTION_COLORS[e] : "bg-transparent border-border text-muted-foreground hover:border-muted-foreground"}`}
              >
                {EMOTION_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="reasoning" className="text-xs mb-2 block">Analyse du trade</Label>
          <Textarea
            id="reasoning"
            placeholder="Pourquoi avez-vous pris / conservé / clôturé ce trade ? Quel était votre setup ?"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            className="h-20 resize-none text-sm"
          />
        </div>

        <div>
          <Label htmlFor="notes" className="text-xs mb-2 block">Notes personnelles</Label>
          <Textarea
            id="notes"
            placeholder="Autre chose — conditions de marché, leçons apprises, erreurs…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-16 resize-none text-sm"
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting || createEntry.isPending} className="w-full">
          {submitting ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Enregistrer l'entrée
        </Button>
      </div>

      {/* Existing entries */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Journal</h3>
        {isLoading && <Activity className="h-5 w-5 animate-spin text-accent mx-auto" />}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune entrée pour l'instant. Enregistrez votre première réflexion ci-dessus.
          </div>
        )}
        <AnimatePresence>
          {entries?.map((entry: JournalEntry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="border border-border rounded-xl p-3 bg-card/30 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}</Badge>
                  {entry.emotion && (
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${EMOTION_COLORS[entry.emotion] ?? "bg-muted"}`}>
                      {EMOTION_LABELS[entry.emotion] ?? entry.emotion}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(entry.createdAt), "dd MMM, HH:mm", { locale: fr })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {entry.reasoning && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Analyse</div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{entry.reasoning}</p>
                </div>
              )}
              {entry.notes && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Notes</div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{entry.notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionAny | null>(null);
  const [closeReason, setCloseReason] = useState("MANUAL");
  const [closePrice, setClosePrice] = useState("");
  const [journalPosition, setJournalPosition] = useState<PositionAny | null>(null);

  const { data: positions, isLoading: loadingPositions } = useGetPortfolioPositions();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: summary, isLoading: loadingSummary } = useGetPortfolioSummary({ query: { refetchInterval: 10000 } as any });
  const closeMutation = useClosePosition();

  if (loadingPositions || loadingSummary) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  const openPositions = (positions as PositionAny[] | undefined)?.filter((p) => p.status === "open") || [];
  const closedPositions = (positions as PositionAny[] | undefined)?.filter((p) => p.status !== "open") || [];

  const handleCloseClick = (position: PositionAny) => {
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
        data: { closeReason, closePrice: Number(closePrice) },
      });
      toast({ title: "Position clôturée", description: `${selectedPosition.symbol} clôturé à ${closePrice}` });
      setCloseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetPortfolioPositionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Erreur lors de la clôture" });
    }
  };

  const getReasonBadge = (reason?: string | null) => {
    if (!reason) return null;
    switch (reason) {
      case "TP1": return <Badge className="bg-accent text-accent-foreground">{reason}</Badge>;
      case "TP2":
      case "TP3": return <Badge className="bg-blue-500 text-white">{reason}</Badge>;
      case "SL": return <Badge className="bg-destructive text-destructive-foreground">{reason}</Badge>;
      default: return <Badge variant="outline">{reason}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Target Progress Banner */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border p-5 md:p-6 rounded-xl shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-16 -mr-16 text-accent/5 pointer-events-none">
            <Target size={200} />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 relative z-10">
            <div className="w-full md:w-1/2">
              <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase mb-1">Progression de l'objectif</h2>
              <div className="flex justify-between items-end mb-2">
                <span className="font-mono text-lg text-muted-foreground">${summary.startingCapital.toLocaleString()}</span>
                <span className="font-mono text-3xl md:text-4xl font-bold tracking-tight">${summary.currentEquity.toLocaleString()}</span>
                <span className="font-mono text-lg text-accent">${summary.profitTarget.toLocaleString()}</span>
              </div>
              <Progress value={summary.targetProgress} className="h-3" />
              <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground">
                <span>Départ</span>
                <span>Actuel ({summary.targetProgress.toFixed(1)}%)</span>
                <span>Objectif</span>
              </div>
            </div>
            <div className="flex gap-5 md:gap-8 flex-wrap">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">P&L Total</div>
                <div className={`text-2xl font-bold flex items-center ${summary.totalPnl >= 0 ? "text-accent" : "text-destructive"}`}>
                  {summary.totalPnl >= 0 ? <TrendingUp className="mr-2 h-5 w-5" /> : <TrendingDown className="mr-2 h-5 w-5" />}
                  {summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Rendement</div>
                <div className={`text-2xl font-bold ${summary.totalPnlPercent >= 0 ? "text-accent" : "text-destructive"}`}>
                  {summary.totalPnlPercent >= 0 ? "+" : ""}{summary.totalPnlPercent.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Réussite</div>
                <div className="text-2xl font-bold text-foreground">{summary.winRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Equity Curve Chart */}
      {summary?.equityCurve && summary.equityCurve.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Courbe d'équité</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] p-0 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.equityCurve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "dd MMM", { locale: fr })} stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} minTickGap={30} />
                <YAxis domain={["auto", "auto"]} tickFormatter={(val) => `$${val}`} stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={10} width={75} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Équité"]}
                  labelFormatter={(label) => format(new Date(label), "dd MMM yyyy", { locale: fr })}
                />
                <ReferenceLine y={summary.startingCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine y={summary.profitTarget} stroke="hsl(var(--accent))" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <h3 className="font-medium text-xs">Positions ouvertes</h3>
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">{summary.openPositions}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <h3 className="font-medium text-xs">Positions clôturées</h3>
                <History className="h-4 w-4" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">{summary.closedPositions}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <h3 className="font-medium text-xs">R:R moyen</h3>
                <Crosshair className="h-4 w-4" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">1:{summary.avgRr?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <h3 className="font-medium text-xs">Meilleur / Pire</h3>
                <Target className="h-4 w-4" />
              </div>
              <div className="text-lg md:text-xl font-bold">
                <span className="text-accent">${summary.bestTrade?.toFixed(2) || "0.00"}</span>
                <span className="text-muted-foreground font-normal mx-1">/</span>
                <span className="text-destructive">-${Math.abs(summary.worstTrade || 0).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Open Positions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Positions ouvertes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Actif</TableHead>
                  <TableHead className="text-xs">Direction</TableHead>
                  <TableHead className="text-xs">Entrée</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Stop</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Objectifs</TableHead>
                  <TableHead className="text-xs">Risque</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Ouvert le</TableHead>
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.length > 0 ? (
                  openPositions.map((pos) => (
                    <TableRow key={pos.id} className={pos.direction === "BUY" ? "border-l-2 border-l-accent" : "border-l-2 border-l-destructive"}>
                      <TableCell className="font-bold text-sm">{pos.symbol}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-bold ${pos.direction === "BUY" ? "text-accent" : "text-destructive"}`}>
                          {pos.direction === "BUY" ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                          {pos.direction === "BUY" ? "ACHAT" : "VENTE"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pos.entry}</TableCell>
                      <TableCell className="font-mono text-sm text-destructive hidden md:table-cell">{pos.stopLoss}</TableCell>
                      <TableCell className="font-mono text-sm hidden md:table-cell">
                        <span className="text-accent">{pos.takeProfit1}</span>
                        {pos.takeProfit2 && <span className="text-muted-foreground"> / {pos.takeProfit2}</span>}
                        {pos.takeProfit3 && <span className="text-muted-foreground"> / {pos.takeProfit3}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{pos.riskPercent}%</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {format(new Date(pos.openedAt), "dd MMM, HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                            onClick={() => setJournalPosition(pos)}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Journal</span>
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCloseClick(pos)}>
                            Clôturer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                      Aucune position ouverte. Attendez un signal et cliquez sur "J'ai ouvert ce trade".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Closed Positions */}
      {closedPositions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Positions clôturées</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Actif</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs">Entrée</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Clôture</TableHead>
                    <TableHead className="text-xs">P&L</TableHead>
                    <TableHead className="text-xs">Raison</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right text-xs">Journal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedPositions.map((pos) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-bold text-sm">{pos.symbol}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-bold ${pos.direction === "BUY" ? "text-accent" : "text-destructive"}`}>
                          {pos.direction === "BUY" ? "ACHAT" : "VENTE"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pos.entry}</TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">{pos.closePrice ?? "—"}</TableCell>
                      <TableCell className={`font-mono text-sm font-semibold ${(pos.realizedPnl ?? 0) >= 0 ? "text-accent" : "text-destructive"}`}>
                        {pos.realizedPnl != null ? `${pos.realizedPnl >= 0 ? "+" : ""}$${pos.realizedPnl}` : "—"}
                      </TableCell>
                      <TableCell>{getReasonBadge(pos.closeReason)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">
                        {pos.closedAt ? format(new Date(pos.closedAt), "dd MMM, HH:mm", { locale: fr }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                          onClick={() => setJournalPosition(pos)}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer la position</DialogTitle>
            <DialogDescription>
              Saisissez le prix de sortie pour calculer le P&L réalisé.
            </DialogDescription>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4 py-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${selectedPosition.direction === "BUY" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                {selectedPosition.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {selectedPosition.symbol} — {selectedPosition.direction === "BUY" ? "ACHAT" : "VENTE"} @ {selectedPosition.entry}
              </div>
              <div>
                <Label htmlFor="closePrice" className="text-sm mb-2 block">Prix de clôture</Label>
                <Input
                  id="closePrice"
                  type="number"
                  step="any"
                  value={closePrice}
                  onChange={(e) => setClosePrice(e.target.value)}
                  placeholder="Saisissez le prix de sortie"
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">Raison de clôture</Label>
                <RadioGroup value={closeReason} onValueChange={setCloseReason} className="flex flex-wrap gap-3">
                  {["TP1", "TP2", "TP3", "SL", "MANUAL"].map((r) => (
                    <div key={r} className="flex items-center space-x-2">
                      <RadioGroupItem value={r} id={`reason-${r}`} />
                      <Label htmlFor={`reason-${r}`} className="text-sm cursor-pointer">{r}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCloseSubmit}
              disabled={!closePrice || closeMutation.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {closeMutation.isPending ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmer la clôture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal sheet */}
      <Sheet open={!!journalPosition} onOpenChange={(open) => { if (!open) setJournalPosition(null); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle>Journal de trading</SheetTitle>
            <SheetDescription>
              Enregistrez vos analyses et émotions pour ce trade.
            </SheetDescription>
          </SheetHeader>
          {journalPosition && (
            <JournalPanel position={journalPosition} onClose={() => setJournalPosition(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
