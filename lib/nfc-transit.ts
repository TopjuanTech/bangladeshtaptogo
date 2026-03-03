export const STATIONS = [
  "Uttara North",
  "Uttara Center",
  "Uttara South",
  "Pallabi",
  "Mirpur 11",
  "Mirpur 10",
  "Kazipara",
  "Shewrapara",
  "Agargaon",
  "Bijoy Sarani",
  "Farmgate",
  "Karwan Bazar",
  "Shahbag",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
  "Kamalapur",
] as const;

export type Station = (typeof STATIONS)[number];

export type TransitErrorCode =
  | "CARD_EXPIRED"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_TOP_UP"
  | "INVALID_EXTENSION"
  | "ALREADY_TAPPED_IN"
  | "NOT_TAPPED_IN";

export class TransitError extends Error {
  code: TransitErrorCode;

  constructor(code: TransitErrorCode, message: string) {
    super(message);
    this.name = "TransitError";
    this.code = code;
  }
}

export type TapSession = {
  station: Station;
  at: Date;
};

export type CardEvent =
  | {
      type: "ISSUE";
      at: Date;
      initialBalance: number;
      expiresAt: Date;
    }
  | {
      type: "TOP_UP";
      at: Date;
      amount: number;
      balanceAfter: number;
      via: "cashier";
    }
  | {
      type: "EXTEND_EXPIRY";
      at: Date;
      days: number;
      previousExpiry: Date;
      nextExpiry: Date;
      via: "mobile-app";
    }
  | {
      type: "TAP_IN";
      at: Date;
      station: Station;
    }
  | {
      type: "TRIP_DEBIT";
      at: Date;
      entry: Station;
      exit: Station;
      fare: number;
      balanceAfter: number;
    };

export type TransitCard = {
  id: string;
  issuedAt: Date;
  expiresAt: Date;
  balance: number;
  tapSession: TapSession | null;
  events: CardEvent[];
};

export type FareMatrix = Record<Station, Record<Station, number>>;

