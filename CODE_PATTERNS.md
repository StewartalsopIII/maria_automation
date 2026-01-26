# Maria Automation - Code Patterns & Examples

Reference guide showing common patterns used throughout the codebase for consistent development.

---

## Pattern 1: API Error Handling

**Location:** Throughout (all OpenRouter calls)

```javascript
// Basic pattern with fallback
try {
  const response = callOpenRouter(prompt, maxTokens);
  return response;
} catch (error) {
  Logger.log('Error in function: ' + error.message);
  return 'Fallback default value';
}
```

**With JSON parsing:**
```javascript
try {
  const response = callOpenRouter(prompt, 2000);
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Validate structure
  if (!Array.isArray(parsed.links) || !Array.isArray(parsed.books)) {
    throw new Error('Invalid structure');
  }

  return cleaned;
} catch (error) {
  Logger.log('Links extraction failed: ' + error.message);
  return JSON.stringify({links: [], books: []});
}
```

**Key Points:**
- Strip markdown code blocks (`\`\`\`json` → '')
- Always validate parsed structure before use
- Return appropriate fallback (empty array, null, default)
- Log error with descriptive context

---

## Pattern 2: Conditional Feature Execution

**Location:** Image generation (lines 782-808)

```javascript
function generateEpisodeArtwork(transcript, metadata, showNotes, folder) {
  // Feature flag check
  if (!CONFIG.GENERATE_IMAGES) {
    Logger.log('Image generation disabled in CONFIG');
    return null;
  }

  // Show-type conditional
  if (metadata.showType !== 'stewart-squared') {
    Logger.log('Skipping image generation (not Stewart Squared episode)');
    return null;
  }

  // Non-blocking error handling
  try {
    Logger.log('Generating episode artwork for Stewart Squared...');
    const imagePrompt = generateImagePrompt(transcript, metadata, showNotes);
    const base64DataUrl = callOpenRouterImageAPI(imagePrompt);
    const imageFile = saveImageToDrive(base64DataUrl, folder, 'episode-artwork.png');
    Logger.log('Episode artwork generated successfully');
    return imageFile;
  } catch (error) {
    Logger.log('Error generating artwork: ' + error.message);
    return null; // Don't throw - just log and continue
  }
}
```

**Key Points:**
- Feature flag check first
- Show-type conditional for selective features
- Non-blocking error handling (return null, don't throw)
- Detailed logging at each decision point
- Allows main process to continue if feature fails

---

## Pattern 3: Character-Level Formatting with Offset Management

**Location:** Master doc timestamps (lines 472-485)

```javascript
// Bold timestamp values at line starts
const tsString = tsText.getText();
const tsPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)/gm;  // Matches 00:00 or 00:00:00
let match;

while ((match = tsPattern.exec(tsString)) !== null) {
  tsText.setBold(match.index, match.index + match[1].length - 1, true);
}
```

**More complex: Markdown bold replacement (lines 498-518):**
```javascript
// Convert **bold** to actual bold formatting
const kiPara = body.appendParagraph(showNotes.keyInsights);
const kiText = kiPara.editAsText();

// Find all **text** patterns and store positions
const kiString = kiText.getText();
const boldPattern = /\*\*(.+?)\*\*/g;
const replacements = [];

while ((match = boldPattern.exec(kiString)) !== null) {
  replacements.push({
    start: match.index,
    end: match.index + match[0].length - 1
  });
}

// CRITICAL: Process in reverse order to maintain offsets
for (let i = replacements.length - 1; i >= 0; i--) {
  const r = replacements[i];

  // Apply bold to content (skip the ** markers)
  kiText.setBold(r.start + 2, r.end - 2, true);

  // Remove ** markers
  kiText.deleteText(r.end - 1, r.end);       // Remove trailing **
  kiText.deleteText(r.start, r.start + 1);   // Remove leading **
}
```

**Key Points:**
- Collect all matches first (avoid invalidating indices)
- Process in **REVERSE order** (prevents index shifts)
- Offset calculations: `start + 2` to skip opening `**`, `end - 2` to skip closing `**`
- Delete in specific order (end first, then start)
- Use `editAsText()` for character-level operations

---

## Pattern 4: Configuration with Feature Flags

**Location:** CONFIG object (lines 6-18)

```javascript
const CONFIG = {
  // Secure - retrieved from PropertiesService
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),

  // Google Drive references (hardcoded, acceptable)
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',

  // Model selection
  MODEL: 'anthropic/claude-sonnet-4',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',

  // Feature flags (can be toggled on/off)
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,

  // Metadata for external APIs
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};
```

**Usage Pattern:**
```javascript
// Check feature flag
if (!CONFIG.GENERATE_IMAGES) {
  return null;
}

// Use configuration
const metadata = {
  showType: 'crazy-wisdom' // or 'stewart-squared'
};

// Determine show name dynamically
const showName = metadata.showType === 'stewart-squared' ? 'Stewart Squared' : 'Crazy Wisdom';

// Use in API calls
const headers = {
  'HTTP-Referer': CONFIG.SITE_URL,
  'X-Title': CONFIG.SITE_NAME
};
```

**Key Points:**
- Centralized configuration at top
- API keys NOT hardcoded (use PropertiesService)
- Feature flags enable/disable functionality
- Show-type conditionals for dynamic behavior
- Easy to modify without touching logic

---

## Pattern 5: Prompt Engineering with Specific Instructions

**Location:** Various generation functions

```javascript
// Example 1: Simple instruction with format specification
function generateKeywords(transcript, metadata) {
  const prompt = `Give me the keywords from the episode in a list in sentence form
with commas in between each keyword.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 500);
}

