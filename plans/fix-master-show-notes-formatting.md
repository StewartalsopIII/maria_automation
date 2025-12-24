# Fix Master Show Notes Formatting Issues

**Type:** Bug Fix + Enhancement
**Show:** All (Crazy Wisdom + Stewart Squared)
**Generated:** 2025-12-24

---

## Overview

Fix formatting issues in the master show notes document where timestamps and key insights are not properly formatted for Maria's copy-paste workflow. The automation currently outputs plain text with markdown syntax that doesn't convert to Google Docs native formatting, making it difficult to copy and paste with proper styling.

---

## Problem Statement

### Current Issues

1. **Timestamps Section Problems**
   - Font size is default 11pt, too large for easy scanning
   - No bold formatting on timestamp values
   - Cannot copy and paste with formatting intact
   - No dedicated copyable section

2. **Key Insights Section Problems**
   - Font size is default 11pt, too large
   - Markdown bold syntax (`**text**`) shows as literal asterisks, not actual bold
   - Example: `1. **Space Debris Removal**: text` renders with visible `**` instead of bold
   - Cannot copy and paste with proper formatting
   - No dedicated copyable section

3. **Name Spelling Issue**
   - "Stuart" appears instead of "Stewart" in generated content

4. **Copy-Paste Workflow**
   - Maria needs to manually reformat content after copying
   - Loses time fixing font sizes and bold formatting
   - Inconsistent results when pasting into other documents

### User Impact

- **Maria (Primary User)**: Spends extra time manually formatting timestamps and key insights after copying from master doc
- **Workflow Efficiency**: 5-10 minutes of manual formatting per episode
- **Quality**: Risk of inconsistent formatting across episodes

---

## Proposed Solution

### High-Level Approach

Implement three layers of improvements:

1. **Markdown Parser**: Convert markdown syntax (`**bold**`) to native Google Docs bold formatting
2. **Font Size Controller**: Apply smaller fonts (9-10pt) to timestamps and key insights
3. **Copyable Sections**: Create dedicated "TIMESTAMPS (Copy & Paste)" and "KEY INSIGHTS (Copy & Paste)" sections with optimized formatting

### Technical Components

#### 1. Markdown Bold Conversion Utility

```javascript
// gas_project/Code.gs (new function)

function convertMarkdownToFormatting(paragraph) {
  const text = paragraph.editAsText();
  const fullText = text.getText();

  // Pattern for markdown bold: **text**
  const boldPattern = /\*\*(.+?)\*\*/g;
  let match;
  const replacements = [];

  // Find all markdown bold patterns
  while ((match = boldPattern.exec(fullText)) !== null) {
    replacements.push({
      start: match.index,
      end: match.index + match[0].length - 1,
      content: match[1]
    });
  }

  // Apply replacements in reverse order (prevents offset shifting)
  for (let i = replacements.length - 1; i >= 0; i--) {
    const rep = replacements[i];

    // First apply bold to the content (including the **)
    text.setBold(rep.start + 2, rep.end - 2, true);

    // Then remove the ** markers
    text.deleteText(rep.end - 1, rep.end); // Remove trailing **
    text.deleteText(rep.start, rep.start + 1); // Remove leading **
  }
}
```

#### 2. Formatted Section Creator

```javascript
// gas_project/Code.gs (new function)

function appendFormattedSection(body, title, content, fontSize, applyMarkdownFormatting = false) {
  // Add section heading
  const heading = body.appendParagraph(title);
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Add content paragraph
  const contentPara = body.appendParagraph(content);

  // Apply markdown formatting if requested
  if (applyMarkdownFormatting) {
    convertMarkdownToFormatting(contentPara);
  }

  // Set font size for the entire paragraph
  const textElement = contentPara.editAsText();
  textElement.setFontSize(fontSize);

  // Add spacing for readability
  contentPara.setSpacingAfter(12);

  return contentPara;
}
```

#### 3. Timestamp Formatting Helper

```javascript
// gas_project/Code.gs (new function)

function formatTimestamps(paragraph, fontSize = 9) {
  const text = paragraph.editAsText();
  const fullText = text.getText();

  // Pattern to find timestamps: 00:00 or 00:00:00 at start of lines
  const timestampPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)/gm;
  let match;

  // Apply font size to entire paragraph first
  text.setFontSize(fontSize);

  // Then make timestamp portions bold
  while ((match = timestampPattern.exec(fullText)) !== null) {
    const start = match.index;
    const end = match.index + match[1].length - 1;
    text.setBold(start, end, true);
  }
}
```

