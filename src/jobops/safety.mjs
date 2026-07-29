import { containsAny, normalizeText } from './text.mjs';

const PLATFORM_PATTERNS = [
  { platform: 'linkedin', needles: ['linkedin.com', 'linkedin'] },
  { platform: 'indeed', needles: ['indeed.com', 'indeed apply', 'indeed'] },
  { platform: 'workday', needles: ['myworkdayjobs.com', 'workdayjobs.com', 'workday'] },
  { platform: 'glassdoor', needles: ['glassdoor.com', 'glassdoor'] },
];

const DEFAULT_BLOCKED = ['linkedin', 'indeed', 'workday'];

export function classifyPlatform(input = {}) {
  const text = normalizeText([
    input.url,
    input.apply_url,
    input.source_type,
    input.source_name,
    input.name,
  ].filter(Boolean).join(' '));

  const match = PLATFORM_PATTERNS.find((pattern) => pattern.needles.some((needle) => text.includes(normalizeText(needle))));
  return match?.platform || 'unknown';
}

export function evaluateAutomationPolicy(job = {}, source = {}, safety = {}) {
  const blockedSources = safety.blocked_sources || DEFAULT_BLOCKED;
  const platform = classifyPlatform({ ...source, ...job });
  const isBlocked = blockedSources.includes(platform);
  const reasons = [];

  if (isBlocked) {
    reasons.push(`${platform} is configured as a constrained platform`);
  }
  if (safety.never_solve_captcha !== false) {
    reasons.push('captcha solving is disabled by policy');
  }
  if (safety.block_submissions !== false) {
    reasons.push('automated submission is disabled by policy');
  }

  return {
    platform,
    allowed_discovery: !isBlocked || source.type === 'file',
    allowed_material_prep: true,
    allowed_browser_fill: false,
    allowed_submission: false,
    requires_human_review: safety.require_human_review !== false,
    reasons,
  };
}

export function assertDiscoveryAllowed(source, safety) {
  const policy = evaluateAutomationPolicy({}, source, safety);
  if (!policy.allowed_discovery) {
    throw new Error(`Discovery blocked for ${source.name || source.type}: ${policy.reasons.join('; ')}`);
  }
  return policy;
}

export function assertNoCaptchaBypass(value = '') {
  if (containsAny(value, ['captcha solver', 'capsolver', '2captcha', 'anticaptcha', 'proxy rotation'])) {
    throw new Error('Configuration appears to request CAPTCHA bypass or evasion tooling, which is not allowed.');
  }
}
