import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface CurrencyState {
  currency: string;
  setCurrency: (code: string) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      setCurrency: (code) => set({ currency: code }),
    }),
    { name: "moxiee-currency" }
  )
);
