# n8n – 3 mins → FULL BACKEND

## 1. Go to n8n → Login

**https://n8n.srv886554.hstgr.cloud** → Log in.

---

## 2. Import workflows

**Workflows** → **+ New** → **Import from JSON** (or **…** → **Import from file**).

Upload **all 12** files from Cursor’s `n8n-workflows/`:

- `01-send-otp.json`
- `02-estimate-profit.json`
- `03-ghl-webhook.json`
- `04-deal-expiry-cron.json`
- `05-ai-generate-listing.json`
- `06-ai-lesson-content.json`
- `07-daily-deals-whatsapp.json`
- `08-new-inquiry-notifications.json`
- `09-csv-bulk-properties.json`
- `10-signup-welcome-email.json`
- `11-affiliate-conversion-alerts.json`
- `12-deal-expiry-alerts.json`

---

## 3. Add credentials

**Settings** (gear) → **Credentials** → **New**:

| Credential | What to enter |
|------------|----------------|
| **Supabase** | Your Supabase URL + service role key |
| **Twilio** | Account SID + Auth Token |
| **OpenAI** | API key |
| **Resend** | API key |

Then open **each workflow** and assign the right credential to each Supabase / Twilio / OpenAI / Resend node.

---

## 4. Activate

Open each workflow → toggle **ACTIVE** on → copy the **Production** webhook URL from the Webhook node when you need it.

---

## Test `/send-otp` (Workflow 1)

**Webhook URL:**

```
https://n8n.srv886554.hstgr.cloud/webhook/send-otp
```

**Test in terminal:**

```bash
curl -X POST "https://n8n.srv886554.hstgr.cloud/webhook/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+447863992555"}'
```

**Expected:** `{"success":true,"message_id":"..."}` and an OTP on WhatsApp/SMS.

---

## PASTE HERE (when done)

1. **Screenshot:** 12 workflows **ACTIVE** in n8n  
   _(Save the image in the project or link it here, e.g. `screenshots/n8n-12-active.png`)_

2. **n8n webhook URL for `/send-otp`** (and that it works):

```
Webhook URL: https://n8n.srv886554.hstgr.cloud/webhook/send-otp
Tested: [ ] Yes  [ ] No   →  WhatsApp OTP + AI profit working!
```

Fill in the checkbox and paste any note (e.g. “n8n live → WhatsApp OTP + AI profit working!”) below.
