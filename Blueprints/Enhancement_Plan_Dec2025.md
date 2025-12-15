# Maria Automation Enhancement Plan
**Date:** December 15, 2025
**Status:** Planning Phase - Awaiting Approval

---

## Overview
This document outlines the planned enhancements to the existing Maria Automation Google Apps Script for podcast show notes generation. The script currently processes transcripts from both Crazy Wisdom and Stewart Squared podcasts, generating comprehensive show notes using OpenRouter's Claude Sonnet 4 API.

---

## Current State

### Working Features
- ✅ Monitors input folder for new transcript files (`.txt`)
- ✅ Auto-detects guest name and podcast type (Crazy Wisdom vs Stewart Squared)
- ✅ Generates 8 types of content per episode:
  1. 10 Episode Titles
  2. Timestamps (every 5 minutes)
  3. Key Insights (7 items)
  4. Intro Paragraph
  5. Hashtags (5-10)
  6. Keywords
  7. Clip Suggestions (5-7 clips)
  8. Social Media Posts
- ✅ Creates individual docs + MASTER doc in organized folders
- ✅ Runs on 5-minute trigger (checks for new files)
- ✅ Uses OpenRouter API with Claude Sonnet 4

### Technology Stack
- **Platform:** Google Apps Script
- **AI Provider:** OpenRouter API
- **Text Model:** `anthropic/claude-sonnet-4`
- **Storage:** Google Drive
- **Output:** Google Docs

### File Structure
```
maria_automation/
├── .clasp.json (connected to script ID)
├── gas_project/
│   ├── Code.gs (main script, 381 lines)
│   └── appsscript.json (permissions config)
├── Blueprints/ (documentation)
├── src_files/ (walkthrough videos)
└── google_apps_script/ (empty)
```

---

## Enhancement Requirements

### 1. YouTube Show Notes Format ⭐ HIGH PRIORITY
**Problem:** YouTube has a 5,000 character limit for video descriptions, but current output is much longer.

**Solution:** Create a separate "YouTube Show Notes" document with only:
- Intro paragraph (with guest name, topics, links)
- Timestamps (concise format)
- Key Insights (7 numbered items)

**Format Example:**
```
In this episode of [Podcast Name], Stewart Alsop sits down with [Guest Name] to explore...

[Guest social links and resources mentioned]

Timestamps
00:00 Topic one discussion
05:00 Topic two exploration
...

Key Insights
1. [First insight paragraph]
2. [Second insight paragraph]
...
```

**Character Limit:** Must fit within 5,000 characters total

**Implementation:**
- Add new function: `generateYouTubeShowNotes(transcript, metadata, showNotes)`
- Use existing intro, timestamps, and key insights
- Concatenate and validate length < 5,000 chars
- Create new doc: `youtube-show-notes`

### 2. Transistor Show Notes (No Change)
**Requirement:** Keep existing full MASTER document for Transistor.fm (audio-only platform with no text limit)

**Current Output:** All 8 sections in one MASTER doc
- No changes needed to this functionality

### 3. Stewart Squared Episode Artwork Generation ⭐ HIGH PRIORITY
**Problem:** Stewart Squared episodes need custom thumbnail images for RSS feed/Transistor.fm

**Requirements:**
- **Image Dimensions:** 2048×2048 pixels (meets Transistor 1400×1400 minimum, stays under 512KB limit)
- **Format:** PNG or JPEG
- **Style:** Tech/AI-themed, vibrant colors, abstract/modern aesthetic
- **Content:** Based on episode topics/themes

**Solution:** Use OpenRouter's Flux.2 Pro image generation model

**API Details:**
- **Model:** `black-forest-labs/flux.2-pro`
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Parameters:**
  - `modalities: ["image", "text"]`
  - Width: 2048, Height: 2048
  - Aspect ratio: 1:1 (square)
  - Max resolution: 4 MP
- **Response:** Base64-encoded PNG data URL

**Prompt Generation Strategy:**
1. Analyze transcript for main topics/themes
2. Generate dynamic image prompt:
   ```
   "Stewart Squared podcast episode artwork. Modern, vibrant tech-themed illustration
   featuring [MAIN TOPICS]. Abstract, colorful, AI/technology aesthetic. Professional
   podcast thumbnail design. Bold, eye-catching composition."
   ```
3. Include episode-specific keywords from content

**Implementation:**
- Add new function: `generateEpisodeArtwork(transcript, metadata)`
- Only generate for Stewart Squared episodes (check `metadata.showType`)
- Create new function: `callOpenRouterImageAPI(prompt)`
- Decode base64 response and save as PNG to Google Drive
- Place image in episode folder with name: `episode-artwork.png`

**Transistor.fm Image Specs:**
- Recommended: 3000×3000 pixels
- Minimum: 1400×1400 pixels
- Our output: 2048×2048 pixels ✅
- Max file size: 512KB
- Format: JPEG or PNG
- Colorspace: RGB
- Resolution: 72 dpi

