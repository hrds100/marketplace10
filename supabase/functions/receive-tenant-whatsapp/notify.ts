// Module 4: Send notifications (bell + email)
// Non-blocking — failures don't stop the flow

const BASE_URL = 'https://hub.nfstay.com'

export async function notifyAdmin(
  supabase: any,
  propertyName: string,
  propertyId: string,
  tenantName: string | null
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: null,
      type: 'new_inquiry',
      title: `New inquiry for ${propertyName}`,
      body: `${tenantName || 'Someone'} inquired about ${propertyName} via whatsapp`,
      property_id: propertyId,
    } as Record<string, unknown>)
  } catch (e) {
    console.error('[notify] Admin bell notification failed:', e)
  }
}

export async function notifyTenantEmail(
  supabase: any,
  tenantEmail: string,
  tenantName: string | null,
  propertyName: string,
  propertyId: string,
  listerName: string
): Promise<void> {
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        type: 'inquiry-tenant-confirmation',
        data: {
          tenant_name: tenantName || 'there',
          tenant_email: tenantEmail,
          property_name: propertyName,
          property_url: `${BASE_URL}/deals/${propertyId}`,
          lister_name: listerName,
        },
      },
    })
  } catch (e) {
    console.error('[notify] Tenant email failed:', e)
  }
}
