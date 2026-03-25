const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const ALERT_EMAIL = 'hugo@nfstay.com';

interface TestFailure {
  testId: string;
  testName: string;
  route: string;
  expected: string;
  actual: string;
  timestamp: string;
}

export async function sendFailureAlert(failure: TestFailure) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test-failure-alert',
        data: {
          to: ALERT_EMAIL,
          testId: failure.testId,
          testName: failure.testName,
          route: failure.route,
          expected: failure.expected,
          actual: failure.actual,
          timestamp: failure.timestamp,
        },
      }),
    });
  } catch (e) {
    console.error('Failed to send alert email:', e);
  }
}