### 4. Social Media Posts Enhancement (PENDING)
**Status:** Awaiting clarification from Maria

**Original Requirement:** "For other guests besides Stewart Alsop, need 2 social media posts based off the clips that are suggested in the document"

**Questions to Resolve:**
- Does this mean 2 posts per clip suggestion?
- Or 2 total posts per episode (currently generates 1)?
- What differentiates these from existing social post generation?
- Should these reference specific clip timestamps?

**Action:** User will consult with Maria before implementing

### 5. Formatting Enhancement (DEFERRED)
**Original Task:** "No periods" or "put some periods, maybe"

**Status:** Unclear requirement, skipped for now

**Possible Interpretations:**
- Add periods to timestamp format?
- Remove periods from somewhere?
- Formatting style preference?

**Action:** Will revisit after user clarifies

---

## Implementation Plan

### Phase 1: YouTube Show Notes (30 min)
1. Create `generateYouTubeShowNotes()` function
2. Concatenate: intro + "\n\nTimestamps\n" + timestamps + "\n\nKey Insights\n" + keyInsights
3. Validate character count < 5,000
4. Truncate gracefully if needed (cut from bottom of Key Insights)
5. Create doc with slug: `youtube-show-notes`
6. Test with sample transcript

### Phase 2: Image Generation API Integration (1-2 hours)
1. Research OpenRouter image API implementation
2. Create `callOpenRouterImageAPI(prompt)` function
   - Set modalities parameter
   - Handle base64 response
   - Error handling for API failures
3. Create `generateImagePrompt(transcript, metadata)` function
   - Extract main topics (reuse keywords/insights)
   - Build dynamic prompt with Stewart Squared branding
4. Create `saveImageToDrive(base64Data, folder, filename)` function
   - Decode base64
   - Create blob
   - Save as PNG
5. Test image generation with sample episode

### Phase 3: Conditional Logic for Stewart Squared (30 min)
1. Update `processNewTranscripts()` main function
2. Add conditional check:
   ```javascript
   if (metadata.showType === 'stewart-squared') {
     const artwork = generateEpisodeArtwork(transcript, metadata);
     saveImageToDrive(artwork, guestFolder, 'episode-artwork.png');
   }
   ```
3. Test with both podcast types

### Phase 4: Integration & Testing (1 hour)
1. Update `createShowNotesDocs()` to include YouTube format
2. Test complete flow:
   - Crazy Wisdom episode (no image)
   - Stewart Squared episode (with image)
3. Verify all outputs:
   - Individual docs (8 types)
   - MASTER doc (full version)
   - YouTube show notes doc (under 5k chars)
   - Episode artwork PNG (Stewart Squared only)
4. Check file naming and folder structure
5. Monitor API costs and execution time

### Phase 5: Documentation & Deployment (30 min)
1. Update inline code comments
2. Add CONFIG option for image generation on/off
3. Document new Google Drive folder structure
4. Push to Google Apps Script via clasp
5. Update trigger if needed
6. Create test run checklist

---

## Technical Specifications

### New Functions to Add

#### 1. `generateYouTubeShowNotes(showNotes, metadata)`
```javascript
/**
 * Generates YouTube-formatted show notes under 5,000 characters
 * Includes: intro + timestamps + key insights
 * @param {Object} showNotes - Object containing all generated show notes
 * @param {Object} metadata - Episode metadata (guestName, showType)
 * @returns {string} Formatted show notes text under 5,000 chars
 */
```

#### 2. `generateImagePrompt(transcript, metadata)`
```javascript
/**
 * Generates a dynamic image generation prompt based on episode content
 * Uses keywords and main topics for Stewart Squared branding
 * @param {string} transcript - Full episode transcript
 * @param {Object} metadata - Episode metadata
 * @returns {string} Image generation prompt
 */
```

#### 3. `callOpenRouterImageAPI(prompt)`
```javascript
/**
 * Calls OpenRouter API for image generation using Flux.2 Pro
 * Returns base64-encoded PNG data
 * @param {string} prompt - Image generation prompt
 * @returns {string} Base64-encoded image data
 */
```

#### 4. `saveImageToDrive(base64Data, folder, filename)`
```javascript
/**
 * Decodes base64 image data and saves to Google Drive
 * @param {string} base64Data - Base64-encoded image
 * @param {Folder} folder - Google Drive folder object
 * @param {string} filename - Name for the image file
 * @returns {File} Created Google Drive file
 */
```

#### 5. `generateEpisodeArtwork(transcript, metadata)`
```javascript
/**
 * Main function to generate episode artwork
 * Orchestrates prompt generation, API call, and saving
 * @param {string} transcript - Full episode transcript
 * @param {Object} metadata - Episode metadata
 * @returns {string} Base64 image data
 */
```