// Example 2: Complex prompt with examples and constraints
function generateClipSuggestions(transcript, metadata) {
  const prompt = `Analyze this podcast transcript and find 5-7 engaging clips
for social media. Each clip should include:

1. A strong hook (something that makes people stop scrolling) that appeals to the target audience
2. A suggested title or caption idea for the clip
3. A timestamp and text excerpt (at least 80 words) from the transcript
4. A note about why this moment works (e.g., curiosity, emotion, surprising insight)

Keep clips between 15–90 seconds long for Instagram Reels/TikTok. Highlight only
the most shareable, insightful, impactful, resonating or belief-changing moments.

Target audience:
- Demographics: 25–45 years old, global with strong North America and Europe presence
- Psychographics: Curious, open-minded, skeptical of surface-level trends. Interested
  in technology, consciousness, business, and human potential.
- Behaviors: Engage with podcasts, YouTube interviews, thought-leadership.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 4000);
}

// Example 3: Specialized prompt for CTAs with examples
function generateCTAs(transcript, metadata, clips) {
  const showName = metadata.showType === 'stewart-squared' ? 'Stewart Squared' : 'Crazy Wisdom';

  const prompt = `For each clip suggestion below, write a compelling Call-to-Action
(CTA) that creates intrigue and makes viewers want to hear more of the full episode.

Guidelines:
- Each CTA should generate curiosity about what comes next in the conversation
- Reference specific topics the guest discusses later in the episode
- Include a question or mention to the audience about wanting to know more
- End with: "Subscribe to ${showName} on Spotify and YouTube"
- Keep each CTA to 2-3 sentences max

Example CTAs:
- "Want to find out where Garrett believes America sits in the ancient cycle of power
  and what might be coming next? Subscribe to ${showName} on Spotify and YouTube
  and hear the full episode."
- "Catch the rest on ${showName}, as we break down the early signs of who's set to
  dominate the next decade of AI. Make sure to subscribe on Spotify and YouTube."

Format your response as:

CTA 1 (for Clip 1):
[Call to action for first clip]

CTA 2 (for Clip 2):
[Call to action for second clip]

[Continue for all clips...]

Guest: ${metadata.guestName}
Show: ${showName}

Clip Suggestions:
${clips}

Full Transcript (for context on what comes later):
${transcript.substring(0, 15000)}`;

  return callOpenRouter(prompt, 3000);
}
```

**Key Points:**
- Specific formatting instructions (number of items, max length, format)
- Character/word limits (e.g., "under 120 words each")
- Explicit rules and constraints
- Examples of expected output
- Dynamic content (show name, guest name)
- Transcript truncation for long prompts (first 2000 or 15000 chars)

---

## Pattern 6: Metadata Extraction with Fallbacks

**Location:** extractMetadata (lines 77-109)

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

  const response = callOpenRouter(prompt, 200);

  try {
    // Strip markdown code blocks
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Return with defaults if fields missing
    return {
      guestName: parsed.guestName || 'Unknown Guest',
      showType: parsed.showType || 'crazy-wisdom'
    };
  } catch (e) {
    Logger.log('Failed to parse metadata: ' + e.message);
    // Fallback to defaults
    return {
      guestName: 'Unknown Guest',
      showType: 'crazy-wisdom'
    };
  }
}
```

**Key Points:**
- Explicit instruction about host name (prevents including host as guest)
- Clear rules for podcast type classification
- Expected JSON format specified in prompt
- Only first 2000 chars used (saves tokens)
- Try-catch with meaningful fallbacks
- Default to most common value if parsing fails

---

## Pattern 7: Folder and Document Organization

**Location:** Folder creation (lines 115-131)

```javascript
function createOutputFolders(showType, guestName) {
  const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);

  // Get or create show-type folder
  let showFolder;
  const showFolders = outputFolder.getFoldersByName(showType);
  if (showFolders.hasNext()) {
    showFolder = showFolders.next();
  } else {
    showFolder = outputFolder.createFolder(showType);
  }

  // Create dated guest folder
  const dateStr = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const guestFolderName = guestName + ' - ' + dateStr;
  const guestFolder = showFolder.createFolder(guestFolderName);

  return guestFolder;
}
```

**Document creation pattern (lines 434-448):**
```javascript
function createDoc(folder, slug, title, content) {
  // Create document with lowercase slug name
  const doc = DocumentApp.create(slug);
  const body = doc.getBody();

  // Add title as heading
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Append content (plain text)
  body.appendParagraph(content);

  // Save and move to folder
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

**Key Points:**
- Check for existing folders before creating (avoid duplicates)
- Use consistent date format (YYYY-MM-DD UTC)
- Folder naming: `[ShowType]/[GuestName] - [Date]/`
- Document slug names are lowercase
- Document titles are human-readable
- Save-and-close before moving (required by Google Docs API)

---

## Pattern 8: JSON Response Handling

**Location:** Links generation (lines 288-326)

```javascript
function generateLinks(transcript, metadata) {
  const prompt = `Extract URLs and books mentioned in this podcast transcript.

Return ONLY valid JSON with this structure:
{
  "links": [
    {"title": "Descriptive Title", "url": "https://example.com"}
  ],
  "books": [
    {"title": "Book Title", "author": "Author Name"}
  ]
}

Rules:
- Include only explicitly mentioned resources
- For partial URLs like "example dot com", format as: example.com
- For books without authors, use "Unknown Author"
- Empty arrays if category not present
- Add https:// if protocol missing

Transcript:
${transcript}`;

  try {
    const response = callOpenRouter(prompt, 2000);
    // Remove markdown code blocks
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure before returning
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

**Key Points:**
- Specify exact JSON structure in prompt
- Document URL and author handling rules
- Strip markdown code blocks from response
- Validate array structure before use
- Return JSON string (not parsed object)
- Fallback to empty arrays on error

---

## Pattern 9: Dynamic Prompt Content

**Location:** Various (images, CTAs)

```javascript
// Image prompt with dynamic content from keywords
function generateImagePrompt(transcript, metadata, showNotes) {
  const topics = showNotes.keywords.substring(0, 200); // First 200 chars

  const prompt = `Stewart Squared podcast episode artwork. Modern, vibrant tech-themed
abstract illustration featuring themes of ${topics}. Colorful, bold, AI/technology
aesthetic with futuristic elements. Professional podcast thumbnail design with dynamic
composition. Eye-catching, high-contrast colors. No text or words in the image.`;

  return prompt;
}

// CTA with dynamic show name
function generateCTAs(transcript, metadata, clips) {
  const showName = metadata.showType === 'stewart-squared'
    ? 'Stewart Squared'
    : 'Crazy Wisdom';

  const prompt = `...
End with: "Subscribe to ${showName} on Spotify and YouTube"
...`;

  return callOpenRouter(prompt, 3000);
}
```

**Key Points:**
- Extract dynamic content from generated data (keywords, metadata)
- Limit extracted content (first 200 chars) to keep prompt size reasonable
- Use conditional logic for show-type specific content
- String interpolation with `${variable}` syntax

---

## Pattern 10: Processing State Management

**Location:** processNewTranscripts (lines 35-71)

```javascript
function processNewTranscripts() {
  const inputFolder = DriveApp.getFolderById(CONFIG.INPUT_FOLDER_ID);
  const files = inputFolder.getFilesByType('text/plain');

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    // Skip already processed files
    if (fileName.startsWith('[PROCESSED] ')) {
      continue;
    }

    try {
      Logger.log('Processing: ' + fileName);

      // Processing steps...
      const transcript = file.getBlob().getDataAsString();
      const metadata = extractMetadata(transcript);
      const showNotes = generateAllShowNotes(transcript, metadata);
      // ... etc

      // Mark as successful
      file.setName('[PROCESSED] ' + fileName);
      Logger.log('Successfully processed: ' + fileName);

    } catch (error) {
      // Mark as failed
      Logger.log('Error processing ' + fileName + ': ' + error.message);
      file.setName('[FAILED] ' + fileName);
    }
  }
}
```

**Key Points:**
- Prefix-based state tracking (`[PROCESSED]`, `[FAILED]`)
- Check prefix to avoid re-processing
- Skip already processed files in loop
- Try-catch wraps entire process
- State marker set before/after processing
- Informative logging at decision points

---

## Pattern 11: Base64 Image Handling

**Location:** saveImageToDrive (lines 753-780)

```javascript
function saveImageToDrive(base64DataUrl, folder, filename) {
  if (!base64DataUrl) {
    throw new Error('base64DataUrl is null or undefined');
  }

  Logger.log('base64DataUrl format: ' + base64DataUrl.substring(0, 50) + '...');

  // Validate format (must have comma separator)
  if (!base64DataUrl.includes(',')) {
    throw new Error('Invalid base64DataUrl format - no comma found. Value: '
      + base64DataUrl.substring(0, 100));
  }

  // Extract base64 data portion (after comma)
  const base64Data = base64DataUrl.split(',')[1];

  if (!base64Data) {
    throw new Error('base64Data is empty after split');
  }

  // Decode and create blob
  const decodedData = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedData, 'image/png', filename);

  // Save to Drive
  const file = folder.createFile(blob);
  Logger.log('Image saved: ' + filename + ' (' + Math.round(blob.getBytes().length / 1024) + ' KB)');

  return file;
}
```

**Key Points:**
- Validate input (not null/undefined)
- Check for comma separator (data URL format: `data:image/png;base64,DATA`)
- Split on comma, extract second part
- Validate extracted data is not empty
- Use `Utilities.base64Decode()` for decoding
- Create blob with proper MIME type
- Log file size in KB for monitoring

---

## Pattern 12: Section Headers in Comments

**Used throughout for code organization:**

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

**Function documentation pattern:**
```javascript
/**
 * Extract links and books from transcript
 * @param {string} transcript - The podcast transcript
 * @param {object} metadata - Guest name and show type
 * @returns {string} JSON string with links and books
 */
