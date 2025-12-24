# Formatting Implementation Guide
**For fixing Google Docs formatting issues in Maria Automation**

---

## Overview

This guide provides ready-to-implement code for fixing the formatting issues:
- Markdown bold (**text**) not converting to actual bold
- Timestamps need smaller font sizes
- Need separate "copy & paste" sections with proper formatting
- Key Insights need better copyability

---

## Part 1: Markdown Formatting Utility

Add this function to your `Code.gs` file (recommended: before `createMasterDoc()` function):

```javascript
// ===========================================
// TEXT FORMATTING UTILITIES
// ===========================================

/**
 * Parses markdown syntax in text and returns array of formatting instructions
 * Supports: **bold**, *italic*, ***bold italic***
 * @param {string} content - Text containing markdown
 * @returns {Array} Array of {type, start, end} objects for formatting
 */
function parseMarkdownFormatting(content) {
  const formats = [];

  // Bold: **text**
  const boldRegex = /\*\*([^\*]+)\*\*/g;
  let match;
  while ((match = boldRegex.exec(content)) !== null) {
    const fullStart = match.index;
    const fullEnd = match.index + match[0].length - 1;
    const contentStart = fullStart + 2;
    const contentEnd = fullEnd - 2;

    formats.push({
      type: 'bold',
      start: contentStart,
      end: contentEnd
    });
  }

  // Italic: *text* (but not **)
  const italicRegex = /(?<!\*)\*([^\*]+)\*(?!\*)/g;
  while ((match = italicRegex.exec(content)) !== null) {
    formats.push({
      type: 'italic',
      start: match.index + 1,
      end: match.index + match[0].length - 2
    });
  }

  return formats;
}

/**
 * Removes markdown syntax from text (converts **bold** to bold)
 * @param {string} content - Text with markdown
 * @returns {string} Clean text without markdown syntax
 */
function cleanMarkdownSyntax(content) {
  // Remove bold markers: **text** → text
  let cleaned = content.replace(/\*\*([^\*]+)\*\*/g, '$1');

  // Remove italic markers: *text* → text
  cleaned = cleaned.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '$1');

  return cleaned;
}

/**
 * Applies markdown formatting to a paragraph
 * IMPORTANT: This removes markdown syntax AND applies formatting
 * @param {Paragraph} paragraph - Google Docs paragraph element
 * @param {string} content - Text with markdown syntax
 */
function formatParagraphWithMarkdown(paragraph, content) {
  // Get formatting instructions BEFORE cleaning syntax
  const formats = parseMarkdownFormatting(content);

  // Clean the markdown syntax from content
  const cleanedContent = cleanMarkdownSyntax(content);

  // Clear the paragraph and insert clean text
  paragraph.clear();
  paragraph.appendText(cleanedContent);

  // Get the text object for formatting
  const text = paragraph.editAsText();

  // Apply all formatting
  formats.forEach(format => {
    if (format.type === 'bold') {
      text.setBold(format.start, format.end, true);
    } else if (format.type === 'italic') {
      text.setItalic(format.start, format.end, true);
    }
  });
}

/**
 * Helper: Sets font size for entire paragraph
 * @param {Paragraph} paragraph - Google Docs paragraph
 * @param {number} sizeInPoints - Font size (e.g., 9, 10, 11, 12)
 */
function setFontSizeForParagraph(paragraph, sizeInPoints) {
  const text = paragraph.editAsText();
  const length = text.getText().length;
  if (length > 0) {
    text.setFontSize(0, length - 1, sizeInPoints);
  }
}

/**
 * Helper: Sets font family for entire paragraph
 * @param {Paragraph} paragraph - Google Docs paragraph
 * @param {string} fontFamily - Font name (e.g., 'Courier New', 'Times New Roman')
 */
function setFontFamilyForParagraph(paragraph, fontFamily) {
  const text = paragraph.editAsText();
  const length = text.getText().length;
  if (length > 0) {
    text.setFontFamily(0, length - 1, fontFamily);
  }
}
```

