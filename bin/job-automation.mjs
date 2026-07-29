#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { extractResumeText, parseResume } from '../src/jobops/resume.mjs';
import { discoverJobs } from '../src/jobops/sources.mjs';
import { scoreJob } from '../src/jobops/scorer.mjs';
import { buildReviewPackage } from '../src/jobops/materials.mjs';
import { loadAutomationConfig, loadResumeForConfig, runAutomation, writeJson } from '../src/jobops/pipeline.mjs';
import { upsertApplication } from '../src/jobops/tracker.mjs';

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || 'help';

try {
  if (command === 'help') help();
  else if (command === 'doctor') doctor(args);
  else if (command === 'parse-resume') parseResumeCommand(args);
  else if (command === 'discover') await discoverCommand(args);
  else if (command === 'score') scoreCommand(args);
  else if (command === 'prepare') prepareCommand(args);
  else if (command === 'run') await runCommand(args);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

function help() {
  console.log(`Career-Ops job automation

Usage:
  node bin/job-automation.mjs doctor --config config/automation.example.json
  node bin/job-automation.mjs parse-resume --resume cv.md --out data/job-automation/resume.json
  node bin/job-automation.mjs discover --config config/automation.example.json --out data/job-automation/discovered.json
  node bin/job-automation.mjs score --config config/automation.example.json --jobs examples/job-seeds.example.json --out data/job-automation/scored.json
  node bin/job-automation.mjs prepare --config config/automation.example.json --jobs examples/job-seeds.example.json --limit 5
  node bin/job-automation.mjs run --config config/automation.example.json --limit 10

The system prepares materials and review packages. It does not submit applications.`);
}

function doctor(parsedArgs) {
  const config = loadConfigFromArgs(parsedArgs);
  const checks = [
    ['resume file', existsSync(config.candidate?.resume_path || 'cv.md')],
    ['human review required', config.safety?.require_human_review !== false],
    ['automated submissions blocked', config.safety?.block_submissions !== false],
    ['captcha bypass disabled', config.safety?.never_solve_captcha !== false],
    ['sources configured', (config.sources || []).length > 0],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? 'ok' : 'missing'} ${name}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

function parseResumeCommand(parsedArgs) {
  const resumePath = parsedArgs.resume || parsedArgs.r || 'cv.md';
  const resume = parseResume(extractResumeText(resumePath), { sourcePath: resumePath });
  outputJson(parsedArgs.out, resume);
}

async function discoverCommand(parsedArgs) {
  const config = loadConfigFromArgs(parsedArgs);
  const jobs = await discoverJobs(config);
  outputJson(parsedArgs.out, jobs);
}

function scoreCommand(parsedArgs) {
  const config = loadConfigFromArgs(parsedArgs);
  const resume = loadResumeForConfig(config);
  const jobs = readJobs(parsedArgs.jobs);
  const scored = jobs.map((job) => ({ job, score: scoreJob(job, resume, config.candidate || {}) }))
    .sort((a, b) => b.score.score - a.score.score);
  outputJson(parsedArgs.out, scored);
}

function prepareCommand(parsedArgs) {
  const config = loadConfigFromArgs(parsedArgs);
  const resume = loadResumeForConfig(config);
  const jobs = readJobs(parsedArgs.jobs);
  const limit = Number(parsedArgs.limit || 5);
  const trackerPath = config.tracking?.path || 'data/job-automation/applications.jsonl';
  const packages = [];

  for (const job of jobs.slice(0, limit)) {
    const score = scoreJob(job, resume, config.candidate || {});
    const reviewPackage = buildReviewPackage({ resume, job, score, config, outputDir: config.tracking?.review_dir });
    packages.push(reviewPackage);
    upsertApplication(trackerPath, { job, score, status: 'needs_review', review_package: reviewPackage.dir });
  }
  outputJson(parsedArgs.out, packages);
}

async function runCommand(parsedArgs) {
  const config = loadConfigFromArgs(parsedArgs);
  const result = await runAutomation(config, { limit: Number(parsedArgs.limit || config.limits?.max_review_packages || 10) });
  outputJson(parsedArgs.out, {
    discovered: result.jobs.length,
    selected: result.selected.length,
    packages: result.packages.map((item) => item.dir),
  });
}

function loadConfigFromArgs(parsedArgs) {
  return loadAutomationConfig(resolve(parsedArgs.config || 'config/automation.example.json'));
}

function readJobs(filePath) {
  if (!filePath) throw new Error('--jobs is required');
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  return Array.isArray(payload) ? payload : payload.jobs || [];
}

function outputJson(filePath, payload) {
  if (filePath) writeJson(filePath, payload);
  else console.log(JSON.stringify(payload, null, 2));
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
    } else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}
