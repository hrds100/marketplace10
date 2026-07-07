-- Import 25 CircleLoop→Twilio ported numbers (Hugo 2026-07-07).
-- Labelled Circleloop1..25 (also set as Twilio FriendlyName via
-- wk-twilio-connect configure_webhooks). All Twilio voice+SMS, accessible
-- to every admin/agent/worker (inbound rings all members; inbox is shared).
INSERT INTO wk_numbers (e164, label, provider, channel, voice_enabled, sms_enabled, is_active) VALUES
  ('+447361599014','Circleloop1','twilio','sms',true,true,true),
  ('+447361599240','Circleloop2','twilio','sms',true,true,true),
  ('+447361599447','Circleloop3','twilio','sms',true,true,true),
  ('+447361599563','Circleloop4','twilio','sms',true,true,true),
  ('+447361599705','Circleloop5','twilio','sms',true,true,true),
  ('+447361602471','Circleloop6','twilio','sms',true,true,true),
  ('+447361602498','Circleloop7','twilio','sms',true,true,true),
  ('+447361602556','Circleloop8','twilio','sms',true,true,true),
  ('+447383669635','Circleloop9','twilio','sms',true,true,true),
  ('+447383675017','Circleloop10','twilio','sms',true,true,true),
  ('+447383685092','Circleloop11','twilio','sms',true,true,true),
  ('+447383688034','Circleloop12','twilio','sms',true,true,true),
  ('+447397901495','Circleloop13','twilio','sms',true,true,true),
  ('+447397902504','Circleloop14','twilio','sms',true,true,true),
  ('+447397909307','Circleloop15','twilio','sms',true,true,true),
  ('+447868775854','Circleloop16','twilio','sms',true,true,true),
  ('+447868776431','Circleloop17','twilio','sms',true,true,true),
  ('+447868778292','Circleloop18','twilio','sms',true,true,true),
  ('+447868779336','Circleloop19','twilio','sms',true,true,true),
  ('+447868781044','Circleloop20','twilio','sms',true,true,true),
  ('+447868783953','Circleloop21','twilio','sms',true,true,true),
  ('+447868784525','Circleloop22','twilio','sms',true,true,true),
  ('+447868790833','Circleloop23','twilio','sms',true,true,true),
  ('+447868791864','Circleloop24','twilio','sms',true,true,true),
  ('+447868791970','Circleloop25','twilio','sms',true,true,true)
ON CONFLICT (e164) DO UPDATE SET
  label=EXCLUDED.label, provider='twilio', channel='sms',
  voice_enabled=true, sms_enabled=true, is_active=true;