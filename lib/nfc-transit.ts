export const STATIONS = [
  "Dr. Santos",
  "Ninoy Aquino Avenue",
  "PITX",
  "MIA Road",
  "Redemptorist - Aseana",
  "Baclaran",
  "EDSA",
  "Libertad",
  "Gil Puyat",
  "Vito Cruz",
  "Quirino",
  "Pedro Gil",
  "UN Avenue",
  "Central",
  "Carriedo",
  "D. Jose",
  "Bambang",
  "Tayuman",
  "Blumentritt",
  "Abad Santos",
  "R. Papa",
  "5th Avenue",
  "Monumento",
  "Balintawak",
  "Fernando Poe Jr.",
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

const LRT1_DISTANCE_FARE_PROFILE = [
  16, 19, 20, 22, 23, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41,
  42, 43, 45, 46, 49, 52,
] as const;

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
      const distance = Math.abs(
        stationOrder.get(from)! - stationOrder.get(to)!,
      );
      const fareIndex = Math.min(
        distance,
        LRT1_DISTANCE_FARE_PROFILE.length - 1,
      );
      matrix[from][to] = LRT1_DISTANCE_FARE_PROFILE[fareIndex];
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
  minimumFare = 16,
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
      `Insufficient balance to tap in. Minimum required is ${minimumFare} PHP.`,
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
      `Insufficient balance for fare ${fare} PHP. Please top up and tap out again.`,
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
