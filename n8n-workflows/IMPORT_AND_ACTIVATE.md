# Import all 12 workflows + activate (one command)

1. **Get your n8n API key**  
   n8n → **Settings** (gear) → **API** → Create key / copy.

2. **Run (paste your key):**

```bash
cd marketplace10
N8N_API_KEY="YOUR_N8N_API_KEY" npm run n8n:import
```

Or set it once and run:

```bash
export N8N_API_KEY="YOUR_N8N_API_KEY"
export N8N_BASE_URL="https://n8n.srv886554.hstgr.cloud"
npm run n8n:import
```

3. **Add credentials**  
   **Option A – via script (Supabase + OpenAI only):**
   ```bash
   N8N_API_KEY="..." SUPABASE_URL="https://....supabase.co" SUPABASE_SERVICE_KEY="..." OPENAI_API_KEY="..." node scripts/add-n8n-credentials.mjs
   ```
   **Option B – in n8n UI:** Settings → Credentials → New → add **Supabase**, **Twilio** (Account SID + Auth Token), **OpenAI**, **Resend**.  
   Then open each workflow and assign the credential to each Supabase/Twilio/OpenAI/Resend node.  
   (Twilio Auth Token and Resend cannot be created via the script on some n8n versions; add those in the UI.)

4. **Webhook URLs** (after import, base):

- `https://n8n.srv886554.hstgr.cloud/webhook/send-otp`
- `https://n8n.srv886554.hstgr.cloud/webhook/estimate-profit`
- `https://n8n.srv886554.hstgr.cloud/webhook/ghl-payment-success`
- `https://n8n.srv886554.hstgr.cloud/webhook/ai-generate-listing`
- `https://n8n.srv886554.hstgr.cloud/webhook/ai-lesson-content`
- `https://n8n.srv886554.hstgr.cloud/webhook/new-inquiry`
- `https://n8n.srv886554.hstgr.cloud/webhook/csv-bulk-properties`
- `https://n8n.srv886554.hstgr.cloud/webhook/signup-welcome`
- `https://n8n.srv886554.hstgr.cloud/webhook/affiliate-conversion`

Schedule workflows (04, 07, 12) stay inactive until you add credentials and turn them **Active** in the UI.
