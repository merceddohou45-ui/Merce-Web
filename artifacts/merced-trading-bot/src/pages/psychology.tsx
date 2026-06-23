import { useGetPsychologyAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, TrendingUp, TrendingDown, Lightbulb, BookOpen } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

const EMOTION_COLORS: Record<string, string> = {
  CONFIDENT: "#22c55e",
  DISCIPLINED: "#3b82f6",
  PATIENT: "#a855f7",
  NEUTRAL: "#6b7280",
  NERVOUS: "#eab308",
  FOMO: "#f97316",
  GREEDY: "#ef4444",
  FEARFUL: "#dc2626",
};

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

const CARD_EMOTION_STYLES: Record<string, string> = {
  CONFIDENT: "border-green-500/30 bg-green-500/5 text-green-400",
  DISCIPLINED: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  PATIENT: "border-purple-500/30 bg-purple-500/5 text-purple-400",
  NEUTRAL: "border-border bg-muted/30 text-muted-foreground",
  NERVOUS: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  FOMO: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  GREEDY: "border-red-500/30 bg-red-500/5 text-red-400",
  FEARFUL: "border-destructive/30 bg-destructive/5 text-destructive",
};

function WinRateBar({ winRate, lossRate }: { winRate: number; lossRate: number }) {
  const neutral = Math.max(0, 100 - winRate - lossRate);
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
      <div style={{ width: `${winRate}%` }} className="bg-green-500" />
      <div style={{ width: `${neutral}%` }} className="bg-muted" />
      <div style={{ width: `${lossRate}%` }} className="bg-destructive" />
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-sm shadow-xl">
      <p className="font-semibold mb-1">{EMOTION_LABELS[label] ?? label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }} className="font-mono">
          {p.name}: {p.value ?? "—"}
          {p.name === "Taux de réussite" ? "%" : ""}
          {p.name === "P&L moy." ? " USD" : ""}
        </p>
      ))}
    </div>
  );
};

