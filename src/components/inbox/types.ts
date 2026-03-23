export interface Thread {
  id: string;
  propertyId: string | null;
  propertyTitle: string;
  propertyCity: string;
  propertyPostcode: string;
  propertyImage: string | null;
  propertyImageBlurred: boolean;
  propertyProfit: number;
  propertyRent: number;
  propertyBedrooms: number | null;
  dealType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderIsOperator: boolean;
  unread: boolean;
  isSupport: boolean;
  isOnline: boolean;
  termsAccepted: boolean;
  landlordId: string | null;
  operatorId: string | null;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  bodyReceiver: string | null;
  isMasked: boolean;
  maskType: string | null;
  messageType: 'text' | 'system';
  createdAt: string;
}

export interface QuickReply {
  id: string;
  title: string;
  body: string;
  category: string;
}
