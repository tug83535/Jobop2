# Setup Guide

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+ (for PDF generation and utility scripts)
- (Optional) Go 1.21+ (for the dashboard TUI)

## Quick Start (5 steps)

### 1. Clone and install

```bash
git clone https://github.com/santifer/career-ops.git
cd career-ops
npm install
npx playwright install chromium   # Required for PDF generation
```

### 2. Configure your profile

```bash
cp config/profile.example.yml config/profile.yml
```

Edit `config/profile.yml` with your personal details: name, email, target roles, narrative, proof points.

### 3. Add your CV

Create `cv.md` in the project root with your full CV in markdown format. This is the source of truth for all evaluations and PDFs.

(Optional) Create `article-digest.md` with proof points from your portfolio projects/articles.

### 4. Configure portals

```bash
cp templates/portals.example.yml portals.yml
```

Edit `portals.yml`:
- Update `title_filter.positive` with keywords matching your target roles
- Add companies you want to track in `tracked_companies`
- Customize `search_queries` for your preferred job boards

### 5. Start using

Open Claude Code in this directory:

```bash
claude
```

Then paste a job offer URL or description. Career-ops will automatically evaluate it, generate a report, create a tailored PDF, and track it.

## Available Commands

| Action | How |
|--------|-----|
| Evaluate an offer | Paste a URL or JD text |
| Search for offers | `/career-ops scan` |
| Process pending URLs | `/career-ops pipeline` |
| Generate a PDF | `/career-ops pdf` |
| Batch evaluate | `/career-ops batch` |
| Check tracker status | `/career-ops tracker` |
| Fill application form | `/career-ops apply` |

## Verify Setup

```bash
node cv-sync-check.mjs      # Check configuration
node verify-pipeline.mjs     # Check pipeline integrity
```

## Production Job-Automation Engine

The testable automation engine lives in `src/jobops/` and uses `bin/job-automation.mjs`.

```bash
cp config/automation.example.json config/automation.json
# Edit config/automation.json and point candidate.resume_path to your resume

npm run jobops -- doctor --config config/automation.json
npm run jobops -- parse-resume --resume cv.md --out data/job-automation/resume.json
npm run jobops -- discover --config config/automation.json --out data/job-automation/discovered.json
npm run jobops -- score --config config/automation.json --jobs data/job-automation/discovered.json --out data/job-automation/scored.json
npm run jobops -- prepare --config config/automation.json --jobs data/job-automation/discovered.json --limit 5
```

This prepares review packages in `output/review-packages/`. It does not submit applications or bypass platform protections. See [AUTOMATION_SYSTEM.md](AUTOMATION_SYSTEM.md) and [SAFETY_AND_COMPLIANCE.md](SAFETY_AND_COMPLIANCE.md).

## Build Dashboard (Optional)

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard            # Opens TUI pipeline viewer
```
