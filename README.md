# Maria Automation

Automated podcast show notes generation for the **Crazy Wisdom** and **Stewart Squared** podcasts. Processes transcripts and produces titles, timestamps, key insights, clip suggestions, social media posts, CTAs, and episode artwork.

> For Claude Code context, see [CLAUDE.md](CLAUDE.md). For architecture details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How It Works

A Google Apps Script watches a Google Drive folder for new `.txt` transcript files. When one appears, it:

1. Detects the guest name and podcast type (Crazy Wisdom vs Stewart Squared)
2. Generates 11 types of content using Claude Sonnet 4.5 via OpenRouter
3. Creates organized Google Docs in a dated output folder
4. For Stewart Squared episodes, generates episode artwork using Flux 2 Pro
5. Marks the transcript as `[PROCESSED]` or `[FAILED]`

The automation runs every 5 minutes via a timer trigger.

## Generated Output

Each episode produces a folder containing:

```
[Guest Name] - 2026-02-12/
├── titles                    10 episode title options
├── timestamps                Timestamps every 5 minutes
├── key-insights              7 detailed insights
├── intro                     Opening paragraph
├── hashtags                  5-10 discovery hashtags
├── keywords                  Episode keyword list
├── clip-suggestions          5-7 clips with hooks and timestamps
├── social-posts              1 social media post per clip
├── ctas                      1 call-to-action per clip
├── youtube-show-notes        YouTube-formatted (under 5000 chars)
├── links                     Extracted URLs and books (if any)
├── MASTER - [Guest Name]     All content consolidated
└── episode-artwork.png       Stewart Squared only (2048x2048)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Google Apps Script (V8) |
| Text generation | Claude Sonnet 4.5 via [OpenRouter](https://openrouter.ai) |
| Image generation | Flux 2 Pro via OpenRouter |
| Storage | Google Drive |
| Documents | Google Docs API |
| Deployment | [clasp](https://github.com/google/clasp) |

## Project Structure

```
maria_automation/
├── CLAUDE.md                  ← Claude Code context (start here)
├── README.md                  ← This file
├── SETUP.md                   ← Initial setup and API key rotation
├── QUICK_REFERENCE.md         ← Config values and common tasks
├── docs/
│   ├── ARCHITECTURE.md        ← System design and function map
│   └── KNOWN_ISSUES.md        ← Bugs, debugging, troubleshooting
├── gas_project/
│   ├── Code.gs                ← Main script (~950 lines, the only source file)
│   └── appsscript.json        ← OAuth scopes and runtime config
├── Blueprints/
│   ├── Workflow_Automation_Status.md  ← What's automated vs manual
│   ├── Enhancement_Plan_Dec2025.md    ← Feature specs
│   └── ...                            ← Planning history
├── plans/                     ← Implementation plans (some completed)
├── src_files/                 ← Video walkthroughs of manual workflow
└── .clasp.json                ← clasp deployment config
```

## Setup

See [SETUP.md](SETUP.md) for initial setup instructions including:
- API key rotation and secure storage
- Google Apps Script deployment
- Trigger configuration

## Deployment

```bash
# Push changes to Google Apps Script
clasp push

# Verify in the editor
open "https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit"
```

## Known Issues

See [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for current issues and debugging guides.

Key issue: Image generation for Stewart Squared can fail silently due to the 6-minute GAS execution time limit. The fix (moving image generation earlier in the pipeline) has been applied.

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Claude Code fast-start context |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and function map |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Troubleshooting and debugging |
| [SETUP.md](SETUP.md) | First-time setup |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Config and common tasks |
| [Blueprints/Workflow_Automation_Status.md](Blueprints/Workflow_Automation_Status.md) | Automation status tracker |

## Research Archives

These files document research done during development. They're reference material, not operational docs:

| File | Content |
|------|---------|
| [REPOSITORY_ANALYSIS.md](REPOSITORY_ANALYSIS.md) | Full codebase analysis |
| [CODE_PATTERNS.md](CODE_PATTERNS.md) | Established code conventions |
| [FORMATTING_IMPLEMENTATION_GUIDE.md](FORMATTING_IMPLEMENTATION_GUIDE.md) | Google Docs formatting guide |
| [GOOGLE_DOCS_API_REFERENCE.md](GOOGLE_DOCS_API_REFERENCE.md) | Docs API quick reference |
| [BEST_PRACTICES_RESEARCH.md](BEST_PRACTICES_RESEARCH.md) | GAS best practices |
| [RESEARCH_FINDINGS.md](RESEARCH_FINDINGS.md) | Technical deep-dive |
| [RESEARCH_SUMMARY.md](RESEARCH_SUMMARY.md) | Research overview |