---

## Part 2: Copy-Paste Section Creator

Add this function for creating easily copyable sections:

```javascript
/**
 * Creates a formatted section optimized for copy-paste
 * Each item is a separate paragraph with monospace font
 * @param {Body} body - Document body
 * @param {string} sectionTitle - Title for the section
 * @param {Array<string>} items - Array of items to include
 * @param {number} fontSize - Font size (default 10)
 * @param {string} fontFamily - Font family (default 'Courier New')
 */
function createCopyableSectionFormatted(
  body,
  sectionTitle,
  items,
  fontSize = 10,
  fontFamily = 'Courier New'
) {
  // Add section title
  const titlePara = body.appendParagraph(sectionTitle);
  titlePara.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  titlePara.setSpacingAfter(6);

  // Add each item as separate paragraph
  items.forEach((item, index) => {
    if (item.trim() === '') return; // Skip empty items

    const itemPara = body.appendParagraph(item);

    // Apply monospace font for copy-paste friendliness
    setFontFamilyForParagraph(itemPara, fontFamily);
    setFontSizeForParagraph(itemPara, fontSize);

    // Small spacing between items for visual separation
    itemPara.setSpacingAfter(2);

    // Optional: Add light background color for visual distinction
    // itemPara.setBackgroundColor('#f0f0f0'); // Light gray
  });

  // Add space before next section
  body.appendParagraph('').setSpacingAfter(12);
}
```

---

## Part 3: Updated createMasterDoc() Function

Replace your existing `createMasterDoc()` function with this enhanced version:

