import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { sendFailureAlert } from './alerts';

interface TestPointResult {
  id: string;
  name: string;
  suite: string;
  route: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  expected?: string;
  actual?: string;
  timestamp: string;
}

class MonitoringReporter implements Reporter {
  private results: TestPointResult[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const idMatch = test.title.match(/\[([A-Z]+-\d+)\]/);
    const id = idMatch ? idMatch[1] : test.title;

    this.results.push({
      id,
      name: test.title,
      suite: test.parent.title || 'unknown',
      route: test.annotations.find(a => a.type === 'route')?.description || '',
      status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
      duration: result.duration,
      error: result.errors?.[0]?.message?.slice(0, 500),
      timestamp: new Date().toISOString(),
    });
  }

  async onEnd(result: FullResult) {
    const outputDir = path.join(process.cwd(), 'tests', 'monitoring', 'results');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filename = `results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const summary = {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      duration: result.duration,
      results: this.results,
    };

    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(outputDir, 'latest.json'), JSON.stringify(summary, null, 2));

    // Send email alerts for failures in CI only
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCI) {
      const failures = this.results.filter(r => r.status === 'failed');
      for (const f of failures) {
        await sendFailureAlert({
          testId: f.id,
          testName: f.name,
          route: f.route,
          expected: f.expected || '',
          actual: f.actual || f.error || '',
          timestamp: f.timestamp,
        });
      }
    }
  }
}

export default MonitoringReporter;
