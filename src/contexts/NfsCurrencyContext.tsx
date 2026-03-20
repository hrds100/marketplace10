import { createContext, useContext, useState, ReactNode } from "react";
import { CURRENCIES, CURRENCY_RATES } from "@/lib/nfstay/constants";

interface CurrencyContextType {
  currency: typeof CURRENCIES[number];
  setCurrencyCode: (code: string) => void;
  convert: (amountGBP: number) => number;
  formatPrice: (amountGBP: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function NfsCurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(() => localStorage.getItem('nfs_currency') || 'GBP');
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  const setCurrencyCode = (c: string) => {
    setCode(c);
    localStorage.setItem('nfs_currency', c);
  };

  const convert = (amountGBP: number) => Math.round(amountGBP * (CURRENCY_RATES[currency.code] || 1));
  const formatPrice = (amountGBP: number) => `${currency.symbol}${convert(amountGBP).toLocaleString()}`;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convert, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within NfsCurrencyProvider');
  return ctx;
}
