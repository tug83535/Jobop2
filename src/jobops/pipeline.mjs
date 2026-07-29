import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { extractResumeText, parseResume } from './resume.mjs';
import { discoverJobs } from './sources.mjs';
import { scoreJob } from './scorer.mjs';
import { buildReviewPackage } from './materials.mjs';
import { upsertApplication } from './tracker.mjs';
import { assertNoCaptchaBypass } from './safety.mjs';

export function loadAutomationConfig(filePath) {
  const config = JSON.parse(readFileSync(filePath, 'utf8'));
  assertNoCaptchaBypass(JSON.stringify(config));
  return config;
}

export function loadResumeForConfig(config) {
  const resumePath = config.candidate?.resume_path || 'cv.md';
  return parseResume(extractResumeText(resumePath), { sourcePath: resumePath });
}

export async function runAutomation(config, options = {}) {
  const resume = options.resume || loadResumeForConfig(config);
  const jobs = options.jobs || await discoverJobs(config, options);
  const scored = jobs.map((job) => ({ job, score: scoreJob(job, resume, config.candidate || {}) }))
    .sort((a, b) => b.score.score - a.score.score);

  const minimum = config.candidate?.minimum_score || 4.0;
  const limit = options.limit || config.limits?.max_review_packages || 10;
  const selected = scored.filter((item) => item.score.score >= minimum).slice(0, limit);
  const trackerPath = config.tracking?.path || 'data/job-automation/applications.jsonl';
  const packages = [];

  for (const item of selected) {
    const reviewPackage = buildReviewPackage({
      resume,
      job: item.job,
      score: item.score,
      config,
      outputDir: config.tracking?.review_dir,
    });
    packages.push(reviewPackage);
    upsertApplication(trackerPath, {
      job: item.job,
      score: item.score,
      status: 'needs_review',
      review_package: reviewPackage.dir,
    });
  }

  return { resume, jobs, scored, selected, packages };
}

export function writeJson(filePath, payload) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
