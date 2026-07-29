import { readFileSync } from 'fs';
import { assertDiscoveryAllowed } from './safety.mjs';
import { stripHtml, unique } from './text.mjs';

export async function discoverJobs(config, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!fetchImpl) throw new Error('A fetch implementation is required for network discovery.');

  const sources = (config.sources || []).filter((source) => source.enabled !== false);
  const limit = config.limits?.max_jobs_per_source || 50;
  const jobs = [];

  for (const source of sources) {
    assertDiscoveryAllowed(source, config.safety || {});
    const discovered = await discoverFromSource(source, { fetchImpl, limit });
    jobs.push(...discovered.map((job) => ({ ...job, source_name: source.name || source.type })));
  }

  return dedupeJobs(jobs);
}

export async function discoverFromSource(source, { fetchImpl = globalThis.fetch, limit = 50 } = {}) {
  switch (source.type) {
    case 'greenhouse':
      return fetchGreenhouse(source, fetchImpl, limit);
    case 'lever':
      return fetchLever(source, fetchImpl, limit);
    case 'ashby':
      return fetchAshby(source, fetchImpl, limit);
    case 'file':
      return readJobsFile(source, limit);
    default:
      throw new Error(`Unsupported source type: ${source.type}`);
  }
}

async function fetchGreenhouse(source, fetchImpl, limit) {
  const url = source.api || `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.board)}/jobs?content=true`;
  const payload = await fetchJson(fetchImpl, url);
  return (payload.jobs || []).slice(0, limit).map((job) => ({
    id: `greenhouse:${source.board || source.name}:${job.id}`,
    source_type: 'greenhouse',
    company: source.company || source.name,
    title: job.title,
    location: job.location?.name || '',
    url: job.absolute_url || job.url || '',
    apply_url: job.absolute_url || job.url || '',
    description: stripHtml(job.content || job.description || ''),
    departments: unique((job.departments || []).map((department) => department.name)),
    compensation: null,
    raw: job,
  }));
}

async function fetchLever(source, fetchImpl, limit) {
  const base = source.eu ? 'https://api.eu.lever.co' : 'https://api.lever.co';
  const url = source.api || `${base}/v0/postings/${encodeURIComponent(source.site)}?mode=json`;
  const payload = await fetchJson(fetchImpl, url);
  return payload.slice(0, limit).map((job) => ({
    id: `lever:${source.site || source.name}:${job.id}`,
    source_type: 'lever',
    company: source.company || source.name,
    title: job.text,
    location: job.categories?.location || job.workplaceType || '',
    url: job.hostedUrl || '',
    apply_url: job.applyUrl || job.hostedUrl || '',
    description: stripHtml(job.descriptionPlain || job.description || job.openingPlain || ''),
    departments: unique([job.categories?.team, job.categories?.department]),
    compensation: job.salaryRange || job.salaryDescriptionPlain || null,
    raw: job,
  }));
}

async function fetchAshby(source, fetchImpl, limit) {
  const url = source.api || `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.organization)}?includeCompensation=true`;
  const payload = await fetchJson(fetchImpl, url);
  const jobs = payload.jobs || payload.jobPostings || [];
  return jobs.slice(0, limit).map((job) => ({
    id: `ashby:${source.organization || source.name}:${job.id || job.jobId || job.title}`,
    source_type: 'ashby',
    company: source.company || source.name,
    title: job.title,
    location: formatAshbyLocation(job.location),
    url: job.jobUrl || job.url || job.hostedUrl || '',
    apply_url: job.applyUrl || job.jobUrl || job.url || '',
    description: stripHtml(job.descriptionPlain || job.descriptionHtml || job.description || ''),
    departments: unique([job.department, job.team].map((item) => typeof item === 'string' ? item : item?.name)),
    compensation: job.compensation || job.compensationTierSummary || null,
    raw: job,
  }));
}

function readJobsFile(source, limit) {
  const payload = JSON.parse(readFileSync(source.path, 'utf8'));
  const jobs = Array.isArray(payload) ? payload : payload.jobs || [];
  return jobs.slice(0, limit).map((job, index) => ({
    id: job.id || `file:${source.name || source.path}:${index}`,
    source_type: 'file',
    company: job.company || source.company || source.name,
    title: job.title,
    location: job.location || '',
    url: job.url || '',
    apply_url: job.apply_url || job.applyUrl || job.url || '',
    description: stripHtml(job.description || ''),
    departments: job.departments || [],
    compensation: job.compensation || null,
    raw: job,
  }));
}

function formatAshbyLocation(location) {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return unique([location.name, location.city, location.region, location.country]).join(', ');
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'career-ops-job-automation/1.0',
    },
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.json();
}

function dedupeJobs(jobs) {
  const seen = new Set();
  const result = [];
  for (const job of jobs) {
    const key = (job.url || `${job.company}:${job.title}:${job.location}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }
  return result;
}
