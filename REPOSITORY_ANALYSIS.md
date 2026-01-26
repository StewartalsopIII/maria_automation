# Maria Automation - Repository Analysis & Conventions Guide

**Analysis Date:** January 20, 2026
**Project:** Google Apps Script Podcast Show Notes Automation
**Main Branch:** `automate-clip-content-creation`
**Status:** Active Development

---

## Executive Summary

The Maria Automation project is a Google Apps Script system that processes podcast transcripts and automatically generates comprehensive show notes for two podcast types: **"Crazy Wisdom"** (external guests) and **"Stewart Squared"** (featuring Stewart Alsop II or discussions between two Stewarts). The system leverages OpenRouter's Claude Sonnet 4 API for content generation and Flux 2 Pro for episode artwork creation.

**Key Stats:**
- **Main Script:** `gas_project/Code.gs` (829 lines)
- **Tech Stack:** Google Apps Script, OpenRouter API, Google Drive, Google Docs
- **Execution Model:** Time-based trigger (every 5 minutes)
- **API Provider:** OpenRouter with Claude Sonnet 4 + Flux 2 Pro models
- **Security Pattern:** API key stored in PropertiesService (encrypted), NOT in source code

---

## 1. Repository Organization & Structure

```
maria_automation/
├── .clasp.json              # Google Apps Script configuration (script ID reference)
├── .env                     # Environment variables (gitignored)
├── .gitignore              # Secrets and build artifacts excluded
├── SETUP.md                # Initial setup and security instructions
├── gas_project/            # Root directory for clasp deployment
│   ├── Code.gs            # Main script (829 lines) - PRIMARY FILE
│   └── appsscript.json    # Google Apps Script permissions config
├── Blueprints/
│   ├── Task_Checklist.md
│   ├── Project_History.md  # Original requirements and planning
│   ├── Workflow_Analysis.md
│   ├── Workflow_Automation_Status.md  # "Single source of truth" for automation status
│   ├── Enhancement_Plan_Dec2025.md    # Detailed feature plans
│   └── Implementation_Plan.md
├── plans/                  # Individual feature implementation plans
│   ├── add-links-extraction-simple.md
│   ├── fix-show-notes-formatting-simple.md
│   ├── update-youtube-show-notes-format.md
│   ├── add-links-extraction-feature.md
│   └── fix-master-show-notes-formatting.md
├── RESEARCH_*.md           # Research and analysis documents
├── FORMATTING_IMPLEMENTATION_GUIDE.md
├── GOOGLE_DOCS_API_REFERENCE.md
└── src_files/              # Walkthrough videos (not in repo)
```

**Deployment:**
- Connected via `clasp` (Google Apps Script CLI)
- Script ID: `1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2`
- Deploy via: `clasp push`

---

## 2. Project Architecture Overview

### High-Level Data Flow

```
Input: Transcript (.txt file)
        ↓
  [Monitor folder via 5-min trigger]
        ↓
  [Extract metadata: guest name, show type]
        ↓
  [Call OpenRouter API 8-9 times]
        ↓
  [Generate all show notes content]
        ↓
  [Create folder: ShowType/GuestName-Date/]
        ↓
  [Create individual docs + master doc]
        ↓
  [For Stewart Squared: Generate episode artwork]
        ↓
Output: Organized Google Drive folder with docs
```

### Core Components

