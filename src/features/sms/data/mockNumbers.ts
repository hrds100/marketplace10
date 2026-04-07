import type { SmsPhoneNumber } from '../types';

export const mockNumbers: SmsPhoneNumber[] = [
  {
    id: 'num-1',
    twilioSid: 'PN1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    phoneNumber: '+447911234567',
    label: 'Main Line',
    isDefault: true,
    webhookUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook',
    messageCount: 1243,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'num-2',
    twilioSid: 'PN2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    phoneNumber: '+447922345678',
    label: 'Bookings',
    isDefault: false,
    webhookUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook',
    messageCount: 587,
    createdAt: '2026-02-01T14:30:00.000Z',
  },
  {
    id: 'num-3',
    twilioSid: 'PN3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    phoneNumber: '+447933456789',
    label: 'Marketing',
    isDefault: false,
    webhookUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook',
    messageCount: 312,
    createdAt: '2026-03-10T09:15:00.000Z',
  },
];
