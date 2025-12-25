# Update YouTube Show Notes Format

## Problem Statement

Current YouTube show notes generation has two issues:
1. **AI-generated timestamps** - Maria uses Riverside's auto-generated chapters instead, so these are wasted tokens and space
2. **Key insights are truncated** - Instead of truncating at 5000 chars, insights should be generated shorter from the start

## Proposed Solution

Update `generateYouTubeShowNotes()` function to:
1. **Remove AI timestamps** - Don't include AI-generated timestamps in YouTube notes
2. **Add timestamp placeholder** - Include clear placeholder text where Maria can paste Riverside's ~14 chapter timestamps
3. **Generate shorter insights** - Modify `generateKeyInsights()` or create YouTube-specific variant that produces 7 concise insights (200-250 chars each, 1-2 sentences)

## Current vs New Format

**Current format:**
```
[Intro] (~200 chars)

Timestamps
[AI-generated timestamps] (~400 chars)

Key Insights
[7 detailed insights] (~2000+ chars, then truncated)
Total: Often exceeds 5000, gets truncated
```

**New format:**
```
[Intro] (~200 chars)

Timestamps
[Placeholder text for Maria to paste Riverside chapters] (~770 chars reserved)

Key Insights
[7 shorter, punchier insights] (~1400-1750 chars)
Total: ~2,800 chars (well under 5000!)
```

## Technical Approach

**File:** `gas_project/Code.gs`

**Option 1: Modify existing function (simpler)**
- Update `generateYouTubeShowNotes()` at line ~322
- Remove timestamps concatenation
- Add placeholder text
- Update `generateKeyInsights()` prompt to include "YouTube-friendly" instruction (shorter)

**Option 2: Create YouTube-specific insights (cleaner separation)**
- Create new `generateKeyInsightsYouTube(transcript, metadata)` function
- Separate prompt optimized for brevity (200-250 chars per insight)
- Update `generateYouTubeShowNotes()` to call this instead

**Recommendation: Option 2** - Cleaner separation, easier to maintain different formats

## Implementation

### Step 1: Create YouTube-specific insights function

```javascript
function generateKeyInsightsYouTube(transcript, metadata) {
  const prompt = `Give me 7 key insights from this episode in a numbered list.

IMPORTANT: Make each insight SHORT and punchy for YouTube description (200-250 characters max each).
- Keep it to 1-2 sentences per insight
- Focus on the core takeaway only
- No unnecessary detail

Guest: ${metadata.guestName}

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 2000);
}
```

### Step 2: Update YouTube show notes function

```javascript
function generateYouTubeShowNotes(showNotes, metadata) {
  // Start with intro
  let youtubeNotes = showNotes.intro + '\n\n';

  // Add placeholder for Riverside timestamps
  youtubeNotes += 'Timestamps\n';
  youtubeNotes += '[MARIA: Paste Riverside chapter timestamps here]\n\n';

  // Add shorter key insights
  youtubeNotes += 'Key Insights\n' + showNotes.keyInsightsYouTube;

  // Check if under 5000 characters (should be ~2800)
  if (youtubeNotes.length > 5000) {
    Logger.log('Warning: YouTube notes exceed 5000 chars (' + youtubeNotes.length + '). This should not happen.');
    youtubeNotes = youtubeNotes.substring(0, 4950) + '...\n\n[Truncated]';
  }

  Logger.log('YouTube show notes length: ' + youtubeNotes.length + ' chars');
  return youtubeNotes;
}
```

### Step 3: Update generateAllShowNotes()

```javascript
function generateAllShowNotes(transcript, metadata) {
  const showNotes = {};

  showNotes.titles = generateTitles(transcript, metadata);
  showNotes.timestamps = generateTimestamps(transcript, metadata);
  showNotes.keyInsights = generateKeyInsights(transcript, metadata);
  showNotes.keyInsightsYouTube = generateKeyInsightsYouTube(transcript, metadata); // NEW
  showNotes.intro = generateIntro(transcript, metadata);
  showNotes.hashtags = generateHashtags(transcript, metadata);
  showNotes.keywords = generateKeywords(transcript, metadata);
  showNotes.clips = generateClipSuggestions(transcript, metadata);
  showNotes.socialPosts = generateSocialPosts(transcript, metadata, showNotes.hashtags, showNotes.clips);
  showNotes.links = generateLinks(transcript, metadata);

  return showNotes;
}
```

## Acceptance Criteria

- [ ] YouTube show notes no longer include AI-generated timestamps
- [ ] Clear placeholder text indicates where Maria should paste Riverside timestamps
- [ ] Key insights are 7 items, each 200-250 characters (1-2 sentences)
- [ ] Total character count is consistently under 3000 (well under 5000 limit)
- [ ] Master document still uses detailed key insights (unchanged)
- [ ] No truncation needed (insights are right-sized from generation)

## Character Budget Breakdown

| Section | Characters |
|---------|-----------|
| Intro | ~200 |
| "Timestamps" header + placeholder | ~100 |
| Reserved space for Riverside timestamps | ~770 |
| "Key Insights" header | ~15 |
| 7 insights @ 250 chars max | ~1750 |
| Spacing/formatting | ~50 |
| **Total** | **~2,885** |
| **Buffer remaining** | **~2,115** |

## Context

**Related work:**
- `gas_project/Code.gs:322-340` - Current generateYouTubeShowNotes()
- `gas_project/Code.gs:172-180` - Current generateKeyInsights()
- `gas_project/Code.gs:137-150` - generateAllShowNotes() integration point

**Why this matters:**
- Maria manually replaces AI timestamps anyway (wasted effort)
- Riverside provides better, real timestamps from actual video
- Shorter insights are more YouTube-friendly (users skim descriptions)
- Consistent character count means no unexpected truncation

## Success Metrics

- Character count: Consistently 2500-3000 (never >5000)
- Insights length: Each 200-250 chars (measurable via Logger)
- Maria's feedback: Easier workflow, no manual timestamp replacement needed
- Token savings: ~500 tokens per episode (no timestamp generation)

## References

**Screenshots provided:**
- Current YouTube notes with detailed insights
- Riverside timestamp example (~14 chapters)
- Generated docs showing youtube-show-notes file

**Estimated effort:** 30-45 minutes
- Add new function: 15 min
- Update existing function: 10 min
- Integration: 5 min
- Testing: 10 min