#### 1. **Configuration & Setup** (Lines 1-29)
```javascript
const CONFIG = {
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties()...
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
  MODEL: 'anthropic/claude-sonnet-4',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

**Pattern:** Configuration centralized at top of file with feature flags (`GENERATE_IMAGES`) and API models. Folder IDs are hardcoded (Google Drive folder references).

#### 2. **Main Trigger Function** (Lines 35-71)
```javascript
function processNewTranscripts()
```

- Scans input folder for `.txt` files
- Skips files already marked `[PROCESSED]` or `[FAILED]`
- Extracts metadata, generates content, creates documents
- Renames file with prefix on success/failure
- Error handling: Catches exceptions and renames file `[FAILED]`

**Pattern:** Main entry point with defensive prefixing (prevents re-processing).

#### 3. **Metadata Extraction** (Lines 77-109)
```javascript
function extractMetadata(transcript)
```

Uses Claude API to detect:
- Guest name (excludes "Stewart Alsop III" - the host)
- Show type: "crazy-wisdom" or "stewart-squared"

**Pattern:** Passes first 2000 characters of transcript + explicit instruction to API, expects JSON response, includes error handling with fallback defaults.

#### 4. **Show Notes Generation** (Lines 137-153)
Nine separate generation functions called in sequence:

```javascript
showNotes.titles = generateTitles(...)
showNotes.timestamps = generateTimestamps(...)
showNotes.keyInsights = generateKeyInsights(...)
showNotes.intro = generateIntro(...)
showNotes.hashtags = generateHashtags(...)
showNotes.keywords = generateKeywords(...)
showNotes.clips = generateClipSuggestions(...)
showNotes.socialPosts = generateSocialPosts(...)
showNotes.links = generateLinks(...)
```

Returns object with 9 string properties.

**Pattern:** Modular generation functions, each handles one content type, all return strings. Lazy evaluation (all generated, all used).

#### 5. **Document Creation** (Lines 404-648)
Three main document creation functions:

**Individual Docs:**
```javascript
function createShowNotesDocs(folder, showNotes, metadata)
```
Creates separate Google Docs for each content type (titles, timestamps, etc.)

**Master Doc:**
```javascript
function createMasterDoc(folder, showNotes, metadata)
```
Creates consolidated document with all sections, includes:
- Character-level formatting (bold timestamps, markdown bold → actual bold)
- Font size adjustments (9pt for timestamps/insights)
- Dynamic bold pattern matching with index-based replacement
- Links section with proper URL formatting and bolding

**Links Helper:**
```javascript
function addLinksSection(body, linksJson)
function formatLinksForStandalone(linksJson)
```

**Pattern:**
- Documents created with `DocumentApp.create()`
- Content appended as paragraphs
- Files moved to folder after creation
- Character-level formatting uses `editAsText()` with regex-based index replacement
- Bold marker replacement processes in **reverse order** to maintain offsets (line 509)

---

## 3. Configuration & API Integration Patterns

### Configuration Pattern

**Location:** Lines 6-18 of `Code.gs`

```javascript
const CONFIG = {
  // API key retrieved from secure storage
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),

  // Google Drive folder IDs (hardcoded)
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',

  // API models (hardcoded, but can be changed)
  MODEL: 'anthropic/claude-sonnet-4',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',

  // Feature flags
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,

  // Metadata for API requests
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

