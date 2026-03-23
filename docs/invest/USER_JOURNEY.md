# Investment Module - The Complete User Journey

> Every flow explained in simple English. No technical jargon. Anyone can understand this.

---

## 1. Sign Up 👤

```
👤 User lands on hub.nfstay.com/signup
   ↓
📝 Fills in: Name, Email, Password, WhatsApp number
   ↓
📱 Gets WhatsApp OTP → types the code → verified
   ↓
🔗 If they came from a referral link (?ref=HUGO2026), the agent is tracked automatically
   ↓
🔐 Particle Network creates a crypto wallet for them in the background
   (they don't need to know about this - it just happens)
   ↓
✅ Account created! They land on the Deals page
```

---

## 2. Browse & Find Investment Properties 🏠

```
🏠 User opens the Deals page (hub.nfstay.com/dashboard/deals)
   ↓
💎 They see special JV property cards with "Exclusive JV" badge + "64% funded"
   ↓
👆 They click on a JV property
   ↓
📊 They land on the Investment Marketplace page
   (/dashboard/invest/marketplace)
   ↓
🔍 They see everything about the property:
   - Beautiful photos in a carousel
   - Annual yield: 12.4%
   - Monthly rent: $8,500
   - Share price: $100 per share
   - How the JV partnership works (expandable explainer)
   - Profit calculator (how much they could earn)
   - Legal documents to download
   - Recent purchase activity
```

---

## 3. Buy Shares (Invest!) 💰

```
💰 User enters amount: $500
   ↓
🧮 System calculates: "= 5 shares at $100/share"
   ↓
💳 User picks payment method:

   Option A: Credit Card (via SamCart)
   ├── Redirected to SamCart checkout page
   ├── SamCart processes the card payment
   ├── SamCart webhook fires → n8n receives it
   ├── n8n calls the blockchain: "give this person 5 shares"
   ├── Shares appear in user's wallet
   └── Order saved in our database

   Option B: Crypto (USDC or BNB)
   ├── Particle wallet pops up on screen
   ├── User clicks "Approve" to sign the transaction
   ├── Shares minted directly on the blockchain
   ├── The Graph picks up the event
   ├── n8n syncs it to our database
   └── Done in seconds

   ↓
📧 Email sent: "Your investment is confirmed! You own 5 shares."
📱 WhatsApp sent: "Welcome to the Seseh Villa partnership! 🎉"
🔔 In-app notification appears

   ↓
🤝 If an agent referred them:
   └── Agent automatically gets 5% commission ($25)
   └── Commission appears in agent's dashboard after 14 days
```

---

## 4. View Your Portfolio 📊

```
📊 User opens Portfolio page (/dashboard/invest/portfolio)
   ↓
🏆 They see their rank: "Deal Rookie" (because they own 1 property)
   ↓
💵 Portfolio Summary shows:
   - Total Invested: $500
   - Total Earnings: $0 (just started)
   - Pending Payouts: $0
   - ROI Progress bar (loading toward their first return)
   ↓
📈 Monthly Earnings chart (empty now - will fill up month by month)
   ↓
🏡 Their Holdings section shows the property:
   - Photo + title + location
   - Shares owned: 5
   - Current value, monthly yield, annual yield
   - Boost APR card (option to increase returns)
   - Buttons: View Property, Buy More Shares, Submit Proposal, Cast Vote
   ↓
🎖️ Achievements section: "First Property" badge unlocked! 🎉
   ↓
🎯 Bottom banner: "Invest in 2 more properties to unlock Cashflow Builder"
```

---

## 5. Earn Rental Income Every Month 🏡💵

```
🏡 The property generates rental income from Airbnb guests
   ↓
👨‍💼 Admin deposits that month's net profit into the Rent smart contract
   ↓
🤖 n8n daily check (inv-rent-sync): "Any new rent available?"
   ↓
📊 System calculates each investor's share:
   Your payout = (monthly rent / total shares) × your shares
   Example: ($8,500 / 1,000) × 5 = $42.50 this month
   ↓
✅ Payout appears on your Payouts page as "Claimable"
   ↓
📧 Email: "You have $42.50 ready to claim from Seseh Villa!"
📱 WhatsApp: "Your rental income is ready! 💰"
```

---

## 6. Claim Your Money 💵

