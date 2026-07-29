import { keywordSet, normalizeText, tokenize, unique } from './text.mjs';

const DEFAULT_WEIGHTS = {
  target_title: 0.25,
  skill_match: 0.35,
  location: 0.15,
  seniority: 0.10,
  evidence: 0.10,
  risk: 0.05,
};

export function scoreJob(job, resume, candidate = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(candidate.scoring_weights || {}) };
  const jobText = [job.title, job.description, job.departments?.join(' ')].filter(Boolean).join(' ');
  const resumeSkills = resume.skills || [];
  const jobTokens = keywordSet(tokenize(jobText));
  const skillTokens = keywordSet(resumeSkills);

  const matchedSkills = resumeSkills.filter((skill) => normalizeText(jobText).includes(normalizeText(skill)));
  const missingKeywords = inferImportantKeywords(jobText).filter((keyword) => !skillTokens.has(keyword));

  const targetTitleScore = titleScore(job.title, candidate.target_titles || []);
  const skillScore = ratioScore(matchedSkills.length, Math.max(8, Math.min(resumeSkills.length || 8, 20)));
  const locationScore = locationScoreFor(job.location, candidate.target_locations || [], candidate.remote_ok !== false);
  const seniorityScore = seniorityScoreFor(job.title, candidate.target_seniority || []);
  const evidenceScore = Math.min(1, (resume.experience?.length || 0) / 4);
  const riskScore = riskScoreFor(jobText, candidate.red_flags || []);

  const weighted =
    targetTitleScore * weights.target_title +
    skillScore * weights.skill_match +
    locationScore * weights.location +
    seniorityScore * weights.seniority +
    evidenceScore * weights.evidence +
    riskScore * weights.risk;

  const score = clamp(1 + weighted * 4, 1, 5);

  return {
    score: Number(score.toFixed(2)),
    recommendation: recommendation(score),
    dimensions: {
      target_title: Number((targetTitleScore * 5).toFixed(2)),
      skill_match: Number((skillScore * 5).toFixed(2)),
      location: Number((locationScore * 5).toFixed(2)),
      seniority: Number((seniorityScore * 5).toFixed(2)),
      evidence: Number((evidenceScore * 5).toFixed(2)),
      risk: Number((riskScore * 5).toFixed(2)),
    },
    matched_skills: unique(matchedSkills).slice(0, 20),
    missing_keywords: unique(missingKeywords).slice(0, 20),
    rationale: buildRationale(job, matchedSkills, missingKeywords, score),
    threshold_met: score >= (candidate.minimum_score || 4.0),
  };
}

function inferImportantKeywords(text) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    if (token.length < 3) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([token]) => token);
}

function titleScore(title = '', targetTitles = []) {
  if (targetTitles.length === 0) return 0.5;
  const normalizedTitle = normalizeText(title);
  if (targetTitles.some((target) => normalizedTitle.includes(normalizeText(target)))) return 1;

  const titleTokens = new Set(tokenize(title));
  const targetTokens = new Set(targetTitles.flatMap((target) => tokenize(target)));
  const overlap = [...titleTokens].filter((token) => targetTokens.has(token)).length;
  return clamp(overlap / Math.max(3, targetTokens.size), 0.15, 0.85);
}

function ratioScore(count, denominator) {
  return clamp(count / denominator, 0, 1);
}

function locationScoreFor(location = '', targets = [], remoteOk = true) {
  const normalized = normalizeText(location);
  if (remoteOk && normalized.includes('remote')) return 1;
  if (targets.length === 0) return 0.6;
  return targets.some((target) => normalized.includes(normalizeText(target))) ? 1 : 0.25;
}

function seniorityScoreFor(title = '', targetSeniority = []) {
  if (targetSeniority.length === 0) return 0.7;
  const normalized = normalizeText(title);
  return targetSeniority.some((seniority) => normalized.includes(normalizeText(seniority))) ? 1 : 0.45;
}

function riskScoreFor(text = '', redFlags = []) {
  if (redFlags.length === 0) return 1;
  const normalized = normalizeText(text);
  const hits = redFlags.filter((flag) => normalized.includes(normalizeText(flag))).length;
  return clamp(1 - hits * 0.35, 0, 1);
}

function recommendation(score) {
  if (score >= 4.5) return 'strong_apply';
  if (score >= 4.0) return 'apply_after_review';
  if (score >= 3.3) return 'research_more';
  return 'skip';
}

function buildRationale(job, matchedSkills, missingKeywords, score) {
  const parts = [
    `${job.company || 'Company'} - ${job.title || 'role'} scored ${score.toFixed(2)}/5.`,
    matchedSkills.length > 0
      ? `Strongest resume evidence: ${matchedSkills.slice(0, 6).join(', ')}.`
      : 'No direct skill matches were found in the parsed resume.',
  ];
  if (missingKeywords.length > 0) {
    parts.push(`Review possible gaps: ${missingKeywords.slice(0, 6).join(', ')}.`);
  }
  return parts.join(' ');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
