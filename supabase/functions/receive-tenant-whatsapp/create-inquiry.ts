// Module 3: Create inquiry in database (with dedup + auto-auth)

export interface CreateInquiryResult {
  inquiryId: string
  isDuplicate: boolean
  autoAuth: boolean
}

export async function createInquiry(
  supabase: any,
  property: any,
  tenant_phone: string,
  tenant_name: string | null,
  tenant_email: string | null,
  message_body: string
): Promise<CreateInquiryResult> {
  // Dedup: same tenant_phone + property_id within 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentDup } = await supabase
    .from('inquiries')
    .select('id')
    .eq('tenant_phone', tenant_phone)
    .eq('property_id', property.id)
    .gte('created_at', fiveMinAgo)
    .limit(1)

  if (recentDup && recentDup.length > 0) {
    return { inquiryId: recentDup[0].id, isDuplicate: true, autoAuth: false }
  }

  // Check auto-auth
  const listerPhone = property.landlord_whatsapp || property.contact_phone || null
  let autoAuth = false
  let autoAuthType: string | null = null

  if (listerPhone) {
    const { data: existing } = await supabase
      .from('inquiries')
      .select('always_authorised, authorisation_type')
      .eq('lister_phone', listerPhone)
      .eq('always_authorised', true)
      .limit(1)
    if (existing && existing.length > 0) {
      autoAuth = true
      autoAuthType = existing[0].authorisation_type || null
    }
  }

  // Insert
  const token = crypto.randomUUID()
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      property_id: property.id,
      lister_type: property.lister_type || 'landlord',
      lister_phone: listerPhone,
      lister_email: property.contact_email || null,
      lister_name: property.contact_name || null,
      channel: 'whatsapp',
      message: message_body || '',
      tenant_name: tenant_name || null,
      tenant_phone,
      tenant_email: tenant_email || null,
      token,
      status: 'new',
      nda_required: property.nda_required || false,
      authorized: autoAuth,
      always_authorised: autoAuth,
      authorisation_type: autoAuthType,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create inquiry: ${error.message}`)

  return { inquiryId: inquiry.id, isDuplicate: false, autoAuth }
}
