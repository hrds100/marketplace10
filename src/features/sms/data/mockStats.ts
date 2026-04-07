import { subDays } from 'date-fns';
import type { SmsDashboardStats } from '../types';

const now = new Date();
const day = (n: number) => subDays(now, n).toISOString().slice(0, 10);

export const mockStats: SmsDashboardStats = {
  messagesToday: { sent: 32, received: 15 },
  unreadCount: 7,
  activeAutomations: 3,
  deliveryRate: 94.2,
  dailyMessages: [
    { date: day(29), sent: 18, received: 9 },
    { date: day(28), sent: 22, received: 11 },
    { date: day(27), sent: 15, received: 7 },
    { date: day(26), sent: 28, received: 14 },
    { date: day(25), sent: 35, received: 18 },
    { date: day(24), sent: 12, received: 6 },
    { date: day(23), sent: 8, received: 3 },
    { date: day(22), sent: 24, received: 12 },
    { date: day(21), sent: 30, received: 16 },
    { date: day(20), sent: 19, received: 10 },
    { date: day(19), sent: 26, received: 13 },
    { date: day(18), sent: 33, received: 17 },
    { date: day(17), sent: 14, received: 5 },
    { date: day(16), sent: 9, received: 4 },
    { date: day(15), sent: 21, received: 11 },
    { date: day(14), sent: 27, received: 14 },
    { date: day(13), sent: 31, received: 16 },
    { date: day(12), sent: 20, received: 10 },
    { date: day(11), sent: 25, received: 13 },
    { date: day(10), sent: 16, received: 8 },
    { date: day(9), sent: 11, received: 4 },
    { date: day(8), sent: 29, received: 15 },
    { date: day(7), sent: 34, received: 17 },
    { date: day(6), sent: 23, received: 12 },
    { date: day(5), sent: 38, received: 19 },
    { date: day(4), sent: 27, received: 14 },
    { date: day(3), sent: 22, received: 11 },
    { date: day(2), sent: 36, received: 18 },
    { date: day(1), sent: 29, received: 14 },
    { date: day(0), sent: 32, received: 15 },
  ],
  statusBreakdown: [
    { status: 'Delivered', count: 1842, colour: '#1E9A80' },
    { status: 'Sent', count: 124, colour: '#F59E0B' },
    { status: 'Failed', count: 47, colour: '#EF4444' },
    { status: 'Queued', count: 18, colour: '#9CA3AF' },
    { status: 'Received', count: 956, colour: '#6B7280' },
  ],
};
