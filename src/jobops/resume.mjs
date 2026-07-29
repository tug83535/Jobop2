import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { spawnSync } from 'child_process';
import { stripHtml, tokenize, unique } from './text.mjs';

const SECTION_ALIASES = new Map([
  ['summary', ['summary', 'profile', 'about', 'objective']],
  ['skills', ['skills', 'technical skills', 'core skills', 'toolkit']],
  ['experience', ['experience', 'work experience', 'professional experience', 'employment']],
  ['projects', ['projects', 'selected projects', 'portfolio']],
  ['education', ['education', 'certifications', 'certification', 'training']],
]);

export function extractResumeText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Resume file not found: ${filePath}`);
  }

  const ext = extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.txt' || ext === '') {
    return readFileSync(filePath, 'utf8');
  }

  if (ext === '.html' || ext === '.htm') {
    return stripHtml(readFileSync(filePath, 'utf8'));
  }

  if (ext === '.pdf') {
    return runTextExtractor('pdftotext', ['-layout', filePath, '-'], 'Install poppler/pdftotext or convert the resume to Markdown/text.');
  }

  if (ext === '.doc' || ext === '.docx' || ext === '.rtf') {
    const outDir = mkdtempSync(join(tmpdir(), 'career-ops-resume-'));
    const outFile = join(outDir, 'resume.txt');
    try {
      const result = spawnSync('textutil', ['-convert', 'txt', '-output', outFile, filePath], { encoding: 'utf8' });
      if (result.status !== 0) {
        throw new Error(result.stderr || 'textutil conversion failed');
      }
      return readFileSync(outFile, 'utf8');
    } finally {
      rmSync(outDir, { force: true, recursive: true });
    }
  }

  throw new Error(`Unsupported resume format "${ext}". Use Markdown, text, HTML, PDF, DOCX, DOC, or RTF.`);
}

function runTextExtractor(command, args, help) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || `${command} exited with status ${result.status}`;
    throw new Error(`${detail}. ${help}`);
  }
  return result.stdout;
}

export function parseResume(text, options = {}) {
  const cleanText = stripHtml(text);
  const lines = cleanText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sections = collectSections(lines);
  const contact = parseContact(cleanText);
  const skills = parseSkills(sections.skills || '', cleanText);
  const experience = parseExperience(sections.experience || '');
  const education = parseBulletish(sections.education || '');
  const projects = parseBulletish(sections.projects || '');

  return {
    source_path: options.sourcePath || null,
    parsed_at: new Date().toISOString(),
    contact,
    headline: inferHeadline(lines),
    summary: firstParagraph(sections.summary || cleanText),
    skills,
    experience,
    projects,
    education,
    keywords: unique([...skills, ...tokenize(cleanText)].slice(0, 250)),
    raw_text: cleanText,
  };
}

function collectSections(lines) {
  const sections = {};
  let activeKey = 'summary';
  sections[activeKey] = [];

  for (const line of lines) {
    const heading = parseHeading(line);
    const mapped = heading ? canonicalSection(heading) : null;
    if (mapped) {
      activeKey = mapped;
      sections[activeKey] ||= [];
      continue;
    }
    sections[activeKey] ||= [];
    sections[activeKey].push(line);
  }

  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.join('\n')]));
}

function parseHeading(line) {
  const markdown = line.match(/^#{1,4}\s+(.+)$/);
  if (markdown) return markdown[1];
  if (line.length <= 42 && /^[A-Z0-9 &/+-]+$/.test(line) && /[A-Z]/.test(line)) return line;
  return null;
}

function canonicalSection(heading) {
  const clean = heading.toLowerCase().replace(/[:#]/g, '').trim();
  for (const [canonical, aliases] of SECTION_ALIASES.entries()) {
    if (aliases.includes(clean)) return canonical;
  }
  return null;
}

function parseContact(text) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] || null;
  const urls = unique(text.match(/https?:\/\/[^\s)]+/g) || []);
  const linkedin = urls.find((url) => /linkedin\.com/i.test(url)) || null;
  const github = urls.find((url) => /github\.com/i.test(url)) || null;
  return { email, phone, urls, linkedin, github };
}

function inferHeadline(lines) {
  const firstUseful = lines.find((line) => !line.includes('@') && !/^https?:\/\//i.test(line));
  return firstUseful?.replace(/^#+\s*/, '') || 'Candidate';
}

function firstParagraph(value) {
  return value.split(/\n\s*\n/)[0]?.replace(/^[-*]\s*/, '').trim() || '';
}

function parseSkills(skillsSection, fullText) {
  const fromSection = skillsSection
    .split(/[,|;\n]/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter((item) => item.length > 1 && item.length < 60);

  const known = [
    'python', 'javascript', 'typescript', 'node', 'react', 'sql', 'excel',
    'power bi', 'tableau', 'salesforce', 'workday', 'greenhouse', 'lever',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'llm',
    'machine learning', 'data analysis', 'automation', 'finance', 'revops',
  ];
  const lowerText = fullText.toLowerCase();
  const inferred = known.filter((skill) => lowerText.includes(skill));
  return unique([...fromSection, ...inferred]).slice(0, 80);
}

function parseExperience(section) {
  const entries = [];
  let current = null;

  for (const line of section.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (!bullet && line.length <= 120) {
      if (current) entries.push(current);
      current = { title: line, bullets: [] };
      continue;
    }
    if (!current) current = { title: 'Experience', bullets: [] };
    current.bullets.push((bullet?.[1] || line).trim());
  }

  if (current) entries.push(current);
  return entries.slice(0, 12);
}

function parseBulletish(section) {
  return section
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 30);
}
