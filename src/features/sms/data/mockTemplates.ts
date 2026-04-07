import type { SmsTemplate } from '../types';

export const mockTemplates: SmsTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Welcome',
    body: 'Hi {name}, welcome to NFStay! We help you find landlord-approved Airbnb properties across the UK. Reply STOP to opt out.',
    category: 'Greeting',
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'tpl-2',
    name: 'Property Available',
    body: 'Hi {name}, great news! A new property has just come available in your area. Would you like to arrange a viewing this week?',
    category: 'Response',
    createdAt: '2026-01-25T11:30:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'tpl-3',
    name: 'Viewing Confirmation',
    body: 'Hi {name}, your viewing is confirmed for {date} at {time}. The address is {address}. Please text back if you need to reschedule.',
    category: 'Scheduling',
    createdAt: '2026-02-01T14:00:00.000Z',
    updatedAt: '2026-02-01T14:00:00.000Z',
  },
  {
    id: 'tpl-4',
    name: 'Follow Up',
    body: 'Hi {name}, just checking in after your viewing. Have you had a chance to think about the property? Happy to answer any questions.',
    category: 'Nurture',
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-03-01T16:45:00.000Z',
  },
  {
    id: 'tpl-5',
    name: 'Payment Reminder',
    body: 'Hi {name}, a friendly reminder that your next payment of {amount} is due on {date}. Please contact us if you need to discuss.',
    category: 'Payment',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'tpl-6',
    name: 'Check-in',
    body: 'Hi {name}, hope you are settling in well! If you have any issues with the property or need anything, just reply to this message.',
    category: 'Support',
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
  },
];
