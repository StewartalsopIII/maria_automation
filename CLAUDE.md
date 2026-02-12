# Maria Automation - Claude Code Context

> This is a Google Apps Script automation that processes podcast transcripts and generates show notes, social media content, and episode artwork. It runs inside Google Drive and calls OpenRouter APIs.

## Quick Orientation

| What | Where |
|------|-------|
| **Main (only) source file** | [`gas_project/Code.gs`](gas_project/Code.gs) (~950 lines) |
| **Deployed to** | Google Apps Script (ID: `1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2`) |
| **Push mechanism** | `clasp push` from this directory |
| **Branch** | `automate-clip-content-creation` (main development branch) |
| **Two podcasts** | "Crazy Wisdom" (external guests) and "Stewart Squared" (father-son) |

## How It Works (30-second version)

1. User drops a `.txt` transcript into a Google Drive input folder
2. A 5-minute timer trigger detects the file and calls `processNewTranscripts()`
3. The script calls OpenRouter (Claude Sonnet 4.5) **12 times sequentially** to generate content
4. For Stewart Squared episodes, it also generates artwork via Flux 2 Pro
5. It creates ~12 Google Docs in an organized output folder
6. The original file is renamed `[PROCESSED]` or `[FAILED]`

## Critical Constraints

- **Google Apps Script has a 6-minute execution time limit.** The 12 sequential API calls + doc creation + image generation must all complete within this window. See [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for details.
- **Errors in image generation are silently caught** (line ~928). Always check Apps Script execution logs when debugging image issues.
- **The host's name is "Stewart" (with "ew"), not "Stuart".** This matters in prompts.
- **This project lives inside a Dropbox folder.** Paths may differ across machines.

## Key Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full function map and data flow.

```
processNewTranscripts()          ← Entry point (timer trigger)
  ├── extractMetadata()          ← 1 API call: detect guest + show type
  ├── createOutputFolders()      ← Creates Drive folder structure
  ├── generateAllShowNotes()     ← 11 API calls (sequential):
  │     ├── generateTitles()
  │     ├── generateTimestamps()
  │     ├── generateKeyInsights()
  │     ├── generateKeyInsights('youtube')
  │     ├── generateIntro()
  │     ├── generateHashtags()
  │     ├── generateKeywords()
  │     ├── generateClipSuggestions()
  │     ├── generateSocialPosts()
  │     ├── generateCTAs()
  │     └── generateLinks()
  ├── generateEpisodeArtwork()   ← 1 API call (Stewart Squared only, Flux 2 Pro)
  ├── createShowNotesDocs()      ← Creates ~12 individual Google Docs
  └── createMasterDoc()          ← Creates 1 consolidated master doc
```

## API Configuration

| Setting | Value |
|---------|-------|
| Text model | `anthropic/claude-sonnet-4.5` via OpenRouter |
| Image model | `black-forest-labs/flux.2-pro` via OpenRouter |
| API key storage | Google Apps Script Properties Service (encrypted) |
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` |

## Documentation Map

| Doc | Purpose | When to read |
|-----|---------|-------------|
| **[CLAUDE.md](CLAUDE.md)** (this file) | Fast-start context for Claude Code | First thing, every session |
| **[README.md](README.md)** | Human-readable project overview | Understanding the project |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System design, function map, data flow | Before modifying Code.gs |
| **[docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)** | Bugs, debugging, troubleshooting | When something breaks |
| **[SETUP.md](SETUP.md)** | Initial setup and API key rotation | First-time setup only |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Config values, deploy commands, common tasks | Quick lookups |
| **[Blueprints/Workflow_Automation_Status.md](Blueprints/Workflow_Automation_Status.md)** | What's automated vs manual vs planned | Planning new features |

## What NOT to Change Without Asking

The user (Stewart) has said everything other than image generation is working well. Before modifying any generation function prompts, document creation logic, or folder structure, confirm with the user first.

## Common Operations

**Deploy a change:**
```bash
clasp push
```

**Test manually:** Run `testWithSampleTranscript()` in the Apps Script editor.

**Check logs:** Apps Script editor > Executions (left sidebar) > click an execution.

**Add a new content type:** See pattern in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adding-a-new-content-type).
