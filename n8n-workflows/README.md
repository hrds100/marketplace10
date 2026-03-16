# marketplace10 n8n Workflows

Import these JSON files into your n8n instance: **Workflows → Import from File** (or paste).

**n8n base URL:** `https://n8n.srv886554.hstgr.cloud`

---

## 0. Community nodes (if you see “Install this node”)

If Twilio or Resend nodes show **“Install this node to use it”**:

1. Left sidebar → **Community nodes**
2. **Install a community node**
3. Search: **`n8n-nodes-twilio`** → Install (for SMS/WhatsApp in workflows 01, 07)
4. If Resend is missing, search for the Resend community node and install it too.

---

## 1. Credentials to create in n8n

| Credential | Used in | What to set |
|------------|---------|-------------|
| **Supabase** | 01, 02, 04, 08, 09 | URL: `https://asazddtvjvmckouxcmmo.supabase.co`, Service Role Key |
| **Twilio** | 01, 07 | Account SID, Auth Token. From number: `+447476560018` |
| **OpenAI** | 02, 05, 06 | API Key. Model: `gpt-4.1` or `gpt-4-turbo` |
| **Resend** | 08, 10, 11, 12 | API Key. From: your verified domain |

---

## 2. Workflow 03 – GHL Tier Update (Supabase RPC)

- Tier updates come from GHL via n8n webhook → Supabase profiles.tier update.
- See docs/n8n/workflow-5-tier-update.json for the live production workflow.

---

## 3. Webhook URLs (after activation)

| Workflow | Path | Full URL |
|----------|------|----------|
| 01 Send OTP | `/webhook/send-otp` | `https://n8n.srv886554.hstgr.cloud/webhook/send-otp` |
| 02 Estimate profit | `/webhook/estimate-profit` | `.../webhook/estimate-profit` |
| 03 GHL Tier | `/webhook/ghl-payment-success` | `.../webhook/ghl-payment-success` |
| 05 AI listing | `/webhook/ai-generate-listing` | `.../webhook/ai-generate-listing` |
| 06 AI lesson | `/webhook/ai-lesson-content` | `.../webhook/ai-lesson-content` |
| 08 New inquiry | `/webhook/new-inquiry` | `.../webhook/new-inquiry` |
| 09 CSV bulk | `/webhook/csv-bulk-properties` | `.../webhook/csv-bulk-properties` |
| 10 Welcome email | `/webhook/signup-welcome` | `.../webhook/signup-welcome` |
| 11 Affiliate | `/webhook/affiliate-conversion` | `.../webhook/affiliate-conversion` |

Use **Test** URL (`/webhook-test/...`) while building; switch to production when ready.

**Optional – import via API:** From project root, set `N8N_BASE_URL` and `N8N_API_KEY` (n8n Settings → API), then run `npm run n8n:import`. Then add credentials and activate each workflow in the UI.

---

## 4. Frontend env

```env
VITE_N8N_WEBHOOK_URL=https://n8n.srv886554.hstgr.cloud
```

Then call e.g. `fetch(\`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/send-otp\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })`.

---

## 5. File list

| # | File | Description |
|---|------|-------------|
| 01 | `01-send-otp.json` | POST phone → Twilio SMS OTP, store in `otps` |
| 02 | `02-estimate-profit.json` | POST city, postcode, beds → GPT + Airbnb URL, save to `properties` |
| 03 | `03-ghl-webhook.json` | GHL payment → update `profiles.tier` via Supabase |
| 04 | `04-deal-expiry-cron.json` | Daily: 7d → under_offer, 14d → expired |
| 05 | `05-ai-generate-listing.json` | POST → GPT name/description |
| 06 | `06-ai-lesson-content.json` | POST → GPT lesson content |
| 07 | `07-daily-deals-whatsapp.json` | Daily 9am: top 5 deals via Twilio |
| 08 | `08-new-inquiry-notifications.json` | POST inquiry → save + Resend email |
| 09 | `09-csv-bulk-properties.json` | POST CSV → parse → insert `properties` |
| 10 | `10-signup-welcome-email.json` | POST email/name → Resend welcome |
| 11 | `11-affiliate-conversion-alerts.json` | POST → Resend alert |
| 12 | `12-deal-expiry-alerts.json` | Daily 10am: expiring deals → Resend |
