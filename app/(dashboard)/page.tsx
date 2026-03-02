"use client";

import Link from "next/link";
import { useMemo } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/dashboard/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCardRegistryStore } from "@/lib/card-registry-store";
import { isCardExpired } from "@/lib/nfc-transit";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const cards = useCardRegistryStore((state) => state.cards);
  const transactions = useCardRegistryStore((state) => state.transactions);

  const now = new Date();
  const cardList = Object.values(cards);
  const activeTrips = cardList.filter((item) => item.card.tapSession).length;
  const expiredCards = cardList.filter((item) =>
    isCardExpired(item.card, now),
  ).length;
  const totalIncome = useMemo(
    () =>
      transactions
        .reduce((sum, tx) => sum + Number(tx.income ?? 0), 0)
        .toFixed(2),
    [transactions],
  );
  const recent = transactions.slice(0, 5);

  return (
    <PageShell
      title="Dashboard"
      description="Real-time snapshot of card activity, transaction flow, and simulator health."
      actions={
        <Link
          href="/ticket-shop"
          className={buttonVariants({ variant: "default" })}
        >
          Quick Sell
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registered Cards" value={`${cardList.length}`} />
        <MetricCard label="Active Trips" value={`${activeTrips}`} />
        <MetricCard label="Expired Cards" value={`${expiredCards}`} />
        <MetricCard label="Total Income" value={`₱${totalIncome}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Operational checkpoints for today.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Card Registry</span>
              <span className="font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Fare Engine</span>
              <span className="font-medium">Loaded</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Current Route Load</span>
              <span className="font-medium">{activeTrips} active sessions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump directly to daily tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/card-management"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "justify-start",
              )}
            >
              Register New Card
            </Link>
            <Link
              href="/top-up-expiry"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "justify-start",
              )}
            >
              Top Up Balance
            </Link>
            <Link
              href="/transactions"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "justify-start",
              )}
            >
              View Full Logs
            </Link>
            <Link
              href="/transit-simulator"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "justify-start",
              )}
            >
              Run Lifecycle Simulation
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest payment and fare events.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No transactions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">UID</th>
                    <th className="px-2 py-2 font-medium">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-b-0">
                      <td className="px-2 py-2">
                        {new Date(tx.at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">{tx.type}</td>
                      <td className="px-2 py-2">{tx.uid ?? "-"}</td>
                      <td className="px-2 py-2">
                        ₱{Number(tx.income ?? 0).toFixed(2)}
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
