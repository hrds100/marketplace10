QUICK LIST FLOW - Admin to Tenant to Landlord
Last updated: 2026-03-27

PART 1 - ADMIN CREATES A LISTING

Admin opens /admin/marketplace/quick-list

Admin pastes WhatsApp text (any format)

Admin clicks "Parse with AI"

Client-side parser extracts all fields:
  - Phone number (contact_phone / landlord_whatsapp)
  - Contact name
  - Postcode -> city (via Google Maps geocoding)
  - Bedrooms, bathrooms
  - Rent (PCM), deposit, sourcing fee
  - Profit estimate
  - Property type (flat / house / HMO / block / BRR / sale)
  - Deal type (SA / R2R / BRR / care home / block)
  - Furnished status
  - Nightly rate (projected)
  - Purchase price (for BRR/sale deals)
  - Unknown fields -> "N/A"

n8n /webhook/ai-generate-listing -> generates professional description

Form fills automatically
Admin reviews, edits if needed
Only required field: contact_email

Admin clicks "Submit for Approval"

n8n Airbnb pricing webhook fires
-> estimated nightly rate, monthly revenue, profit fill in

Listing saved to Supabase:
  status = pending
  landlord_whatsapp = parsed phone number

Listing appears in /admin/submissions queue


PART 2 - ADMIN APPROVES

Admin opens /admin/submissions

Reviews listing -> clicks "Approve"

status -> live
Listing visible on /dashboard/deals marketplace


PART 3 - TENANT ENQUIRES (canonical path)

Tenant browses /dashboard/deals

Tenant clicks listing -> clicks "WhatsApp" on DealDetail

DealDetail opens wa.me link with structured message containing:
  - Property link (hub.nfstay.com/deals/{slug})
  - Reference no. (first 5 chars of UUID)
  - ID: {full UUID}
Message goes to NFsTay WhatsApp number via GHL.

No inquiry is created on the frontend. The single canonical path:
  GHL inbound -> n8n webhook -> receive-tenant-whatsapp edge function -> inquiry row created

Inquiry appears in Admin > Outreach > Tenant Requests for admin authorization.

n8n fires -> checks: has this landlord number
been contacted before? (first_contact_sent flag)


PART 4A - FIRST TIME CONTACT (3-message sequence)

IF first_contact_sent = false:

MESSAGE 1 (WhatsApp Template - pre-approved):
"Someone is interested in your property
[listing title + address]. Is it still available?"

Landlord replies "Yes" (or positive response)

n8n detects reply -> short delay -> sends:

MESSAGE 2 (free text):
"Hi! Just to introduce ourselves - we help
landlords connect with tenants and SA operators
interested in Airbnb and rent-to-rent.
We're handling this enquiry for you.
Please see the next message to reply directly."

Short delay -> sends:

MESSAGE 3 (free text + magic link):
"Here's your direct link to read the message
and reply: hub.nfstay.com/inbox?token=abc123"

Set first_contact_sent = true on listing/contact


PART 4B - RETURNING LANDLORD (already has account)

IF first_contact_sent = true:

Single WhatsApp message:
"You have a new message about your property
[title]. Reply here: hub.nfstay.com/inbox"


PART 5 - LANDLORD LOGS IN

Landlord clicks magic link

MagicLoginPage -> auto-logged in

Lands on inbox -> sees tenant message -> replies

IF listings exist with matching landlord_whatsapp:
  ClaimAccountBanner appears:
  "We found listings posted with your number.
   Claim them to manage everything from here."

Landlord clicks "Claim my listings"

All properties where landlord_whatsapp =
their phone -> linked via chat_threads

Listings now in landlord's dashboard


PART 6 - ONGOING

Landlord and tenant message inside platform
Deal agreed -> managed from landlord dashboard
