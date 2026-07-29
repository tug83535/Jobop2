import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDiscoveryAllowed, assertNoCaptchaBypass, classifyPlatform, evaluateAutomationPolicy } from '../src/jobops/safety.mjs';

test('policy blocks constrained platforms and automated submission', () => {
  const job = { url: 'https://www.linkedin.com/jobs/view/123', title: 'Role' };
  const policy = evaluateAutomationPolicy(job, {}, { require_human_review: true, block_submissions: true, never_solve_captcha: true });

  assert.equal(classifyPlatform(job), 'linkedin');
  assert.equal(policy.allowed_discovery, false);
  assert.equal(policy.allowed_submission, false);
  assert.throws(() => assertDiscoveryAllowed({ type: 'linkedin', name: 'LinkedIn', url: job.url }, {}), /Discovery blocked/);
});

test('policy rejects captcha bypass configuration', () => {
  assert.throws(() => assertNoCaptchaBypass('use CapSolver API key'), /CAPTCHA bypass/);
});
