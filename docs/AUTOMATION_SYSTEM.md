# Production Job-Application Automation System

This layer turns Career-Ops into a production-style job application assistant from a source resume. It automates the parts that are safe to automate and deliberately stops before final submission.

## Assumptions

- The user's resume is stored locally as `cv.md`, or another path is configured in `config/automation.json`.
- Personal data stays local. Generated trackers and review packages are written to gitignored `data/job-automation/` and `output/review-packages/`.
- Final application submission is always done by the user. The system prepares materials, evidence, answers, and checklists.
- Discovery uses official/public job feeds where possible. Constrained platforms are blocked by policy.

## What It Does

1. Parse the resume into contact details, skills, experience evidence, education, and keywords.
2. Discover jobs from configured sources:
   - Greenhouse Job Board API
   - Lever Postings API
   - Ashby public job postings API
   - Local JSON seed files for pasted/manual jobs
3. Normalize postings into one schema.
4. Score each posting against resume evidence and target preferences.
5. Generate a review package:
   - tailored resume draft
   - cover letter draft
   - common application answers
   - submission checklist
   - manifest with score and policy decisions
6. Track each opportunity in JSONL with a status history.

## What It Does Not Do

- It does not submit applications.
- It does not solve CAPTCHAs.
- It does not bypass anti-bot systems.
- It does not scrape constrained platforms such as LinkedIn, Indeed, or Workday by default.
- It does not fabricate resume facts. Drafts must be reviewed by the user before use.

## Architecture

```text
config/automation.json
        |
        v
resume parser  ---> normalized resume profile
        |
        v
source adapters ---> normalized job postings
        |
        v
scoring engine ---> ranked opportunities
        |
        v
material generator ---> review package in output/review-packages/
        |
        v
tracker ---> data/job-automation/applications.jsonl
```

## CLI

```bash
cp config/automation.example.json config/automation.json
# edit config/automation.json and point candidate.resume_path to your resume

npm run jobops -- doctor --config config/automation.json
npm run jobops -- parse-resume --resume cv.md --out data/job-automation/resume.json
npm run jobops -- discover --config config/automation.json --out data/job-automation/discovered.json
npm run jobops -- score --config config/automation.json --jobs data/job-automation/discovered.json --out data/job-automation/scored.json
npm run jobops -- prepare --config config/automation.json --jobs data/job-automation/discovered.json --limit 5
npm run jobops -- run --config config/automation.json --limit 10
```

## Configuration

Use `config/automation.example.json` as the template. The schema is in `schemas/automation-config.schema.json`.

Important fields:

- `candidate.resume_path`: path to the user's resume.
- `candidate.target_titles`: preferred role titles.
- `candidate.target_locations`: accepted locations.
- `candidate.minimum_score`: threshold for generating review packages.
- `sources`: discovery sources. Keep constrained platforms out of this list.
- `safety`: must keep `require_human_review`, `block_submissions`, and `never_solve_captcha` set to `true`.
- `tracking.path`: JSONL tracker path.
- `tracking.review_dir`: where generated review packages go.

## Review Package Contract

Every review package includes:

- `manifest.json`: normalized job, score, and automation policy.
- `tailored-resume.md`: resume draft based only on parsed source resume facts.
- `cover-letter.md`: role-specific draft letter.
- `application-answers.md`: copy/paste-ready draft answers for common fields.
- `submission-checklist.md`: final human checklist and platform policy status.

Treat all generated text as draft material. The user must verify accuracy, consent fields, eligibility answers, and platform terms before applying.
