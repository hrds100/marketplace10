import { supabase } from '@/integrations/supabase/client';

const GHL_TOKEN = import.meta.env.VITE_GHL_BEARER_TOKEN || '';

// Send investment notification via GHL WhatsApp + in-app bell
export async function sendInvestNotification(event: {
  type: string;
  user_id?: string;
  user_name?: string;
  amount?: number;
  property?: string;
  email?: string;
  phone?: string;
  ghl_contact_id?: string;
  [key: string]: unknown;
}) {
  try {
    // Trigger GHL workflow directly for WhatsApp notification
    if (event.ghl_contact_id) {
      fetch(`https://services.leadconnectorhq.com/contacts/${event.ghl_contact_id}/workflow/75b14201-f492-44e9-a6e8-4423842fa07e`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }).catch(() => {});
    }

    // Create in-app notification if user_id provided
    if (event.user_id) {
      await (supabase.from('notifications') as any).insert({
        user_id: event.user_id,
        title: 'nfstay Partnership',
        body: getNotificationMessage(event.type, event),
        read: false,
      });
    }
  } catch (err) {
    console.error('Notification failed:', err);
  }
}

function getNotificationMessage(type: string, event: Record<string, unknown>): string {
  const amount = event.amount || 0;
  const property = event.property || '';

  const messages: Record<string, string> = {
    purchase_confirmed: `Your allocation of $${amount} in ${property} is confirmed.`,
    rent_available: `You have $${amount} rental income available to claim.`,
    rent_claimed: `Your claim of $${amount} has been submitted.`,
    commission_earned: `You earned $${amount} commission!`,
    commission_claimable: `Your $${amount} commission is now ready to claim.`,
    payout_completed: `Your payout of \u00a3${amount} has been sent to your bank account.`,
    proposal_created: `New proposal for ${property}. Vote now.`,
    proposal_result: `Proposal for ${property} has been decided.`,
    bank_details_saved: `Your bank details have been saved.`,
    boost_activated: `Your APR has been boosted for ${property}.`,
  };

  return messages[type] || `nfstay notification: ${type}`;
}
