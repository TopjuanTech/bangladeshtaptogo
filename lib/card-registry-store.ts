import { create } from "zustand";

import { TransitCard, issueCard } from "@/lib/nfc-transit";

export type RegisteredCard = {
  uid: string;
  registeredAt: Date;
  card: TransitCard;
};

export type RegisteredTransaction = {
  id: string;
  uid?: string | null;
  type: "TICKET_SALE" | "TOP_UP" | "TRIP_DEBIT" | string;
  at: Date;
  paid?: number; // amount paid by customer (PHP)
  // cardBalance removed: do not store per-card balance in transactions
  income?: number; // total income (paid - cardBalance) per card
  quantity?: number; // for bulk sales
  splits?: {
    DOTR?: number;
    COMMISSION?: number;
    VIP?: number;
    GATERON?: number;
  };
  raw?: any;
};

type CardRegistryState = {
  cards: Record<string, RegisteredCard>;
  transactions: RegisteredTransaction[];
  registerCard: (
    uid: string,
    now: Date,
  ) => { ok: true } | { ok: false; reason: string };
  buyTicket: (
    uid: string,
    now: Date,
  ) => { ok: true; tx: RegisteredTransaction } | { ok: false; reason: string };
  sellTickets: (
    quantity: number,
    now: Date,
  ) => { ok: true; tx: RegisteredTransaction } | { ok: false; reason: string };
  updateCard: (uid: string, card: TransitCard) => void;
  getCard: (uid: string) => RegisteredCard | undefined;
  isRegistered: (uid: string) => boolean;
  getTransactionsForUid: (uid: string) => RegisteredTransaction[];
};

const DEFAULT_ISSUE_BALANCE = 80;
const DEFAULT_VALIDITY_DAYS = 30;

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function normalizeUid(uid: string): string {
  return uid.trim().toUpperCase();
}

export const useCardRegistryStore = create<CardRegistryState>((set, get) => ({
  cards: {},
  transactions: [],

  registerCard: (uid, now) => {
    const normalizedUid = normalizeUid(uid);

    if (!normalizedUid) {
      return { ok: false as const, reason: "UID is required." };
    }

    const existing = get().cards[normalizedUid];
    if (existing) {
      return { ok: false as const, reason: "Card is already registered." };
    }

    const newCard = issueCard({
      id: normalizedUid,
      initialBalance: DEFAULT_ISSUE_BALANCE,
      issuedAt: now,
      validityDays: DEFAULT_VALIDITY_DAYS,
    });

    set((state) => ({
      cards: {
        ...state.cards,
        [normalizedUid]: {
          uid: normalizedUid,
          registeredAt: new Date(now),
          card: newCard,
        },
      },
    }));

    return { ok: true as const };
  },

  buyTicket: (uid, now) => {
    const normalizedUid = normalizeUid(uid);

    if (!normalizedUid) {
      return { ok: false as const, reason: "UID is required." };
    }

    // If already registered, prevent duplicate ticket sale
    if (get().cards[normalizedUid]) {
      return { ok: false as const, reason: "Card already exists." };
    }

    // Create the card with initial balance (customer gets card with balance)
    const newCard = issueCard({
      id: normalizedUid,
      initialBalance: DEFAULT_ISSUE_BALANCE,
      issuedAt: now,
      validityDays: DEFAULT_VALIDITY_DAYS,
    });

    set((state) => ({
      cards: {
        ...state.cards,
        [normalizedUid]: {
          uid: normalizedUid,
          registeredAt: new Date(now),
          card: newCard,
        },
      },
    }));

    // Business: ticket price is 100, card receives DEFAULT_ISSUE_BALANCE = 80,
    // income = paid - cardBalance = 20
    const paid = 100;
    const cardBalance = DEFAULT_ISSUE_BALANCE;
    const income = roundMoney(paid - cardBalance);

    // Splits: 60% DOTR, 40% commission; commission split 60% VIP, 40% Gateron
    const DOTR = roundMoney(income * 0.6);
    const COMMISSION = roundMoney(income * 0.4);
    const VIP = roundMoney(COMMISSION * 0.6);
    const GATERON = roundMoney(COMMISSION * 0.4);

    const tx: RegisteredTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uid: normalizedUid,
      type: "TICKET_SALE",
      at: new Date(now),
      paid,
      income,
      splits: {
        DOTR,
        COMMISSION,
        VIP,
        GATERON,
      },
      raw: null,
    };

    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));

    return { ok: true as const, tx };
  },

  sellTickets: (quantity, now) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false as const,
        reason: "Quantity must be a positive integer.",
      };
    }

    // aggregated sale: each ticket paid 100, card receives DEFAULT_ISSUE_BALANCE
    const paid = 100;
    const cardBalance = DEFAULT_ISSUE_BALANCE;
    const incomePer = roundMoney(paid - cardBalance); // 20

    const totalPaid = roundMoney(paid * quantity);
    const totalIncome = roundMoney(incomePer * quantity);

    // Splits per ticket then multiplied
    const DOTR_per = roundMoney(incomePer * 0.6);
    const COMMISSION_per = roundMoney(incomePer * 0.4);
    const VIP_per = roundMoney(COMMISSION_per * 0.6);
    const GATERON_per = roundMoney(COMMISSION_per * 0.4);

    const tx: RegisteredTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uid: null,
      type: "TICKET_SALE",
      at: new Date(now),
      paid: totalPaid,
      quantity,
      income: totalIncome,
      splits: {
        DOTR: roundMoney(DOTR_per * quantity),
        COMMISSION: roundMoney(COMMISSION_per * quantity),
        VIP: roundMoney(VIP_per * quantity),
        GATERON: roundMoney(GATERON_per * quantity),
      },
      raw: null,
    };

    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));

    return { ok: true as const, tx };
  },

  updateCard: (uid, card) => {
    const normalizedUid = normalizeUid(uid);
    const existing = get().cards[normalizedUid];
    if (!existing) {
      return;
    }

    set((state) => ({
      cards: {
        ...state.cards,
        [normalizedUid]: {
          ...existing,
          card,
        },
      },
    }));
  },

  getCard: (uid) => {
    const normalizedUid = normalizeUid(uid);
    return get().cards[normalizedUid];
  },

  isRegistered: (uid) => {
    const normalizedUid = normalizeUid(uid);
    return Boolean(get().cards[normalizedUid]);
  },
  getTransactionsForUid: (uid) => {
    const normalizedUid = normalizeUid(uid);
    return get().transactions.filter((t) => t.uid === normalizedUid);
  },
}));

export function normalizeCardUid(uid: string): string {
  return normalizeUid(uid);
}