```
💵 User opens Payouts page → sees "$42.50 available to claim"
   ↓
👆 Clicks "Claim"
   ↓
🔄 Modal opens with options:

   🏦 Bank Transfer (Worldwide - 200+ countries)
   ├── First time? Select your country → form adapts:
   │     🇬🇧 UK: Sort code + Account number
   │     🇪🇺 EU: IBAN + BIC
   │     🇺🇸 US: Routing number + Account number
   │     🌍 Other: IBAN or Account number + BIC + Bank name
   ├── Choose payout currency (GBP, EUR, USD, or local)
   ├── System saves details securely
   ├── WhatsApp confirms: "Bank details saved ✅"
   ├── Claim submitted → status: PENDING
   ├── Tuesday 5am: n8n batches all bank claims
   ├── Sends batch to Revolut as a payment draft
   ├── Hugo gets WhatsApp: "Batch ready - 15 payees, £4,230 GBP + €890 + $1,200"
   ├── Hugo opens Revolut app → approves with Face ID
   ├── Revolut sends via fastest rail (local or SWIFT)
   │     🇬🇧 GBP: same day  |  🇪🇺 EUR: same/next day
   │     🇺🇸 USD: same day   |  🌍 SWIFT: 1-5 days
   ├── User gets WhatsApp: "Your payout of £42.50 has arrived ✅"
   └── Bank statement shows: "nfstay Payout"

   💲 USDC (Direct to Wallet) - INSTANT
   ├── Rent contract sends USDC straight to user's wallet
   └── Done in seconds. No admin needed.

   🪙 STAY Token - INSTANT
   ├── System claims USDC first
   ├── Automatically swaps USDC → STAY via PancakeSwap
   └── STAY tokens arrive in user's wallet

   🌱 LP Token (Farm) - INSTANT
   ├── Claims USDC → creates liquidity pair → stakes in farm
   └── User earns farming rewards on top of rent income
```

---

## 7. Vote on Property Decisions 🗳️

```
📋 Someone proposes: "Let's renovate the pool to increase nightly rates"
   ↓
📧 All shareholders get email notification
📱 WhatsApp: "New proposal for Seseh Villa - tap to vote"
   ↓
🗳️ User opens Proposals page → sees the active proposal
   ↓
📖 Reads the proposal: what's being suggested, why, expected impact
   ↓
👍 Clicks "Vote Yes" → confirmation dialog → confirms
   ↓
📊 Vote bar updates in real-time (482 Yes / 118 No)
   ↓
⏰ Voting stays open for 30 days
   ↓
✅ If majority Yes + quorum reached → APPROVED → management implements it
❌ If not enough votes or majority No → REJECTED
   ↓
📧 All shareholders notified of the result
📱 WhatsApp: "Pool renovation APPROVED by 80% of partners ✅"
```

---

## 8. Submit Your Own Proposal 📝

```
📝 User has an idea: "We should list on Booking.com too"
   ↓
👆 Clicks "Submit Proposal" on their property card (Portfolio page)
   ↓
📋 Modal opens:
   - Select property (dropdown with images)
   - Enter title and description
   - See the fee: ~10 USDC in STAY tokens
   ↓
👆 Clicks "Submit" → wallet approves STAY fee → proposal created
   ↓
📧 All other shareholders notified: "New proposal to vote on!"
   ↓
⏰ Voting opens for 30 days
```

---

## 9. Boost Your Returns 🚀

```
🚀 User sees "Boost APR" card on their property in Portfolio
   ↓
📈 Shows: Current APR 12.4% → Boosted APR 18.6%
   Cost: 0.275 USDC
   ↓
👆 Clicks "Boost APR 🚀"
   ↓
💰 Wallet opens → user pays 0.275 USDC
   ↓
✅ APR is now boosted! Earning at 18.6% instead of 12.4%
   ↓
🪙 Bonus: user starts earning STAY tokens too
   ↓
👆 Anytime later: clicks "Claim" on boost card → STAY tokens sent to wallet
```

---

## 10. Become an Agent & Earn Commissions 🤝

```
🤝 User opens "Become An Agent" page
   ↓
📊 Sees the earning calculator:
   - "Refer 10 subscribers → earn £268/month"
   - "Refer 1 investor ($5,000) → earn $250"
   ↓
👆 Clicks "Join" → gets a unique referral code (e.g. HUGO2026)
   ↓
📤 Shares their link: hub.nfstay.com/signup?ref=HUGO2026
   ↓
💬 Uses the sharing kit:
   - WhatsApp template (pre-written message, one tap to send)
   - Email template
   - Copy-paste message
```

### When someone signs up through the link:

```
👤 New user signs up with ?ref=HUGO2026
   ↓
🔗 Agent is tracked automatically in the database

   💼 IF the user SUBSCRIBES (monthly £67):
   ├── GHL processes payment
   ├── Webhook fires → n8n calculates: £67 × 40% = £26.80
   ├── Commission saved (status: pending)
   ├── After 14 days → status: claimable
   ├── Agent gets WhatsApp: "You earned £26.80 from a new subscription! 🎉"
   └── Agent claims via Bank Transfer or USDC (same claim flow as investors)

   🏠 IF the user INVESTS ($1,000 in shares):
   ├── On-chain event detected by The Graph
   ├── n8n calculates: $1,000 × 5% = $50 (first purchase commission)
   ├── Commission saved
   ├── PLUS: 2% of rental profits every month going forward
   ├── Agent gets WhatsApp: "You earned $50 from an investment! 🚀"
   └── Same claim flow
```

