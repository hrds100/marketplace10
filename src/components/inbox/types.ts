export interface Thread {
  id: string;
  propertyTitle: string;
  propertyCity: string;
  propertyPostcode: string;
  propertyImage: string | null;
  propertyProfit: number;
  propertyRent: number;
  dealType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  isSupport: boolean;
  termsAccepted: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  messageType: 'text' | 'system';
  createdAt: string;
}

export interface QuickReply {
  id: string;
  title: string;
  body: string;
}
