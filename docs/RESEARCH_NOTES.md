# Research Notes

Research date: 2026-07-29

## Open-Source Projects Reviewed

| Project | Useful Pattern | Risk / Difference |
|---|---|---|
| [ApplyPilot](https://github.com/Pickle-Pixel/ApplyPilot) | Full pipeline: discovery, enrichment, scoring, tailoring, cover letters, browser application flow. | Includes autonomous submission and optional CAPTCHA solving. This repo intentionally avoids those paths. |
| [career-ops](https://github.com/santifer/career-ops) | Strong local command-center model: scoring, CV tailoring, tracker, dashboard, agent modes. | This repo builds on that pattern and adds a testable automation kernel. |
| [job-apply-plugin](https://github.com/neonwatty/job-apply-plugin) | Application assistant workflow across ATS forms with AI-generated answers. | This repo keeps the browser/submission step human-controlled. |
| [Auto_job_applier_linkedIn](https://github.com/GodsScion/Auto_job_applier_linkedIn) | Demonstrates demand for LinkedIn Easy Apply automation. | LinkedIn automation is a policy risk, so LinkedIn is blocked by default. |
| [AIHawk](https://github.com/feder-cr/jobs_applier_ai_agent_aihawk) | AI-assisted tailored application workflows. | The safety posture here is stricter: prepare only, no unattended submit. |

## Platform Constraints

- [LinkedIn prohibited software guidance](https://www.linkedin.com/help/linkedin/answer/a1341387) says third-party crawlers, bots, browser plug-ins, extensions, and other software that scrape or automate LinkedIn activity are not permitted.
- [Indeed Terms of Service](https://www.indeed.com/legal) prohibit automation, scripting, or bots to automate the Indeed Apply process outside official vendors and tooling.
- [Workday site terms](https://www.workday.com/en-us/legal/site-terms.html) prohibit data mining, robots, similar extraction methods, and applications that interact with Workday sites without prior written consent.

## Lower-Risk Official/Public Feeds

- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html) provides JSON access to offices, departments, and published jobs.
- [Lever Postings API](https://github.com/lever/postings-api) provides published postings, details, hosted URLs, and application URLs.
- [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api) provides currently published job postings for an organization.

## Design Decision

The safest production-quality version is not "apply everywhere automatically." It is:

1. Discover from official/public feeds.
2. Score against verified resume evidence.
3. Generate tailored drafts.
4. Track everything.
5. Require human review and manual submission.

This still removes most repetitive work while avoiding CAPTCHA bypass, anti-bot evasion, and platform-term conflicts.
