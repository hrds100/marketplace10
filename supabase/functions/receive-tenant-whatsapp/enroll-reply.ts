// Module 5: Enroll contact in GHL workflow for WhatsApp auto-reply
// Workflow cf089a15 has NO trigger — enrollment is the only way to fire it

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const INQUIRY_WORKFLOW = 'cf089a15-1d42-4d9a-85d1-ab35b82b4ad5'

export async function enrollReply(
  tenantPhone: string,
  propertyName: string,
  ghlToken: string
): Promise<void> {
  if (!tenantPhone || !ghlToken) return

  const ghlHeaders = {
    'Authorization': `Bearer ${ghlToken}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }

  // Find GHL contact
  let contactId = ''
  try {
    const searchRes = await fetch(
      `${GHL_BASE}/contacts/?query=${encodeURIComponent(tenantPhone)}&locationId=${GHL_LOCATION_ID}`,
      { headers: { 'Authorization': ghlHeaders.Authorization, 'Version': ghlHeaders.Version } }
    )
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      contactId = searchData?.contacts?.[0]?.id || ''
    }
  } catch (e) {
    console.error('[enroll-reply] Contact search failed:', e)
    return
  }

  if (!contactId) {
    console.log('[enroll-reply] No GHL contact found for', tenantPhone)
    return
  }

  // Set property name on contact for WhatsApp template
  const cleanName = propertyName.replace(/^Property\s*#\d+\s*-\s*/, '').replace(/\s*\(\s*\)\s*$/, '').trim() || propertyName
  await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: 'PUT',
    headers: ghlHeaders,
    body: JSON.stringify({
      customFields: [{ id: 'Z0thvOTyoO2KxTMt5sP8', field_value: cleanName }],
    }),
  }).catch(() => {})

  // Remove + re-enroll (idempotent)
  await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${INQUIRY_WORKFLOW}`, {
    method: 'DELETE',
    headers: { 'Authorization': ghlHeaders.Authorization, 'Version': ghlHeaders.Version },
  }).catch(() => {})

  const enrollRes = await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${INQUIRY_WORKFLOW}`, {
    method: 'POST',
    headers: ghlHeaders,
    body: '{}',
  })

  if (!enrollRes.ok) {
    console.error('[enroll-reply] Enrollment failed:', enrollRes.status)
  } else {
    console.log('[enroll-reply] Enrolled', tenantPhone, 'in', INQUIRY_WORKFLOW)
  }
}
