"use client";

import { useMemo, useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardRegistryStore } from "@/lib/card-registry-store";

export default function TransactionsPage() {
  const [filter, setFilter] = useState<
    "ALL" | "TICKET_SALE" | "TOP_UP" | "TRIP_DEBIT"
  >("ALL");
  const transactions = useCardRegistryStore((state) => state.transactions);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? transactions
        : transactions.filter((tx) => tx.type === filter),
    [filter, transactions],
  );

  const totals = useMemo(() => {
    const result = filtered.reduce(
      (acc, tx) => {
        acc.paid += Number(tx.paid ?? 0);
        acc.income += Number(tx.income ?? 0);
        acc.quantity += Number(tx.quantity ?? 1);
        acc.dotr += Number(tx.splits?.DOTR ?? 0);
        acc.vip += Number(tx.splits?.VIP ?? 0);
        acc.gateron += Number(tx.splits?.GATERON ?? 0);
        return acc;
      },
      { paid: 0, income: 0, quantity: 0, dotr: 0, vip: 0, gateron: 0 },
    );

    return {
      paid: result.paid.toFixed(2),
      income: result.income.toFixed(2),
      quantity: result.quantity,
      dotr: result.dotr.toFixed(2),
      vip: result.vip.toFixed(2),
      gateron: result.gateron.toFixed(2),
    };
  }, [filtered]);

  return (
    <PageShell
      title="Transactions"
      description="Filter transaction logs and monitor payment, quantity, and income totals."
      actions={
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as typeof filter)}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="TICKET_SALE">Ticket Sale</SelectItem>
            <SelectItem value="TOP_UP">Top Up</SelectItem>
            <SelectItem value="TRIP_DEBIT">Trip Debit</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Paid" value={`₱${totals.paid}`} />
        <MetricCard label="Total Income" value={`₱${totals.income}`} />
        <MetricCard label="Total Quantity" value={`${totals.quantity}`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total DOTR Receive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">₱{totals.dotr}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Gateron Receive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">₱{totals.gateron}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total VIP Receive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">₱{totals.vip}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Logs</CardTitle>
          <CardDescription>{filtered.length} record(s) shown.</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No transactions available for this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">UID</th>
                    <th className="px-2 py-2 font-medium">Paid</th>
                    <th className="px-2 py-2 font-medium">Income</th>
                    <th className="px-2 py-2 font-medium">DOTR</th>
                    <th className="px-2 py-2 font-medium">VIP</th>
                    <th className="px-2 py-2 font-medium">Gateron</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-b-0">
                      <td className="px-2 py-2">
                        {new Date(tx.at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">{tx.type}</td>
                      <td className="px-2 py-2">{tx.uid ?? "-"}</td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.paid ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.income ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.splits?.DOTR ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.splits?.VIP ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.splits?.GATERON ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
