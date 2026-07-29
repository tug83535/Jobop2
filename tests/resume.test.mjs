import test from 'node:test';
import assert from 'node:assert/strict';
import { extractResumeText, parseResume } from '../src/jobops/resume.mjs';

test('parseResume extracts contact, skills, and experience evidence', () => {
  const text = extractResumeText('tests/fixtures/resume.md');
  const resume = parseResume(text, { sourcePath: 'tests/fixtures/resume.md' });

  assert.equal(resume.contact.email, 'connor@example.com');
  assert.equal(resume.contact.github, 'https://github.com/connor-example');
  assert.ok(resume.skills.includes('Salesforce'));
  assert.ok(resume.skills.includes('SQL'));
  assert.equal(resume.experience.length, 2);
  assert.match(resume.experience[0].bullets[0], /automation workflows/);
});