const DHAKA_METRO_FARE_ROWS: Record<Station, readonly number[]> = {
  "Uttara North": [
    0, 18, 18, 27, 27, 36, 36, 45, 54, 54, 63, 72, 72, 81, 81, 90, 90,
  ],
  "Uttara Center": [
    18, 0, 18, 18, 18, 18, 18, 27, 36, 36, 45, 54, 54, 63, 63, 72, 72,
  ],
  "Uttara South": [
    18, 18, 0, 18, 18, 18, 18, 27, 36, 36, 45, 54, 54, 63, 63, 72, 72,
  ],
  Pallabi: [27, 18, 18, 0, 18, 18, 18, 18, 27, 27, 36, 45, 45, 54, 54, 63, 63],
  "Mirpur 11": [
    27, 18, 18, 18, 0, 18, 18, 18, 27, 27, 36, 45, 45, 54, 54, 63, 63,
  ],
  "Mirpur 10": [
    36, 18, 18, 18, 18, 0, 18, 18, 18, 18, 27, 36, 36, 45, 45, 54, 54,
  ],
  Kazipara: [36, 18, 18, 18, 18, 18, 0, 18, 18, 18, 27, 36, 36, 45, 45, 54, 54],
  Shewrapara: [
    45, 27, 27, 18, 18, 18, 18, 0, 18, 18, 18, 27, 27, 36, 36, 45, 45,
  ],
  Agargaon: [54, 36, 36, 27, 27, 18, 18, 18, 0, 18, 18, 18, 18, 27, 27, 36, 36],
  "Bijoy Sarani": [
    54, 36, 36, 27, 27, 18, 18, 18, 18, 0, 18, 18, 18, 27, 27, 36, 36,
  ],
  Farmgate: [63, 45, 45, 36, 36, 27, 27, 18, 18, 18, 0, 18, 18, 18, 18, 27, 27],
  "Karwan Bazar": [
    72, 54, 54, 45, 45, 36, 36, 27, 18, 18, 18, 0, 18, 18, 18, 18, 18,
  ],
  Shahbag: [72, 54, 54, 45, 45, 36, 36, 27, 18, 18, 18, 18, 0, 18, 18, 18, 18],
  "Dhaka University": [
    81, 63, 63, 54, 54, 45, 45, 36, 27, 27, 18, 18, 18, 0, 18, 18, 18,
  ],
  "Bangladesh Secretariat": [
    81, 63, 63, 54, 54, 45, 45, 36, 27, 27, 18, 18, 18, 18, 0, 18, 18,
  ],
  Motijheel: [
    90, 72, 72, 63, 63, 54, 54, 45, 36, 36, 27, 18, 18, 18, 18, 0, 18,
  ],
  Kamalapur: [
    90, 72, 72, 63, 63, 54, 54, 45, 36, 36, 27, 18, 18, 18, 18, 18, 0,
  ],
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const stationOrder = new Map<Station, number>(
  STATIONS.map((station, index) => [station, index]),
);

export function createFareMatrix(
  stations: readonly Station[] = STATIONS,
): FareMatrix {
  const matrix = {} as FareMatrix;

  for (const from of stations) {
    matrix[from] = {} as Record<Station, number>;

    for (const to of stations) {
      const toIndex = stationOrder.get(to)!;
      matrix[from][to] = DHAKA_METRO_FARE_ROWS[from][toIndex];
    }
  }

  return matrix;
}

export function issueCard(options: {
  id: string;
  initialBalance: number;
  issuedAt: Date;
  validityDays: number;
}): TransitCard {
  if (options.initialBalance < 0) {
    throw new TransitError(
      "INVALID_TOP_UP",
      "Initial balance cannot be negative.",
    );
  }

  if (options.validityDays <= 0) {
    throw new TransitError(
      "INVALID_EXTENSION",
      "Card validity must be at least 1 day.",
    );
  }

  const expiresAt = addDays(options.issuedAt, options.validityDays);

  return {
    id: options.id,
    issuedAt: new Date(options.issuedAt),
    expiresAt,
    balance: options.initialBalance,
    tapSession: null,
    events: [
      {
        type: "ISSUE",
        at: new Date(options.issuedAt),
        initialBalance: options.initialBalance,
        expiresAt,
      },
    ],
  };
}

export function topUpCard(
  card: TransitCard,
  amount: number,
  at: Date,
): TransitCard {
  if (amount <= 0) {
    throw new TransitError(
      "INVALID_TOP_UP",
      "Top-up amount must be greater than zero.",
    );
  }

  ensureCardActive(card, at);

  const balance = roundMoney(card.balance + amount);

  return {
    ...card,
    balance,
    events: [
      ...card.events,
      {
        type: "TOP_UP",
        at: new Date(at),
        amount,
        balanceAfter: balance,
        via: "cashier",
      },
    ],
  };
}

export function extendCardExpiry(
  card: TransitCard,
  days: number,
  at: Date,
): TransitCard {
  if (days <= 0) {
    throw new TransitError(
      "INVALID_EXTENSION",
      "Extension days must be greater than zero.",
    );
  }

  const previousExpiry = new Date(card.expiresAt);
  const baseline =
    previousExpiry.getTime() > at.getTime() ? previousExpiry : at;
  const nextExpiry = addDays(baseline, days);

  return {
    ...card,
    expiresAt: nextExpiry,
    events: [
      ...card.events,
      {
        type: "EXTEND_EXPIRY",
        at: new Date(at),
        days,
        previousExpiry,
        nextExpiry,
        via: "mobile-app",
      },
    ],
  };
}

export function tapInCard(
  card: TransitCard,
  station: Station,
  at: Date,
  minimumFare = 18,
): TransitCard {
  ensureCardActive(card, at);

  if (card.tapSession) {
    throw new TransitError(
      "ALREADY_TAPPED_IN",
      "Card already tapped in. Tap out before tapping in again.",
    );
  }

  if (card.balance < minimumFare) {
    throw new TransitError(
      "INSUFFICIENT_BALANCE",
      `Insufficient balance to tap in. Minimum required is ${minimumFare} BDT.`,
    );
  }

  return {
    ...card,
    tapSession: {
      station,
      at: new Date(at),
    },
    events: [
      ...card.events,
      {
        type: "TAP_IN",
        at: new Date(at),
        station,
      },
    ],
  };
}

export function tapOutCard(
  card: TransitCard,
  exitStation: Station,
  at: Date,
  fareMatrix: FareMatrix,
): TransitCard {
  ensureCardActive(card, at);

  if (!card.tapSession) {
    throw new TransitError(
      "NOT_TAPPED_IN",
      "Card has no active trip. Tap in first.",
    );
  }

  const entryStation = card.tapSession.station;
  const fare = fareMatrix[entryStation][exitStation];

  if (card.balance < fare) {
    throw new TransitError(
      "INSUFFICIENT_BALANCE",
      `Insufficient balance for fare ${fare} BDT. Please top up and tap out again.`,
    );
  }

  const balanceAfter = roundMoney(card.balance - fare);

  if (balanceAfter < 0) {
    throw new TransitError(
      "INSUFFICIENT_BALANCE",
      "Operation would result in negative balance.",
    );
  }

  return {
    ...card,
    balance: balanceAfter,
    tapSession: null,
    events: [
      ...card.events,
      {
        type: "TRIP_DEBIT",
        at: new Date(at),
        entry: entryStation,
        exit: exitStation,
        fare,
        balanceAfter,
      },
    ],
  };
}

export function isCardExpired(card: TransitCard, at: Date): boolean {
  return at.getTime() > card.expiresAt.getTime();
}

export function getFare(
  from: Station,
  to: Station,
  matrix: FareMatrix,
): number {
  return matrix[from][to];
}

function ensureCardActive(card: TransitCard, at: Date): void {
  if (isCardExpired(card, at)) {
    throw new TransitError(
      "CARD_EXPIRED",
      "Card has expired. Extend validity in the mobile app.",
    );
  }
}

function addDays(input: Date, days: number): Date {
  return new Date(input.getTime() + days * DAY_IN_MS);
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
