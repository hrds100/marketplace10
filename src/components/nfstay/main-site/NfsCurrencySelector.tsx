import { CURRENCIES } from "@/lib/nfstay/constants";
import { useCurrency } from "@/contexts/NfsCurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NfsCurrencySelector() {
  const { currency, setCurrencyCode } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={setCurrencyCode}>
      <SelectTrigger className="w-auto h-8 gap-1 border-none bg-transparent text-sm font-medium px-2 focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map(c => (
          <SelectItem key={c.code} value={c.code}>
            <span className="font-medium">{c.symbol}</span> {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
