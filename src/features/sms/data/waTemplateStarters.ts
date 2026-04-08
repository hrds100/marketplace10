export interface WaTemplateStarter {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  body: string;
  description: string;
  icon: string;
}

export const WA_TEMPLATE_STARTERS: WaTemplateStarter[] = [
  // UTILITY - Property
  {
    name: 'viewing_confirmation',
    category: 'UTILITY',
    language: 'en',
    body: 'Your property viewing is confirmed. {{1}} at {{2}}. Date: {{3}}, Time: {{4}}. Reply to reschedule.',
    description: 'Confirm a property viewing appointment',
    icon: 'Calendar',
  },
  {
    name: 'viewing_reminder',
    category: 'UTILITY',
    language: 'en',
    body: 'Reminder: Your viewing for {{1}} is tomorrow at {{2}}. Address: {{3}}. Call {{4}} if you need directions.',
    description: 'Remind about upcoming viewing',
    icon: 'Bell',
  },
  {
    name: 'lease_agreement_ready',
    category: 'UTILITY',
    language: 'en',
    body: 'Hi {{1}}, your lease agreement for {{2}} is ready to sign. Review it here: {{3}}. Sign by {{4}} to secure the property.',
    description: 'Notify tenant that lease is ready',
    icon: 'FileText',
  },
  {
    name: 'rent_payment_reminder',
    category: 'UTILITY',
    language: 'en',
    body: 'Rent reminder {{1}}: \u00a3{{2}} is due on {{3}}. Pay online: {{4}}. Late fees apply after {{5}}.',
    description: 'Remind tenant about rent payment',
    icon: 'CreditCard',
  },
  {
    name: 'rent_payment_received',
    category: 'UTILITY',
    language: 'en',
    body: 'Thank you {{1}}. Rent payment of \u00a3{{2}} received for {{3}}. Receipt: {{4}}. Next payment due {{5}}.',
    description: 'Confirm rent payment received',
    icon: 'CheckCircle',
  },
  {
    name: 'maintenance_request',
    category: 'UTILITY',
    language: 'en',
    body: '{{1}}, we received your maintenance request for {{2}}. A technician will visit on {{3}}. Ref: {{4}}.',
    description: 'Acknowledge maintenance request',
    icon: 'Wrench',
  },
  {
    name: 'move_in_details',
    category: 'UTILITY',
    language: 'en',
    body: 'Welcome {{1}}! Your move-in date is {{2}}. Pick up keys at {{3}} between {{4}}-{{5}}. See you there!',
    description: 'Send move-in instructions',
    icon: 'Key',
  },
  {
    name: 'inquiry_acknowledgment',
    category: 'UTILITY',
    language: 'en',
    body: 'Thanks {{1}} for your inquiry about {{2}}. We will get back to you within 24 hours with the best options for you.',
    description: 'Acknowledge a property inquiry',
    icon: 'MessageSquare',
  },
  {
    name: 'booking_confirmation',
    category: 'UTILITY',
    language: 'en',
    body: 'Booking confirmed! {{1}}, your stay at {{2}} is from {{3}} to {{4}}. Check-in: {{5}}. Address: {{6}}.',
    description: 'Confirm a short-term booking',
    icon: 'Home',
  },
  {
    name: 'checkout_reminder',
    category: 'UTILITY',
    language: 'en',
    body: 'Hi {{1}}, checkout from {{2}} is tomorrow by {{3}}. Please leave the keys in the lockbox. Thank you for staying!',
    description: 'Remind guest about checkout',
    icon: 'LogOut',
  },

  // MARKETING - Property
  {
    name: 'new_listing_alert',
    category: 'MARKETING',
    language: 'en',
    body: 'New listing! {{1}} bedroom property in {{2}}, \u00a3{{3}}/month. This matches what you are looking for. Want to view it?',
    description: 'Alert about a new property listing',
    icon: 'Star',
  },
  {
    name: 'price_drop_alert',
    category: 'MARKETING',
    language: 'en',
    body: 'Good news {{1}}! The property in {{2}} dropped from \u00a3{{3}} to \u00a3{{4}}/month. Schedule a viewing before it goes.',
    description: 'Notify about a price reduction',
    icon: 'TrendingDown',
  },
  {
    name: 'lease_renewal_offer',
    category: 'MARKETING',
    language: 'en',
    body: '{{1}}, we would love you to stay at {{2}}! Renew your lease and get {{3}} off next year. Offer expires {{4}}.',
    description: 'Offer lease renewal with discount',
    icon: 'RefreshCw',
  },
  {
    name: 'referral_reward',
    category: 'MARKETING',
    language: 'en',
    body: 'Know someone looking to rent? Refer them to us and earn \u00a3{{1}} when they sign a lease. Share your link: {{2}}',
    description: 'Referral program invitation',
    icon: 'Users',
  },
  {
    name: 'open_house_invitation',
    category: 'MARKETING',
    language: 'en',
    body: 'You are invited! Open house at {{1}} on {{2}} from {{3}} to {{4}}. Come view the property and ask questions.',
    description: 'Invite to an open house event',
    icon: 'DoorOpen',
  },
  {
    name: 'guest_review_request',
    category: 'MARKETING',
    language: 'en',
    body: '{{1}}, how was your stay at {{2}}? Leave a review and get {{3}} off your next booking: {{4}}',
    description: 'Request a review from a guest',
    icon: 'Star',
  },

  // AUTHENTICATION
  {
    name: 'verification_code',
    category: 'AUTHENTICATION',
    language: 'en',
    body: '{{1}} is your verification code. It expires in 5 minutes. Do not share this code with anyone.',
    description: 'Send OTP verification code',
    icon: 'Shield',
  },
  {
    name: 'login_code',
    category: 'AUTHENTICATION',
    language: 'en',
    body: 'Your login code is {{1}}. Never share this code. If you did not request this, ignore this message.',
    description: 'Two-factor authentication code',
    icon: 'Lock',
  },

  // GENERAL UTILITY
  {
    name: 'appointment_reminder',
    category: 'UTILITY',
    language: 'en',
    body: 'Hello {{1}}, reminder: you have an appointment on {{2}} at {{3}}. Reply YES to confirm or NO to cancel.',
    description: 'General appointment reminder',
    icon: 'Clock',
  },
  {
    name: 'order_confirmation',
    category: 'UTILITY',
    language: 'en',
    body: 'Hello {{1}}, your order #{{2}} has been confirmed. Estimated delivery: {{3}}. Track here: {{4}}',
    description: 'Confirm an order',
    icon: 'ShoppingBag',
  },
];