**Best Practices:**
- API keys NOT hardcoded (stored in PropertiesService)
- Folder IDs hardcoded (acceptable; they don't change frequently)
- Feature flags enable/disable functionality (image generation toggle)
- Setup instructions in SETUP.md for secure initialization

### OpenRouter API Integration

**Text Generation:** (Lines 654-688)
```javascript
function callOpenRouter(prompt, maxTokens)
```

- Method: POST to `https://openrouter.ai/api/v1/chat/completions`
- Auth: Bearer token in `Authorization` header
- Headers include `HTTP-Referer` and `X-Title` (required by OpenRouter)
- Error handling: Checks `json.error` before processing response
- Returns: `json.choices[0].message.content`

**Image Generation:** (Lines 703-751)
```javascript
function callOpenRouterImageAPI(prompt)
```

- Model: Flux 2 Pro (black-forest-labs/flux.2-pro)
- Modalities: `["image", "text"]`
- Response: Base64-encoded data URL
- Error handling: Logs full response for debugging
- Returns: Image URL (handles both `image.image_url.url` and `image.url` paths)

**Base64 Handling:** (Lines 753-780)
```javascript
function saveImageToDrive(base64DataUrl, folder, filename)
```

- Splits on comma to extract base64 data
- Uses `Utilities.base64Decode()` and `Utilities.newBlob()`
- Creates PNG file in Google Drive folder

**Pattern:** Consistent error handling with `muteHttpExceptions: true`, JSON parsing validation, and appropriate fallback messages.

---

## 4. Document Creation & Management Patterns

### Folder Structure Pattern

**Creation:** (Lines 115-131)
```javascript
function createOutputFolders(showType, guestName)
```

Folder hierarchy:
```
OUTPUT_FOLDER_ID/
├── crazy-wisdom/
│   ├── Guest Name 1 - 2025-12-20/
│   │   ├── titles
│   │   ├── timestamps
│   │   ├── key-insights
│   │   ├── intro
│   │   ├── hashtags
│   │   ├── keywords
│   │   ├── clip-suggestions
│   │   ├── social-posts
│   │   ├── ctas
│   │   ├── youtube-show-notes
│   │   ├── links (if present)
│   │   └── MASTER - Guest Name 1
│   └── Guest Name 2 - 2025-12-21/
└── stewart-squared/
    └── ...
```

**Pattern:**
- Show type folder created if not exists (checked via `getFoldersByName()`)
- Guest folder named: `[GuestName] - [YYYY-MM-DD]`
- Ensures unique folder per episode
- Single-level hierarchy under show type

### Document Naming Convention

Individual docs use slug format:
- `titles` → "10 Episode Titles"
- `timestamps` → "Timestamps"
- `key-insights` → "Key Insights"
- `youtube-show-notes` → "YouTube Show Notes (Under 5000 chars)"

Master doc: `"MASTER - [GuestName]"`

**Pattern:** Lowercase slugs for programmatic names, human-readable titles set as heading in documents.

### YouTube Show Notes Format (Lines 379-399)

Special 5,000 character limit for YouTube descriptions:

```
[Intro paragraph]

Timestamps
[Maria: Paste Riverside chapter timestamps here]

Key Insights
[7 insights, markdown bold markers stripped]
```

**Pattern:** Placeholder for manual input (timestamps), concatenation of existing sections, character validation with warning logging.

---

## 5. Error Handling & Logging Conventions

### Error Handling Strategy

**Main Trigger:** (Lines 47-69)
```javascript
try {
  // Processing
} catch (error) {
  Logger.log('Error processing ' + fileName + ': ' + error.message);
  file.setName('[FAILED] ' + fileName);
}
```

**Metadata Extraction:** (Lines 95-108)
```javascript
try {
  const parsed = JSON.parse(cleaned);
  return { ... };
} catch (e) {
  Logger.log('Failed to parse metadata: ' + e.message);
  return { guestName: 'Unknown Guest', showType: 'crazy-wisdom' };
}
```

**Links Generation:** (Lines 312-325)
```javascript
try {
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.links) || !Array.isArray(parsed.books)) {
    throw new Error('Invalid structure');
  }
  return cleaned;
} catch (error) {
  Logger.log('Links extraction failed: ' + error.message);
  return JSON.stringify({links: [], books: []});
}
```

**Image Generation:** (Lines 793-807)
```javascript
try {
  // Image generation
} catch (error) {
  Logger.log('Error generating artwork: ' + error.message);
  return null; // Don't throw - continue without image
}
```

**Patterns:**
- Try-catch blocks around API calls and parsing
- Fallback defaults (unknown guest, empty lists, null images)
- Non-blocking errors (image generation failure doesn't stop processing)
- Consistent logging format: `Logger.log('Context: ' + error.message)`
- File naming prefixes for status tracking: `[PROCESSED]`, `[FAILED]`

### Logging Convention

**Informational:**
```javascript
Logger.log('Processing: ' + fileName);
Logger.log('Successfully processed: ' + fileName);
Logger.log('API key stored securely in Script Properties');
```

**Metadata Detection:**
```javascript
Logger.log('Detected show: ' + metadata.showType + ', Guest: ' + metadata.guestName);
```

**Warnings:**
```javascript
Logger.log('Warning: YouTube notes exceed 5000 chars (' + youtubeNotes.length + ').');
Logger.log('Skipping image generation (not Stewart Squared episode)');
```

**Debug/Detailed:**
```javascript
Logger.log('Image prompt: ' + imagePrompt);
Logger.log('YouTube show notes length: ' + youtubeNotes.length + ' chars');
Logger.log('Image saved: ' + filename + ' (' + Math.round(blob.getBytes().length / 1024) + ' KB)');
Logger.log('Image API Response: ' + JSON.stringify(json).substring(0, 500));
```

**Pattern:** String concatenation (not template literals, for compatibility), context + value format, character limits on large objects.

---

## 6. Automation Workflows & Trigger Setup

### Execution Model

**Trigger Function:** (Lines 814-824)
```javascript
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('processNewTranscripts')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger created: processNewTranscripts will run every 5 minutes');
}
```

**Execution Flow:**
1. Every 5 minutes, `processNewTranscripts()` is called
2. Scans input folder for `.txt` files
3. Checks for `[PROCESSED]` prefix (skips if found)
4. On success: Renames to `[PROCESSED] [filename]`
5. On error: Renames to `[FAILED] [filename]`

**Why 5-minute intervals?**
- Google Apps Script limit: 6-minute maximum execution time
- Text generation for one episode: ~2-3 minutes
- Image generation: ~30 seconds
- 5 minutes provides buffer and allows ~3 executions/15 minutes

### Automation Status (Single Source of Truth)

**File:** `/Blueprints/Workflow_Automation_Status.md`

Defines what's automated vs. manual:

| Status | Meaning |
|--------|---------|
| ✅ Automated | Currently working in the system |
| 🔧 To-Be-Automated | Planned or possible to automate |
| 📥 Automatable Input | Step is manual, but content can be auto-generated |
| 👤 Manual | Requires human judgment (always manual) |

**Currently Automated (9 content types):**
- Episode titles (10 options)
- Timestamps (every 5 minutes)
- Key insights (7 items)
- Intro paragraph
- Hashtags (5-10)
- Keywords
- Clip suggestions (5-7 clips)
- Social media posts
- Links and books
- YouTube show notes
- Episode artwork (Stewart Squared only)

**Always Manual (Riverside.fm workflow):**
- Clip selection and validation
- Boundary refinement (listening & judging)
- Volume balancing
- Final review before export

---

## 7. Existing Automation Workflows & Status

### Workflow 1: Transcript Processing & Show Notes Generation

**Status:** ✅ Fully Automated (829-line script)

**Input:** `.txt` file uploaded to Google Drive input folder

**Processing Steps:**
1. Detect guest name and show type via AI
2. Generate 9 types of content (8-9 API calls)
3. Create individual Google Docs for each content type
4. Create master consolidated document
5. For Stewart Squared: Generate episode artwork image
6. Organize all documents in dated guest folder

**Output:** Organized folder with:
- 10 individual show notes documents (titled, timestamps, insights, etc.)
- 1 master document with everything
- 1 YouTube-formatted document (under 5,000 chars)
- 1 episode artwork PNG (Stewart Squared only)

**Trigger:** Time-based (5-minute intervals)

### Workflow 2: Video Clip Creation (Riverside.fm)

**Status:** 📥 Partially Automatable

**Automatable Parts:**
- Clip suggestion generation (5-7 clips with timestamps, hooks, captions)
- Hook text generation (AI-generated, copy-paste into Riverside)
- CTA generation (1 per clip, AI-generated)
- Hashtag suggestions

**Manual Parts:**
- Clip selection from suggestions
- Timestamp validation (listening required)
- Aspect ratio changing (9:16)
- AI tool application (Remove Pauses)
- Layout configuration
- Text overlay positioning
- Music selection and volume balancing
- Export and download

### Workflow 3: Social Media Posting

**Status:** 🔧 Partial

**Currently Generated:**
- 3 social media posts (should be 6-7, one per clip)
- Hashtags (5-10)
- Keywords

**Planned Enhancements:**
- Fix social posts: Generate 1 post per clip (not 3 generic posts)
- Tie each post to specific clip content
- Generate CTA for each clip

**Manual Steps:**
- Upload clip to platform
- Paste post copy
- Schedule/publish

---

## 8. Notable Code Patterns & Practices

### Pattern 1: Defensive API Response Parsing

**Location:** Metadata extraction (Lines 95-108)

```javascript
try {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    guestName: parsed.guestName || 'Unknown Guest',
    showType: parsed.showType || 'crazy-wisdom'
  };
} catch (e) {
  Logger.log('Failed to parse metadata: ' + e.message);
  return { guestName: 'Unknown Guest', showType: 'crazy-wisdom' };
}
```

**Pattern:** Strip markdown code blocks, provide fallback defaults, log errors for debugging.

### Pattern 2: Links JSON Processing

**Location:** Generate links (Lines 288-326)

```javascript
function generateLinks(transcript, metadata) {
  const prompt = `Extract URLs and books...`;

  try {
    const response = callOpenRouter(prompt, 2000);
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.links) || !Array.isArray(parsed.books)) {
      throw new Error('Invalid structure');
    }

    return cleaned;  // Return string, not object
  } catch (error) {
    Logger.log('Links extraction failed: ' + error.message);
    return JSON.stringify({links: [], books: []});
  }
}
```

**Pattern:** Validate structure (arrays), return JSON string (not object), fallback to empty arrays.

### Pattern 3: Character-Level Formatting with Offset Management

**Location:** Master doc creation (Lines 472-518)

```javascript
// Bold timestamp values (00:00 or 00:00:00 at line starts)
const tsString = tsText.getText();
const tsPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)/gm;
let match;

while ((match = tsPattern.exec(tsString)) !== null) {
  tsText.setBold(match.index, match.index + match[1].length - 1, true);
}
```

**And for markdown bold replacement (Lines 498-518):**
```javascript
// Convert **bold** to actual bold formatting
const replacements = [];
while ((match = boldPattern.exec(kiString)) !== null) {
  replacements.push({
    start: match.index,
    end: match.index + match[0].length - 1
  });
}

// Process in reverse order to maintain offsets
for (let i = replacements.length - 1; i >= 0; i--) {
  const r = replacements[i];

  // Apply bold to content (excluding the **)
  kiText.setBold(r.start + 2, r.end - 2, true);

  // Remove ** markers
  kiText.deleteText(r.end - 1, r.end);       // Remove trailing **
  kiText.deleteText(r.start, r.start + 1);   // Remove leading **
}
```

**Pattern:**
- Collect all matches first (avoid offset invalidation)
- Process in **reverse order** (prevents index shifts during deletion)
- Use offset calculations: `start + 2` to skip opening `**`, `end - 2` to skip closing `**`

### Pattern 4: Conditional Feature Generation

**Location:** Episode artwork (Lines 782-808)

```javascript
function generateEpisodeArtwork(transcript, metadata, showNotes, folder) {
  if (!CONFIG.GENERATE_IMAGES) {
    Logger.log('Image generation disabled in CONFIG');
    return null;
  }

  if (metadata.showType !== 'stewart-squared') {
    Logger.log('Skipping image generation (not Stewart Squared episode)');
    return null;
  }

  try {
    // Image generation
  } catch (error) {
    Logger.log('Error generating artwork: ' + error.message);
    return null; // Non-blocking error
  }
}
```

**Pattern:** Feature flags, show-type conditional logic, non-blocking error handling.

### Pattern 5: API Prompt Engineering

**Timestamps prompt (Lines 167-172):**
```javascript
const prompt = `Give me timestamps for this episode of every five minutes from the
beginning to the end without worrying about the intro or outro. Make sure to include
what was discussed at each part of the episode. Do it without brackets and only
create a 00:00:00 format if there is more than 60 minutes of content otherwise keep
it like 00:00. Make it no longer than 1100 characters, making emphasis on the
conversation key words. Make each timestamp one or two phrases in narrative form.

Transcript:
${transcript}`;
```

**Pattern:** Specific formatting instructions, character limits, examples of expected format (00:00 vs 00:00:00), tone guidance.

**Social posts prompt (Lines 250-279):**
```javascript
const prompt = `Based on the clip suggestions below, write ONE social media post
for EACH clip. There should be 5-7 posts total (one per clip).

For each post (under 120 words each):
- Start with an engaging rhetorical question that ties into the clip's theme
- Add a one-two sentence description highlighting the insight or tension from that specific clip
- Close with the listener takeaway

Keep the tone curious, thought-provoking, and designed for an audience of tech-savvy,
open-minded knowledge workers. Make it conversational, handwritten style, like it's
written in first person as if the guest is speaking. Don't use the symbol "-" in the text.

Format your response as:

POST 1 (for Clip 1):
[Social media post for first clip]

[Continue for all clips...]

Guest: ${metadata.guestName}
Keywords/Hashtags: ${hashtags}

Clip Suggestions:
${clips}`;
```

**Pattern:** Detailed structure, example format, word count limits, tone specification, variable interpolation.

---

## 9. Metadata Handling Patterns

### Guest Detection Logic

**File:** Lines 77-109 (`extractMetadata` function)

```javascript
function extractMetadata(transcript) {
  const prompt = `Analyze this podcast transcript and extract:
1. The guest's full name (not Stewart Alsop III - he's the host. IMPORTANT: Host name
   is spelled "Stewart" with "ew", not "Stuart")
2. Whether this is "Crazy Wisdom" or "Stewart Squared" podcast

Rules:
- "Stewart Squared" episodes feature Stewart Alsop II (the father) or discussions between two Stewarts
- "Crazy Wisdom" episodes feature external guests
- Look at speaker labels and context to determine this

Respond in JSON format only:
{"guestName": "First Last", "showType": "crazy-wisdom" or "stewart-squared"}

Transcript (first 2000 chars):
${transcript.substring(0, 2000)}`;
```

**Key Details:**
- Explicitly excludes host name (Stewart Alsop III)
- Spelling emphasis: "Stewart" with "ew" (not "Stuart")
- Rules for distinguishing podcast types
- Uses only first 2000 chars (to save tokens, speed up processing)
- Expects JSON format

### Show Type Classification

**Two podcast types:**
1. **"crazy-wisdom"** - External guests, wide variety of topics
2. **"stewart-squared"** - Features Stewart Alsop II (father) or Stewart discussions

**Used for:**
- Folder organization
- Content tone/style (indirectly via prompts)
- Feature flags (image generation for Stewart Squared only)
- CTA text (show name varies: "Crazy Wisdom" vs "Stewart Squared")

---

## 10. Documentation & References in Codebase

### Inline Documentation

**Setup function (Lines 23-29):**
```javascript
// ===========================================
// SETUP FUNCTION - RUN ONCE TO STORE API KEY
// ===========================================
// After deploying this script, run this function ONCE to securely store your API key
// Then delete or comment out this function
function setupAPIKey() {
  const apiKey = 'PASTE_YOUR_NEW_API_KEY_HERE';
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
  Logger.log('API key stored securely in Script Properties');
}
```

**Section headers:**
```javascript
// ===========================================
// PODCAST SHOW NOTES AUTOMATION
// Google Apps Script + OpenRouter (Claude Sonnet 4)
// ===========================================

// ===========================================
// CONFIGURATION - UPDATE THESE
// ===========================================

// ===========================================
// MAIN TRIGGER FUNCTION
// ===========================================

// ===========================================
// METADATA EXTRACTION
// ===========================================
```

**Function documentation:**
```javascript
/**
 * Extract links and books from transcript
 * @param {string} transcript - The podcast transcript
 * @param {object} metadata - Guest name and show type
 * @returns {string} JSON string with links and books
 */
function generateLinks(transcript, metadata) { ... }

/**
 * Generate call-to-actions (CTAs) for each clip
 * @param {string} transcript - The full podcast transcript
 * @param {object} metadata - Guest name and show type
 * @param {string} clips - The generated clip suggestions
 * @returns {string} CTAs for each clip
 */
function generateCTAs(transcript, metadata, clips) { ... }
```

**Pattern:** Clear section headers with comment boxes, JSDoc-style function documentation with @param and @returns tags.

### External Documentation

**Key files in repository:**

1. **SETUP.md** - Initial setup instructions, API key security, deployment commands
2. **Blueprints/Workflow_Automation_Status.md** - "Single source of truth" for what's automated
3. **Blueprints/Enhancement_Plan_Dec2025.md** - Detailed feature specifications and technical requirements
4. **RESEARCH_FINDINGS.md** - In-depth analysis of document formatting and API usage
5. **FORMATTING_IMPLEMENTATION_GUIDE.md** - Character-level formatting patterns and solutions

---

## 11. Git History & Development Patterns

### Recent Commit History

```
15bfc43 documented what is automatable and what is not based on looms from maria
834a6dd chore: remove duplicate Code.js (Code.gs is the source)
4514c59 fix: strip markdown bold markers from YouTube insights
0c21a23 feat: update YouTube show notes format for Riverside workflow
a976371 docs: add YouTube show notes update plan
d5f1249 docs: add planning documents and sync Code.js
16a9307 Merge pull request #3 from StewartalsopIII/add-links-extraction
9fcd904 feat: add links and books extraction from transcripts
0dc0653 Merge pull request #2 from StewartalsopIII/fix-show-notes-formatting
a494df9 Add comprehensive formatting research and implementation documentation
4e60a14 Merge pull request #1 from StewartalsopIII/fix-show-notes-formatting
a3b1708 fix: improve master show notes formatting for better copy-paste workflow
443e724 Fix image URL extraction - use image.image_url.url path
de39951 Add better error handling and logging for image generation debugging
64c158e Add new features: YouTube show notes, 3 social posts, and Stewart Squared image generation
7faa533 Security: Remove hardcoded API key, use Properties Service
1966576 Initial commit: working maria automation script before enhancements
```

### Development Patterns

1. **Security-First Approach:** API key moved to PropertiesService early (commit 7faa533)
2. **Feature Addition:** New features added in discrete commits with testing
3. **Documentation-Driven:** Plans created before implementation (docs/ commits)
4. **Bug Fixes:** Image URL extraction issues debugged across multiple commits
5. **PR-Based Workflow:** Features merged via pull requests (PRs #1, #2, #3)
6. **Incremental Rollout:** Features added in phases (text generation → YouTube format → images)

### Commit Message Conventions

- **feat:** New feature (e.g., "feat: add links extraction")
- **fix:** Bug fix (e.g., "fix: strip markdown bold markers")
- **docs:** Documentation (e.g., "docs: add YouTube show notes plan")
- **chore:** Maintenance (e.g., "chore: remove duplicate Code.js")
- **refactor:** Code restructuring (not seen yet, but would follow pattern)

---

## 12. Configuration & Environment Variables

### Configuration Hierarchy

**1. CONFIG Object (Lines 6-18 of Code.gs):**
```javascript
const CONFIG = {
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
  MODEL: 'anthropic/claude-sonnet-4',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

**2. PropertiesService (Secure Storage):**
- API key stored encrypted
- Set via `setupAPIKey()` function (one-time setup)
- Retrieved: `PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY')`

**3. .clasp.json (Deployment Config):**
```json
{
  "scriptId": "1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2",
  "rootDir": "gas_project"
}
```

**4. appsscript.json (Google Apps Script Permissions):**
```json
{
  "timeZone": "America/New_York",
  "oauthScopes": [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

### OAuth Scopes Explained

- **documents:** Create and modify Google Docs
- **drive:** Access Google Drive (read/write files and folders)
- **script.external_request:** Call external APIs (OpenRouter)
- **script.scriptapp:** Trigger management

---

## 13. Planned Enhancements & Future Improvements

### High Priority (Documented in Enhancement_Plan_Dec2025.md)

1. **YouTube Show Notes Format** ✅ DONE
   - Create 5,000 character version
   - Separate document
   - Format: intro + timestamps + key insights

2. **Stewart Squared Episode Artwork** ✅ DONE
   - Generate images for Stewart Squared episodes only
   - Model: Flux 2 Pro (2048×2048 pixels)
   - Dynamic prompts based on episode content

3. **Social Media Posts Enhancement** 🔧 IN PROGRESS
   - Generate 1 post per clip (currently 3 generic posts)
   - Tie each post to specific clip content
   - Reference clip-specific hooks and insights

4. **CTA Generation** 🔧 IN PROGRESS
   - Generate 1 CTA per clip
   - Use full transcript for context
   - Mention specifics from later in episode

### Medium Priority

- **Character-level formatting improvements:** Markdown parsing, font sizing, copy-paste sections
- **Platform-specific post variants:** Different copy for Instagram vs TikTok vs YouTube
- **Music suggestions per clip:** Based on clip tone/mood
- **Auto-generate Canva CTA images:** Would require Canva API integration

### Always Manual (Human Judgment Required)

- Clip selection from suggestions
- Timestamp validation (listening)
- Boundary refinement
- Volume balancing
- Final review before export
- Music selection
- Platform posting and scheduling

---

## 14. Notable Code Features & Quirks

### Feature 1: Dynamic Show Name in CTAs
**Location:** Lines 335-373 (`generateCTAs` function)

```javascript
const showName = metadata.showType === 'stewart-squared' ? 'Stewart Squared' : 'Crazy Wisdom';
```

CTAs reference the correct podcast name based on show type. This is used in the CTA text template.

### Feature 2: Keyword-Based Image Prompts
**Location:** Lines 694-701 (`generateImagePrompt` function)

```javascript
function generateImagePrompt(transcript, metadata, showNotes) {
  const topics = showNotes.keywords.substring(0, 200); // First 200 chars of keywords

  const prompt = `Stewart Squared podcast episode artwork. Modern, vibrant tech-themed
  abstract illustration featuring themes of ${topics}. Colorful, bold, AI/technology
  aesthetic with futuristic elements. Professional podcast thumbnail design with dynamic
  composition. Eye-catching, high-contrast colors. No text or words in the image.`;

  return prompt;
}
```

Dynamic image prompts use extracted keywords. Limits to 200 chars to keep prompt reasonable.

### Feature 3: Truncation Strategy
**Location:** Lines 391-395 (`generateYouTubeShowNotes` function)

```javascript
if (youtubeNotes.length > 5000) {
  Logger.log('Warning: YouTube notes exceed 5000 chars (' + youtubeNotes.length + ').');
  youtubeNotes = youtubeNotes.substring(0, 4950) + '...\n\n[Truncated for YouTube limit]';
}
```

Graceful degradation: Truncates to 4950 chars + ellipsis + message. Logs warning for debugging.

### Feature 4: Base64 Data URL Handling
**Location:** Lines 760-769 (`saveImageToDrive` function)

```javascript
const base64DataUrl = base64DataUrl.split(',')[1];

if (!base64Data) {
  throw new Error('base64Data is empty after split');
}

const decodedData = Utilities.base64Decode(base64Data);
const blob = Utilities.newBlob(decodedData, 'image/png', filename);
```

Handles data URLs in format: `data:image/png;base64,XXXXX`. Extracts base64 portion after comma, validates, decodes, creates blob.

---

## 15. Recommendations for New Development

### When Adding New Content Types

1. **Create generation function:**
   ```javascript
   function generateNewContent(transcript, metadata) {
     const prompt = `Detailed instructions for the AI...`;
     return callOpenRouter(prompt, maxTokens);
   }
   ```

2. **Add to `generateAllShowNotes()`:**
   ```javascript
   showNotes.newContent = generateNewContent(transcript, metadata);
   ```

3. **Create document via `createShowNotesDocs()`:**
   ```javascript
   createDoc(folder, 'new-content-slug', 'New Content Title', showNotes.newContent);
   ```

4. **Add to master doc:**
   ```javascript
   body.appendParagraph('NEW CONTENT')
     .setHeading(DocumentApp.ParagraphHeading.HEADING1);
   body.appendParagraph(showNotes.newContent);
   ```

### When Adding New Features (Show-Type Specific)

1. **Check show type early:**
   ```javascript
   if (metadata.showType !== 'stewart-squared') return null;
   ```

2. **Use feature flag:**
   ```javascript
   if (!CONFIG.FEATURE_FLAG_NAME) return null;
   ```

3. **Non-blocking error handling:**
   ```javascript
   try {
     // Feature logic
   } catch (error) {
     Logger.log('Error in feature: ' + error.message);
     return null; // Don't throw
   }
   ```

### When Modifying Document Formatting

1. **Use `editAsText()` for character-level formatting**
2. **Process replacements in reverse order** (to maintain offsets)
3. **Collect all matches first**, then apply formatting
4. **Always validate** before `setBold()`, `setFontSize()`, etc.

### When Adding API Calls

1. **Use `callOpenRouter()` or `callOpenRouterImageAPI()` wrappers**
2. **Always check for errors:**
   ```javascript
   if (json.error) {
     throw new Error('OpenRouter API error: ' + json.error.message);
   }
   ```
3. **Parse JSON defensively** (strip markdown, validate structure)
4. **Log full responses** for debugging (first 500 chars)

---

## 16. Troubleshooting & Common Issues

### Issue: Transcript not processing

**Checklist:**
1. Verify file is `.txt` format (not `.pdf` or `.doc`)
2. Check file is in correct input folder (CONFIG.INPUT_FOLDER_ID)
3. Verify file name doesn't start with `[PROCESSED]` or `[FAILED]`
4. Check logs: `View → Logs` in Google Apps Script editor
5. Verify API key is set: `Logger.log(PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'))`

### Issue: API rate limiting

**Solution:**
- Check remaining API balance at openrouter.ai
- Reduce max_tokens in prompts temporarily
- Wait 5-10 minutes before retrying
- Monitor API calls per transcript (currently 8-9 calls per episode)

### Issue: Image generation fails

**Checklist:**
1. Verify `CONFIG.GENERATE_IMAGES = true`
2. Check episode is `stewart-squared` type
3. Verify Flux 2 Pro model is available in OpenRouter
4. Check logs for base64 parsing errors
5. Verify image file size (should be <512KB)

### Issue: YouTube notes exceed 5,000 characters

**Happens when:** Insights are too long or intro is very detailed

**Solution:**
- System automatically truncates and logs warning
- Manually edit key insights to be shorter
- Remove less important insights from generation

---

## 17. Key Files Reference

| File | Purpose | Lines | Last Updated |
|------|---------|-------|--------------|
| `gas_project/Code.gs` | Main script | 829 | Jan 20, 2026 |
| `gas_project/appsscript.json` | Permissions config | 12 | Dec 16, 2025 |
| `.clasp.json` | Deployment config | 16 | Dec 2, 2025 |
| `SETUP.md` | Setup instructions | 97 | Dec 15, 2025 |
| `Blueprints/Workflow_Automation_Status.md` | Automation reference | 249 | Dec 24, 2025 |
| `Blueprints/Enhancement_Plan_Dec2025.md` | Feature specifications | 440 | Dec 15, 2025 |
| `RESEARCH_FINDINGS.md` | Formatting patterns | 604 | Dec 24, 2025 |

---

## 18. Summary: Project Conventions & Best Practices

### Architecture Principles

1. **Single Responsibility:** Each function does one thing (generate titles, generate timestamps, etc.)
2. **Defensive Programming:** Fallback defaults, error handling, validation
3. **Non-blocking Features:** Image generation fails gracefully, doesn't stop processing
4. **Configuration First:** Feature flags, constants at top of file
5. **Logging for Debugging:** Informative, context-rich log messages

### Naming Conventions

- **Folders:** `[ShowType]/[GuestName] - [YYYY-MM-DD]/`
- **Documents:** Lowercase slugs (`titles`, `timestamps`) for files, human-readable titles in docs
- **Functions:** `verb + noun` style (`generateTitles()`, `createMasterDoc()`, `callOpenRouter()`)
- **Variables:** camelCase (`metadata`, `guestFolder`, `showNotes`)
- **Constants:** UPPERCASE_WITH_UNDERSCORES (`CONFIG`, `OPENROUTER_API_KEY`)

### Error Handling

- Always wrap API calls in try-catch
- Provide meaningful fallback defaults
- Log errors with context (function + message)
- File naming prefixes for status tracking (`[PROCESSED]`, `[FAILED]`)
- Non-blocking errors for optional features

### Documentation

- Section headers with comment boxes
- Inline comments for complex logic
- JSDoc-style function documentation
- External documentation for architecture/setup
- Git commits following conventional format (feat/fix/docs/chore)

### Testing & Validation

- Test function available: `testWithSampleTranscript()`
- Logs used for debugging (not console.log)
- JSON parsing with validation checks
- Array structure validation before use
- Character limit checking for YouTube notes

---

## 19. Current Development Status

**Branch:** `automate-clip-content-creation`

**Recent Work (Jan 4-20, 2026):**
- Documented automation status based on workflow videos
- Fixed markdown bold marker stripping in YouTube insights
- Updated YouTube show notes format for Riverside workflow
- Improved character-level formatting in master documents

**In Progress:**
- Social media posts enhancement (1 post per clip, not 3 generic)
- CTA generation (1 per clip)

**Completed Features:**
- ✅ Transcript detection and processing
- ✅ Metadata extraction (guest name, show type)
- ✅ 9 types of content generation
- ✅ Individual and master document creation
- ✅ YouTube show notes formatting (5k char limit)
- ✅ Episode artwork generation (Stewart Squared)
- ✅ Links and books extraction
- ✅ Character-level formatting (bold, font size)

**Known Limitations:**
- Social posts currently 3 generic posts (should be 6-7 clip-specific)
- CTAs not yet automated
- No platform-specific post variants
- Clip selection still manual (Riverside.fm)

---

**Document Version:** 1.0
**Created:** January 20, 2026
**Scope:** Complete repository analysis for understanding conventions and architecture
**Audience:** Developers joining the project, new contributors, code reviewers
