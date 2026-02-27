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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATIONS,
  TransitCard,
  TransitError,
  createFareMatrix,
  extendCardExpiry,
  getFare,
  isCardExpired,
  tapInCard,
  tapOutCard,
  topUpCard,
} from "@/lib/nfc-transit";
import {
  normalizeCardUid,
  useCardRegistryStore,
} from "@/lib/card-registry-store";

const fareMatrix = createFareMatrix();

type MobileNDEFReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  addEventListener: (
    type: "reading" | "readingerror",
    listener: (event: { serialNumber?: string }) => void,
  ) => void;
};

type WindowWithNDEF = Window & {
  NDEFReader?: new () => MobileNDEFReader;
};

export function TransitSimulator() {
  const [now, setNow] = React.useState(new Date("2026-02-24T09:00:00"));
  const [readerAction, setReaderAction] = React.useState<
    "register-select" | "tap-in" | "tap-out"
  >("register-select");
  const [entryStation, setEntryStation] = React.useState<
    (typeof STATIONS)[number]
  >(STATIONS[0]);
  const [exitStation, setExitStation] = React.useState<
    (typeof STATIONS)[number]
  >(STATIONS[1]);
  const [topUpAmount, setTopUpAmount] = React.useState("100");
  const [extendDays, setExtendDays] = React.useState("30");
  const [scannedUid, setScannedUid] = React.useState("04A1B2C3D4");
  const [activeUid, setActiveUid] = React.useState("");
  const [mobileNfcSupported, setMobileNfcSupported] = React.useState(false);
  const [mobileNfcScanning, setMobileNfcScanning] = React.useState(false);
  const scanBufferRef = React.useRef("");
  const scanTimerRef = React.useRef<number | null>(null);
  const nfcAbortControllerRef = React.useRef<AbortController | null>(null);

  const cards = useCardRegistryStore((state) => state.cards);
  const registerCard = useCardRegistryStore((state) => state.registerCard);
  const updateCard = useCardRegistryStore((state) => state.updateCard);
  const isRegistered = useCardRegistryStore((state) => state.isRegistered);
  const getCard = useCardRegistryStore((state) => state.getCard);
  const buyTicket = useCardRegistryStore((state) => state.buyTicket);
  const sellTickets = useCardRegistryStore((state) => state.sellTickets);
  const getTransactionsForUid = useCardRegistryStore(
    (state) => state.getTransactionsForUid,
  );

  const [ticketQuantity, setTicketQuantity] = React.useState("1");
  const transactions = useCardRegistryStore((s) => s.transactions);
  const recentTransactions = React.useMemo(
    () => transactions.slice(0, 3),
    [transactions],
  );

  const registeredUids = React.useMemo(() => Object.keys(cards), [cards]);

  const notifySuccess = React.useCallback((text: string) => {
    toast.success(text);
  }, []);

  const notifyInfo = React.useCallback((text: string) => {
    toast.info(text);
  }, []);

  const notifyError = React.useCallback((text: string) => {
    toast.error(text);
  }, []);

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

  const ensureRegisteredCard = (): {
    uid: string;
    card: TransitCard;
  } | null => {
    const uid = normalizeCardUid(activeUid);

    if (!uid) {
      notifyError("Scan a card and select an active registered UID first.");
      return null;
    }

    if (!isRegistered(uid)) {
      notifyError(`Card ${uid} is not registered. Register it first.`);
      return null;
    }

    const record = getCard(uid);
    if (!record) {
      notifyError(`Card ${uid} is not registered. Register it first.`);
      return null;
    }

    return { uid, card: record.card };
  };

  const ensureRegisteredCardByUid = React.useCallback(
    (
      uid: string,
    ): {
      uid: string;
      card: TransitCard;
    } | null => {
      const normalizedUid = normalizeCardUid(uid);

      if (!normalizedUid) {
        notifyError("UID is required.");
        return null;
      }

      if (!isRegistered(normalizedUid)) {
        notifyError(
          `Card ${normalizedUid} is not registered. Register it first.`,
        );
        return null;
      }

      const record = getCard(normalizedUid);
      if (!record) {
        notifyError(
          `Card ${normalizedUid} is not registered. Register it first.`,
        );
        return null;
      }

      return { uid: normalizedUid, card: record.card };
    },
    [getCard, isRegistered, notifyError],
  );

  const applyOperation = (
    action: (existingCard: TransitCard) => TransitCard,
    successMessage: string,
  ) => {
    const context = ensureRegisteredCard();
    if (!context) {
      return;
    }

    try {
      const nextCard = action(context.card);
      updateCard(context.uid, nextCard);
      notifySuccess(successMessage);
    } catch (error) {
      if (error instanceof TransitError) {
        notifyError(`${error.code}: ${error.message}`);
        return;
      }

      notifyError("Unexpected error occurred.");
    }
  };

  const applyOperationForUid = React.useCallback(
    (
      uid: string,
      action: (existingCard: TransitCard) => TransitCard,
      successMessage: string,
    ) => {
      const context = ensureRegisteredCardByUid(uid);
      if (!context) {
        return;
      }

      setActiveUid(context.uid);

      try {
        const nextCard = action(context.card);
        updateCard(context.uid, nextCard);
        notifySuccess(successMessage);
      } catch (error) {
        if (error instanceof TransitError) {
          notifyError(`${error.code}: ${error.message}`);
          return;
        }

        notifyError("Unexpected error occurred.");
      }
    },
    [ensureRegisteredCardByUid, updateCard, notifyError, notifySuccess],
  );

  const handleRegisterCard = () => {
    const normalizedUid = normalizeCardUid(scannedUid);
    const result = registerCard(normalizedUid, now);

    if (!result.ok) {
      notifyError(result.reason);
      return;
    }

    setActiveUid(normalizedUid);
    notifySuccess(
      `Card ${normalizedUid} registered. Only registered cards are allowed.`,
    );
  };

  const handleScanAndUse = () => {
    const normalizedUid = normalizeCardUid(scannedUid);

    if (!normalizedUid) {
      notifyError("UID is required.");
      return;
    }

    setActiveUid(normalizedUid);

    if (!isRegistered(normalizedUid)) {
      notifyError(
        `Card ${normalizedUid} is not registered. Register it first.`,
      );
      return;
    }

    notifyInfo(`Card ${normalizedUid} selected.`);
  };

  const handleReaderTap = React.useCallback(
    (rawUid: string) => {
      const normalizedUid = normalizeCardUid(rawUid);

      setScannedUid(normalizedUid);

      if (!normalizedUid) {
        notifyError("UID is required.");
        return;
      }

      if (readerAction === "tap-in") {
        applyOperationForUid(
          normalizedUid,
          (existingCard) => tapInCard(existingCard, entryStation, now),
          `Card ${normalizedUid} tapped in at station ${entryStation}.`,
        );
        return;
      }

      if (readerAction === "tap-out") {
        applyOperationForUid(
          normalizedUid,
          (existingCard) =>
            tapOutCard(existingCard, exitStation, now, fareMatrix),
          `Card ${normalizedUid} tapped out at station ${exitStation}.`,
        );
        return;
      }

      if (isRegistered(normalizedUid)) {
        setActiveUid(normalizedUid);
        notifyInfo(`Card ${normalizedUid} selected.`);
        return;
      }

      const result = registerCard(normalizedUid, now);

      if (!result.ok) {
        notifyError(result.reason);
        return;
      }

      setActiveUid(normalizedUid);
      notifySuccess(
        `Card ${normalizedUid} registered from IC reader scan and selected.`,
      );
    },
    [
      entryStation,
      exitStation,
      now,
      readerAction,
      isRegistered,
      registerCard,
      applyOperationForUid,
      notifyError,
      notifyInfo,
      notifySuccess,
    ],
  );

  const stopMobileNfcScan = React.useCallback(() => {
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
      nfcAbortControllerRef.current = null;
    }
    setMobileNfcScanning(false);
  }, []);

  const startMobileNfcScan = React.useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const ndefReaderCtor = (window as WindowWithNDEF).NDEFReader;

    if (!ndefReaderCtor) {
      notifyError(
        "Mobile NFC is not supported on this browser/device. Use Android Chrome over HTTPS.",
      );
      return;
    }

    const isSecureContextAllowed =
      window.isSecureContext || window.location.hostname === "localhost";

    if (!isSecureContextAllowed) {
      notifyError("Mobile NFC requires HTTPS (or localhost) to work.");
      return;
    }

    try {
      stopMobileNfcScan();

      const reader = new ndefReaderCtor();
      const controller = new AbortController();
      nfcAbortControllerRef.current = controller;

      reader.addEventListener("reading", (event) => {
        const uid = normalizeCardUid(event.serialNumber ?? "");

        if (!uid) {
          notifyError(
            "NFC tag detected but UID is not available on this device/tag.",
          );
          return;
        }

        handleReaderTap(uid);
      });

      reader.addEventListener("readingerror", () => {
        notifyError("NFC read error. Please tap the card again.");
      });

      await reader.scan({ signal: controller.signal });
      setMobileNfcScanning(true);
      notifySuccess(
        "Mobile NFC scanning started. Tap card on the phone to run current Reader Action.",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to start mobile NFC scan.";
      setMobileNfcScanning(false);
      notifyError(errorMessage);
    }
  }, [handleReaderTap, stopMobileNfcScan, notifyError, notifySuccess]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setMobileNfcSupported(Boolean((window as WindowWithNDEF).NDEFReader));
  }, []);

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
          handleReaderTap(value);
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
  }, [handleReaderTap]);

  React.useEffect(() => {
    return () => {
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleTopUp = () => {
    const amount = Number(topUpAmount);
    applyOperation(
      (existingCard) => topUpCard(existingCard, amount, now),
      `Top-up successful: +${amount} PHP (cashier).`,
    );
  };

  const handleExtend = () => {
    const days = Number(extendDays);
    applyOperation(
      (existingCard) => extendCardExpiry(existingCard, days, now),
      `Expiry extended by ${days} days (mobile app).`,
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>NFC Card Registration (IC Reader)</CardTitle>
          <CardDescription>
            Simulates reader UID scan. Register card first before top-up or
            travel taps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-3 lg:col-span-2">
            <div className="text-sm font-medium">Scanned Card UID</div>
            <Input
              placeholder="Tap card on reader to get UID"
              value={scannedUid}
              onChange={(event) => setScannedUid(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleReaderTap(scannedUid);
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Reader mode: tap card to send UID + Enter. Current action runs
              immediately on tap.
            </p>
            <div className="space-y-1">
              <div className="text-sm font-medium">Reader Action</div>
              <Select
                value={readerAction}
                onValueChange={(value) =>
                  setReaderAction(
                    (value as "register-select" | "tap-in" | "tap-out") ??
                      "register-select",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose action for next card tap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="register-select">
                    Register / Select
                  </SelectItem>
                  <SelectItem value="tap-in">
                    Tap In (use Entry station)
                  </SelectItem>
                  <SelectItem value="tap-out">
                    Tap Out (use Exit station)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Mobile Built-in NFC</div>
                <Badge
                  variant={mobileNfcSupported ? "secondary" : "destructive"}
                >
                  {mobileNfcSupported ? "Supported" : "Not supported"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Use phone NFC reader (Web NFC). Works best on Android Chrome
                with HTTPS.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={startMobileNfcScan}
                  disabled={!mobileNfcSupported || mobileNfcScanning}
                >
                  Start Mobile NFC Scan
                </Button>
                <Button
                  variant="outline"
                  onClick={stopMobileNfcScan}
                  disabled={!mobileNfcScanning}
                >
                  Stop Mobile NFC Scan
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRegisterCard}>Register Card</Button>
              <Button variant="outline" onClick={handleScanAndUse}>
                Use This UID
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Active Registered Card</div>
            <Select
              value={activeUid}
              onValueChange={(value) => setActiveUid(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select registered UID" />
              </SelectTrigger>
              <SelectContent>
                {registeredUids.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No registered cards
                  </SelectItem>
                ) : (
                  registeredUids.map((uid) => (
                    <SelectItem key={uid} value={uid}>
                      {uid}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="text-muted-foreground text-xs">
              Registered cards: {registeredUids.length}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ticket Shop</CardTitle>
          <CardDescription>
            Issue a new NFC ticket-card (card is created with 80 PHP). Each
            ticket costs 100 PHP; income (20 PHP) is split 60% DOTR / 40%
            commission — commission further splits 60% VIP / 40% Gateron.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Quantity</div>
            <Input
              type="number"
              min="1"
              value={ticketQuantity}
              onChange={(event) => setTicketQuantity(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const qty = Number(ticketQuantity);
                  if (!Number.isInteger(qty) || qty <= 0) {
                    notifyError("Quantity must be a positive integer.");
                    return;
                  }

                  const res = sellTickets(qty, now);
                  if (!res.ok) {
                    notifyError(res.reason);
                    return;
                  }

                  const tx = res.tx;
                  notifySuccess(
                    `Sold ${qty} ticket(s) — total paid ${tx.paid} PHP.`,
                  );
                  notifyInfo(
                    `Income ${tx.income} PHP split: DOTR ${tx.splits?.DOTR} PHP, Commission ${tx.splits?.COMMISSION} PHP (VIP ${tx.splits?.VIP} PHP, Gateron ${tx.splits?.GATERON} PHP)`,
                  );
                }}
              >
                Buy Tickets
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Recent Transactions</div>
            <div className="text-xs text-muted-foreground">
              Shows recent ticket sales (bulk sales are shown here).
            </div>
            <div className="mt-2 space-y-2">
              {/** Show last 3 transactions */}
              {recentTransactions.map((t) => (
                <div key={t.id} className="rounded border p-2 text-sm">
                  <div className="font-medium">{t.type}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(t.at).toLocaleString()}
                  </div>
                  <div className="text-xs">Quantity: {t.quantity ?? 1}</div>
                  <div className="text-xs">Paid: {t.paid} PHP</div>
                  <div className="text-xs">Income: {t.income} PHP</div>
                  <div className="text-xs">DOTR: {t.splits?.DOTR} PHP</div>
                  <div className="text-xs">VIP: {t.splits?.VIP} PHP</div>
                  <div className="text-xs">
                    Gateron: {t.splits?.GATERON} PHP
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NFC Tap-to-Go Transit Simulator</CardTitle>
          <CardDescription>
            Models card lifecycle, tap-in/tap-out tracking, fare matrix pricing
            by distance, and validation errors.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">Card UID</div>
            <div className="font-medium">{activeUid || "N/A"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">Balance</div>
            <div className="font-medium">
              {card ? `${card.balance.toFixed(2)} PHP` : "N/A"}
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
            <div className="flex items-center gap-2 pt-0.5">
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
          <CardTitle>Lifecycle Operations</CardTitle>
          <CardDescription>
            Top-up (cashier) and extend expiry (mobile app). Registered cards
            only.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Top-Up at Cashier</div>
            <Input
              type="number"
              min="1"
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
            />
            <Button onClick={handleTopUp} disabled={!card}>
              Top Up Balance
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">
              Extend Expiry in Mobile App
            </div>
            <Input
              type="number"
              min="1"
              value={extendDays}
              onChange={(event) => setExtendDays(event.target.value)}
            />
            <Button onClick={handleExtend} disabled={!card}>
              Extend Expiry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tap-to-Travel</CardTitle>
          <CardDescription>
            Tap in at entry station, tap out at exit station, fare
            auto-deducted.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Tap In</div>
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
              Set Reader Action to Tap In, then tap your card on the IC reader.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Tap Out</div>
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
              Set Reader Action to Tap Out, then tap the same card to exit.
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
            LRT-1 fare matrix from the configured schedule (minimum same-station
            fare is 16 PHP).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            Dr. Santos → Dr. Santos ={" "}
            {getFare("Dr. Santos", "Dr. Santos", fareMatrix)} PHP
          </div>
          <div>
            Dr. Santos → Ninoy Aquino Avenue ={" "}
            {getFare("Dr. Santos", "Ninoy Aquino Avenue", fareMatrix)} PHP
          </div>
          <div>
            Dr. Santos → PITX = {getFare("Dr. Santos", "PITX", fareMatrix)} PHP
          </div>
          <div>
            Dr. Santos → Baclaran ={" "}
            {getFare("Dr. Santos", "Baclaran", fareMatrix)} PHP
          </div>
          <div>
            Dr. Santos → Fernando Poe Jr. ={" "}
            {getFare("Dr. Santos", "Fernando Poe Jr.", fareMatrix)} PHP
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fare Matrix (PHP)</CardTitle>
          <CardDescription>
            Auto-calculated using station distance.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
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
