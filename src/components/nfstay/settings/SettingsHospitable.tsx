import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNfsHospitableConnection, useNfsHospitableConnect } from '@/hooks/nfstay/use-nfs-hospitable';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Unlink,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';

const syncStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-600' },
  syncing: { label: 'Syncing...', color: 'text-blue-600' },
  completed: { label: 'Up to date', color: 'text-green-600' },
  failed: { label: 'Sync failed', color: 'text-red-600' },
};

const healthLabels: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Healthy', color: 'text-green-600' },
  warning: { label: 'Warning', color: 'text-yellow-600' },
  error: { label: 'Error', color: 'text-red-600' },
};

const callbackErrorMessages: Record<string, string> = {
  auth_failed: 'Authorization was denied or failed at Hospitable.',
  state_expired: 'The connection request expired. Please try again.',
  no_pending_connection: 'No pending connection found. Please start the connect flow again.',
  missing_params: 'Missing required parameters from Hospitable.',
  token_exchange_failed: 'Failed to verify connection with Hospitable.',
};

export default function SettingsHospitable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { connection, loading, error: fetchError, refetch } = useNfsHospitableConnection();
  const {
    connecting,
    disconnecting,
    syncing,
    error: connectError,
    initiateConnect,
    disconnect,
    triggerResync,
  } = useNfsHospitableConnect();

  // Handle return from Hospitable Connect callback
  const [callbackMessage, setCallbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (status === 'success' || successParam === 'connected') {
      setCallbackMessage({ type: 'success', text: 'Hospitable connected successfully! Syncing your properties...' });
      refetch();
      // Clean up query params
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete('status');
      cleaned.delete('success');
      setSearchParams(cleaned, { replace: true });
    } else if (errorParam) {
      setCallbackMessage({ type: 'error', text: callbackErrorMessages[errorParam] || `Connection error: ${errorParam}` });
      refetch();
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete('error');
      setSearchParams(cleaned, { replace: true });
    }
  }, []); // Run once on mount

  const error = fetchError || connectError;
  const isConnected = connection?.status === 'connected' && connection?.is_active;
  const isDisconnected = connection?.status === 'disconnected';

  const handleDisconnect = async () => {
    const ok = await disconnect();
    if (ok) refetch();
  };

  const handleResync = async () => {
    const ok = await triggerResync();
    if (ok) {
      // Refresh after a short delay to show new sync status
      setTimeout(() => refetch(), 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__SETTINGS" className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Hospitable Integration</h3>
        <p className="text-sm text-muted-foreground">
          Connect your Hospitable account to sync properties and reservations from Airbnb, VRBO, and Booking.com.
        </p>
      </div>

      {callbackMessage && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
          callbackMessage.type === 'success'
            ? 'text-green-700 bg-green-50 dark:bg-green-950/20'
            : 'text-red-600 bg-red-50 dark:bg-red-950/20'
        }`}>
          {callbackMessage.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {callbackMessage.text}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isConnected ? (
        /* ── Not connected / disconnected ── */
        <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {isDisconnected ? 'Reconnect Hospitable' : 'Connect Hospitable'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {isDisconnected
                ? 'Your Hospitable connection was disconnected. Reconnect to resume syncing your Airbnb listings.'
                : 'Link your Hospitable account to automatically import your listings and reservations from Airbnb, VRBO, and other platforms.'}
            </p>
          </div>
          <Button data-feature="BOOKING_NFSTAY__HOSPITABLE_CONNECT" onClick={initiateConnect} disabled={connecting} className="w-full max-w-xs">
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
            {connecting ? 'Connecting...' : isDisconnected ? 'Reconnect Hospitable' : 'Connect with Hospitable'}
          </Button>

          {connection?.status === 'failed' && connection?.last_error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg text-left">
              <p className="font-medium">Previous connection failed:</p>
              <p>{typeof connection.last_error === 'object' && connection.last_error !== null
                ? (connection.last_error as Record<string, unknown>).message as string || 'Unknown error'
                : String(connection.last_error)}</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Connected ── */
        <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 space-y-5">
          {/* Connection status */}
          <div data-feature="BOOKING_NFSTAY__HOSPITABLE_STATUS" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Hospitable Connected</p>
              <p className="text-xs text-muted-foreground font-mono">
                {connection.hospitable_customer_id || 'Connected'}
              </p>
            </div>
          </div>

          {/* Sync status + health */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span>Sync: </span>
              <span className={syncStatusLabels[connection.sync_status]?.color || 'text-muted-foreground'}>
                {syncStatusLabels[connection.sync_status]?.label || connection.sync_status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {connection.health_status === 'healthy'
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : connection.health_status === 'warning'
                  ? <AlertCircle className="w-4 h-4 text-yellow-600" />
                  : <XCircle className="w-4 h-4 text-red-600" />}
              <span className={healthLabels[connection.health_status]?.color || ''}>
                {healthLabels[connection.health_status]?.label || connection.health_status}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm border-t border-border/40 pt-4">
            <div>
              <p className="text-muted-foreground">Properties synced</p>
              <p className="font-medium text-lg">{connection.total_properties}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reservations synced</p>
              <p className="font-medium text-lg">{connection.total_reservations}</p>
            </div>
          </div>

          {/* Connected platforms */}
          {Array.isArray(connection.connected_platforms) && connection.connected_platforms.length > 0 && (
            <div className="border-t border-border/40 pt-4">
              <p className="text-xs text-muted-foreground mb-2">Connected platforms</p>
              <div className="flex flex-wrap gap-2">
                {(connection.connected_platforms as string[]).map((platform) => (
                  <span
                    key={String(platform)}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium capitalize"
                  >
                    {String(platform)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last sync info */}
          {connection.last_sync_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
              <Clock className="w-3.5 h-3.5" />
              Last synced: {new Date(connection.last_sync_at).toLocaleString()}
            </div>
          )}

          {/* Sync error */}
          {connection.last_sync_error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
              <p className="font-medium">Last sync error:</p>
              <p>{connection.last_sync_error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              data-feature="BOOKING_NFSTAY__HOSPITABLE_SYNC"
              variant="outline"
              size="sm"
              onClick={handleResync}
              disabled={syncing || connection.sync_status === 'syncing'}
            >
              {syncing
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {disconnecting
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Unlink className="w-4 h-4 mr-2" />}
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