function generateLinks(transcript, metadata) { ... }
```

**Key Points:**
- Comment boxes clearly delineate sections
- JSDoc style for functions (@param, @returns)
- Consistent formatting throughout

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Not Processing Offsets in Reverse
```javascript
// WRONG - will break indices
for (let i = 0; i < replacements.length; i++) {
  deleteText(...);  // Deletes text, shifts all later indices
}

// RIGHT - maintain indices
for (let i = replacements.length - 1; i >= 0; i--) {
  deleteText(...);  // Delete end to start, indices remain valid
}
```

### ❌ Mistake 2: Hardcoding API Keys
```javascript
// WRONG - exposed in GitHub history
const CONFIG = {
  OPENROUTER_API_KEY: 'sk-or-v1-...'
};

// RIGHT - secure storage
const CONFIG = {
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY')
};
```

### ❌ Mistake 3: Not Validating JSON
```javascript
// WRONG - crashes if invalid JSON
const parsed = JSON.parse(response);

// RIGHT - validate and fallback
try {
  const parsed = JSON.parse(response);
  if (!Array.isArray(parsed.links)) throw new Error('Invalid');
  return parsed;
} catch (error) {
  return { links: [], books: [] };
}
```

### ❌ Mistake 4: Throwing from Optional Features
```javascript
// WRONG - stops entire process
try {
  generateEpisodeArtwork(...);  // throws
} catch (error) {
  throw error;  // Stops processing
}

// RIGHT - non-blocking
try {
  generateEpisodeArtwork(...);
} catch (error) {
  Logger.log('Error: ' + error.message);
  return null;  // Continue without feature
}
```

### ❌ Mistake 5: Not Stripping Markdown
```javascript
// WRONG - `\`\`\`json` doesn't parse
const parsed = JSON.parse(response);

// RIGHT - strip first
const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
const parsed = JSON.parse(cleaned);
```

---

**This document provides reusable patterns for extending and maintaining the Maria Automation system.**
