import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { parseResume } from '../src/jobops/resume.mjs';
import { scoreJob } from '../src/jobops/scorer.mjs';

const resume = parseResume(readFileSync('tests/fixtures/resume.md', 'utf8'));
const jobs = JSON.parse(readFileSync('tests/fixtures/jobs.json', 'utf8')).jobs;
const candidate = {
  target_titles: ['RevOps Automation Lead', 'AI Operations Manager'],
  target_locations: ['Remote', 'United States'],
  target_seniority: ['Senior', 'Lead'],
  remote_ok: true,
  minimum_score: 4,
  red_flags: ['unpaid'],
};

test('scoreJob ranks aligned jobs above weak jobs', () => {
  const fit = scoreJob(jobs[0], resume, candidate);
  const miss = scoreJob(jobs[1], resume, candidate);

  assert.ok(fit.score > miss.score);
  assert.ok(fit.score >= 4);
  assert.equal(fit.threshold_met, true);
  assert.ok(fit.matched_skills.includes('Salesforce'));
});
