# Roadmap

## Now

- Resume parsing for Markdown, text, HTML, PDF via `pdftotext`, and DOC/DOCX/RTF via macOS `textutil`.
- Official/public source adapters for Greenhouse, Lever, Ashby, and local seed files.
- Deterministic scoring based on target titles, resume skills, location, seniority, evidence, and red flags.
- Review package generation.
- JSONL application tracker.
- Safety policy that blocks automated submission and constrained-platform discovery.
- Node test coverage and CI.

## Next

- Add a local web dashboard for review packages and tracker status.
- Add an import command for pasted job descriptions and saved browser URLs.
- Add optional LLM drafting with strict fact-grounding and diff review.
- Add JSON schema validation at runtime.
- Add richer compensation/location normalization.
- Add duplicate detection across ATS mirrors and reposts.
- Add manual status commands for `submitted_manual`, `interview`, `rejected`, and `withdrawn`.

## Later

- Add email/calendar follow-up planning through explicit user-approved connectors.
- Add recruiter/contact research as a separate workflow with platform-specific guardrails.
- Add anonymized analytics across application outcomes.
- Add signed local audit bundles for high-stakes job-search records.
