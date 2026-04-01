QUICK LIST FLOW - Admin to Tenant to Landlord
Last updated: 2026-04-01


PART 1 - ADMIN CREATES A LISTING

Admin opens /admin/marketplace/quick-list

Admin pastes WhatsApp text (any format)

Admin clicks "Parse with AI"

Edge function ai-parse-listing processes text:
  -> gpt-4o-mini extracts structured data
  -> contact_phone normalized to +44 format
  -> postcode resolved to city (if missing)
  -> Returns JSON with: name, city, postcode,
     bedrooms, bathrooms, rent, deposit, type,
     deal_type, listing_type, description, features,
     nightly_rate_projected, purchase_price, sourcing_fee

Form auto-fills. Admin reviews + edits fields.

Only contact_email is required. Phone is optional
but recommended for GHL/WhatsApp outreach.

Admin clicks "Submit for Approval" -> status = pending
Admin clicks "Skip & Publish" -> status = live

n8n Airbnb pricing webhook fires ->
  returns estimated rates + profit ->
  saved to property row

Photos uploaded to Supabase Storage (deals-photos bucket)
or Pexels fallback images shown blurred with "On request" label.


PART 2 - ADMIN APPROVES (if submitted for approval)

Admin opens /admin/marketplace/submissions

Reviews listing -> clicks "Approve"

status -> live
Listing visible on /dashboard/deals marketplace


PART 3 - TENANT ENQUIRES (canonical path)

Tenant browses /dashboard/deals

Tenant clicks WhatsApp on PropertyCard, InquiryPanel, or DealDetail.

wa.me opens with a short, human-readable message:
  "Hi, I am interested in a property on nfstay.
   Link: hub.nfstay.com/deals/{slug}
   Reference no.: {short ref}
   Please contact me at your earliest convenience."

The message contains ONLY the deal link and short reference.
No internal UUID. No database insert on the frontend.

The message goes to NFsTay WhatsApp (+44 7476 368123) via GHL.

GHL receives the inbound message -> n8n webhook fires ->
receive-tenant-whatsapp edge function creates one inquiry row.

The inquiry appears in Admin > Outreach > Tenant Requests.
The landlord receives NOTHING at this point.


PART 4 - ADMIN REVIEWS AND RELEASES

Admin opens /admin/marketplace/outreach -> Tenant Requests tab.

Each row shows: tenant name, property name, lister phone, date.

Admin chooses one of three release paths:
  - NDA: enrolls lister in GHL NDA workflow (via ghl-enroll edge function)
  - NDA + Claim: enrolls in NDA workflow + prompts landlord to claim
  - Direct: marks authorized immediately, no GHL workflow

GHL enrollment must succeed before DB is updated to authorized=true.
If GHL fails, the inquiry stays unauthorized and admin sees an error toast.

Only after admin release does the landlord receive any message.


PART 5 - LANDLORD ACTIVATION (grouped by landlord)

Admin opens /admin/marketplace/outreach -> Landlord Activation tab.

Landlords are grouped by phone number, not by property.
One row per landlord phone shows:
  - Landlord name (if claimed) or phone number
  - Email (if claimed)
  - Property count (e.g. "3 properties")
  - Expand arrow to see nested property list

"Send Outreach" sends the first WhatsApp to the landlord via GHL.
This marks ALL properties in that landlord group as outreach_sent.
ghl-enroll creates the GHL contact if it does not exist.


PART 6 - LANDLORD LOGS IN AND CLAIMS

Landlord clicks magic link in GHL message.

landlord-magic-login edge function:
  - Looks up landlord_invites by token
  - Finds or creates user (landlord_{phone}@nfstay.internal)
  - Auto-logs in, lands on inbox

IF landlord has unclaimed listings:
  ClaimAccountBanner appears.
  Landlord enters real name + email.

claim-landlord-account edge function:
  - Updates auth email and profile
  - Links ALL properties matching landlord phone
    (contact_phone, contact_whatsapp, landlord_whatsapp)
  - Links all chat threads and inquiries for those properties
  - Landlord now owns the full group of properties


PART 7 - ONGOING

Landlord and tenant message inside platform.
Deal agreed -> managed from landlord dashboard.
