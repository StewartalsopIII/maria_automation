# Maria Automation - Quick Reference Guide

> Back to: [CLAUDE.md](CLAUDE.md) | [README.md](README.md) | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

## At a Glance

**What:** Google Apps Script that processes podcast transcripts and generates comprehensive show notes
**Where:** `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/`
**Main File:** `gas_project/Code.gs` (~950 lines)
**Tech:** Google Apps Script + OpenRouter API (Claude Sonnet 4.5) + Google Drive

---

## Key Folder IDs (from CONFIG object)

```
INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG'   (watch for new transcripts)
OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn'   (create output structure)
Script ID: 1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2
```

---

## Process Flow

```
1. User uploads .txt transcript → INPUT_FOLDER_ID
2. Every 5 minutes: processNewTranscripts() runs
3. Extract metadata (guest name, show type)
4. Call AI 12 times to generate content
5. Create folder: OUTPUT_FOLDER_ID/[ShowType]/[Guest] - [Date]/
6. Create 10-12 Google Docs
7. For Stewart Squared: Generate image
8. Rename original: [PROCESSED] or [FAILED]
```

---

## Generated Content Types (9 total)

| Content | Function | Status |
|---------|----------|--------|
| Titles | `generateTitles()` | ✅ 10 options |
| Timestamps | `generateTimestamps()` | ✅ Every 5 min |
| Key Insights | `generateKeyInsights()` | ✅ 7 items |
| Intro | `generateIntro()` | ✅ 1 paragraph |
| Hashtags | `generateHashtags()` | ✅ 5-10 tags |
| Keywords | `generateKeywords()` | ✅ List |
| Clip Suggestions | `generateClipSuggestions()` | ✅ 5-7 clips |
| Social Posts | `generateSocialPosts()` | 🔧 3 posts (should be 6-7) |
| Links & Books | `generateLinks()` | ✅ Extracted |

**Plus:**
- YouTube Show Notes (5,000 char limit)
- Episode Artwork (Stewart Squared only, 2048×2048 PNG)

---

## Document Output Structure

```
Per episode folder: [Guest Name] - 2025-12-20/
├── Individual docs (separate Google Docs for each content type)
│   ├── titles
│   ├── timestamps
│   ├── key-insights
│   ├── intro
│   ├── hashtags
│   ├── keywords
│   ├── clip-suggestions
│   ├── social-posts
│   ├── ctas
│   ├── youtube-show-notes
│   └── links (if present)
├── MASTER - [Guest Name] (consolidated document)
└── episode-artwork.png (Stewart Squared only)
```

---

## Two Podcast Types

| Show Type | Identifier | Details |
|-----------|-----------|---------|
| **Crazy Wisdom** | `"crazy-wisdom"` | External guests, wide audience |
| **Stewart Squared** | `"stewart-squared"` | Stewart Alsop II or Stewart discussions |

**Distinction:** Stewart Squared episodes get episode artwork generated; Crazy Wisdom episodes do not.

---

## How to Deploy Changes

```bash
cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/Sustained\ Use/maria_automation

# Check status
git status

# Make changes to gas_project/Code.gs

# Push to Google Apps Script
clasp push

# Verify in Google Apps Script editor:
# https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit
```

---

## Testing

1. **Manual trigger:**
   - Open Google Apps Script editor
   - Select `testWithSampleTranscript()` from function dropdown
   - Click Run button
   - Check logs: `View → Logs`

2. **Upload test transcript:**
   - Create `.txt` file with podcast transcript
   - Upload to input folder
   - Wait up to 5 minutes for processing
   - Check output folder for results

---

## Configuration Changes

**To change API key:**
1. Open Google Apps Script editor
2. Find `setupAPIKey()` function (line 25)
3. Replace `'PASTE_YOUR_NEW_API_KEY_HERE'`
4. Run `setupAPIKey()` once
5. Delete the function
6. Deploy: `clasp push`

**To disable image generation:**
1. In `Code.gs`, find line 14: `GENERATE_IMAGES: true,`
2. Change to: `GENERATE_IMAGES: false,`
3. Deploy: `clasp push`

**To change output folders:**
1. Update CONFIG object (lines 6-18)
2. Find new Google Drive folder ID
3. Update `INPUT_FOLDER_ID` or `OUTPUT_FOLDER_ID`
4. Deploy: `clasp push`

---

## Error Handling Convention

- **Error Prefix:** `[FAILED] [original-filename]`
- **Check Logs:** Google Apps Script editor → `View → Logs`
- **Common Issues:**
  - File format not `.txt` → Check file extension
  - API key invalid → Check PropertiesService setup
  - Folder not found → Verify CONFIG folder IDs
  - Rate limited → Wait 5-10 minutes, check OpenRouter balance

---

## Code Organization (~950 lines total)

