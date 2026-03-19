# NFStay — Acceptance Scenarios

> BDD scenarios (Given/When/Then) for NFStay flows.
> Include relevant scenarios in every execution prompt for feature/flow work.

---

## How to Use

**Phase 1 (prompt refinement):** Include relevant scenarios in the execution prompt under `ACCEPTANCE SCENARIOS`.

**Phase 2 (execution):** Implement so these behaviors hold. Verify before marking DONE.

---

## Auth & Onboarding

### Operator activation (shared signup)
```
Given I am a new user
When I sign up via the shared /signup flow
Then a Supabase Auth account is created
And a profiles row exists
And a crypto wallet is provisioned (WalletProvisioner)
And OTP verification is completed
When I navigate to /nfstay for the first time
Then NfsOperatorGuard detects no nfs_operators row
And I am redirected to /nfstay/onboarding
And an nfs_operators row is created with onboarding_step = 'account_setup'
```

### Returning operator login
```
Given I am an existing operator with completed onboarding
When I log in with valid credentials and navigate to /nfstay
Then I see the NFStay operator dashboard
And my nfs_operators data is loaded
```

### Onboarding completion
```
Given I am an operator on step 'payment_methods'
When I complete the final onboarding step
Then onboarding_step is set to 'completed'
And I can access all dashboard features
```

### Team member invitation
```
Given I am an operator admin
When I invite a team member by email
Then an nfs_auth_tokens row is created with type 'invitation'
And an invitation email is sent
When the invited user clicks the link and signs up
Then an nfs_operator_users row is created with status 'active'
And the new user can access the operator dashboard with their assigned role
```

---

## Properties

### Create property
```
Given I am an operator with completed onboarding
When I start creating a new property
Then I see a multi-step wizard starting at 'propertyBasics'
When I complete all required steps and click "Publish"
Then nfs_properties.listing_status is set to 'listed'
And the property appears in traveler search
```

### Upload property photos
```
Given I am on the property photos step
When I upload images
Then they are stored in the nfs-images Supabase Storage bucket
And thumbnail URLs are saved in nfs_properties.images JSONB
And the images display in the property gallery
```

### Traveler search
```
Given I am a traveler on the search page
When I enter a location and dates
Then I see a list of available properties
And a map with property markers
And I can filter by property type, guests, price range
```

### Property detail
```
Given I am a traveler viewing a property
Then I see the photo gallery, description, amenities, rules, location map, and booking widget
And I can check availability for my dates
And I see pricing breakdown including fees and discounts
```

---

## Reservations & Pricing

### Availability check
```
Given I select dates for a property
When another reservation exists for overlapping dates
Then the dates show as unavailable
And I cannot proceed to booking
```

### Pricing calculation
```
Given I select valid dates for a property
When I check pricing
Then I see: nightly rate x nights + cleaning fee + extra guest fee + custom fees - discounts
And the total matches the expected calculation
```

### Promo code
```
Given I have a valid promo code
When I apply it during booking
Then the discount is calculated and shown
And the total is reduced accordingly
When I apply an expired or invalid code
Then I see an error message
And the total is unchanged
```

### Operator creates reservation
```
Given I am an operator
When I create a reservation manually
Then an nfs_reservations row is created with status 'pending' and booking_source 'operator_direct'
And the dates are blocked on the property calendar
```

---

## Payments (Stripe)

### Traveler completes payment
```
Given I am a traveler with valid dates and pricing
When I click "Book and Pay"
Then a Stripe Checkout session is created
And I am redirected to Stripe's hosted checkout
When I complete payment
Then Stripe sends a webhook
And nfs_reservations.status is set to 'confirmed'
And nfs_reservations.payment_status is set to 'succeeded'
And I receive a booking confirmation email
And the operator is notified
```

### Stripe Connect onboarding
```
Given I am an operator without a Stripe account
When I click "Connect Stripe" in settings
Then I am redirected to Stripe Connect OAuth
When I complete Stripe onboarding
Then nfs_stripe_accounts is created with connection details
And my dashboard shows "Stripe Connected"
```

### Platform fee
```
Given a traveler pays $100 for a booking
When the payment is processed
Then the platform fee (3% = $3.00) is retained
And the operator receives the remainder minus Stripe fees
And nfs_stripe_accounts.total_earned is updated
```

---

## Hospitable

### Connect Hospitable
```
Given I am an operator
When I click "Connect Hospitable" in settings
Then I am redirected to Hospitable OAuth
When I authorize the connection
Then nfs_hospitable_connections is created with status 'connected'
And the init-sync n8n workflow is triggered
And my Airbnb/VRBO listings begin syncing
```

### Listing sync
```
Given my Hospitable connection is active
When a listing changes on Airbnb/VRBO
Then Hospitable sends a webhook
And the n8n workflow updates the corresponding nfs_properties row
And sync_status shows 'completed'
```

### Manual resync
```
Given my Hospitable connection is active
When I click "Resync" in settings
Then the manual-sync n8n workflow is triggered
And all listings and reservations are re-synced
```

---

## White-Label

### Subdomain storefront
```
Given an operator has subdomain 'luxstays'
When a traveler visits luxstays.nfstay.app
Then they see the operator's branded storefront
With the operator's logo, colors, hero content, and FAQs
And only that operator's properties are shown
```

### Custom domain
```
Given an operator has added a custom domain 'bookings.example.com'
When they click "Verify Domain"
Then the system checks DNS for the expected A record or CNAME
When DNS is correct
Then custom_domain_verified is set to true
And visitors to bookings.example.com see the operator's storefront
```

### Booking on white-label
```
Given a traveler is on an operator's white-label site
When they book a property
Then booking_source is set to 'white_label'
And operator_domain records which domain was used
And the Stripe checkout uses the operator's branding
```

---

## Analytics

### Page view tracking
```
Given a traveler views a property page
Then an nfs_analytics row is created with event_type 'page_view'
And device_type, referrer, and session_id are recorded
```

### Operator dashboard stats
```
Given I am an operator with bookings
When I view my analytics dashboard
Then I see: total bookings, total revenue, average nightly rate, occupancy trends
And I can filter by date range and property
```

---

## Shared with marketplace10

No acceptance scenarios are shared. NFStay flows are completely independent from marketplace10 flows (inbox, CRM, payments via GHL, university).

---

*End of NFStay Acceptance Scenarios.*
