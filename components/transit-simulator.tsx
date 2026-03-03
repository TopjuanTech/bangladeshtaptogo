"use client";

import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  STATIONS,
  TransitError,
  createFareMatrix,
  getFare,
  isCardExpired,
  tapInCard,
  tapOutCard,
} from "@/lib/nfc-transit";
import {
  normalizeCardUid,
  useCardRegistryStore,
} from "@/lib/card-registry-store";

const fareMatrix = createFareMatrix();

export function TransitSimulator() {
  const [now, setNow] = React.useState(new Date("2026-02-24T09:00:00"));
  const [entryStation, setEntryStation] = React.useState<
    (typeof STATIONS)[number]
  >(STATIONS[0]);
  const [exitStation, setExitStation] = React.useState<
    (typeof STATIONS)[number]
  >(STATIONS[1]);
  const [activeUid, setActiveUid] = React.useState("");
  const [lastReaderUid, setLastReaderUid] = React.useState("");
  const scanBufferRef = React.useRef("");
  const scanTimerRef = React.useRef<number | null>(null);

  const updateCard = useCardRegistryStore((state) => state.updateCard);
  const isRegistered = useCardRegistryStore((state) => state.isRegistered);
  const getCard = useCardRegistryStore((state) => state.getCard);
  const cards = useCardRegistryStore((state) => state.cards);

  const registeredUids = React.useMemo(() => Object.keys(cards), [cards]);

  React.useEffect(() => {
    if (!activeUid && registeredUids.length > 0) {
      setActiveUid(registeredUids[0]);
    }

    if (
      activeUid &&
      !registeredUids.includes(activeUid) &&
      registeredUids.length > 0
    ) {
      setActiveUid(registeredUids[0]);
    }
  }, [activeUid, registeredUids]);

  const activeRecord = activeUid ? cards[activeUid] : undefined;
  const card = activeRecord?.card ?? null;
  const expired = card ? isCardExpired(card, now) : false;

  const notifySuccess = React.useCallback((text: string) => {
    toast.success(text);
  }, []);

  const notifyError = React.useCallback((text: string) => {
    toast.error(text);
  }, []);

  const processReaderTap = React.useCallback(
    (rawUid: string) => {
      const uid = normalizeCardUid(rawUid);

      if (!uid) {
        notifyError("Reader UID is empty.");
        return;
      }

      setLastReaderUid(uid);
      setActiveUid(uid);

      if (!isRegistered(uid)) {
        notifyError(
          `Card ${uid} is not registered. Register in Card Management first.`,
        );
        return;
      }

      const record = getCard(uid);
      if (!record) {
        notifyError(
          `Card ${uid} is not registered. Register in Card Management first.`,
        );
        return;
      }

      try {
        const nextCard = record.card.tapSession
          ? tapOutCard(record.card, exitStation, now, fareMatrix)
          : tapInCard(record.card, entryStation, now);

        updateCard(uid, nextCard);

        if (record.card.tapSession) {
          notifySuccess(`Auto tap-out complete for ${uid} at ${exitStation}.`);
          return;
        }

        notifySuccess(`Auto tap-in complete for ${uid} at ${entryStation}.`);
      } catch (error) {
        if (error instanceof TransitError) {
          notifyError(`${error.code}: ${error.message}`);
          return;
        }

        notifyError("Unexpected error occurred.");
      }
    },
    [
      entryStation,
      exitStation,
      getCard,
      isRegistered,
      notifyError,
      notifySuccess,
      now,
      updateCard,
    ],
  );

  React.useEffect(() => {
    const resetBuffer = () => {
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = window.setTimeout(() => {
        scanBufferRef.current = "";
      }, 120);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingField =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (isTypingField) {
        return;
      }

      if (event.key === "Enter") {
        const value = scanBufferRef.current;
        if (value) {
          event.preventDefault();
          processReaderTap(value);
          scanBufferRef.current = "";
        }
        return;
      }

      if (/^[a-zA-Z0-9-]$/.test(event.key)) {
        scanBufferRef.current += event.key;
        resetBuffer();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }
    };
  }, [processReaderTap]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>NFC Tap-to-Go Transit Simulator</CardTitle>
          <CardDescription>
            IC card reader is the default input device. Reader scan
            automatically runs tap-in/tap-out lifecycle and fare deduction.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border p-3 lg:col-span-2">
            <div className="text-muted-foreground text-xs">
              Default Input Device
            </div>
            <div className="mt-1 text-sm font-medium">
              Connected IC Card Reader
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              Scan card on reader to auto tap-in/tap-out.
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              Last Reader UID: {lastReaderUid || "N/A"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">Balance</div>
            <div className="font-medium">
              {card ? `৳${card.balance.toFixed(2)}` : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">Expiry</div>
            <div className="font-medium">
              {card ? card.expiresAt.toLocaleString() : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">Status</div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Badge variant={card ? "secondary" : "destructive"}>
                {card ? "Registered" : "Unregistered"}
              </Badge>
              <Badge variant={expired ? "destructive" : "secondary"}>
                {expired ? "Expired" : "Active"}
              </Badge>
              <Badge variant={card?.tapSession ? "default" : "outline"}>
                {card?.tapSession
                  ? `In trip (${card.tapSession.station})`
                  : "Idle"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tap-to-Travel</CardTitle>
          <CardDescription>
            Configure entry/exit station rules used by automatic IC reader tap
            operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Auto Tap-In Station</div>
            <Select
              value={entryStation}
              onValueChange={(value) =>
                setEntryStation(value as (typeof STATIONS)[number])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select entry station" />
              </SelectTrigger>
              <SelectContent>
                {STATIONS.map((station) => (
                  <SelectItem key={`entry-${station}`} value={station}>
                    {station}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Applied when scanned card is idle (not currently in a trip).
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Auto Tap-Out Station</div>
            <Select
              value={exitStation}
              onValueChange={(value) =>
                setExitStation(value as (typeof STATIONS)[number])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select exit station" />
              </SelectTrigger>
              <SelectContent>
                {STATIONS.map((station) => (
                  <SelectItem key={`exit-${station}`} value={station}>
                    {station}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Applied when scanned card is currently in a trip.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Clock</div>
            <div className="text-muted-foreground text-xs">
              Current simulation time
            </div>
            <div className="text-sm">{now.toLocaleString()}</div>
            <Button
              variant="outline"
              onClick={() =>
                setNow((prev) => new Date(prev.getTime() + 24 * 60 * 60 * 1000))
              }
            >
              Advance 1 Day
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Fare Checks</CardTitle>
          <CardDescription>
            Dhaka Metro fare matrix from the configured schedule (minimum travel
            fare is 18 BDT).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            Uttara North → Uttara Center ={" "}
            {getFare("Uttara North", "Uttara Center", fareMatrix)} BDT
          </div>
          <div>
            Uttara North → Mirpur 10 ={" "}
            {getFare("Uttara North", "Mirpur 10", fareMatrix)} BDT
          </div>
          <div>
            Uttara North → Farmgate ={" "}
            {getFare("Uttara North", "Farmgate", fareMatrix)} BDT
          </div>
          <div>
            Uttara North → Motijheel ={" "}
            {getFare("Uttara North", "Motijheel", fareMatrix)} BDT
          </div>
          <div>
            Farmgate → Kamalapur ={" "}
            {getFare("Farmgate", "Kamalapur", fareMatrix)} BDT
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fare Matrix (BDT)</CardTitle>
          <CardDescription>
            Based on configured Dhaka Metro fare matrix.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-180 border-collapse text-xs">
            <thead>
              <tr>
                <th className="bg-muted sticky left-0 border px-2 py-1 text-left">
                  From/To
                </th>
                {STATIONS.map((station) => (
                  <th
                    key={`head-${station}`}
                    className="bg-muted border px-2 py-1"
                  >
                    {station}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((from) => (
                <tr key={`row-${from}`}>
                  <td className="bg-muted sticky left-0 border px-2 py-1 font-medium">
                    {from}
                  </td>
                  {STATIONS.map((to) => (
                    <td
                      key={`${from}-${to}`}
                      className="border px-2 py-1 text-center"
                    >
                      {fareMatrix[from][to]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
