export interface Thread {
  id: string;
  propertyTitle: string;
  propertyCity: string;
  propertyPostcode: string;
  propertyImage: string | null;
  propertyProfit: number;
  contactName: string;
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