| Section | Lines | Purpose |
|---------|-------|---------|
| Configuration | 1-30 | API keys, folder IDs, feature flags |
| Main Trigger | 35-71 | Entry point, file scanning, processing loop |
| Metadata | 77-109 | Guest name + show type detection |
| Folder Mgmt | 115-131 | Create output directory structure |
| Show Notes Gen | 137-153 | Call all 9 generation functions |
| Individual Gens | 155-373 | 9 separate generation functions |
| YouTube Format | 379-399 | 5,000 char limited version |
| Document Mgmt | 404-648 | Create Docs, format content, move files |
| OpenRouter API | 654-688 | Text generation API wrapper |
| Image API | 703-808 | Image generation + base64 handling |
| Setup & Triggers | 814-829 | Trigger creation, test function |

---

## Key Functions (Quick Reference)

| Function | Purpose | Called By |
|----------|---------|-----------|
| `processNewTranscripts()` | Main entry point | Timer trigger (5 min) |
| `extractMetadata()` | Detect guest + show type | processNewTranscripts |
| `generateAllShowNotes()` | Call all 9 generators | processNewTranscripts |
| `createMasterDoc()` | Create consolidated doc | processNewTranscripts |
| `callOpenRouter()` | LLM API wrapper | All generation functions |
| `generateEpisodeArtwork()` | Create image (Stewart Squared) | processNewTranscripts |
| `setupTrigger()` | Create 5-min timer | Manual setup |

---

## Common Tasks

### Add New Content Type

1. Create generation function:
```javascript
function generateNewThing(transcript, metadata) {
  const prompt = `Your detailed prompt here...`;
  return callOpenRouter(prompt, 1000);
}
```

2. Add to `generateAllShowNotes()`:
```javascript
showNotes.newThing = generateNewThing(transcript, metadata);
```

3. Create document in `createShowNotesDocs()`:
```javascript
createDoc(folder, 'new-thing', 'New Thing Title', showNotes.newThing);
```

### Fix Formatting Issue

1. Edit Master Doc section (around line 450)
2. Use `editAsText()` for character-level formatting
3. Process replacements in **reverse order** (maintain offsets)
4. Test thoroughly before deploying

### Debug an Issue

1. Open Google Apps Script editor
2. Add `Logger.log()` statements to track execution
3. Run `testWithSampleTranscript()`
4. Check logs: `View → Logs`
5. Look for error messages with context

---

## Git Workflow

```bash
# See recent commits
git log --oneline -10

# See what changed
git diff

# Create commit (only when asked)
git add .
git commit -m "feat: description of changes"

# Push (only when asked)
git push origin automate-clip-content-creation
```

---

## Important Notes

1. **API Key Security:** Never commit `.env` or hardcoded keys. Use PropertiesService.

2. **File Naming:** Always use lowercase slugs for document names (`titles`, not `Titles`).

3. **Error Handling:** Always wrap API calls in try-catch. Use non-blocking errors for optional features.

4. **Processing Time:** Each transcript takes ~2-3 minutes. Google Apps Script limit is 6 minutes per execution.

5. **Offset Management:** When doing regex replacements in Google Docs, **always process in reverse order** to maintain correct indices.

6. **Testing:** Always test with sample transcript before deploying to production.

---

## Useful Links

- **Google Apps Script Editor:** https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit
- **OpenRouter Dashboard:** https://openrouter.ai/keys
- **Input Folder:** Google Drive folder `1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG`
- **Output Folder:** Google Drive folder `1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn`

---

## Documentation Files

| File | Purpose | When to Read |
|------|---------|-------------|
| [CLAUDE.md](CLAUDE.md) | Claude Code fast-start context | First thing, every session |
| [README.md](README.md) | Human-readable project overview | Understanding the project |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, function map, data flow | Before modifying Code.gs |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Bugs, debugging, troubleshooting | When something breaks |
| [SETUP.md](SETUP.md) | Initial setup and API key rotation | First-time setup only |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | This file - config and common tasks | Quick lookups |
| [Blueprints/Workflow_Automation_Status.md](Blueprints/Workflow_Automation_Status.md) | What's automated vs manual vs planned | Planning new features |

### Research Archives
| File | Content |
|------|---------|
| [REPOSITORY_ANALYSIS.md](REPOSITORY_ANALYSIS.md) | Full codebase analysis |
| [CODE_PATTERNS.md](CODE_PATTERNS.md) | Code conventions |
| [FORMATTING_IMPLEMENTATION_GUIDE.md](FORMATTING_IMPLEMENTATION_GUIDE.md) | Google Docs formatting |
| [RESEARCH_FINDINGS.md](RESEARCH_FINDINGS.md) | Technical deep-dive |

---

**Last Updated:** February 12, 2026
**Status:** Active Development
**Branch:** `automate-clip-content-creation`