### Updated CONFIG Object
```javascript
const CONFIG = {
  OPENROUTER_API_KEY: 'sk-or-v1-...',
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
  MODEL: 'anthropic/claude-sonnet-4',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',  // NEW
  GENERATE_IMAGES: true,  // NEW - toggle image generation
  IMAGE_SIZE: 2048,  // NEW - width/height for square images
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

### Updated Document Output Structure

**Per Episode Folder:**
```
[Guest Name] - [Date]/
├── titles (10 Episode Titles)
├── timestamps (Timestamps)
├── key-insights (Key Insights)
├── intro (Intro Paragraph)
├── hashtags (Hashtags)
├── keywords (Keywords)
├── clip-suggestions (Clip Suggestions)
├── social-posts (Social Media Posts)
├── youtube-show-notes (NEW - YouTube format, <5k chars)
├── MASTER - [Guest Name] (Full show notes for Transistor)
└── episode-artwork.png (NEW - Stewart Squared only, 2048×2048)
```

---

## API Cost Estimates

### Current Costs (Per Episode)
- 8 text generation calls using Claude Sonnet 4
- Token usage varies by transcript length
- Estimated: ~$0.50-2.00 per episode

### New Costs (Per Stewart Squared Episode)
- 1 additional image generation call (Flux.2 Pro)
- Image generation cost: ~$0.05-0.15 per image
- Total estimated increase: ~5-10% more per Stewart Squared episode

### Frequency
- Runs every 5 minutes (288 times/day)
- Most runs do nothing (no new files)
- API calls only when new transcript uploaded
- Typical usage: 2-4 episodes per week
- Monthly estimated cost: $10-40 (mostly text generation)

---

## Open Questions

### Before Implementation
1. ✅ YouTube character limit? → **5,000 characters**
2. ✅ Transistor image requirements? → **1400×1400 min, 3000×3000 ideal, 512KB max**
3. ✅ OpenRouter image generation support? → **Yes, Flux.2 Pro up to 2048×2048**
4. ✅ YouTube show notes: separate doc or replace? → **Create separate "YouTube Show Notes" document**
5. ❓ Social media posts clarification? → **User will ask Maria**
6. ❓ Periods formatting clarification? → **Deferred**

### For User Decision
- Should YouTube show notes include hashtags/keywords at the end if space allows?
- Any specific branding text to include in Stewart Squared image prompts?
- Should image generation have a fallback/retry logic if API fails?

---

## Risk Assessment

### Low Risk
- YouTube show notes generation (simple concatenation)
- Conditional logic for Stewart Squared (straightforward)

### Medium Risk
- Image generation API integration (new API, different response format)
- Base64 decoding and Drive upload (file handling complexity)
- Image file size management (<512KB requirement)

### Mitigation Strategies
1. Extensive testing with sample transcripts before deployment
2. Error handling and logging for all new functions
3. Fallback behavior if image generation fails (don't block transcript processing)
4. Manual verification of first few generated images
5. Monitor Google Apps Script execution logs for errors

---

## Success Criteria

### YouTube Show Notes
- ✅ All show notes under 5,000 characters
- ✅ Proper formatting with sections labeled
- ✅ No truncation of critical information (intro intact)
- ✅ Matches example format provided by user

### Episode Artwork
- ✅ Images generate successfully for Stewart Squared episodes only
- ✅ Images are 2048×2048 pixels, PNG format
- ✅ File size under 512KB
- ✅ Visual style matches existing Stewart Squared branding
- ✅ Content reflects episode topics
- ✅ Saved to correct folder with consistent naming

### General
- ✅ No errors in execution logs
- ✅ Existing functionality remains unchanged
- ✅ API costs within expected range
- ✅ Processing time remains under Google Apps Script limits (<6 min per execution)

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 0 | Planning & Documentation | 1 hour | ✅ Complete |
| 1 | YouTube Show Notes | 30 min | ⏳ Pending |
| 2 | Image API Integration | 2 hours | ⏳ Pending |
| 3 | Conditional Logic | 30 min | ⏳ Pending |
| 4 | Testing | 1 hour | ⏳ Pending |
| 5 | Deployment | 30 min | ⏳ Pending |
| **Total** | | **4.5 hours** | |

**Note:** Does not include time for Maria clarification on social media posts requirement.

---

## Next Steps

1. ✅ Document full plan (this file)
2. ⏳ Get user approval on:
   - YouTube show notes document structure (1 doc or 2?)
   - Any specific image prompt requirements
3. ⏳ User to consult Maria on social media posts clarification
4. ⏳ Begin Phase 1 implementation after approval
5. ⏳ Iterative testing and refinement
6. ⏳ Final deployment and monitoring

---

## Notes

- Script currently connected via clasp to Google Apps Script ID: `1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2`
- All changes will be made to `gas_project/Code.gs`
- No changes needed to `appsscript.json` (permissions already include Drive, Docs, External Requests)
- Execution frequency (5 min) is acceptable to user
- API costs are acceptable as long as reasonable
- Project follows "Grug Brain" principles: simple, maintainable, debuggable code

---

**Document Version:** 1.0
**Last Updated:** December 15, 2025
**Author:** Claude Code (with Stewart Alsop)
