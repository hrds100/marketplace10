// NFStay Analytics — tracking and querying hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Track events
// ============================================================================

interface TrackEventParams {
  operatorId: string;
  propertyId?: string;
  eventType: string;
  viewSource?: string;
  reservationId?: string;
  bookingData?: Record<string, unknown>;
}

/**
 * Track an analytics event. Fire-and-forget — errors are silently swallowed.
 * Uses service_role via Edge Function for anonymous visitors.
 */
export function useNfsAnalyticsTrack() {
  const tracked = useRef(new Set<string>());

  const track = useCallback(async (params: TrackEventParams) => {
    // Deduplicate within same session
    const key = `${params.eventType}:${params.propertyId || ''}:${params.operatorId}`;
    if (tracked.current.has(key)) return;
    tracked.current.add(key);

    try {
      const sessionId = getOrCreateSessionId();
      const deviceType = detectDeviceType();

      await (supabase.from('nfs_analytics') as any).insert({
        operator_id: params.operatorId,
        property_id: params.propertyId || null,
        event_type: params.eventType,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        session_id: sessionId,
        device_type: deviceType,
        view_source: params.viewSource || 'direct',
        reservation_id: params.reservationId || null,
        booking_data: params.bookingData || {},
      });
    } catch {
      // Silent — analytics should never break the user experience
    }
  }, []);

  return { track };
}

// ============================================================================
// Query analytics (operator dashboard)
// ============================================================================

interface AnalyticsSummary {
  totalPageViews: number;
  totalPropertyViews: number;
  totalBookingStarts: number;
  totalBookingCompleted: number;
  conversionRate: number;
  topProperties: { propertyId: string; title: string; views: number }[];
  viewsByDay: { date: string; views: number }[];
  viewsBySource: { source: string; count: number }[];
}

export function useNfsAnalyticsSummary(operatorId: string | undefined, days = 30) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAnalytics() {
      try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error: dbError } = await (supabase.from('nfs_analytics') as any)
          .select('event_type, property_id, view_source, timestamp')
          .eq('operator_id', operatorId)
          .gte('timestamp', since.toISOString())
          .order('timestamp', { ascending: false })
          .limit(5000);

        if (cancelled) return;

        if (dbError) {
          setError(dbError.message);
          setLoading(false);
          return;
        }

        const events = (data || []) as {
          event_type: string;
          property_id: string | null;
          view_source: string | null;
          timestamp: string;
        }[];

        // Aggregate
        const pageViews = events.filter(e => e.event_type === 'page_view').length;
        const propertyViews = events.filter(e => e.event_type === 'property_view').length;
        const bookingStarts = events.filter(e => e.event_type === 'booking_start').length;
        const bookingCompleted = events.filter(e => e.event_type === 'booking_completed').length;

        // Top properties by views
        const propCounts = new Map<string, number>();
        events
          .filter(e => e.event_type === 'property_view' && e.property_id)
          .forEach(e => {
            propCounts.set(e.property_id!, (propCounts.get(e.property_id!) || 0) + 1);
          });
        const topProperties = Array.from(propCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([propertyId, views]) => ({ propertyId, title: propertyId.slice(0, 8), views }));

        // Views by day
        const dayCounts = new Map<string, number>();
        events.forEach(e => {
          const day = e.timestamp.split('T')[0];
          dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
        });
        const viewsByDay = Array.from(dayCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, views]) => ({ date, views }));

        // Views by source
        const sourceCounts = new Map<string, number>();
        events.forEach(e => {
          const src = e.view_source || 'direct';
          sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
        });
        const viewsBySource = Array.from(sourceCounts.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count);

        setSummary({
          totalPageViews: pageViews,
          totalPropertyViews: propertyViews,
          totalBookingStarts: bookingStarts,
          totalBookingCompleted: bookingCompleted,
          conversionRate: propertyViews > 0 ? (bookingCompleted / propertyViews) * 100 : 0,
          topProperties,
          viewsByDay,
          viewsBySource,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [operatorId, days]);

  return { summary, loading, error };
}

// ============================================================================
// Helpers
// ============================================================================

function getOrCreateSessionId(): string {
  const key = 'nfs_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function detectDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
}
