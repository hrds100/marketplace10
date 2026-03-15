import type { Thread, Message, QuickReply } from './types';

export const DUMMY_THREADS: Thread[] = [
  {
    id: 'support',
    propertyTitle: 'NFsTay Support',
    propertyCity: '',
    propertyPostcode: '',
    propertyImage: null,
    propertyProfit: 0,
    contactName: 'NFsTay Team',
    lastMessage: 'Welcome to NFsTay! How can we help you today?',
    lastMessageAt: 'Ongoing',
    unread: false,
    isSupport: true,
    termsAccepted: true,
  },
  {
    id: 'thread-1',
    propertyTitle: 'Maple House',
    propertyCity: 'Manchester',
    propertyPostcode: 'M14 5RG',
    propertyImage: 'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&w=200',
    propertyProfit: 680,
    contactName: 'James Walker',
    lastMessage: 'Hi, I saw your listing and I am very interested in the property. Could we arrange a viewing?',
    lastMessageAt: 'Yesterday',
    unread: true,
    isSupport: false,
    termsAccepted: false,
  },
  {
    id: 'thread-2',
    propertyTitle: 'Victoria Court',
    propertyCity: 'London',
    propertyPostcode: 'SW9 8EJ',
    propertyImage: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&w=200',
    propertyProfit: 820,
    contactName: 'Sarah Khan',
    lastMessage: 'The landlord has confirmed SA approval. Ready to proceed whenever you are.',
    lastMessageAt: 'Friday',
    unread: false,
    isSupport: false,
    termsAccepted: true,
  },
  {
    id: 'thread-3',
    propertyTitle: 'Oak Lodge',
    propertyCity: 'Birmingham',
    propertyPostcode: 'B15 2TT',
    propertyImage: 'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&w=200',
    propertyProfit: 420,
    contactName: 'Tom Peters',
    lastMessage: 'Can you send over the projected occupancy rates for this area?',
    lastMessageAt: 'Thursday',
    unread: true,
    isSupport: false,
    termsAccepted: false,
  },
];

export const DUMMY_MESSAGES: Record<string, Message[]> = {
  'support': [
    { id: 'sm-1', threadId: 'support', senderId: 'system', body: 'Welcome to NFsTay! How can we help you today?', messageType: 'text', createdAt: '2026-03-15T09:00:00Z' },
  ],
  'thread-1': [
    { id: 'm1-1', threadId: 'thread-1', senderId: 'system', body: 'Hugo sent an inquiry · 12 Mar', messageType: 'system', createdAt: '2026-03-12T10:00:00Z' },
    { id: 'm1-2', threadId: 'thread-1', senderId: 'me', body: 'Hi James, I saw your listing for Maple House in Manchester. The numbers look strong — could we arrange a viewing this week?', messageType: 'text', createdAt: '2026-03-12T10:05:00Z' },
    { id: 'm1-3', threadId: 'thread-1', senderId: 'other', body: 'Hi, I saw your listing and I am very interested in the property. Could we arrange a viewing?', messageType: 'text', createdAt: '2026-03-14T14:30:00Z' },
  ],
  'thread-2': [
    { id: 'm2-1', threadId: 'thread-2', senderId: 'system', body: 'Hugo sent an inquiry · 8 Mar', messageType: 'system', createdAt: '2026-03-08T09:00:00Z' },
    { id: 'm2-2', threadId: 'thread-2', senderId: 'me', body: 'Hi Sarah, really interested in Victoria Court. Is the landlord open to a rent-to-rent arrangement with SA approval?', messageType: 'text', createdAt: '2026-03-08T09:10:00Z' },
    { id: 'm2-3', threadId: 'thread-2', senderId: 'other', body: 'Yes, absolutely. The landlord is fully on board with serviced accommodation. Happy to share the compliance documents.', messageType: 'text', createdAt: '2026-03-09T11:00:00Z' },
    { id: 'm2-4', threadId: 'thread-2', senderId: 'me', body: 'Brilliant. Can you confirm the monthly rent and any break clauses?', messageType: 'text', createdAt: '2026-03-10T08:30:00Z' },
    { id: 'm2-5', threadId: 'thread-2', senderId: 'other', body: 'The landlord has confirmed SA approval. Ready to proceed whenever you are.', messageType: 'text', createdAt: '2026-03-14T16:00:00Z' },
  ],
  'thread-3': [
    { id: 'm3-1', threadId: 'thread-3', senderId: 'system', body: 'Hugo sent an inquiry · 10 Mar', messageType: 'system', createdAt: '2026-03-10T14:00:00Z' },
    { id: 'm3-2', threadId: 'thread-3', senderId: 'me', body: 'Hi Tom, Oak Lodge looks like a solid opportunity. What is the current occupancy like in B15?', messageType: 'text', createdAt: '2026-03-10T14:05:00Z' },
    { id: 'm3-3', threadId: 'thread-3', senderId: 'other', body: 'Can you send over the projected occupancy rates for this area?', messageType: 'text', createdAt: '2026-03-13T09:15:00Z' },
  ],
};

export const DUMMY_QUICK_REPLIES: QuickReply[] = [
  { id: 'qr-1', title: 'Arrange viewing', body: 'Thanks for your inquiry! I\'d love to arrange a viewing. What day works best for you?' },
  { id: 'qr-2', title: 'Ask about property', body: 'Could you tell me more about the property? I\'m particularly interested in the SA approval status and any existing tenancy.' },
  { id: 'qr-3', title: 'Express interest', body: 'I\'m very interested in this opportunity. What\'s the best time to speak and discuss terms?' },
  { id: 'qr-4', title: 'Request documents', body: 'Could you share the compliance documents and any existing EPC/gas safety certificates?' },
];
