# Add Links Extraction from Transcripts

## Overview

Extract links and books mentioned in podcast transcripts and add them to show notes. Simple, focused implementation following existing codebase patterns.

**Output:**
- Links section in master document (at the end)
- Standalone "links" document using existing `createDoc()` pattern

## Problem Statement

**Current:** Links and books mentioned in episodes aren't captured. Freelancer must manually search transcripts.

**Desired:** Automatic extraction with clickable hyperlinks, ready for copy-paste into published show notes.

## Proposed Solution

Add one content generation function following the existing pattern used 8 times in the codebase:

```javascript
// Follows same pattern as generateTimestamps(), generateKeyInsights(), etc.
function generateLinks(transcript, metadata) {
  // Simple prompt, structured JSON response
  // Returns: {links: [...], books: [...]}
}
```

Integrate using existing patterns:
- Call in `generateAllShowNotes()` (like other content)
- Add section to master doc (like other sections)
- Create standalone doc via `createDoc()` (like other docs)

**Why This Works:**
- Follows established conventions (no new patterns)
- Simple two-category structure (Links + Books)
- Trust Claude Sonnet 4 to extract accurately
- Match existing error handling (try-catch, log, continue)

## Technical Approach

### Integration Points

**File:** `gas_project/Code.gs`

1. **Line ~269**: Add `generateLinks()` function
2. **Line ~137**: Add to `generateAllShowNotes()`
3. **Line ~297**: Add to `createShowNotesDocs()`
4. **Line ~410**: Add section to `createMasterDoc()`

### Implementation

#### 1. Generate Links Function (~30 lines)

```javascript
/**
 * Extract links and books from transcript
 * @param {string} transcript - The podcast transcript
 * @param {object} metadata - Guest name and show type
 * @returns {string} JSON string with links and books
 */
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
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Basic validation
    if (!Array.isArray(parsed.links) || !Array.isArray(parsed.books)) {
      throw new Error('Invalid structure');
    }

    return cleaned;
  } catch (error) {
    Logger.log('Links extraction failed: ' + error.message);
    return JSON.stringify({links: [], books: []});
  }
}
```

#### 2. Format Links Function (~35 lines)

```javascript
/**
 * Add formatted links section to document body
 * @param {object} body - Document body element
 * @param {string} linksJson - JSON string with links and books
 */
function addLinksSection(body, linksJson) {
  let data;
  try {
    data = JSON.parse(linksJson);
  } catch (error) {
    Logger.log('Failed to parse links for display');
    return;
  }

  // Skip if no content
  if (data.links.length === 0 && data.books.length === 0) {
    return;
  }

  // Main heading
  body.appendParagraph('LINKS & RESOURCES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Links section
  if (data.links.length > 0) {
    body.appendParagraph('Websites & Articles')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    data.links.forEach(item => {
      const para = body.appendParagraph('');
      const text = para.editAsText();

      text.appendText('• ');
      const start = text.getText().length;
      text.appendText(item.title);
      const end = text.getText().length - 1;

      // Add https:// if missing
      const url = item.url.startsWith('http') ? item.url : 'https://' + item.url;
      text.setLinkUrl(start, end, url);
      text.setBold(start, end, true);

      text.setFontSize(9);
      para.setSpacingAfter(3);
    });

    body.appendParagraph('').setSpacingAfter(8);
  }

  // Books section
  if (data.books.length > 0) {
    body.appendParagraph('Books')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    data.books.forEach(item => {
      const para = body.appendParagraph('');
      const text = para.editAsText();

      text.appendText('• "');
      const titleStart = text.getText().length;
      text.appendText(item.title);
      const titleEnd = text.getText().length - 1;
      text.setItalic(titleStart, titleEnd, true);

      text.appendText('" by ' + (item.author || 'Unknown Author'));

      text.setFontSize(9);
      para.setSpacingAfter(3);
    });
  }
}
```

#### 3. Integration (~15 lines)

