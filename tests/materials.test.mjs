import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseResume } from '../src/jobops/resume.mjs';
import { scoreJob } from '../src/jobops/scorer.mjs';
import { buildReviewPackage } from '../src/jobops/materials.mjs';

test('buildReviewPackage writes human-review materials and blocks submission', () => {
  const temp = mkdtempSync(join(tmpdir(), 'career-ops-test-'));
  try {
    const resume = parseResume(readFileSync('tests/fixtures/resume.md', 'utf8'));
    const job = JSON.parse(readFileSync('tests/fixtures/jobs.json', 'utf8')).jobs[0];
    const score = scoreJob(job, resume, { target_titles: ['RevOps Automation Lead'], target_locations: ['Remote'] });
    const reviewPackage = buildReviewPackage({
      resume,
      job,
      score,
      config: {
        safety: { require_human_review: true, block_submissions: true, never_solve_captcha: true },
        tracking: { review_dir: temp },
      },
    });

    const checklist = readFileSync(join(reviewPackage.dir, 'submission-checklist.md'), 'utf8');
    assert.match(checklist, /Automated submission allowed: no/);
    assert.ok(reviewPackage.files.includes('tailored-resume.md'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
