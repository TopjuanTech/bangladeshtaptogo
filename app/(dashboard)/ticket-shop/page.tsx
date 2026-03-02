"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  normalizeCardUid,
  useCardRegistryStore,
} from "@/lib/card-registry-store";

export default function TicketShopPage() {
  const [uidInput, setUidInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");

  const buyTicket = useCardRegistryStore((state) => state.buyTicket);
  const sellTickets = useCardRegistryStore((state) => state.sellTickets);
  const transactions = useCardRegistryStore((state) => state.transactions);

  const latestSale = useMemo(
    () => transactions.find((tx) => tx.type === "TICKET_SALE"),
    [transactions],
  );

  const incomePerTicket = 20;
  const division = {
    DOTR: {
      percent: 60,
      amountPerTicket: 12,
    },
    COMMISSION: {
      percent: 40,
      amountPerTicket: 8,
      VIPPercentOfCommission: 60,
      GateronPercentOfCommission: 40,
      VIPAmountPerTicket: 4.8,
      GateronAmountPerTicket: 3.2,
    },
  };

  const handleSingleSale = () => {
    const uid = normalizeCardUid(uidInput);
    const result = buyTicket(uid, new Date());
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(`Ticket sold and card ${uid} issued.`);
    setUidInput("");
  };

  const handleBulkSale = () => {
    const quantity = Number.parseInt(quantityInput, 10);
    const result = sellTickets(quantity, new Date());
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(`Bulk ticket sale complete: ${quantity} ticket(s).`);
  };

  return (
    <PageShell
      title="Ticket Shop"
      description="Handle single-card issuance and bulk ticket sales with transparent pricing."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Single Ticket + Card Issuance</CardTitle>
            <CardDescription>
              Assign a new card UID at point of sale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={uidInput}
              onChange={(event) => setUidInput(event.target.value)}
              placeholder="Card UID"
            />
            <Button onClick={handleSingleSale} className="w-full">
              Sell Single Ticket
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Ticket Sales</CardTitle>
            <CardDescription>
              Record aggregate sales without assigning UID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              placeholder="Quantity"
            />
            <Button
              onClick={handleBulkSale}
              variant="outline"
              className="w-full"
            >
              Record Bulk Sale
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Matrix</CardTitle>
          <CardDescription>Current default product breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="px-2 py-2 font-medium">Item</th>
                <th className="px-2 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-2 py-2">Customer Payment</td>
                <td className="px-2 py-2">₱100.00</td>
              </tr>
              <tr className="border-b">
                <td className="px-2 py-2">Initial Card Balance</td>
                <td className="px-2 py-2">₱80.00</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Income Per Sale</td>
                <td className="px-2 py-2">₱20.00</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income Division</CardTitle>
          <CardDescription>
            Revenue split visibility per ticket and for latest recorded sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Allocation</th>
                  <th className="px-2 py-2 font-medium">Per Ticket</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-2 py-2">DOTR</td>
                  <td className="px-2 py-2">
                    {division.DOTR.percent}% of income
                  </td>
                  <td className="px-2 py-2">
                    ₱{division.DOTR.amountPerTicket.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2">Commission (Total)</td>
                  <td className="px-2 py-2">
                    {division.COMMISSION.percent}% of income
                  </td>
                  <td className="px-2 py-2">
                    ₱{division.COMMISSION.amountPerTicket.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2">VIP</td>
                  <td className="px-2 py-2">
                    {division.COMMISSION.VIPPercentOfCommission}% of commission
                  </td>
                  <td className="px-2 py-2">
                    ₱{division.COMMISSION.VIPAmountPerTicket.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-2">Gateron</td>
                  <td className="px-2 py-2">
                    {division.COMMISSION.GateronPercentOfCommission}% of
                    commission
                  </td>
                  <td className="px-2 py-2">
                    ₱{division.COMMISSION.GateronAmountPerTicket.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">Reference</div>
            <p className="text-muted-foreground mt-1">
              Income basis is ₱{incomePerTicket.toFixed(2)} per ticket (₱100
              paid - ₱80 card value).
            </p>
            {latestSale ? (
              <p className="text-muted-foreground mt-2">
                Latest sale split: DOTR ₱
                {Number(latestSale.splits?.DOTR ?? 0).toFixed(2)} · Commission ₱
                {Number(latestSale.splits?.COMMISSION ?? 0).toFixed(2)} · VIP ₱
                {Number(latestSale.splits?.VIP ?? 0).toFixed(2)} · Gateron ₱
                {Number(latestSale.splits?.GATERON ?? 0).toFixed(2)}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Ticket Sale</CardTitle>
        </CardHeader>
        <CardContent>
          {latestSale ? (
            <p className="text-sm">
              {new Date(latestSale.at).toLocaleString()} · UID:{" "}
              {latestSale.uid ?? "N/A"} · Income: ₱
              {Number(latestSale.income ?? 0).toFixed(2)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              No ticket sales recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