### Agent claims commissions:

```
💵 Agent opens Payouts page → sees commissions available
   ↓
   Same 4 options as investors:
   🏦 Bank Transfer (Tuesday batch via Revolut - worldwide, 200+ countries)
   💲 USDC (instant to wallet)
   🪙 STAY Token (instant swap)
   🌱 LP Token (farm for extra yield)
```

---

## 11. Admin Has Full Control 👨‍💼

```
👨‍💼 Admin can:

📊 Dashboard - see total invested, shareholders, revenue, activity at a glance
🏠 Properties - add/edit investment properties, set share prices, toggle open/funded
📦 Orders - view all purchases, complete pending ones, process refunds
👥 Shareholders - see who owns what, filter by property, export CSV
💰 Commissions - view all commissions across all agents, filter and search
⚙️ Settings - set global commission rates (40% sub, 5% first, 2% recurring)
   └── Override per-user: give one agent 50%, another 30%
💳 Payouts - approve/reject payout requests, mark as paid
   └── Bank payouts: approve weekly batch in Revolut app (Face ID)
🗳️ Proposals - moderate, close early if spam
🚀 Boosts - view boost status, admin-boost a user's property
🔍 Search - find any user, order, commission, or payout instantly
📄 Export - download CSV of anything
📋 Audit Trail - every admin action is logged permanently
```

---

## 12. Notifications - Everything Connected 🔔

```
Every important event triggers notifications:

📧 = Email (via Resend, same sender as hub.nfstay.com)
📱 = WhatsApp (same number as hub.nfstay.com)
🔔 = In-app notification (bell icon)

👤 Sign up                    📧 Welcome email
💰 Shares purchased           📧📱🔔 Buyer + Agent notified
💵 Rent available to claim    📧📱🔔 Investor notified
✅ Rent claimed               📧🔔 Confirmation
💼 Commission earned          📧📱🔔 Agent notified
💼 Commission claimable (14d) 📧🔔 Agent reminded
🏦 Bank details saved         📱 Security confirmation
🏦 Payout batch ready         📱 Hugo notified (Revolut approval)
🏦 Bank payout completed      📱🔔 User notified
🏦 Bank payout failed         📱 Hugo alerted
📋 New proposal created       📧🔔 All shareholders
📋 Proposal ending soon (2d)  📧🔔 All shareholders
📋 Proposal result            📧📱🔔 All shareholders
🚀 Boost activated            📧🔔 User
📦 New order pending          📱🔔 Admin
```

---

## How the Systems Connect (Simple Version) 🔌

```
WHAT THE USER SEES:
    hub.nfstay.com (React website on Vercel)

WHAT STORES THE DATA:
    Supabase (database + user accounts + security rules)

WHAT HANDLES THE BLOCKCHAIN:
    Smart contracts on BNB Chain (shares, rent, voting, boost)
    The Graph (reads blockchain events and makes them searchable)
    Particle Network (creates wallets for users automatically)

WHAT AUTOMATES EVERYTHING:
    n8n (processes payments, calculates commissions, sends notifications,
         runs Tuesday payout batch, syncs blockchain data)

WHAT PROCESSES PAYMENTS:
    SamCart (credit card payments for share purchases)
    GHL/GoHighLevel (subscription payments for membership)
    Revolut Business (sends bank transfers every Tuesday)
    Blockchain (instant crypto payments: USDC, STAY, LP)

WHAT SENDS MESSAGES:
    Resend (emails - same sender as hub.nfstay.com)
    WhatsApp (same number as hub.nfstay.com, via n8n)
    In-app notifications (bell icon, via Supabase)
```

---

## Payment Systems Summary 💳

```
THREE payment systems, THREE purposes:

1️⃣  SamCart
    └── For: buying property shares with credit card
    └── Webhook → n8n → blockchain → shares minted

2️⃣  GoHighLevel (GHL)
    └── For: monthly/annual subscriptions (membership)
    └── Webhook → n8n → commission calculated for agent

3️⃣  Crypto (Particle wallet)
    └── For: buying shares with USDC or BNB
    └── Direct on-chain transaction → shares minted instantly
```

---

*Last updated: 2026-03-18*
*This document is the simple English overview. For technical details, see the other docs in this folder.*