```javascript
// In generateAllShowNotes() (line ~137)
showNotes.links = generateLinks(transcript, metadata);

// In createMasterDoc() (line ~410, before final save)
addLinksSection(body, showNotes.links);

// In createShowNotesDocs() (line ~297, after other docs)
try {
  const linksData = JSON.parse(showNotes.links);
  if (linksData.links.length > 0 || linksData.books.length > 0) {
    const linksText = formatLinksForStandalone(showNotes.links);
    createDoc(folder, 'links', 'Links & Resources', linksText);
  }
} catch (error) {
  Logger.log('Skipping standalone links doc: ' + error.message);
}

// Helper for standalone doc
function formatLinksForStandalone(linksJson) {
  const data = JSON.parse(linksJson);
  let text = '';

  if (data.links.length > 0) {
    text += 'WEBSITES & ARTICLES\n\n';
    data.links.forEach(item => {
      text += `• ${item.title}\n  ${item.url}\n\n`;
    });
  }

  if (data.books.length > 0) {
    text += 'BOOKS\n\n';
    data.books.forEach(item => {
      text += `• "${item.title}" by ${item.author || 'Unknown Author'}\n\n`;
    });
  }

  return text;
}
```

## Acceptance Criteria

### Functional
- [ ] Extract URLs and books from transcripts
- [ ] Add links section to master document (at end, after social posts)
- [ ] Create standalone "links" document in episode folder
- [ ] Links are clickable with descriptive titles
- [ ] Books show with authors (or "Unknown Author")
- [ ] Empty transcripts don't create empty sections

### Non-Functional
- [ ] Follows existing code patterns (generateX, createDoc)
- [ ] Uses existing error handling (try-catch, log, continue)
- [ ] 9pt font matching other sections
- [ ] <10 seconds added to generation time

### Quality Gates
- [ ] Test with transcript containing 5+ URLs and 2+ books
- [ ] Test with transcript containing no links
- [ ] Test with malformed JSON response
- [ ] Verify hyperlinks are clickable
- [ ] Verify formatting matches other sections

## Implementation Estimate

**Total: ~2-3 hours**

- Phase 1: Core extraction function (45 min)
- Phase 2: Formatting function (45 min)
- Phase 3: Integration (30 min)
- Phase 4: Testing (30-45 min)

## What We're NOT Doing (and Why)

Based on code review feedback, we're explicitly **not** including:

1. **Five Categories** → Just Links + Books (60% less code)
2. **Context Extraction** → Not needed, transcript has context
3. **Retry Logic** → Other sections don't have it, OpenRouter is reliable
4. **Complex Validation** → Simple try-catch is sufficient
5. **Plain Text URL Backup** → Hyperlinks work fine in copy-paste
6. **Detailed Edge Case Handling** → AI handles most, log the rest

These can be added later if actual usage shows they're needed. Start simple.

## Success Metrics

**Quantitative:**
- 90%+ of mentioned links captured
- <5% false positives
- <10 seconds added to generation time

**Qualitative:**
- Freelancer can copy-paste links easily
- Show notes look professional
- No errors in production

## Dependencies & Risks

**Dependencies:**
- ✅ Existing `callOpenRouter()` function
- ✅ Google Docs API methods (setLinkUrl, setBold, setItalic)
- ✅ Drive folder structure

**Risks:**

| Risk | Mitigation |
|------|-----------|
| AI misses some links | Acceptable - 90% target is fine |
| Invalid JSON | Try-catch returns empty, logs error |
| Performance impact | Single API call, <10s added |

**Rollback:** Comment out 3 integration lines if issues arise

## References

**Codebase Patterns:**
- `gas_project/Code.gs:135-269` - generateX() pattern
- `gas_project/Code.gs:312-326` - createDoc() pattern
- `gas_project/Code.gs:347-396` - Formatting pattern (9pt, bold, italic)

**Review Feedback:**
- DHH: "Make it boring, follow existing patterns, 80 lines"
- Kieran: "Eliminate code duplication, simpler validation"
- Simplicity: "Two categories max, no retry logic, 95 lines"

---

## Notes

**Philosophy:** Simple first, complexity later if needed. This implementation:
- Follows all existing patterns
- No new abstractions
- ~95 lines total vs 650+ in original plan
- Can ship in 2-3 hours vs 8-10 hours
- Easy to extend if users request more features

**Future Enhancements (out of scope):**
- Additional categories (tools, people, etc.)
- Context extraction
- Timestamp linking
- URL validation