#### 4. Enhanced createMasterDoc Function

```javascript
// gas_project/Code.gs (replace existing function at line 328)

function createMasterDoc(folder, showNotes, metadata) {
  const doc = DocumentApp.create('MASTER - ' + metadata.guestName);
  const body = doc.getBody();

  // Title
  body.appendParagraph(metadata.guestName + ' - Show Notes')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  // Metadata
  body.appendParagraph('Show: ' + metadata.showType);
  body.appendParagraph('Generated: ' + new Date().toISOString());
  body.appendHorizontalRule();

  // INTRO (standard formatting)
  body.appendParagraph('INTRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.intro);

  // EPISODE TITLES (standard formatting)
  body.appendParagraph('EPISODE TITLES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.titles);

  // TIMESTAMPS - Original (for reference)
  body.appendParagraph('TIMESTAMPS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const timestampsPara = body.appendParagraph(showNotes.timestamps);
  formatTimestamps(timestampsPara, 9);

  // TIMESTAMPS - Copy & Paste Section
  body.appendParagraph('TIMESTAMPS (Copy & Paste)')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const timestampsCopyPara = body.appendParagraph(showNotes.timestamps);
  formatTimestamps(timestampsCopyPara, 10);
  timestampsCopyPara.setSpacingAfter(16);

  // KEY INSIGHTS - Original (for reference)
  body.appendParagraph('KEY INSIGHTS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const insightsPara = body.appendParagraph(showNotes.keyInsights);
  convertMarkdownToFormatting(insightsPara);
  insightsPara.editAsText().setFontSize(10);

  // KEY INSIGHTS - Copy & Paste Section
  body.appendParagraph('KEY INSIGHTS (Copy & Paste)')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const insightsCopyPara = body.appendParagraph(showNotes.keyInsights);
  convertMarkdownToFormatting(insightsCopyPara);
  insightsCopyPara.editAsText().setFontSize(10);
  insightsCopyPara.setSpacingAfter(16);

  // KEYWORDS (standard formatting)
  body.appendParagraph('KEYWORDS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.keywords);

  // HASHTAGS (standard formatting)
  body.appendParagraph('HASHTAGS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.hashtags);

  // CLIP SUGGESTIONS (standard formatting)
  body.appendParagraph('CLIP SUGGESTIONS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.clips);

  // SOCIAL MEDIA POSTS (standard formatting)
  body.appendParagraph('SOCIAL MEDIA POSTS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.socialPosts);

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

#### 5. Fix "Stuart" → "Stewart" in Prompts

```javascript
// gas_project/Code.gs (update line 79)

// OLD:
// 1. The guest's full name (not Stewart Alsop - he's the host)

// NEW:
1. The guest's full name (not Stewart Alsop III - he's the host. Note: Host name is spelled "Stewart" not "Stuart")

// Also update line 184:
// OLD:
Give me an intro to the topics discussed mentioning the host Stewart Alsop

