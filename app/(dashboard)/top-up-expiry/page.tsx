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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardRegistryStore } from "@/lib/card-registry-store";
import { TransitError, extendCardExpiry, topUpCard } from "@/lib/nfc-transit";

export default function TopUpExpiryPage() {
  const [selectedUid, setSelectedUid] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [extendDays, setExtendDays] = useState("30");

  const cards = useCardRegistryStore((state) => state.cards);
  const updateCard = useCardRegistryStore((state) => state.updateCard);

  const cardList = useMemo(() => Object.values(cards), [cards]);
  const currentCard = selectedUid ? cards[selectedUid]?.card : undefined;

  const handleTopUp = () => {
    if (!currentCard) {
      toast.error("Select a card first.");
      return;
    }

    try {
      const amount = Number.parseFloat(topUpAmount);
      const next = topUpCard(currentCard, amount, new Date());
      updateCard(selectedUid, next);
      toast.success(`Top-up successful: ₱${amount.toFixed(2)}.`);
    } catch (error) {
      if (error instanceof TransitError) {
        toast.error(error.message);
        return;
      }
      toast.error("Top-up failed.");
    }
  };

  const handleExtend = () => {
    if (!currentCard) {
      toast.error("Select a card first.");
      return;
    }

    try {
      const days = Number.parseInt(extendDays, 10);
      const next = extendCardExpiry(currentCard, days, new Date());
      updateCard(selectedUid, next);
      toast.success(`Validity extended by ${days} day(s).`);
    } catch (error) {
      if (error instanceof TransitError) {
        toast.error(error.message);
        return;
      }
      toast.error("Validity extension failed.");
    }
  };

  return (
    <PageShell
      title="Top-Up & Expiry"
      description="Manage card balance and validity extension operations from a dedicated module."
    >
      <Card>
        <CardHeader>
          <CardTitle>Card Selection</CardTitle>
          <CardDescription>Select a registered card to manage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedUid}
            onValueChange={(value) => setSelectedUid(value ?? "")}
          >
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Select card UID" />
            </SelectTrigger>
            <SelectContent>
              {cardList.map((record) => (
                <SelectItem key={record.uid} value={record.uid}>
                  {record.uid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Up Balance</CardTitle>
            <CardDescription>Add value to the selected card.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              min={1}
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
              placeholder="Amount"
            />
            <Button onClick={handleTopUp} className="w-full">
              Process Top Up
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extend Validity</CardTitle>
            <CardDescription>Increase card expiry period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              min={1}
              value={extendDays}
              onChange={(event) => setExtendDays(event.target.value)}
              placeholder="Days"
            />
            <Button onClick={handleExtend} variant="outline" className="w-full">
              Extend Expiry
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selected Card Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {!currentCard ? (
            <p className="text-muted-foreground text-sm">
              Choose a card to view balance and expiry details.
            </p>
          ) : (
            <div className="grid gap-2 text-sm">
              <p>
                <span className="font-medium">Balance:</span> ₱
                {currentCard.balance.toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Expires:</span>{" "}
                {new Date(currentCard.expiresAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Events:</span>{" "}
                {currentCard.events.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
