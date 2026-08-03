import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

function formatNumber(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentsTotals({
  incomingEuro,
  incomingTry,
  incomingRate,
  outgoingTotal,
  netAmount,
}: {
  incomingEuro: string | number | undefined;
  incomingTry: string | number | undefined;
  incomingRate: string | number | undefined;
  outgoingTotal: number;
  netAmount: number;
}) {
  const netPositive = netAmount >= 0;

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-base">Monthly totals</CardTitle>
        <p className="text-sm text-muted">
          Incoming is pulled from Invoices → SMM for the same month, for reference only.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-lg border border-border p-4">
          <div className="text-xs font-medium text-muted">Incoming (SMM invoice, reference)</div>
          <div className="text-lg font-semibold tabular-nums">€{formatNumber(incomingEuro)}</div>
          <div className="text-sm tabular-nums text-muted">
            ₺{formatNumber(incomingTry)} @ {formatNumber(incomingRate)}
          </div>
        </div>
        <div className="space-y-1 rounded-lg border border-border p-4">
          <div className="text-xs font-medium text-muted">Outgoing (payments total)</div>
          <div className="text-lg font-semibold tabular-nums">₺{formatNumber(outgoingTotal)}</div>
        </div>
        <div
          className={`space-y-1 rounded-lg border p-4 ${
            netPositive ? "border-accent/30 bg-accent/10" : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="text-xs font-medium text-muted">Net</div>
          <div
            className={`text-lg font-semibold tabular-nums ${netPositive ? "text-accent" : "text-red-500"}`}
          >
            {netPositive ? "+" : ""}
            ₺{formatNumber(netAmount)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
