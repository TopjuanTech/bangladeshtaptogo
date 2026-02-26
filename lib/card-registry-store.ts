import { create } from "zustand";

import { TransitCard, issueCard } from "@/lib/nfc-transit";

export type RegisteredCard = {
  uid: string;
  registeredAt: Date;
  card: TransitCard;
};

type CardRegistryState = {
  cards: Record<string, RegisteredCard>;
  registerCard: (
    uid: string,
    now: Date,
  ) => { ok: true } | { ok: false; reason: string };
  updateCard: (uid: string, card: TransitCard) => void;
  getCard: (uid: string) => RegisteredCard | undefined;
  isRegistered: (uid: string) => boolean;
};

const DEFAULT_ISSUE_BALANCE = 50;
const DEFAULT_VALIDITY_DAYS = 30;

function normalizeUid(uid: string): string {
  return uid.trim().toUpperCase();
}

export const useCardRegistryStore = create<CardRegistryState>((set, get) => ({
  cards: {},

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
}));

export function normalizeCardUid(uid: string): string {
  return normalizeUid(uid);
}