export default function Psychology() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading } = useGetPsychologyAnalytics({ query: { refetchInterval: 30000 } as any });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  const hasData = data && data.totalEntries > 0;
  const activeEmotions = data?.emotionStats.filter((e) => e.totalEntries > 0) ?? [];
  const allEmotions = data?.emotionStats ?? [];

  const winRateChartData = activeEmotions
    .filter((e) => e.winRate !== null)
    .map((e) => ({
      emotion: e.emotion,
      "Taux de réussite": e.winRate,
    }));

  const frequencyChartData = activeEmotions.map((e) => ({
    emotion: e.emotion,
    Entrées: e.totalEntries,
  }));

  const radarData = allEmotions.map((e) => ({
    emotion: EMOTION_LABELS[e.emotion] ?? e.emotion,
    score: e.winRate ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-7 w-7 text-accent" />
          Analyse psychologique
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Comprenez comment votre état émotionnel influence vos performances de trading.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
              <span className="text-xs">Entrées journal</span>
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-2xl md:text-3xl font-bold">{data?.totalEntries ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
              <span className="text-xs">Positions journalisées</span>
              <Activity className="h-4 w-4" />
            </div>
            <div className="text-2xl md:text-3xl font-bold">{data?.totalPositionsWithJournal ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
              <span className="text-xs">Meilleure émotion</span>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            {data?.topWinEmotion ? (
              <div className={`text-sm md:text-base font-bold px-2 py-1 rounded-md inline-block border ${CARD_EMOTION_STYLES[data.topWinEmotion] ?? ""}`}>
                {EMOTION_LABELS[data.topWinEmotion] ?? data.topWinEmotion}
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
              <span className="text-xs">Pire émotion</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            {data?.topLossEmotion ? (
              <div className={`text-sm md:text-base font-bold px-2 py-1 rounded-md inline-block border ${CARD_EMOTION_STYLES[data.topLossEmotion] ?? ""}`}>
                {EMOTION_LABELS[data.topLossEmotion] ?? data.topLossEmotion}
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="font-semibold text-lg">Aucune entrée dans le journal</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Ouvrez un trade dans votre Portefeuille et ajoutez une entrée journal avec un tag émotionnel. Après quelques entrées, vos schémas comportementaux apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Insights */}
          {data.insights.length > 0 && (
            <Card className="border-accent/20 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  Insights comportementaux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <p className="text-foreground/90 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {winRateChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Taux de réussite par émotion
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px] p-0 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={winRateChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <XAxis
                        dataKey="emotion"
                        tickFormatter={(v) => EMOTION_LABELS[v] ?? v}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        width={45}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                      <Bar dataKey="Taux de réussite" radius={[4, 4, 0, 0]}>
                        {winRateChartData.map((entry) => (
                          <Cell key={entry.emotion} fill={EMOTION_COLORS[entry.emotion] ?? "#6b7280"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {frequencyChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Fréquence des émotions
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px] p-0 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequencyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <XAxis
                        dataKey="emotion"
                        tickFormatter={(v) => EMOTION_LABELS[v] ?? v}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        width={35}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                      <Bar dataKey="Entrées" radius={[4, 4, 0, 0]}>
                        {frequencyChartData.map((entry) => (
                          <Cell key={entry.emotion} fill={EMOTION_COLORS[entry.emotion] ?? "#6b7280"} opacity={0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {activeEmotions.filter((e) => e.winRate !== null).length >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Radar de performance émotionnelle
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] p-0 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="emotion"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Radar
                      name="Taux de réussite %"
                      dataKey="score"
                      stroke="hsl(var(--accent))"
                      fill="hsl(var(--accent))"
                      fillOpacity={0.2}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      formatter={(v: number) => [`${v}%`, "Taux de réussite"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Détail par émotion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {allEmotions.map((stat) => {
                  const totalOutcomes = stat.winCount + stat.lossCount;
                  const lossRate =
                    totalOutcomes > 0
                      ? parseFloat(((stat.lossCount / totalOutcomes) * 100).toFixed(1))
                      : 0;

                  return (
                    <div key={stat.emotion} className="flex items-center gap-4 px-4 md:px-6 py-4">
                      <div className="w-24 shrink-0">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CARD_EMOTION_STYLES[stat.emotion] ?? "border-border text-muted-foreground"}`}
                        >
                          {EMOTION_LABELS[stat.emotion] ?? stat.emotion}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {stat.totalEntries > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                {stat.winCount}G / {stat.lossCount}P
                                {totalOutcomes === 0 && " (aucun trade clôturé)"}
                              </span>
                              {stat.winRate != null && (
                                <span className={stat.winRate >= 50 ? "text-accent" : "text-destructive"}>
                                  {stat.winRate}% réussite
                                </span>
                              )}
                            </div>
                            {totalOutcomes > 0 && (
                              <WinRateBar winRate={stat.winRate ?? 0} lossRate={lossRate} />
                            )}
                            {totalOutcomes === 0 && (
                              <div className="h-2 rounded-full bg-muted w-full" />
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">Aucune entrée</div>
                        )}
                      </div>

                      <div className="shrink-0 text-right w-28 space-y-0.5">
                        <div className="text-xs text-muted-foreground">
                          {stat.totalEntries} {stat.totalEntries <= 1 ? "entrée" : "entrées"}
                        </div>
                        {stat.avgPnl != null && (
                          <div
                            className={`text-xs font-mono font-semibold ${(stat.avgPnl ?? 0) >= 0 ? "text-accent" : "text-destructive"}`}
                          >
                            {(stat.avgPnl ?? 0) >= 0 ? "+" : ""}${stat.avgPnl} moy.
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 w-14 text-right">
                        {stat.totalEntries > 0 && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {stat.linkedPositions} pos.
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {data.entryTypeBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Types d'entrées journal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { key: "open", label: "Analyse d'ouverture", color: "text-accent" },
                    { key: "note", label: "Notes", color: "text-blue-400" },
                    { key: "close", label: "Analyse de clôture", color: "text-purple-400" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="space-y-2">
                      <div className={`text-3xl font-bold ${color}`}>
                        {data.entryTypeBreakdown[key] ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
                      <Progress
                        value={
                          data.totalEntries > 0
                            ? ((data.entryTypeBreakdown[key] ?? 0) / data.totalEntries) * 100
                            : 0
                        }
                        className="h-1"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
