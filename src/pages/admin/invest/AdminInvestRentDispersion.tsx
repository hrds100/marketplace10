import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useBlockchain } from '@/hooks/useBlockchain';
import { Banknote, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminInvestRentDispersion() {
  const { adminAddRent, adminResetPropertyRent, adminGetRentDetails, loading: blockchainLoading } = useBlockchain();

  const [propertyId, setPropertyId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [rentExists, setRentExists] = useState(false);
  const [rentInfo, setRentInfo] = useState<{ rentRemaining: number; totalRent: number } | null>(null);

  const handlePropertyIdChange = useCallback(async (value: string) => {
    setPropertyId(value);
    setRentExists(false);
    setRentInfo(null);

    if (!value) return;

    setIsFetching(true);
    try {
      const details = await adminGetRentDetails(value);
      if (details && details.rentRemaining > 0) {
        setRentExists(true);
        setRentInfo(details);
      }
    } catch {
      // ignore — property may not exist yet
    } finally {
      setIsFetching(false);
    }
  }, [adminGetRentDetails]);

  const handleAddRent = async () => {
    if (!propertyId || !amount) {
      toast.error('Property ID and amount are required');
      return;
    }
    setIsLoadingAdd(true);
    try {
      await adminAddRent(propertyId, amount);
      toast.success(`Rent of $${amount} added to property ${propertyId}`);
      setAmount('');
      setPropertyId('');
      setRentExists(false);
      setRentInfo(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg);
    } finally {
      setIsLoadingAdd(false);
    }
  };

  const handleResetProperty = async () => {
    if (!propertyId) {
      toast.error('Property ID is required');
      return;
    }
    setIsLoadingReset(true);
    try {
      await adminResetPropertyRent(propertyId);
      toast.success(`Property ${propertyId} rent details reset`);
      setAmount('');
      setPropertyId('');
      setRentExists(false);
      setRentInfo(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      toast.error(msg);
    } finally {
      setIsLoadingReset(false);
    }
  };

  const isDisabled = isLoadingAdd || isLoadingReset || isFetching || blockchainLoading;

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Rent Distribution</h1>

      <Card className="border-border max-w-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-500" />
            Disperse Rent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Add monthly rent to a property on the Rent smart contract. The USDC is transferred from
            your admin wallet and distributed proportionally to shareholders when they claim.
          </p>

          {/* Property ID */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
            <Input
              type="text"
              placeholder="e.g. 1"
              value={propertyId}
              onChange={(e) => handlePropertyIdChange(e.target.value)}
              disabled={isDisabled}
              className="max-w-[200px]"
            />
            {isFetching && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking property...
              </p>
            )}
            {rentExists && rentInfo && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Rent already exists: ${rentInfo.rentRemaining.toFixed(2)} remaining of ${rentInfo.totalRent.toFixed(2)} total
              </p>
            )}
            {propertyId && !isFetching && !rentExists && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                No active rent — ready to add
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (USDC)</label>
            <Input
              type="number"
              placeholder="e.g. 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDisabled || rentExists}
              className="max-w-[200px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleAddRent}
              disabled={isDisabled || rentExists || !propertyId || !amount}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
            >
              {isLoadingAdd ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
              {isLoadingAdd ? 'Adding...' : 'Add Rent'}
            </Button>

            <Button
              variant="outline"
              onClick={handleResetProperty}
              disabled={isDisabled || !rentExists || !propertyId}
              className="gap-2"
            >
              {isLoadingReset ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {isLoadingReset ? 'Resetting...' : 'Reset Property'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
