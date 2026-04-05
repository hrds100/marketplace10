// Module 2: Find property from message content
// Tries 4 strategies: direct ID, /deals/ link, reference number, short ref

export async function findProperty(
  supabase: any,
  message_body: string,
  property_id: string | null,
  property_ref: string | null
): Promise<any | null> {
  // A: Direct property_id (full UUID)
  if (property_id) {
    const { data } = await supabase.from('properties').select('*').eq('id', property_id).single()
    if (data) return data
  }

  // B: Extract from /deals/ link in message
  if (message_body) {
    const slugMatch = message_body.match(/\/deals\/([^\s\n]+)/i)
    if (slugMatch) {
      const slugOrId = slugMatch[1]
      const { data: bySlug } = await supabase.from('properties').select('*').eq('slug', slugOrId).single()
      if (bySlug) return bySlug
      const { data: byId } = await supabase.from('properties').select('*').eq('id', slugOrId).single()
      if (byId) return byId
    }
  }

  // C: Extract short reference from message
  if (message_body) {
    const refMatch = message_body.match(/Ref(?:erence)?\s*(?:no\.)?[:#]?\s*([A-Z0-9]{5})/i)
    if (refMatch) {
      const shortRef = refMatch[1].toLowerCase()
      const { data: candidates } = await supabase.from('properties').select('*').ilike('id', `${shortRef}%`)
      if (candidates && candidates.length === 1) return candidates[0]
    }
  }

  // D: property_ref from payload
  if (property_ref) {
    const { data: candidates } = await supabase.from('properties').select('*').ilike('id', `${property_ref}%`)
    if (candidates && candidates.length === 1) return candidates[0]
  }

  return null
}
