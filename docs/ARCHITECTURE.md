# Architecture

> System design, data flow, and function map for the Maria Automation script.
>
> Back to: [CLAUDE.md](../CLAUDE.md) | [README.md](../README.md) | [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Drive    │     │  Google Apps      │     │  OpenRouter API  │
│  Input Folder    │────>│  Script Runtime   │────>│  (Claude 4.5 +   │
│  (.txt files)    │     │  (6-min limit)    │<────│   Flux 2 Pro)    │
└─────────────────┘     │                  │     └─────────────────┘
                        │                  │
                        │    ┌─────────┐   │     ┌─────────────────┐
                        │    │ Code.gs │   │     │  Google Drive    │
                        │    │ ~950 ln │   │────>│  Output Folder   │
                        │    └─────────┘   │     │  (Docs + Images) │
                        └──────────────────┘     └─────────────────┘
```

## Execution Pipeline

The entire pipeline runs in `processNewTranscripts()` (`Code.gs:35`). Each transcript is processed sequentially:

```
processNewTranscripts()                    Code.gs:35    ENTRY POINT (timer trigger)
│
├── For each .txt file in input folder:
│   │
│   ├── extractMetadata()                  Code.gs:77    1 API call (~5s)
│   │   └── callOpenRouter()               Code.gs:779   → guest name + show type
│   │
│   ├── createOutputFolders()              Code.gs:115   Drive API
│   │   └── Creates: OUTPUT/[show-type]/[guest] - [date]/
│   │
│   ├── generateAllShowNotes()             Code.gs:137   11 API calls (~2-4 min)
│   │   ├── generateTitles()               Code.gs:155   max_tokens: 1000
│   │   ├── generateTimestamps()           Code.gs:166   max_tokens: 1500
│   │   ├── generateKeyInsights()          Code.gs:175   max_tokens: 2500
│   │   ├── generateKeyInsights('youtube') Code.gs:175   max_tokens: 2000
│   │   ├── generateIntro()                Code.gs:191   max_tokens: 800
│   │   ├── generateHashtags()             Code.gs:200   max_tokens: 500
│   │   ├── generateKeywords()             Code.gs:220   max_tokens: 500
│   │   ├── generateClipSuggestions()      Code.gs:229   max_tokens: 4000
│   │   ├── generateSocialPosts()          Code.gs:266   max_tokens: 4000
│   │   ├── generateCTAs()                 Code.gs:351   max_tokens: 3000
│   │   └── generateLinks()               Code.gs:304   max_tokens: 2000
│   │
│   ├── generateEpisodeArtwork()           Code.gs:907   1 API call (~10-20s)
│   │   ├── (skips if not stewart-squared)
│   │   ├── generateImagePrompt()          Code.gs:819   builds prompt from keywords
│   │   ├── callOpenRouterImageAPI()       Code.gs:828   Flux 2 Pro, modalities: ['image','text']
│   │   └── saveImageToDrive()             Code.gs:878   base64 → PNG → Drive
│   │
│   ├── createShowNotesDocs()              Code.gs:421   Creates ~12 Google Docs
│   │   ├── createDoc() × 10              Code.gs:450   individual section docs
│   │   ├── generateYouTubeShowNotes()     Code.gs:395   5000-char formatted version
│   │   └── formatLinksForStandalone()     Code.gs:754   links doc (if present)
│   │
│   ├── createMasterDoc()                  Code.gs:542   1 consolidated doc
│   │   ├── Formatted sections with headings
│   │   ├── parseClips() + parsePosts() + parseCTAs()   content parsers
│   │   ├── Grouped clip output (clip + post + CTA per clip)
│   │   └── addLinksSection()              Code.gs:682   formatted links
│   │
│   └── file.setName('[PROCESSED]...')     marks as done
```

## Time Budget (6-minute limit)

| Phase | Estimated Time | Calls |
|-------|---------------|-------|
| Metadata extraction | ~5s | 1 API call |
| Show notes generation | 2-4 min | 11 API calls |
| Image generation | 10-20s | 1 API call (Stewart Squared only) |
| Document creation | 30-60s | ~13 Docs API calls |
| **Total** | **~3-5 min** | **13 API + 13 Docs** |

The 6-minute limit is the single biggest architectural constraint. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md#1-gas-6-minute-execution-time-limit) for details.

## API Integration

### Text Generation (callOpenRouter)

```
Code.gs:779 — callOpenRouter(prompt, maxTokens)

Endpoint: POST https://openrouter.ai/api/v1/chat/completions
Model:    anthropic/claude-sonnet-4.5
Auth:     Bearer token from Properties Service
Returns:  json.choices[0].message.content (string)
```

Every generation function follows the same pattern:
1. Build a prompt string with the transcript and metadata
2. Call `callOpenRouter(prompt, maxTokens)`
3. Return the raw string response

### Image Generation (callOpenRouterImageAPI)

```
Code.gs:828 — callOpenRouterImageAPI(prompt)

Endpoint:    POST https://openrouter.ai/api/v1/chat/completions
Model:       black-forest-labs/flux.2-pro
Modalities:  ['image', 'text']
Auth:        Bearer token from Properties Service
Returns:     base64 data URL (data:image/png;base64,...)

Response path: json.choices[0].message.images[0].image_url.url
Fallback:      json.choices[0].message.images[0].url
```

## Data Flow

```
Transcript (.txt)
    │
    ▼
extractMetadata() ──→ { guestName, showType }
    │
    ▼
generateAllShowNotes() ──→ showNotes object:
    │                       {
    │                         titles: string,
    │                         timestamps: string,
    │                         keyInsights: string,
    │                         keyInsightsYouTube: string,
    │                         intro: string,
    │                         hashtags: string,
    │                         keywords: string,
    │                         clips: string,
    │                         socialPosts: string,
    │                         ctas: string,
    │                         links: string (JSON)
    │                       }
    │
    ├──→ generateEpisodeArtwork() ──→ episode-artwork.png (Stewart Squared only)
    │
    ├──→ createShowNotesDocs() ──→ 10-12 individual Google Docs
    │
    └──→ createMasterDoc() ──→ 1 consolidated Google Doc
              │
              ├── parseClips(showNotes.clips) ──→ string[]
              ├── parsePosts(showNotes.socialPosts) ──→ string[]
              └── parseCTAs(showNotes.ctas) ──→ string[]
```

## Content Parsers

The master doc groups each clip with its corresponding social post and CTA. Three parsers extract individual items from the LLM's numbered output:

| Parser | Pattern | Location |
|--------|---------|----------|
| `parseClips()` | Splits on `CLIP N:` | Code.gs:476 |
| `parsePosts()` | Splits on `POST N` | Code.gs:508 |
| `parseCTAs()` | Splits on `CTA N` | Code.gs:526 |

These use **index-based matching** (clip[0] → post[0] → cta[0]), not label matching.

## Google Drive Structure

```
Input Folder (1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG)
├── transcript.txt                    ← new files detected here
├── [PROCESSED] transcript.txt        ← after successful processing
└── [FAILED] transcript.txt           ← after error

Output Folder (1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn)
├── crazy-wisdom/
│   └── [Guest Name] - 2026-02-12/
│       ├── titles
│       ├── timestamps
│       ├── key-insights
│       ├── intro
│       ├── hashtags
│       ├── keywords
│       ├── clip-suggestions
│       ├── social-posts
│       ├── ctas
│       ├── youtube-show-notes
│       ├── links (if extracted)
│       └── MASTER - [Guest Name]
│
└── stewart-squared/
    └── [Guest Name] - 2026-02-12/
        ├── (same docs as above)
        └── episode-artwork.png        ← only for Stewart Squared
```

## Show Type Detection

| Show | Identifier | Rule |
|------|-----------|------|
| Crazy Wisdom | `crazy-wisdom` | External guests |
| Stewart Squared | `stewart-squared` | Stewart Alsop II (father) or two-Stewart discussions |

Detection happens in `extractMetadata()` (Code.gs:77) via an LLM call that analyzes the first 2000 characters of the transcript.

## Adding a New Content Type

Follow this 3-step pattern:

**Step 1:** Create the generation function:
```javascript
function generateNewContent(transcript, metadata) {
  const prompt = `Your prompt here...
Transcript:
${transcript}`;
  return callOpenRouter(prompt, 1000);
}
```

**Step 2:** Add to `generateAllShowNotes()` (Code.gs:137):
```javascript
showNotes.newContent = generateNewContent(transcript, metadata);
```

**Step 3:** Add to `createShowNotesDocs()` (Code.gs:421):
```javascript
createDoc(folder, 'new-content', 'New Content Title', showNotes.newContent);
```

**Warning:** Each new API call adds ~10-20 seconds to execution time. Check the [time budget](#time-budget-6-minute-limit) before adding calls.

## Configuration

All configuration lives in the `CONFIG` object at the top of `Code.gs:7`:

```javascript
const CONFIG = {
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
  MODEL: 'anthropic/claude-sonnet-4.5',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

---

Back to: [CLAUDE.md](../CLAUDE.md) | [README.md](../README.md) | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | [QUICK_REFERENCE.md](../QUICK_REFERENCE.md)
