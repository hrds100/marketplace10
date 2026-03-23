# Investment Module - Acceptance Scenarios

> BDD-style Given/When/Then for every major feature.

---

## Share Purchase

### Scenario: User buys shares with card
```
Given I am on the Marketplace property detail page
And the property has shares available (status = open)
When I enter $500 in the investment amount
Then I see "= 5 shares" calculated automatically
When I select "Credit Card" as payment method
And I check the TSA agreement box
And I click "Secure Your Shares"
Then I am redirected to the payment processor
When payment succeeds
Then an order is created with status "completed"
And my shareholding is updated
And the agent (if any) receives a commission entry
And I receive an email confirmation
```

### Scenario: User buys shares with crypto
```
Given I am on the Marketplace property detail page
When I enter $1000 and select "Crypto"
And I click "Secure Your Shares"
Then my wallet prompts me to sign the transaction
When the transaction is confirmed on-chain
Then my shares are minted via RWA contract
And the order is recorded in Supabase
And agent commission is calculated
```

---

## Payouts

### Scenario: Investor claims rental income
```
Given I have shares in a property
And rent has been deposited for this month
And my payout status is "claimable"
When I click "Claim" on the payout
Then the claim modal opens with 4 methods
When I select "Bank Transfer" and click "Continue"
Then the system processes my claim
And the payout status changes to "claimed"
And I receive a confirmation email
And admin sees the payout request
```

---

## Commissions

### Scenario: Agent earns subscription commission
```
Given I am an agent with referral code "HUGO2026"
And a user signs up using my referral link
When the user subscribes to the Monthly plan (£67)
Then a commission of £26.80 (40%) is created
And the status is "pending"
After 14 days
Then the status changes to "claimable"
And I receive a notification
```

### Scenario: Agent earns investment commission
```
Given a user I referred buys 10 shares at $100 each ($1000)
Then a commission of $50 (5%) is created for me
When the property generates rental income next month
Then I receive 2% of that income as recurring commission
```

### Scenario: Admin overrides commission rate
```
Given I am an admin
When I go to Commission Settings
And I set agent "HUGO2026" subscription rate to 50%
Then future subscription commissions for this agent use 50%
And all other agents still use the default 40%
```

---

## Governance

### Scenario: Shareholder creates proposal
```
Given I own shares in "Seseh Beachfront Villa"
When I click "Submit Proposal" on my Portfolio card
Then a modal opens with property pre-selected
When I enter a title and description
And I click "Submit Proposal"
Then a fee of ~10 USDC in STAY tokens is deducted
And the proposal appears in the Proposals page as "Active"
And all shareholders are notified
```

### Scenario: Shareholder votes
```
Given there is an active proposal for my property
When I click "Vote Yes"
Then a confirmation dialog asks me to confirm
When I confirm
Then my vote is recorded
And the vote progress bar updates
And I see "You voted Yes" badge
```

---

## Boost

### Scenario: User boosts APR
```
Given I own shares in a property
And my property is not boosted
When I click "Boost APR" in my Portfolio
Then I see the boosted APR (1.5x base)
And the cost in USDC
When I confirm and pay
Then my APR is boosted
And I start earning STAY tokens
And the Boost card shows "Boosted" status
```

---

## Admin

### Scenario: Admin views commission ledger
```
Given I am an admin
When I navigate to Admin > Commissions
Then I see all commission entries across all agents
And I can filter by: agent, source type, status, date range
And I can search by agent name or referral code
```

### Scenario: Admin sets global commission rate
```
Given I am an admin
When I navigate to Admin > Commission Settings
And I change "Subscription" default from 40% to 35%
Then all new subscription commissions use 35%
And existing commissions are not affected
And the change is logged in admin_audit_log
```
