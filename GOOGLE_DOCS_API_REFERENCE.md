# Google Docs API Quick Reference for Maria Automation

## Currently Used Methods

```javascript
// Document creation & management
DocumentApp.create(name)              // Create new document
doc.getBody()                         // Get body element
doc.saveAndClose()                    // Save and close
doc.getId()                           // Get document ID

// Paragraph operations
body.appendParagraph(text)            // Add paragraph with text
body.appendHorizontalRule()           // Add horizontal line
paragraph.setHeading(type)            // Set heading level
paragraph.setSpacingAfter(points)     // Space after paragraph
paragraph.setSpacingBefore(points)    // Space before paragraph

// File operations
DriveApp.getFolderById(id)            // Get folder reference
DriveApp.getFileById(id)              // Get file reference
file.moveTo(folder)                   // Move file to folder
```

## Available But Not Yet Used - TEXT FORMATTING

### Character-Level Formatting

```javascript
// Get text object for formatting
paragraph.editAsText()                // Returns Text object

// Text formatting methods
text.setBold(startOffset, endOffset, true/false)
text.setItalic(startOffset, endOffset, true/false)
text.setUnderline(startOffset, endOffset, true/false)
text.setStrikethrough(startOffset, endOffset, true/false)

// Font properties
text.setFontSize(startOffset, endOffset, sizeInPoints)
text.setFontFamily(startOffset, endOffset, fontName)
text.setForegroundColor(startOffset, endOffset, colorHex)
text.setBackgroundColor(startOffset, endOffset, colorHex)

// Getting text
text.getText()                        // Returns full text as string
text.getTextAlignment()               // Get alignment
```

### Paragraph Formatting (Already Partially Used)

```javascript
// Heading levels
DocumentApp.ParagraphHeading.TITLE
DocumentApp.ParagraphHeading.HEADING1
DocumentApp.ParagraphHeading.HEADING2
DocumentApp.ParagraphHeading.HEADING3
DocumentApp.ParagraphHeading.NORMAL

// Line spacing
paragraph.setLineSpacing(factor)      // 1.0 = single, 1.5 = 1.5x, 2.0 = double

// Text alignment
DocumentApp.HorizontalAlignment.LEFT
DocumentApp.HorizontalAlignment.CENTER
DocumentApp.HorizontalAlignment.RIGHT
DocumentApp.HorizontalAlignment.JUSTIFY

paragraph.setAlignment(align)
```

## Common Font Sizes

```
8pt   - Very small (annotations, footnotes)
9pt   - Small (timestamps, references)
10pt  - Slightly small (subtitles)
11pt  - Default (body text)
12pt  - Large (section titles)
14pt  - Very large (headers)
16pt  - Extra large (main title)
```

## Common Font Families

```javascript
'Arial'
'Courier New'           // Monospace (copy-paste friendly)
'Georgia'
'Times New Roman'
'Trebuchet MS'
'Verdana'
'Comic Sans MS'
```

## Common Colors (Hex Codes)

```javascript
// Grays
'#000000'   // Black
'#666666'   // Dark gray
'#999999'   // Gray
'#cccccc'   // Light gray
'#f0f0f0'   // Very light gray
'#ffffff'   // White

// Accent colors
'#0099ff'   // Blue (hashtags)
'#ff6600'   // Orange
'#ff0000'   // Red
'#00cc00'   // Green
'#9900ff'   // Purple
```

## Complete Character Formatting Example

```javascript
function demonstrateTextFormatting() {
  const doc = DocumentApp.create('Formatting Demo');
  const body = doc.getBody();

  // Create a paragraph
  const para = body.appendParagraph('Hello beautiful world!');

  // Get text object for formatting
  const text = para.editAsText();

  // Format "Hello" (chars 0-4) as bold, blue, 14pt
  text.setBold(0, 4, true);
  text.setForegroundColor(0, 4, '#0099ff');
  text.setFontSize(0, 4, 14);

  // Format "beautiful" (chars 6-14) as italic, red, 12pt
  text.setItalic(6, 14, true);
  text.setForegroundColor(6, 14, '#ff0000');
  text.setFontSize(6, 14, 12);

  doc.saveAndClose();
}
```

## Paragraph Formatting Example

```javascript
function demonstrateParaFormatting() {
  const doc = DocumentApp.create('Paragraph Demo');
  const body = doc.getBody();

  // Create paragraph
  const para = body.appendParagraph('This is a special paragraph');

  // Format paragraph
  para.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  para.setSpacingBefore(12);
  para.setSpacingAfter(12);
  para.setLineSpacing(1.5);

  doc.saveAndClose();
}
```

## Offset Calculations

When formatting text, offsets are CHARACTER-based (0-indexed):

```
Text: "Hello World"
Positions: 0123456789A (H=0, e=1, l=2, l=3, o=4, space=5, W=6, etc)

To format "World" (6-10):
text.setBold(6, 10, true)
```

