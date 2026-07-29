import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverFromSource } from '../src/jobops/sources.mjs';

test('greenhouse adapter normalizes API jobs', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      jobs: [
        {
          id: 123,
          title: 'AI Operations Manager',
          absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/123',
          location: { name: 'Remote' },
          content: '<p>Run automation and analytics.</p>',
          departments: [{ name: 'Operations' }],
        },
      ],
    }),
  });

  const jobs = await discoverFromSource({ type: 'greenhouse', name: 'Acme', board: 'acme' }, { fetchImpl });
  assert.equal(jobs[0].source_type, 'greenhouse');
  assert.equal(jobs[0].company, 'Acme');
  assert.equal(jobs[0].description, 'Run automation and analytics.');
});

test('lever adapter normalizes postings jobs', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ([
      {
        id: 'abc',
        text: 'Solutions Architect',
        hostedUrl: 'https://jobs.lever.co/acme/abc',
        applyUrl: 'https://jobs.lever.co/acme/abc/apply',
        categories: { location: 'Remote', team: 'Sales' },
        descriptionPlain: 'Design technical solutions.',
      },
    ]),
  });

  const jobs = await discoverFromSource({ type: 'lever', name: 'Acme', site: 'acme' }, { fetchImpl });
  assert.equal(jobs[0].source_type, 'lever');
  assert.equal(jobs[0].apply_url, 'https://jobs.lever.co/acme/abc/apply');
  assert.deepEqual(jobs[0].departments, ['Sales']);
});