```javascript
function createMasterDoc(folder, showNotes, metadata) {
  const doc = DocumentApp.create('MASTER - ' + metadata.guestName);
  const body = doc.getBody();

  // TITLE
  body.appendParagraph(metadata.guestName + ' - Show Notes')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  // METADATA
  body.appendParagraph('Show: ' + metadata.showType);
  body.appendParagraph('Generated: ' + new Date().toISOString());
  body.appendHorizontalRule();

  // ===== INTRO =====
  body.appendParagraph('INTRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const introPara = body.appendParagraph(showNotes.intro);
  formatParagraphWithMarkdown(introPara, showNotes.intro);

  // ===== EPISODE TITLES =====
  body.appendParagraph('EPISODE TITLES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const titlesPara = body.appendParagraph(showNotes.titles);
  formatParagraphWithMarkdown(titlesPara, showNotes.titles);

  // ===== TIMESTAMPS (WITH SMALLER FONT) =====
  body.appendParagraph('TIMESTAMPS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const timestampsPara = body.appendParagraph(showNotes.timestamps);
  formatParagraphWithMarkdown(timestampsPara, showNotes.timestamps);
  setFontSizeForParagraph(timestampsPara, 9); // Smaller font for timestamps

  // ===== KEY INSIGHTS (WITH SMALLER FONT) =====
  body.appendParagraph('KEY INSIGHTS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const insightsPara = body.appendParagraph(showNotes.keyInsights);
  formatParagraphWithMarkdown(insightsPara, showNotes.keyInsights);
  setFontSizeForParagraph(insightsPara, 10); // Slightly smaller

  // ===== KEYWORDS =====
  body.appendParagraph('KEYWORDS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const keywordsPara = body.appendParagraph(showNotes.keywords);
  formatParagraphWithMarkdown(keywordsPara, showNotes.keywords);

  // ===== HASHTAGS =====
  body.appendParagraph('HASHTAGS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const hashtagsPara = body.appendParagraph(showNotes.hashtags);
  formatParagraphWithMarkdown(hashtagsPara, showNotes.hashtags);

  // ===== CLIP SUGGESTIONS =====
  body.appendParagraph('CLIP SUGGESTIONS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const clipsPara = body.appendParagraph(showNotes.clips);
  formatParagraphWithMarkdown(clipsPara, showNotes.clips);

  // ===== SOCIAL MEDIA POSTS =====
  body.appendParagraph('SOCIAL MEDIA POSTS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const socialPara = body.appendParagraph(showNotes.socialPosts);
  formatParagraphWithMarkdown(socialPara, showNotes.socialPosts);

  // ===== OPTIONAL: COPY & PASTE SECTIONS =====
  // Uncomment these if you want separate easily-copyable sections

  /*
  body.appendParagraph('').setSpacingAfter(12); // Spacing

  // Copy & Paste Timestamps
  const timestampLines = showNotes.timestamps
    .split('\n')
    .filter(line => line.trim() !== '');
  createCopyableSectionFormatted(body, 'Copy & Paste Timestamps', timestampLines, 9);

  // Copy & Paste Key Insights (numbered)
  const insightLines = showNotes.keyInsights
    .split('\n')
    .filter(line => line.trim() !== '');
  createCopyableSectionFormatted(body, 'Copy & Paste Key Insights', insightLines, 10);

  // Copy & Paste Hashtags
  const hashtagLines = showNotes.hashtags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '');
  createCopyableSectionFormatted(body, 'Copy & Paste Hashtags', hashtagLines, 9);
  */

  // Save and move to folder
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

---

## Part 4: Enhanced createDoc() Function (Optional)

Update your generic document creator to support formatting:

```javascript
function createDoc(folder, slug, title, content, fontSize = 11) {
  const doc = DocumentApp.create(slug);
  const body = doc.getBody();

  // Add title
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Add content with markdown formatting
  const contentPara = body.appendParagraph(content);
  formatParagraphWithMarkdown(contentPara, content);

  // Apply font size if specified
  if (fontSize !== 11) {
    setFontSizeForParagraph(contentPara, fontSize);
  }

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

---

## Part 5: Example - Creating Copy & Paste Sections

If you want separate "copy & paste" documents with optimized formatting:

```javascript
/**
 * Creates a dedicated copy-paste document for timestamps
 * Each timestamp on its own line with monospace font
 */
function createCopyablePasteSections(folder, showNotes) {
  // ===== TIMESTAMPS COPY & PASTE =====
  const timestampDoc = DocumentApp.create('Copy & Paste - Timestamps');
  const tsBody = timestampDoc.getBody();

  tsBody.appendParagraph('Copy & Paste Timestamps')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const timestampLines = showNotes.timestamps
    .split('\n')
    .filter(line => line.trim() !== '');

  timestampLines.forEach(line => {
    const para = tsBody.appendParagraph(line);
    setFontFamilyForParagraph(para, 'Courier New');
    setFontSizeForParagraph(para, 9);
    para.setSpacingAfter(3);
  });

  timestampDoc.saveAndClose();
  let file = DriveApp.getFileById(timestampDoc.getId());
  file.moveTo(folder);

  // ===== KEY INSIGHTS COPY & PASTE =====
  const insightDoc = DocumentApp.create('Copy & Paste - Key Insights');
  const kiBody = insightDoc.getBody();

  kiBody.appendParagraph('Copy & Paste Key Insights')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const insightLines = showNotes.keyInsights
    .split('\n')
    .filter(line => line.trim() !== '');

  insightLines.forEach(line => {
    const para = kiBody.appendParagraph(line);
    setFontFamilyForParagraph(para, 'Courier New');
    setFontSizeForParagraph(para, 10);
    para.setSpacingAfter(4);
  });

  insightDoc.saveAndClose();
  file = DriveApp.getFileById(insightDoc.getId());
  file.moveTo(folder);
}
```

Then call this function in `processNewTranscripts()`:
```javascript
createShowNotesDocs(guestFolder, showNotes, metadata);
createCopyablePasteSections(guestFolder, showNotes); // ADD THIS LINE
```

---

## Part 6: Testing Checklist

After implementing the formatting functions, test with:

```javascript
// TEST FUNCTION - Run manually to verify formatting works
function testFormattingFunctions() {
  // Create test document
  const testDoc = DocumentApp.create('TEST - Formatting');
  const body = testDoc.getBody();

  // Test 1: Markdown bold conversion
  body.appendParagraph('TEST 1: Markdown Bold Conversion')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const testPara1 = body.appendParagraph('This is a **test** of **bold** markdown');
  formatParagraphWithMarkdown(testPara1, 'This is a **test** of **bold** markdown');
  body.appendParagraph(''); // Spacing

  // Test 2: Font size reduction
  body.appendParagraph('TEST 2: Font Size Reduction')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const testPara2 = body.appendParagraph('This text should be 9pt font size');
  setFontSizeForParagraph(testPara2, 9);
  body.appendParagraph(''); // Spacing

  // Test 3: Copy-paste section
  body.appendParagraph('TEST 3: Copy-Paste Section')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const testItems = [
    '00:00 Introduction',
    '05:00 Main discussion',
    '10:00 Deep dive',
    '15:00 Q&A section'
  ];
  createCopyableSectionFormatted(body, 'Test Timestamps', testItems, 9);

  testDoc.saveAndClose();
  Logger.log('Test document created: ' + testDoc.getId());
}
```

Run this function and verify:
- Bold text appears in bold in the document (not as **text**)
- Font sizes are correctly applied
- Copy-paste sections have monospace font
- Spacing looks good

---

## Part 7: Integration Steps

1. **Backup current Code.gs:**
   ```bash
   cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/Sustained\ Use/maria_automation/gas_project
   cp Code.gs Code.gs.backup
   ```

2. **Add formatting utilities:** Add all functions from Parts 1 & 2 to your Code.gs

3. **Update createMasterDoc():** Replace with the enhanced version from Part 3

4. **Test formatting:** Run `testFormattingFunctions()` manually

5. **Process a sample transcript:** Upload a test transcript and verify the output

6. **Deploy to Google Apps Script:**
   ```bash
   cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/Sustained\ Use/maria_automation
   clasp push
   ```

7. **Verify in Google Apps Script dashboard** that the code is updated

---

## Part 8: Common Issues & Solutions

### Issue: Bold text not showing after formatting

**Cause:** Text might have been inserted after formatting was applied
**Fix:** Always call `formatParagraphWithMarkdown()` AFTER appending the text

```javascript
// WRONG
const para = body.appendParagraph(content);
formatParagraphWithMarkdown(para, 'different content');

// CORRECT
const para = body.appendParagraph(content);
formatParagraphWithMarkdown(para, content);
```

### Issue: Font size not changing

**Cause:** Text element is empty or length calculation is wrong
**Fix:** Check that text.getText().length > 0

```javascript
function setFontSizeForParagraph(paragraph, sizeInPoints) {
  const text = paragraph.editAsText();
  const length = text.getText().length;

  Logger.log('Paragraph length: ' + length); // Debug

  if (length > 0) {
    text.setFontSize(0, length - 1, sizeInPoints);
  }
}
```

### Issue: Markdown syntax showing in document

**Cause:** `cleanMarkdownSyntax()` not being called
**Fix:** Verify you're using `formatParagraphWithMarkdown()` not just appending text

```javascript
// WRONG - markdown won't be converted
body.appendParagraph(showNotes.intro);

// CORRECT - markdown will be converted to actual formatting
const para = body.appendParagraph(showNotes.intro);
formatParagraphWithMarkdown(para, showNotes.intro);
```

---

## Summary

These utilities provide:
- **Markdown Parsing:** Converts **bold** to actual bold text
- **Font Size Control:** Reduce timestamps/insights to 9-10pt
- **Copy-Paste Optimization:** Separate sections with monospace font
- **Consistent Styling:** Reusable formatter functions

Total implementation: 3-4 hours including testing and deployment.

