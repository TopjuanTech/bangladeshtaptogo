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
import { isCardExpired } from "@/lib/nfc-transit";

export default function CardManagementPage() {
  const [uidInput, setUidInput] = useState("");
  const [manualBalanceEnabled, setManualBalanceEnabled] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState("80");

  const cards = useCardRegistryStore((state) => state.cards);
  const registerCard = useCardRegistryStore((state) => state.registerCard);

  const cardList = useMemo(() => Object.values(cards), [cards]);

  const handleRegister = () => {
    const now = new Date();
    const uid = normalizeCardUid(uidInput);
    let initialBalance: number | undefined;

    if (manualBalanceEnabled) {
      const parsedBalance = Number.parseFloat(initialBalanceInput);

      if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
        toast.error(
          "Initial balance must be a valid number greater than or equal to 0.",
        );
        return;
      }

      initialBalance = parsedBalance;
    }

    const result = registerCard(uid, now, initialBalance);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(`Card ${uid} registered successfully.`);
    setUidInput("");
  };

  return (
    <PageShell
      title="Card Management"
      description="Register, inspect, and monitor NFC cards from one focused workspace."
    >
      <Card>
        <CardHeader>
          <CardTitle>Register New Card</CardTitle>
          <CardDescription>
            Use scanned UID input or manual entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={manualBalanceEnabled ? "default" : "outline"}
              onClick={() => setManualBalanceEnabled((current) => !current)}
            >
              {manualBalanceEnabled
                ? "Manual Initial Balance: On"
                : "Manual Initial Balance: Off"}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={uidInput}
              onChange={(event) => setUidInput(event.target.value)}
              placeholder="Enter UID (e.g. 04A1B2C3D4)"
            />
            {manualBalanceEnabled ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                value={initialBalanceInput}
                onChange={(event) => setInitialBalanceInput(event.target.value)}
                placeholder="Initial balance"
                className="sm:max-w-48"
              />
            ) : null}
            <Button onClick={handleRegister}>Register Card</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Cards</CardTitle>
          <CardDescription>
            {cardList.length} card(s) currently in the registry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cardList.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No registered cards yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-2 py-2 font-medium">UID</th>
                    <th className="px-2 py-2 font-medium">Balance</th>
                    <th className="px-2 py-2 font-medium">Expiry</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Tap Session</th>
                  </tr>
                </thead>
                <tbody>
                  {cardList.map((record) => {
                    const expired = isCardExpired(record.card, new Date());
                    return (
                      <tr key={record.uid} className="border-b last:border-b-0">
                        <td className="px-2 py-2 font-medium">{record.uid}</td>
                        <td className="px-2 py-2">
                          ₱{record.card.balance.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          {new Date(record.card.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2">
                          {expired ? "Expired" : "Active"}
                        </td>
                        <td className="px-2 py-2">
                          {record.card.tapSession
                            ? `IN: ${record.card.tapSession.station}`
                            : "No active trip"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
