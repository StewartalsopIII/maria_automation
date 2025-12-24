# Fix Show Notes Formatting (Simplified)

**Type:** Bug Fix
**Priority:** High
**Estimated Time:** 30 minutes

---

## Problem

Maria needs to copy timestamps and key insights from master show notes, but:
1. Font is too large (default 11pt)
2. Markdown bold `**text**` shows literal asterisks instead of bold formatting
3. "Stuart" appears instead of "Stewart" in generated content

---

## Solution

Inline font sizing and bold formatting directly in `createMasterDoc()`. No utility functions needed.

---

## Implementation

### 1. Fix Timestamps (9pt font, bold timestamp values)

**File:** `gas_project/Code.gs:347-349`

Replace:
```javascript
body.appendParagraph('TIMESTAMPS')
  .setHeading(DocumentApp.ParagraphHeading.HEADING1);
body.appendParagraph(showNotes.timestamps);
```

With:
```javascript
body.appendParagraph('TIMESTAMPS')
  .setHeading(DocumentApp.ParagraphHeading.HEADING1);

const tsPara = body.appendParagraph(showNotes.timestamps);
const tsText = tsPara.editAsText();

// Set entire section to 9pt
tsText.setFontSize(9);

// Bold timestamp values (00:00 or 00:00:00 at line starts)
const tsString = tsText.getText();
const tsPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)/gm;
let match;

while ((match = tsPattern.exec(tsString)) !== null) {
  tsText.setBold(match.index, match.index + match[1].length - 1, true);
}
```

### 2. Fix Key Insights (9pt font, convert markdown bold)

**File:** `gas_project/Code.gs:351-353`

Replace:
```javascript
body.appendParagraph('KEY INSIGHTS')
  .setHeading(DocumentApp.ParagraphHeading.HEADING1);
body.appendParagraph(showNotes.keyInsights);
```

With:
```javascript
body.appendParagraph('KEY INSIGHTS')
  .setHeading(DocumentApp.ParagraphHeading.HEADING1);

const kiPara = body.appendParagraph(showNotes.keyInsights);
const kiText = kiPara.editAsText();

// Set entire section to 9pt
kiText.setFontSize(9);

// Convert **bold** to actual bold formatting
const kiString = kiText.getText();
const boldPattern = /\*\*(.+?)\*\*/g;
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

### 3. Fix Name Spelling

**File:** `gas_project/Code.gs:79`

Update prompt:
```javascript
const prompt = `Analyze this podcast transcript and extract:
1. The guest's full name (not Stewart Alsop III - he's the host. IMPORTANT: Host name is spelled "Stewart" with "ew", not "Stuart")
2. Whether this is "Crazy Wisdom" or "Stewart Squared" podcast
```

**File:** `gas_project/Code.gs:184`

Update prompt:
```javascript
const prompt = `Give me an intro to the topics discussed mentioning the host Stewart Alsop (spelled Stewart with "ew", not Stuart) and the guest's full name ${metadata.guestName}.
```

---

## Acceptance Criteria

- [ ] Timestamps section displays with 9pt font
- [ ] Timestamp values (00:00, 05:00) are bold
- [ ] Key insights section displays with 9pt font
- [ ] Markdown `**text**` converts to bold (no visible asterisks)
- [ ] "Stewart" spelled correctly in all content
- [ ] Copy-paste preserves font sizes and bold formatting

---

## Testing

1. Run `testWithSampleTranscript()` with real transcript
2. Open generated master document
3. Verify font sizes (9pt for both sections)
4. Verify bold formatting (timestamps and key insights titles)
5. Verify no `**` visible in document
6. Search for "Stuart" - should find zero occurrences
7. Copy section to Google Docs, verify formatting persists

---

## Files Modified

- `gas_project/Code.gs` (lines 79, 184, 347-353)

**Total changes:** ~25 lines of code added/modified

---

## Rollback Plan

If formatting breaks:
1. Revert changes to lines 347-353
2. Content still generates, just without formatting
3. No data loss risk

---

## References

- Original plan (over-engineered): `plans/fix-master-show-notes-formatting.md`
- Current code: `gas_project/Code.gs:328-376`
- Review feedback: DHH, Kieran, Simplicity all recommended inline approach