// NEW:
Give me an intro to the topics discussed mentioning the host Stewart Alsop (spelled Stewart, not Stuart)
```

---

## Technical Considerations

### Google Apps Script API Limitations

- **Character Offset Precision**: End offset is inclusive in `setBold(start, end, true)`
- **Processing Order**: Must process markdown replacements in reverse order to maintain correct offsets
- **Text Mutations**: Deleting characters shifts all subsequent offsets

### Font Size Choices

- **9pt for timestamps**: Small enough to be unobtrusive, large enough to be readable
- **10pt for key insights**: Balances readability with space efficiency
- **12pt for body text**: Standard Google Docs default

### Markdown Pattern Matching

- **Bold pattern**: `/\*\*(.+?)\*\*/g` captures text between `**`
- **Non-greedy matching**: `+?` ensures we match the shortest possible text
- **Global flag**: `g` finds all occurrences in the text

---

## Acceptance Criteria

### Functional Requirements

- [ ] Timestamps section displays with 9pt font
- [ ] Timestamp values (e.g., "00:00", "05:00") are bold
- [ ] Key insights section displays with 10pt font
- [ ] Markdown bold syntax `**text**` converts to actual Google Docs bold formatting
- [ ] No visible `**` asterisks remain in the rendered document
- [ ] "TIMESTAMPS (Copy & Paste)" section exists with 10pt font
- [ ] "KEY INSIGHTS (Copy & Paste)" section exists with 10pt font
- [ ] Copy-paste sections have proper formatting that survives pasting
- [ ] "Stewart" is spelled correctly in all generated content (never "Stuart")

### Quality Requirements

- [ ] Existing sections (INTRO, EPISODE TITLES, etc.) remain unchanged
- [ ] Document structure is preserved
- [ ] No errors in Apps Script execution logs
- [ ] Font sizes are consistent across episodes
- [ ] Bold formatting is applied accurately to intended text only

### Testing Checklist

- [ ] Test with Crazy Wisdom episode transcript
- [ ] Test with Stewart Squared episode transcript
- [ ] Verify markdown bold conversion in key insights
- [ ] Verify timestamp bold formatting
- [ ] Verify font sizes (9pt timestamps, 10pt insights)
- [ ] Verify copy-paste sections have proper formatting
- [ ] Verify "Stewart" spelling in generated content
- [ ] Check Apps Script execution logs for errors

---

## Implementation Plan

### Phase 1: Utility Functions (Est: 1 hour)

**Files to modify:**
- `gas_project/Code.gs`

**Tasks:**
1. Add `convertMarkdownToFormatting(paragraph)` function after line 376
2. Add `formatTimestamps(paragraph, fontSize)` function after markdown converter
3. Add `appendFormattedSection(body, title, content, fontSize, applyMarkdownFormatting)` helper
4. Test utility functions individually with `testFormattingFunctions()` test

**Test function:**
```javascript
function testFormattingFunctions() {
  const doc = DocumentApp.create('TEST - Formatting');
  const body = doc.getBody();

  // Test markdown conversion
  const testPara = body.appendParagraph('This is **bold text** and this is **more bold**.');
  convertMarkdownToFormatting(testPara);
  Logger.log('Markdown test complete');

  // Test timestamp formatting
  const timestampPara = body.appendParagraph('00:00 - Introduction\n05:00 - Main discussion\n10:00 - Conclusion');
  formatTimestamps(timestampPara, 9);
  Logger.log('Timestamp test complete');

  Logger.log('Test doc ID: ' + doc.getId());
  Logger.log('Open: https://docs.google.com/document/d/' + doc.getId());
}
```

### Phase 2: Update createMasterDoc (Est: 1 hour)

**Files to modify:**
- `gas_project/Code.gs` (line 328-376)

**Tasks:**
1. Replace existing `createMasterDoc()` function with enhanced version
2. Add formatting calls for TIMESTAMPS section
3. Add formatting calls for KEY INSIGHTS section
4. Add new "Copy & Paste" sections
5. Test with sample episode data

### Phase 3: Fix Name Spelling (Est: 15 minutes)

**Files to modify:**
- `gas_project/Code.gs` (lines 79, 184)

**Tasks:**
1. Update `extractMetadata()` prompt to specify "Stewart" spelling
2. Update `generateIntro()` prompt to specify "Stewart" spelling
3. Add spelling note to both prompts

### Phase 4: Integration Testing (Est: 30 minutes)

**Tasks:**
1. Deploy to Apps Script with `clasp push` or manual copy-paste
2. Run `testWithSampleTranscript()` with real transcript
3. Verify formatting in generated master document
4. Check execution logs for errors
5. Verify copy-paste workflow with Maria

### Phase 5: Validation (Est: 30 minutes)

**Tasks:**
1. Process 2-3 real transcripts through the automation
2. Review master documents for correct formatting
3. Test copy-paste workflow from Google Docs to other destinations
4. Confirm "Stewart" spelling in all content
5. Get Maria's approval on formatting

---

## Success Metrics

### Quantitative

- **Time savings**: 5-10 minutes per episode (no manual reformatting needed)
- **Error reduction**: Zero formatting inconsistencies across episodes
- **Copy-paste success**: 100% formatting preservation when pasting

### Qualitative

- Maria can copy and paste timestamps/insights without reformatting
- Timestamps are easier to scan with smaller font and bold values
- Key insights have proper bold emphasis on titles
- Professional, consistent document appearance

---

## Dependencies & Risks

### Dependencies

- Google Apps Script DocumentApp API (stable)
- Existing `gas_project/Code.gs` structure
- OpenRouter API for content generation (existing)

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Markdown parsing errors with complex formatting | Medium | Test with varied AI outputs, add error handling |
| Offset calculations incorrect | High | Use reverse-order processing, extensive testing |
| Font sizes not preserved on copy-paste | Medium | Use native Google Docs formatting, test destinations |
| Breaking existing functionality | High | Test thoroughly, maintain backward compatibility |
| "Stewart" still appears as "Stuart" | Low | Add explicit spelling instructions in prompts |

---

## Alternative Approaches Considered

### Option A: Use Google Docs Markdown Import
**Pros**: Automatic markdown conversion
**Cons**: Requires creating temporary files, more complex workflow
**Decision**: Rejected due to added complexity

### Option B: Post-process with separate script
**Pros**: Doesn't modify main automation
**Cons**: Extra step for Maria, prone to forgetting
**Decision**: Rejected, prefer automated solution

### Option C: Change AI prompts to output plain text only
**Pros**: No parsing needed
**Cons**: Loses semantic bold information, harder for AI
**Decision**: Rejected, markdown is clearer for AI

---

## Files to Modify

### Primary Files

1. **gas_project/Code.gs** (lines 328-376, 79, 184)
   - Add utility functions: `convertMarkdownToFormatting()`, `formatTimestamps()`, `appendFormattedSection()`
   - Replace `createMasterDoc()` function
   - Update prompts in `extractMetadata()` and `generateIntro()`

### Test Files (to create)

1. **gas_project/test_formatting.gs** (new file)
   - Test function for formatting utilities
   - Sample data for testing

---

## Code Examples

### Example 1: Timestamp Formatting

**Before:**
```
00:00 - Stewart welcomes Aaron Borger
05:00 - Discussion of space debris
```

**After:**
```
**00:00** - Stewart welcomes Aaron Borger  (9pt font, timestamp bold)
**05:00** - Discussion of space debris        (9pt font, timestamp bold)
```

### Example 2: Key Insights Formatting

**Before:**
```
1. **Space Debris Removal as a Growing Economic Opportunity**: Aaron Borger explains...
```
(Shows literal `**`)

**After:**
```
1. Space Debris Removal as a Growing Economic Opportunity: Aaron Borger explains...
```
(Actual bold on title, 10pt font, no visible `**`)

---

## References

### Internal Code References

- Current `createMasterDoc()`: `gas_project/Code.gs:328-376`
- Metadata extraction: `gas_project/Code.gs:77-109`
- Intro generation: `gas_project/Code.gs:183-190`
- Document creation utilities: `gas_project/Code.gs:312-326`

### External Resources

- [Google Apps Script Text Class](https://developers.google.com/apps-script/reference/document/text)
- [Google Apps Script DocumentApp Reference](https://developers.google.com/apps-script/reference/document)
- [Markdown to Google Docs Best Practices](https://medium.com/@stephane.giron/convert-text-ion-markdown-for-google-documents-with-documentapp-2a2b4672408e)

### Research Documents (Generated)

- `README_RESEARCH.md` - Navigation guide
- `RESEARCH_SUMMARY.md` - Executive overview
- `RESEARCH_FINDINGS.md` - Technical deep-dive
- `FORMATTING_IMPLEMENTATION_GUIDE.md` - Step-by-step implementation
- `GOOGLE_DOCS_API_REFERENCE.md` - API quick reference

---

## Deployment Checklist

- [ ] Back up current `gas_project/Code.gs`
- [ ] Add new utility functions to Code.gs
- [ ] Update `createMasterDoc()` function
- [ ] Update prompts for "Stewart" spelling
- [ ] Test with `testFormattingFunctions()`
- [ ] Deploy to Apps Script
- [ ] Run `testWithSampleTranscript()` with real data
- [ ] Verify master document formatting
- [ ] Test copy-paste workflow
- [ ] Get Maria's approval
- [ ] Monitor first 3 production runs
- [ ] Document any issues in execution logs

---

## Future Enhancements

- Add italic support for `*text*` markdown
- Add link parsing for `[text](url)` markdown
- Create separate formatted documents for individual sections
- Add configurable font sizes via CONFIG
- Add color coding for different insight types
- Implement automated quality checks on generated formatting

---

**Plan Created:** 2025-12-24
**Estimated Implementation Time:** 3-4 hours
**Priority:** High (Maria waiting for fix)
