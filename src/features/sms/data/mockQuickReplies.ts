import type { SmsQuickReply } from '../types';

export const mockQuickReplies: SmsQuickReply[] = [
  {
    id: 'qr-1',
    label: 'Will reply',
    body: "Thanks, I'll get back to you",
    position: 0,
  },
  {
    id: 'qr-2',
    label: 'Available',
    body: 'Property is still available',
    position: 1,
  },
  {
    id: 'qr-3',
    label: 'Viewing',
    body: 'When would you like to view?',
    position: 2,
  },
  {
    id: 'qr-4',
    label: 'Send details',
    body: "I'll send you the details",
    position: 3,
  },
  {
    id: 'qr-5',
    label: 'Thanks',
    body: 'Thanks for your interest',
    position: 4,
  },
];
