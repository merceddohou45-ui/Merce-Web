import { useGetSignalHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";

export default function Signals() {
  const { data: history, isLoading } = useGetSignalHistory();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'won':
        return <Badge className="bg-accent text-accent-foreground">WON</Badge>;
      case 'lost':
        return <Badge className="bg-destructive text-destructive-foreground">LOST</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 text-white">ACTIVE</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signal History</h1>
        <p className="text-muted-foreground mt-1">Complete log of all generated trading opportunities.</p>
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
                <TableHead className="text-right">Status</TableHead>
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
                      <span className={`inline-flex items-center text-xs font-bold ${record.direction === 'BUY' ? 'text-accent' : 'text-destructive'}`}>
                        {record.direction === 'BUY' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {record.direction}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.entry}</TableCell>
                    <TableCell className="font-mono text-sm text-destructive">{record.stopLoss}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="text-accent">{record.takeProfit1}</span>
                      {record.takeProfit2 && <span className="text-muted-foreground"> / {record.takeProfit2}</span>}
                    </TableCell>
                    <TableCell>{record.confidence}%</TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(record.status)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No signal history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
