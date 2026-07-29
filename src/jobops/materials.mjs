import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { evaluateAutomationPolicy } from './safety.mjs';
import { slugify } from './text.mjs';

export function generateTailoredResumeDraft(resume, job, score) {
  const matched = score.matched_skills.length > 0 ? score.matched_skills : resume.skills.slice(0, 10);
  const bullets = resume.experience
    .flatMap((entry) => entry.bullets.map((bullet) => ({ entry: entry.title, bullet })))
    .slice(0, 12);

  return [
    `# ${resume.headline}`,
    '',
    `Target role: ${job.title} at ${job.company}`,
    '',
    '## Review Notice',
    '',
    'This draft only reorganizes facts parsed from the source resume. Review every line before submitting.',
    '',
    '## Contact',
    '',
    contactLine(resume),
    '',
    '## Targeted Summary',
    '',
    `${resume.summary || resume.headline} Relevant match areas for this role: ${matched.slice(0, 8).join(', ')}.`,
    '',
    '## Relevant Skills',
    '',
    matched.map((skill) => `- ${skill}`).join('\n') || '- Add verified skills from the source resume.',
    '',
    '## Relevant Experience Evidence',
    '',
    bullets.map(({ entry, bullet }) => `- ${entry}: ${bullet}`).join('\n') || '- Add verified experience from the source resume.',
    '',
    '## Education And Credentials',
    '',
    resume.education.map((item) => `- ${item}`).join('\n') || '- Add education from the source resume if relevant.',
    '',
  ].join('\n');
}

export function generateCoverLetterDraft(resume, job, score, generation = {}) {
  const words = generation.cover_letter_words || 260;
  const matched = score.matched_skills.slice(0, 5).join(', ') || 'the role requirements';
  return [
    `# Cover Letter Draft - ${job.company} - ${job.title}`,
    '',
    'Review before sending. Do not submit if any statement is inaccurate.',
    '',
    `Dear ${job.company || 'Hiring Team'} team,`,
    '',
    `I am interested in the ${job.title} role because it maps closely to my background in ${matched}. The job description points to problems I can support with evidence from my resume, and I would focus the conversation on the areas where my experience is already proven rather than stretching into unverified claims.`,
    '',
    score.matched_skills.length > 0
      ? `The strongest fit signals are ${score.matched_skills.slice(0, 6).join(', ')}. I would bring those strengths to the team while being direct about any gaps that need ramp time.`
      : 'I would use the interview process to validate fit carefully because the parsed resume did not expose many direct keyword matches.',
    '',
    `I have kept this note concise and can provide more detail on specific projects, metrics, and examples. A tailored resume is attached for review.`,
    '',
    'Sincerely,',
    resume.contact.email ? resume.contact.email : resume.headline,
    '',
    `Target length: ${words} words or fewer.`,
    '',
  ].join('\n');
}

export function generateApplicationAnswers(resume, job, score) {
  return [
    `# Application Answers - ${job.company} - ${job.title}`,
    '',
    '## Why are you interested in this role?',
    '',
    `This role is interesting because it aligns with my verified background in ${answerSkills(score, resume)}. I would want to help ${job.company} solve the specific problems described in the posting while bringing a practical, evidence-driven working style.`,
    '',
    '## Why are you a good fit?',
    '',
    `The clearest fit signals from my resume are ${answerSkills(score, resume)}. I can discuss concrete examples behind these areas and will be direct about anything that requires ramp-up.`,
    '',
    '## Additional information',
    '',
    'I generated tailored materials from my source resume and reviewed them for accuracy before submission.',
    '',
    '## Human Review Checklist',
    '',
    '- Confirm work authorization, location, compensation, and start-date answers.',
    '- Confirm every claim is supported by the source resume.',
    '- Do not paste generated answers without checking the actual application question wording.',
    '- Stop if the application asks for CAPTCHA, credential sharing, or terms you do not accept.',
    '',
  ].join('\n');
}

export function buildReviewPackage({ resume, job, score, config, outputDir }) {
  const policy = evaluateAutomationPolicy(job, { type: job.source_type, name: job.source_name }, config.safety || {});
  const packageSlug = `${new Date().toISOString().slice(0, 10)}-${slugify(job.company)}-${slugify(job.title)}`;
  const dir = join(outputDir || config.tracking?.review_dir || 'output/review-packages', packageSlug);
  mkdirSync(dir, { recursive: true });

  const files = {
    'tailored-resume.md': generateTailoredResumeDraft(resume, job, score),
    'cover-letter.md': generateCoverLetterDraft(resume, job, score, config.generation || {}),
    'application-answers.md': generateApplicationAnswers(resume, job, score),
    'submission-checklist.md': generateSubmissionChecklist(job, score, policy),
    'manifest.json': JSON.stringify({ job, score, policy, generated_at: new Date().toISOString() }, null, 2),
  };

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, 'utf8');
  }

  return { dir, files: Object.keys(files), policy };
}

function generateSubmissionChecklist(job, score, policy) {
  return [
    `# Submission Checklist - ${job.company} - ${job.title}`,
    '',
    `Score: ${score.score}/5`,
    `Recommendation: ${score.recommendation}`,
    `Apply URL: ${job.apply_url || job.url || 'Not provided'}`,
    '',
    '## Policy',
    '',
    `- Platform: ${policy.platform}`,
    `- Automated browser fill allowed: ${policy.allowed_browser_fill ? 'yes' : 'no'}`,
    `- Automated submission allowed: ${policy.allowed_submission ? 'yes' : 'no'}`,
    `- Human review required: ${policy.requires_human_review ? 'yes' : 'no'}`,
    '',
    '## Before You Submit',
    '',
    '- Open the apply URL yourself.',
    '- Review the tailored resume and cover letter.',
    '- Answer eligibility, EEO, legal, and authorization questions yourself.',
    '- Do not bypass CAPTCHA, rate limits, login protections, or platform terms.',
    '- Mark the tracker as submitted only after you personally submit.',
    '',
    '## Policy Reasons',
    '',
    ...policy.reasons.map((reason) => `- ${reason}`),
    '',
  ].join('\n');
}

function contactLine(resume) {
  return [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.contact.github,
  ].filter(Boolean).join(' | ') || 'Add contact details from source resume.';
}

function answerSkills(score, resume) {
  return (score.matched_skills.length > 0 ? score.matched_skills : resume.skills).slice(0, 5).join(', ') || 'the experience shown in my resume';
}