For longer text with special characters:

```javascript
// Helper function
function findAndFormat(text, searchText, applyBold) {
  const content = text.getText();
  const index = content.indexOf(searchText);

  if (index >= 0) {
    text.setBold(index, index + searchText.length - 1, applyBold);
  }
}
```

## API Limitations & Gotchas

1. **Text-level formatting after paragraph operations**
   - Call formatters AFTER adding text to paragraph
   - Formatting persists after saveAndClose()

2. **No built-in markdown support**
   - Must parse and apply formatting manually
   - Can't use RichText or HTML directly

3. **No regex find-and-replace**
   - Must iterate through text manually
   - Use indexOf() for simple searches

4. **Performance on large documents**
   - Each editAsText() call is somewhat expensive
   - Cache text objects when possible

5. **Formatting after text modification**
   - If you modify text after formatting, offsets change
   - Always format at the end or recalculate offsets

## Offset Example with Markdown Removal

```javascript
// BEFORE: "This is **bold** text"
// AFTER clean: "This is bold text"
// Offset shift: -4 characters (removed ** twice)

// Solution: Parse BEFORE cleaning
const matches = /\*\*([^\*]+)\*\*/g.exec(content);
// Then remove markdown
const cleaned = content.replace(/\*\*([^\*]+)\*\*/g, '$1');
// PROBLEM: Original offsets are now wrong!

// BETTER SOLUTION: Use clean text, recalculate positions
const cleaned = content.replace(/\*\*([^\*]+)\*\*/g, '$1');
const boldStart = cleaned.indexOf('bold');
const boldEnd = boldStart + 'bold'.length - 1;
text.setBold(boldStart, boldEnd, true);
```

## Most Important Methods for Maria Automation

For fixing the formatting issues, focus on:

```javascript
// 1. Markdown parsing (find bold text)
/\*\*([^\*]+)\*\*/g        // Regex for **text**

// 2. Cleaning markdown syntax
content.replace(/\*\*(.+?)\*\*/g, '$1')

// 3. Applying bold formatting
text.setBold(start, end, true)

// 4. Reducing font size
text.setFontSize(start, end, 9)

// 5. Using monospace font for copy-paste
text.setFontFamily(start, end, 'Courier New')
```

## Debugging Text Formatting

```javascript
function debugTextFormatting(paragraph) {
  const text = paragraph.editAsText();
  const content = text.getText();

  Logger.log('Paragraph content: ' + content);
  Logger.log('Content length: ' + content.length);
  Logger.log('First character: ' + content.charAt(0));
  Logger.log('Last character: ' + content.charAt(content.length - 1));

  // Try formatting first 5 characters
  if (content.length >= 5) {
    text.setBold(0, 4, true);
    Logger.log('Applied bold to first 5 chars');
  }
}
```

## Useful Utilities

```javascript
// Get text length safely
function getTextLength(paragraph) {
  try {
    const text = paragraph.editAsText();
    return text.getText().length;
  } catch (e) {
    Logger.log('Error getting text length: ' + e);
    return 0;
  }
}

// Format entire paragraph
function setBoldForParagraph(paragraph) {
  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len > 0) {
    text.setBold(0, len - 1, true);
  }
}

// Format portion of paragraph
function setBoldForText(paragraph, searchText) {
  const text = paragraph.editAsText();
  const content = text.getText();
  const index = content.indexOf(searchText);

  if (index >= 0) {
    text.setBold(index, index + searchText.length - 1, true);
  }
}
```

## OAuth Scopes (Already Configured)

Your `appsscript.json` already has all needed scopes:

```json
"https://www.googleapis.com/auth/documents"  // Docs API
"https://www.googleapis.com/auth/drive"      // Drive API
"https://www.googleapis.com/auth/script.external_request"
"https://www.googleapis.com/auth/script.scriptapp"
```

No changes needed to permissions.

---

## Quick Copy-Paste Templates

### Template 1: Format Text in Paragraph

```javascript
function formatExistingText(paragraph, searchText, makeBold) {
  const text = paragraph.editAsText();
  const content = text.getText();
  const index = content.indexOf(searchText);

  if (index >= 0) {
    const end = index + searchText.length - 1;
    text.setBold(index, end, makeBold);
  }
}
```

### Template 2: Reduce Font Size of Paragraph

```javascript
function reduceFontSize(paragraph, newSize) {
  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len > 0) {
    text.setFontSize(0, len - 1, newSize);
  }
}
```

### Template 3: Use Monospace Font for Copy-Paste

```javascript
function makeMonospace(paragraph) {
  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len > 0) {
    text.setFontFamily(0, len - 1, 'Courier New');
  }
}
```

---

## Resources

- **Google Apps Script Documentation:** https://developers.google.com/apps-script/reference/document
- **Document Service Reference:** https://developers.google.com/apps-script/reference/document/document-app
- **Text Class Methods:** https://developers.google.com/apps-script/reference/document/text

