#!/usr/bin/env python3
"""NFSTAY investor payout reminder.

Runs on a schedule (twice a day). For every NEW investor payout claim that is
submitted but not yet paid, it texts Hugo and Chris so the transfer gets made.
It keeps reminding until the claim is marked paid. If Hugo or Chris replies
"PAID" to the alert, the oldest outstanding claim is marked paid and the
reminders stop.

All config comes from environment variables so no secrets live in this file:

  SUPABASE_URL           e.g. https://asazddtvjvmckouxcmmo.supabase.co
  SUPABASE_SERVICE_ROLE  service-role JWT (bypasses RLS; never commit it)
  TWILIO_SID             Twilio Account SID
  TWILIO_TOKEN           Twilio Auth Token
  SMS_FROM               sending number in E.164, e.g. +447380308316
  NOTIFY_HUGO            Hugo's mobile in E.164
  NOTIFY_CHRIS           Chris's mobile in E.164
  CLAIM_CUTOFF           ISO timestamp; only claims submitted AFTER this fire
"""
import os
import json
import base64
import datetime
import urllib.request
import urllib.parse

SB = os.environ["SUPABASE_URL"].rstrip("/")
SR = os.environ["SUPABASE_SERVICE_ROLE"]
TW_SID = os.environ["TWILIO_SID"]
TW_TOK = os.environ["TWILIO_TOKEN"]
FROM = os.environ["SMS_FROM"]
CUTOFF = os.environ["CLAIM_CUTOFF"]
RECIPIENTS = {"Hugo": os.environ["NOTIFY_HUGO"], "Chris": os.environ["NOTIFY_CHRIS"]}

SB_H = {"apikey": SR, "Authorization": "Bearer " + SR}
TW_AUTH = base64.b64encode(f"{TW_SID}:{TW_TOK}".encode()).decode()


def sb_get(path):
    req = urllib.request.Request(SB + path, headers=SB_H)
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())


def sb_write(path, body, method):
    req = urllib.request.Request(
        SB + path, data=json.dumps(body).encode(),
        headers={**SB_H, "Content-Type": "application/json"}, method=method)
    return urllib.request.urlopen(req, timeout=30).read().decode()


def tw_get(url):
    req = urllib.request.Request(url, headers={"Authorization": "Basic " + TW_AUTH})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())


def tw_send(to, body):
    data = urllib.parse.urlencode({"From": FROM, "To": to, "Body": body}).encode()
    req = urllib.request.Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{TW_SID}/Messages.json",
        data=data,
        headers={"Authorization": "Basic " + TW_AUTH,
                 "Content-Type": "application/x-www-form-urlencoded"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())


def main():
    claims = sb_get(
        "/rest/v1/payout_claims?status=in.(pending,processing)&paid_at=is.null"
        "&claimed_at=gt." + CUTOFF +
        "&select=id,user_id,week_ref,amount_entitled,claimed_at&order=claimed_at.asc")
    if not claims:
        print("No new unpaid claims. Nothing to send.")
        return

    uids = list({c["user_id"] for c in claims})
    names = {p["id"]: (p.get("name") or "Investor")
             for p in sb_get("/rest/v1/profiles?id=in.(" + ",".join(uids) + ")&select=id,name")}

    # Did Hugo or Chris reply PAID recently? If so, clear the oldest claim.
    inbound = tw_get(
        f"https://api.twilio.com/2010-04-01/Accounts/{TW_SID}/Messages.json"
        f"?To={urllib.parse.quote(FROM)}&PageSize=50")
    paid_reply = any(
        m.get("from") in RECIPIENTS.values() and "paid" in (m.get("body") or "").lower()
        for m in inbound.get("messages", []))

    if paid_reply and claims:
        c = claims[0]
        sb_write("/rest/v1/payout_claims?id=eq." + c["id"],
                 {"status": "paid", "paid_at": datetime.datetime.utcnow().isoformat() + "Z"},
                 "PATCH")
        try:
            sb_write("/rest/v1/payout_audit_log",
                     {"claim_id": c["id"], "user_id": c["user_id"], "event_type": "claim_paid",
                      "new_status": "paid", "performed_by": "sms_reply",
                      "metadata": {"via": "PAID reply"}}, "POST")
        except Exception:
            pass
        print(f"PAID reply -> marked {names.get(c['user_id'])} {c['week_ref']} paid.")
        claims = claims[1:]

    results = []
    for c in claims:
        gbp = round(float(c["amount_entitled"]) * 0.75)
        body = (f"NFSTAY payout reminder: {names.get(c['user_id'], 'Investor')} "
                f"claimed approx GBP {gbp} ({c['week_ref']}). "
                f"Not paid yet. Reply PAID when you have transferred it.")
        for who, to in RECIPIENTS.items():
            try:
                r = tw_send(to, body)
                results.append(f"{who}:{r.get('status')}")
            except Exception:
                results.append(f"{who}:ERR")

    print(f"Sent {len(claims)} reminder(s): {results}" if claims
          else "All caught up after PAID reply.")


if __name__ == "__main__":
    main()
