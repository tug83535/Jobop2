# Safety And Compliance Controls

This project is designed as a job-search assistant, not an unattended application bot.

## Hard Rules

- Human review is required before every application.
- Automated submission is blocked by default.
- CAPTCHA solving and anti-bot bypass are prohibited.
- Login-wall scraping, credential capture, and terms evasion are prohibited.
- The system may prepare materials for a job the user provides, but it must not automate activity on a constrained site.

## Default Blocked Platforms

The default blocked list is:

- LinkedIn
- Indeed
- Workday

Why:

- LinkedIn's help center says it does not permit third-party crawlers, bots, browser extensions, or similar software that scrape or automate activity on LinkedIn.
- Indeed's Terms prohibit automation, scripting, or bots to automate the Indeed Apply process outside official vendors/tooling.
- Workday's site terms prohibit data mining, robots, similar extraction methods, and applications that interact with its sites without prior written consent.

## Allowed Discovery Pattern

Prefer official/public feeds:

- Greenhouse Job Board API
- Lever Postings API
- Ashby public job postings API
- Direct user-provided job descriptions
- Local seed files

If a source has no official/public feed, add it as a manual URL or pasted job description instead of scraping it.

## Human-In-The-Loop Submission

The system prepares a review package. The user then:

1. Opens the apply URL manually.
2. Reviews the tailored resume and cover letter.
3. Answers legal, eligibility, compensation, and EEO questions personally.
4. Stops if the site requires CAPTCHA, credential sharing, or terms the user does not accept.
5. Marks the tracker manually after submitting.

## Audit Trail

`data/job-automation/applications.jsonl` records:

- normalized job data
- score and recommendation
- status
- generated package path
- status history

This file is gitignored because it may contain personal job-search data.
