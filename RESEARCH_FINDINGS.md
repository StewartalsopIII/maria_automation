# Maria Automation - Formatting Research Report
**Date:** December 24, 2025
**Focus:** Document Formatting Patterns & Google Docs API Usage

---

## Executive Summary

The Maria Automation AppScript project currently uses basic Google Docs API formatting patterns with minimal styling. The current implementation uses only:
- Heading levels (TITLE, HEADING1)
- Plain text paragraphs
- Horizontal rules

**No character-level formatting** (bold, italic, font sizing) is currently implemented. The feature request to support:
- Markdown bold conversion (**text** → bold text)
- Smaller font sizes for timestamps and key insights
- Separate "copy & paste" sections with proper formatting

requires extending the current architecture with text-level formatting utilities.

---

## 1. Current Document Formatting Patterns

### Document Creation Architecture

**File:** `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/gas_project/Code.gs`

#### Generic Document Creator (`createDoc()` function, lines 312-326)
```javascript
function createDoc(folder, slug, title, content) {
  const doc = DocumentApp.create(slug);
  const body = doc.getBody();

  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph(content);  // Plain text only - NO FORMATTING

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

**Current behavior:**
- Creates individual documents for: titles, timestamps, key-insights, intro, hashtags, keywords, clip-suggestions, social-posts
- All content appended as plain paragraphs with no character-level formatting
- No markdown processing or font size adjustments

#### Master Document Creator (`createMasterDoc()` function, lines 328-376)
```javascript
function createMasterDoc(folder, showNotes, metadata) {
  const doc = DocumentApp.create('MASTER - ' + metadata.guestName);
  const body = doc.getBody();

  // Title
  body.appendParagraph(metadata.guestName + ' - Show Notes')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  // Metadata lines
  body.appendParagraph('Show: ' + metadata.showType);
  body.appendParagraph('Generated: ' + new Date().toISOString());
  body.appendHorizontalRule();

  // 8 sections - all with same pattern:
  body.appendParagraph('INTRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.intro);  // Plain text

  body.appendParagraph('TIMESTAMPS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.timestamps);  // Plain text

  // ... repeats for KEY INSIGHTS, KEYWORDS, HASHTAGS, etc.
}
```

**Master document structure:**
```
[TITLE] Guest Name - Show Notes
Show: crazy-wisdom | stewart-squared
Generated: 2025-12-24T...

[HEADING1] INTRO
[Plain text content]

[HEADING1] TIMESTAMPS
[Plain text content - includes timestamp entries]

[HEADING1] KEY INSIGHTS
[Plain text content - numbered list, plain text]

[HEADING1] KEYWORDS
[Plain text content]

[HEADING1] HASHTAGS
[Plain text content]

[HEADING1] CLIP SUGGESTIONS
[Plain text content]

[HEADING1] SOCIAL MEDIA POSTS
[Plain text content]
```

### Current Limitations

1. **No Text-Level Formatting:**
   - Cannot apply bold, italic, underline, strikethrough
   - Cannot set custom font sizes
   - Cannot apply colors
   - Markdown syntax in AI-generated content is ignored

2. **No Semantic Structure:**
   - All content is appended as plain paragraphs
   - No distinction between different content types
   - Difficult to apply different formatting rules to different sections

3. **Copy-Paste Issues:**
   - No special formatting for "copy & paste" sections
   - Timestamps may not be easily selectable
   - Key insights run as continuous text without clear visual separation

---

## 2. Google Docs API Usage Patterns

### Current Scope Permissions

**File:** `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/gas_project/appsscript.json`

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

**Status:** All required permissions are already in place. No permission changes needed.

### Available Google Docs API Methods in Use

```javascript
// Document-level operations
DocumentApp.create(name)              // Creates new document
doc.getBody()                         // Gets body element
doc.saveAndClose()                    // Saves and closes

// Paragraph operations (CURRENTLY USED)
body.appendParagraph(text)            // Adds paragraph
paragraph.setHeading(type)            // Sets heading level
body.appendHorizontalRule()           // Adds horizontal line

// File operations
DriveApp.getFileById(docId)           // Gets file object
file.moveTo(folder)                   // Moves to folder
```

### Available Google Docs API Methods NOT YET USED

```javascript
// Text-level formatting (CHARACTER LEVEL)
paragraph.editAsText()                // Returns Text object for formatting
text.setBold(start, end, value)       // Apply/remove bold
text.setItalic(start, end, value)     // Apply/remove italic
text.setUnderline(start, end, value)  // Apply/remove underline
text.setFontSize(start, end, size)    // Set font size in points
text.setForegroundColor(start, end, color) // Set text color

// Paragraph formatting
paragraph.setSpacingAfter(spacing)    // Add space after paragraph
paragraph.setSpacingBefore(spacing)   // Add space before paragraph
paragraph.setLineSpacing(factor)      // Set line spacing (1.0-3.0)
paragraph.setAlignment(align)         // Set text alignment

// Table operations
body.appendTable([[...]])             // Create tables
body.appendListItem(text)             // Create list items

// Special elements
body.appendImage(blob)                // Add images
```

---

## 3. Existing Formatting Utilities & Helpers

**Current Status:** NONE

The codebase has **no existing formatting utilities**. All formatting is done inline in the `createDoc()` and `createMasterDoc()` functions.

### Why This Matters

The Enhancement Plan (Enhancement_Plan_Dec2025.md) mentions formatting issues but doesn't include formatting utilities. This is a gap in the architecture that prevents:
- Reusable markdown-to-formatting conversion
- Consistent text styling across documents
- Easy modifications to formatting rules

---

## 4. How the Master Document is Structured & Created

### Creation Flow

1. **Trigger:** `processNewTranscripts()` (line 35)
   - Scans input folder for `.txt` files
   - Checks for `[PROCESSED]` or `[FAILED]` prefixes
   - Extracts metadata (guest name, show type)

2. **Show Notes Generation:** `generateAllShowNotes()` (line 137)
   ```javascript
   showNotes.titles = generateTitles(transcript, metadata);
   showNotes.timestamps = generateTimestamps(transcript, metadata);
   showNotes.keyInsights = generateKeyInsights(transcript, metadata);
   showNotes.intro = generateIntro(transcript, metadata);
   showNotes.hashtags = generateHashtags(transcript, metadata);
   showNotes.keywords = generateKeywords(transcript, metadata);
   showNotes.clips = generateClipSuggestions(transcript, metadata);
   showNotes.socialPosts = generateSocialPosts(transcript, metadata, ...);
   ```
   Returns object with 8 string properties

3. **Document Creation:** `createShowNotesDocs()` (line 297)
   - Creates 8 individual documents via `createDoc()`
   - Creates 1 master document via `createMasterDoc()`
   - Creates 1 YouTube-formatted document

4. **Master Doc Assembly:** `createMasterDoc()` (lines 328-376)
   - Creates single document named `"MASTER - [GuestName]"`
   - Appends title, metadata, and 8 sections sequentially
   - Each section gets a HEADING1 + plain text content

### Data Flow for Each Section

```
AI API (OpenRouter)
    ↓
Raw string content (e.g., timestamps with numbered format)
    ↓
Appended to paragraph in Google Doc
    ↓
Rendered as plain text (markdown syntax ignored)
```

### Example: Timestamps Section

**AI generates:**
```
00:00 Intro and welcome discussion
05:00 **Main topic** exploration
10:00 Deep dive into frameworks
```

**Current output in Doc:**
```
[HEADING1] TIMESTAMPS
00:00 Intro and welcome discussion
05:00 **Main topic** exploration
10:00 Deep dive into frameworks
```

**Problem:** The `**Main topic**` markdown is rendered literally, not converted to bold.

---

## 5. Best Practices for Google Apps Script Document Formatting

### Pattern 1: Character-Level Formatting

```javascript
// Correct pattern for formatting specific text
function formatTextInParagraph(paragraph, searchText, isBold) {
  const text = paragraph.editAsText();
  const content = text.getText();
  const index = content.indexOf(searchText);

  if (index >= 0) {
    text.setBold(index, index + searchText.length - 1, isBold);
  }
}

// Usage:
const para = body.appendParagraph("This is **bold** text");
formatTextInParagraph(para, "bold", true);
```

### Pattern 2: Markdown Conversion

```javascript
// Parse and apply markdown formatting
function applyMarkdownFormatting(paragraph, content) {
  const text = paragraph.editAsText();

  // Process bold: **text** → bold
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(content)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length - 1;
    const innerStart = start + 2;
    const innerEnd = end - 2;

    text.setBold(innerStart, innerEnd, true);
  }

  // Process italic: *text* → italic
  const italicRegex = /\*(.*?)\*/g;
  while ((match = italicRegex.exec(content)) !== null) {
    // Similar logic...
  }
}
```

### Pattern 3: Font Size Control

```javascript
// Set different font sizes for different sections
function createFormattedSection(body, title, content, fontSize = 11) {
  // Title (larger)
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  // Content (custom size)
  const contentPara = body.appendParagraph(content);
  contentPara.editAsText().setFontSize(0, content.length - 1, fontSize);

  // Spacing
  contentPara.setSpacingAfter(6);
  contentPara.setSpacingBefore(3);
}

// Usage:
createFormattedSection(body, "Timestamps", timestampContent, 9); // Smaller font
createFormattedSection(body, "Key Insights", insightContent, 11); // Normal font
```

### Pattern 4: Separate Copy-Paste Sections

```javascript
// Create easily copyable sections with visual distinction
function createCopyableSection(body, title, items) {
  // Section title
  const titlePara = body.appendParagraph(title);
  titlePara.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  // Add each item as separate paragraph for easy selection
  items.forEach(item => {
    const itemPara = body.appendParagraph(item);
    itemPara.editAsText().setFontFamily('Courier New'); // Monospace
    itemPara.setSpacingAfter(3);
  });

  // Add spacing before next section
  body.appendParagraph('').setSpacingAfter(12);
}

// Usage:
const timestamps = timestampContent.split('\n');
createCopyableSection(body, 'Timestamps (Copy & Paste)', timestamps);
```

### Pattern 5: Consistent Styling Across Document

```javascript
// Create style guide object
const STYLES = {
  sectionTitle: { fontSize: 14, bold: true },
  subsectionTitle: { fontSize: 12, bold: true },
  timestamp: { fontSize: 9, fontFamily: 'Courier New' },
  keyInsight: { fontSize: 11, bold: false },
  hashtag: { fontSize: 10, color: '#0099ff' }
};

function applyStyling(text, start, end, style) {
  if (style.fontSize) text.setFontSize(start, end, style.fontSize);
  if (style.bold) text.setBold(start, end, style.bold);
  if (style.fontFamily) text.setFontFamily(start, end, style.fontFamily);
  if (style.color) text.setForegroundColor(start, end, style.color);
}
```

---

## 6. Git History & Development Patterns

**File:** `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/.git`

### Recent Commits

```
443e724 Fix image URL extraction - use image.image_url.url path (Dec 16)
de39951 Add better error handling and logging for image generation debugging (Dec 16)
64c158e Add new features: YouTube show notes, 3 social posts, Stewart Squared images (Dec 16)
7faa533 Security: Remove hardcoded API key, use Properties Service (Dec 12)
1966576 Initial commit: working maria automation script before enhancements (Dec 2)
```

### Development Patterns Observed

1. **Incremental Feature Addition:** Features are added in discrete commits
2. **Error Handling Focus:** Recent commits include logging and error management
3. **API Integration Pattern:** Features are added as separate functions that follow existing patterns
4. **Testing Before Commit:** Image generation was debugged across multiple commits

---

## 7. Feature Request Analysis: Formatting Issues

### Issue 1: Markdown Bold Not Converting to Google Docs Bold

**Current Behavior:**
```
AI generates: "Explore the **core concept** further"
Google Doc shows: "Explore the **core concept** further"
Expected: "Explore the core concept further" (with "core concept" in bold)
```

**Root Cause:**
- `appendParagraph()` accepts plain text only
- No markdown parsing before insertion
- Even if markdown exists in content string, it's rendered literally

**Solution:** Need to parse markdown before appending and apply text-level formatting

### Issue 2: Timestamps Need Smaller Font

**Current Behavior:**
```
[HEADING1] TIMESTAMPS
00:00 Intro discussion
05:00 Main topic
10:00 Deep dive
(All in default 11pt font)
```

**Expected Behavior:**
```
[HEADING1] TIMESTAMPS
00:00 Intro discussion        (9pt font for easy scanning)
05:00 Main topic
10:00 Deep dive
```

**Solution:** After appending timestamps paragraph, apply `editAsText().setFontSize()` to reduce to 8-9pt

### Issue 3: Key Insights Copyability

**Current Behavior:**
```
[HEADING1] KEY INSIGHTS
1. First insight is a long paragraph that discusses...
2. Second insight covers a related area and also discusses...
3. Third insight builds on previous concepts...
(All text runs together in one paragraph)
```

**Problem:** User cannot select individual insights without selecting adjacent content

**Solution:**
- Split each insight into its own paragraph
- Use consistent formatting
- Add spacing between insights
- Option: Create separate "copy & paste" section with monospace font

---

## 8. Recommendations for Implementation

### Quick Wins (High Impact, Low Effort)

1. **Add Font Size Control to Timestamps**
   - Location: `createMasterDoc()`, after appending timestamps
   - Add 3-5 lines using `editAsText().setFontSize()`
   - Impact: Much easier to scan timestamps

2. **Split Key Insights into Individual Paragraphs**
   - Location: `createMasterDoc()`, Key Insights section
   - Split on numbering pattern before appending
   - Impact: Improved readability and copyability

3. **Create Formatting Helper Function**
   - Create `applyMarkdownFormatting(paragraph, content)` utility
   - Use in `createMasterDoc()` for all content sections
   - Impact: Ensures consistent markdown handling

### Medium Effort Improvements

4. **Add Separate Copy & Paste Sections**
   - For timestamps: Add "Copy & Paste Timestamps" with monospace font
   - For key insights: Add "Copy & Paste Key Insights" formatted as separate items
   - Location: New sections in `createMasterDoc()` or new function

5. **Implement Markdown Processor**
   - Create `formatContentWithMarkdown(paragraph, content)` function
   - Support: **bold**, *italic*, other common markdown
   - Use across all sections

### Architecture Improvements

6. **Create Formatting Utilities Module**
   - New file or new section in Code.gs
   - Export functions for:
     - Markdown parsing
     - Font size management
     - Copy-paste section creation
     - Consistent styling application
   - Enables code reuse across multiple document creators

---

## 9. File Structure & Dependencies

### Main Script
- **Location:** `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/gas_project/Code.gs`
- **Size:** ~557 lines
- **Current Sections:**
  1. Configuration (lines 1-18)
  2. Setup & API Key (lines 20-29)
  3. Main Trigger (lines 33-71)
  4. Metadata Extraction (lines 73-109)
  5. Folder Management (lines 113-131)
  6. Show Notes Generation (lines 135-291)
  7. YouTube Show Notes (lines 273-291)
  8. Document Creation (lines 293-376)
  9. OpenRouter API (lines 382-416)
  10. Image Generation (lines 419-536)
  11. Setup & Triggers (lines 539-556)

### Configuration Management
- **API Key:** Stored in `PropertiesService` (secure)
- **Folder IDs:** In CONFIG object at top
- **Model Selection:** CONFIG.MODEL, CONFIG.IMAGE_MODEL
- **Feature Flags:** CONFIG.GENERATE_IMAGES, CONFIG.IMAGE_SIZE

### Related Documentation
- `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/SETUP.md`
- `/Users/stewartalsop/Dropbox/Crazy Wisdom/Business/Coding_Projects/Sustained Use/maria_automation/Blueprints/Enhancement_Plan_Dec2025.md`

---

## 10. Implementation Order for Formatting Features

### Phase 1: Markdown Formatting (1-2 hours)
1. Create `parseMarkdown(text)` function
2. Create `formatParagraphWithMarkdown(paragraph)` function
3. Test with sample content
4. Update `createMasterDoc()` to use formatter

### Phase 2: Font Size Control (30 minutes)
1. Create `setSectionFontSize(paragraph, fontSize)` function
2. Update timestamps section in `createMasterDoc()`
3. Update key insights section

### Phase 3: Copy & Paste Sections (1 hour)
1. Create `createCopyableSection(body, title, items)` function
2. Add new sections to master doc for timestamps, key insights
3. Use monospace font for better copyability

### Phase 4: Polish & Testing (1 hour)
1. Test with real transcripts
2. Verify formatting renders correctly
3. Check copy-paste behavior
4. Deploy and monitor

---

## Summary Table

| Aspect | Current Status | What's Missing | Impact |
|--------|---|---|---|
| **Text Formatting** | None (plain text only) | Bold, italic, custom fonts | Markdown not recognized |
| **Font Sizing** | Default 11pt everywhere | Size control per section | Timestamps not optimized for readability |
| **Copyability** | Content in single paragraphs | Individual item separation | Hard to select specific items |
| **Markdown Support** | Not implemented | Parser + formatter | AI markdown syntax ignored |
| **Styling Consistency** | No style guide | Reusable formatter | Difficult to maintain formatting rules |
| **Google Docs API** | Paragraph level only | Text-level methods available | Underutilized API capabilities |
| **Code Organization** | All inline | Separate formatting module | Limited reusability |

---

## Conclusion

The Maria Automation script has a solid foundation for document generation but lacks character-level formatting capabilities. The required formatting fixes are achievable with Google Docs API text-level methods that are already available but unused.

**Key Findings:**
- All necessary API permissions are in place
- Text-level formatting methods (`editAsText()`, `setBold()`, `setFontSize()`, etc.) are readily available
- Current architecture uses only paragraph-level operations
- No markdown processing currently exists
- Master document structure is simple and maintainable

**Effort Estimate:** 3-4 hours to implement all requested formatting features with reusable utilities.

