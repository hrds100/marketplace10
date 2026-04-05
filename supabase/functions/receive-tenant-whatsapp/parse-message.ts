// Module 1: Parse inbound message from GHL or direct call
// Input: raw request body (JSON or form-urlencoded)
// Output: structured fields { tenant_phone, tenant_name, message_body, property_ref, property_id, tenant_email }

export interface ParsedMessage {
  tenant_phone: string
  tenant_name: string | null
  message_body: string
  property_ref: string | null
  property_id: string | null
  tenant_email: string | null
}

export function parseMessage(raw: Record<string, unknown>): ParsedMessage | { skip: true; reason: string } | { error: string } {
  let tenant_phone: string
  let tenant_name: string | null
  let message_body: string
  let property_ref: string | null
  let property_id: string | null
  let tenant_email: string | null

  if (raw.tenant_phone) {
    // Format A — direct call
    tenant_phone = String(raw.tenant_phone)
    tenant_name = raw.tenant_name ? String(raw.tenant_name) : null
    message_body = raw.message_body ? String(raw.message_body) : ''
    property_ref = raw.property_ref ? String(raw.property_ref) : null
    property_id = raw.property_id ? String(raw.property_id) : null
    tenant_email = raw.tenant_email ? String(raw.tenant_email) : null
  } else {
    // Format B — GHL webhook payload
    const ghlBody: Record<string, unknown> = (raw.body as Record<string, unknown>) || raw
    message_body = String(ghlBody.message || ghlBody.body || ghlBody.text || '')
    tenant_phone = String(ghlBody.phone || ghlBody.contactPhone || ghlBody.from || '').replace(/[^0-9+]/g, '')
    tenant_name = (ghlBody.contactName || ghlBody.contact_name || ghlBody.name || null) as string | null
    tenant_email = (ghlBody.contactEmail || ghlBody.contact_email || ghlBody.email || null) as string | null

    const refMatch = message_body.match(/Ref(?:erence)?\s*(?:no\.)?[:#]?\s*([A-Z0-9]{5})/i)
    property_ref = refMatch ? refMatch[1].toUpperCase() : null

    const idMatch = message_body.match(/ID:\s*([0-9a-f-]{36})/i)
    property_id = idMatch ? idMatch[1] : null

    const isInquiry = message_body.toLowerCase().includes('nfstay') || property_ref || property_id || message_body.match(/\/deals\//)
    if (!isInquiry) {
      return { skip: true, reason: 'Not an nfstay inquiry' }
    }
  }

  if (!tenant_phone) {
    return { error: 'Missing tenant_phone' }
  }

  return { tenant_phone, tenant_name, message_body, property_ref, property_id, tenant_email }
}

export function parseBody(bodyText: string): Record<string, unknown> {
  try {
    return JSON.parse(bodyText)
  } catch {
    const params = new URLSearchParams(bodyText)
    return Object.fromEntries(params.entries())
  }
}
