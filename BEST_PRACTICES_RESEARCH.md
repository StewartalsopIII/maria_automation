# Google Apps Script Production Best Practices Research

**Date**: January 2026
**Project**: Maria Automation (Podcast Show Notes Generation)
**Focus**: Production-ready patterns for scalable content generation with external APIs

---

## Executive Summary

This document synthesizes best practices from official Google documentation, industry leaders, and production implementations for building reliable, scalable Google Apps Script automation. The research is specifically tailored to your podcast show notes generation workflow using OpenRouter API.

**Key Findings:**
- **Runtime**: V8 runtime (you're already using this correctly)
- **API Strategy**: Batch external requests, implement exponential backoff retries, cache aggressively
- **Secrets Management**: Use Properties Service for config + Google Secret Manager for sensitive keys
- **Performance**: Read/write data in batches; can achieve 70x speed improvement vs iterative operations
- **Error Handling**: Implement comprehensive retry logic with exponential backoff for LLM API calls
- **Testing**: Use Jest for non-GAS-dependent code; mock external services for reliability
- **Triggers**: Time-based triggers with resumable state tracking for large workloads

---

## 1. Google Apps Script Development Foundation

### 1.1 Runtime: V8 (Critical Migration Alert)

**Status**: V8 is the current standard
**Deadline**: Rhino runtime deprecated February 20, 2025 - End of Life January 31, 2026

Your `appsscript.json` correctly specifies V8:
```json
"runtimeVersion": "V8"
```

**Why V8 Matters:**
- 50-100x faster than Rhino for most operations
- Modern JavaScript features (arrow functions, destructuring, async/await)
- Better error handling and debugging

**Your Implementation**: ✅ Already V8-compliant

**Reference**: [Official Google Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices)

---

### 1.2 Scopes: Principle of Least Privilege

**Current scopes in your `appsscript.json`:**
```json
"oauthScopes": [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/script.scriptapp"
]
```

**Analysis**: Appropriate and minimal for your use case:
- `documents` - Google Docs creation ✅
- `drive` - File management in Google Drive ✅
- `script.external_request` - OpenRouter API calls ✅
- `script.scriptapp` - Trigger management ✅

**Best Practice**: Never request more permissions than necessary. You're following this correctly.

---

## 2. Performance Optimization (Critical for Content Generation)

### 2.1 Batch Operations: The 70x Speedup Pattern

**CRITICAL FINDING**: The official documentation demonstrates a 70-second vs 1-second difference using batch operations instead of iterative reads/writes.

**Your Current Code (Line 39-45):**
```javascript
while (files.hasNext()) {
  const file = files.next();
  const fileName = file.getName();

  if (fileName.startsWith('[PROCESSED] ')) {
    continue;
  }
  // ... process single file
}
```

**Status**: ✅ Already optimal for single-file iteration (file listing is inherently sequential)

**Where Batching Helps in Your Workflow:**

**PROBLEMATIC PATTERN** (if you were doing it):
```javascript
// SLOW: 70+ seconds for many documents
for (let i = 0; i < data.length; i++) {
  doc.getBody().appendParagraph(data[i]);  // Individual writes
}
```

**OPTIMIZED PATTERN** (recommended):
```javascript
// FAST: Combine writes into single operations
const paragraphs = data.map(item => item);  // Prepare all data
doc.getBody().appendParagraph(paragraphs.join('\n'));  // Single write
```

**Your Code Compliance**: Your document creation functions are reasonably efficient, but could be optimized:

**Current (in `createMasterDoc`)**:
```javascript
body.appendParagraph(title)
  .setHeading(DocumentApp.ParagraphHeading.HEADING1);

body.appendParagraph(content);
```

**Recommended Optimization**:
```javascript
// Batch formatting operations where possible
const titlePara = body.appendParagraph(title);
titlePara.setHeading(DocumentApp.ParagraphHeading.HEADING1);

// For large content, prepare formatting before appending
const contentPara = body.appendParagraph(content);
// Apply all formatting in one pass
```

### 2.2 Caching Strategy: Cache Service

**Your Current Implementation**: No caching present

**Recommended Enhancement:**
```javascript
function getCachedMetadata(transcript, cacheKey) {
  const cache = CacheService.getScriptCache();
  let metadata = cache.get(cacheKey);

  if (metadata) {
    Logger.log('Using cached metadata for: ' + cacheKey);
    return JSON.parse(metadata);
  }

  // Generate and cache (30 minute TTL)
  metadata = extractMetadata(transcript);
  cache.put(cacheKey, JSON.stringify(metadata), 1800); // 30 minutes

  return metadata;
}
```

**When to Cache:**
- Repeated API calls within 30 minutes (default TTL)
- Expensive computations
- Frequently accessed configuration

**Your Use Case**: Limited caching opportunity since each transcript is unique, but useful for:
- Guest metadata lookups (names, show types)
- Configuration values
- Recently processed file lists

**Reference**: [Cache Service Documentation](https://developers.google.com/apps-script/reference/cache/cache-service)

---

## 3. API Integration: OpenRouter (LLM Provider)

### 3.1 Error Handling and Retry Logic (Production-Critical)

**Your Current Implementation (Line 654-688):**
```javascript
function callOpenRouter(prompt, maxTokens) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = { /* ... */ };
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error('OpenRouter API error: ' + json.error.message);
  }

  return json.choices[0].message.content;
}
```

**Issues Identified:**
1. No retry logic for transient failures (429, 5xx errors)
2. No exponential backoff
3. Network timeout not handled
4. Rate limit errors immediately fail the entire transcript

**PRODUCTION PATTERN: Exponential Backoff Retry Logic**

```javascript
function callOpenRouterWithRetry(prompt, maxTokens, maxRetries = 3) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const payload = {
        model: CONFIG.MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + CONFIG.OPENROUTER_API_KEY,
          'HTTP-Referer': CONFIG.SITE_URL,
          'X-Title': CONFIG.SITE_NAME
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 60  // Explicit timeout in seconds
      };

      const response = UrlFetchApp.fetch(url, options);
      const httpCode = response.getResponseCode();
      const json = JSON.parse(response.getContentText());

      // Handle HTTP error codes
      if (httpCode === 429) {
        // Rate limited - retry with backoff
        const retryAfter = response.getHeaders()['Retry-After'] || (2 ** attempt);
        Logger.log(`Rate limited. Retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
        Utilities.sleep(retryAfter * 1000);
        continue;
      }

      if (httpCode >= 500) {
        // Server error - retry
        const backoffMs = (2 ** attempt) * 1000 + Math.random() * 1000;
        Logger.log(`Server error ${httpCode}. Retrying in ${Math.round(backoffMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`);
        Utilities.sleep(backoffMs);
        continue;
      }

      if (httpCode >= 400) {
        // Client error - don't retry
        throw new Error(`OpenRouter API error (${httpCode}): ${json.error?.message || 'Unknown error'}`);
      }

      if (json.error) {
        throw new Error(`OpenRouter API error: ${json.error.message}`);
      }

      if (!json.choices?.[0]?.message?.content) {
        throw new Error('Invalid response structure from OpenRouter');
      }

      return json.choices[0].message.content;

    } catch (error) {
      lastError = error;

      // Don't retry on client errors
      if (error.message.includes('400:') || error.message.includes('401:') || error.message.includes('403:')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const backoffMs = (2 ** attempt) * 1000 + Math.random() * 1000;
        Logger.log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${Math.round(backoffMs / 1000)}s`);
        Utilities.sleep(backoffMs);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}
```

**Key Retry Principles** (from OpenRouter documentation):
1. **Exponential Backoff**: Wait time = (2^attempt) * base_delay + random_jitter
2. **Max Retries**: 3-5 attempts for transient errors
3. **Error Classification**:
   - **Retry**: 429 (rate limited), 5xx (server errors), timeouts
   - **No Retry**: 400 (bad request), 401 (auth), 403 (forbidden)
4. **Idempotency**: Ensure retried requests are safe (they are for LLM calls)

**Jitter Importance**: Random delay prevents thundering herd when multiple scripts retry simultaneously

**Reference**: [OpenRouter Error Handling](https://openrouter.ai/docs/api/reference/errors-and-debugging)

---

### 3.2 Timeout Configuration

**Current Implementation**: Uses default (30 seconds)

**Recommended Enhancement**:
```javascript
// Add to options object
const options = {
  // ... other options ...
  timeout: 60  // Explicitly set 60 second timeout for LLM
};
```

**Why**: LLM calls can take 30-45 seconds for longer prompts. A 30-second default timeout would cause spurious failures.

---

### 3.3 Streaming vs Non-Streaming Responses

**Your Current Pattern**: Non-streaming (blocking until full response)

**When to Use Streaming:**
- Very long responses (multiple pages)
- User-facing applications needing real-time feedback
- Cost optimization (stop if user closes connection)

**Your Case**: Non-streaming is correct because:
- You need complete content for processing
- Running automated in background
- No user waiting for real-time output

---

## 4. Secrets Management: API Keys

### 4.1 Your Current Implementation Analysis

**Current Code (Line 7-9)**:
```javascript
const CONFIG = {
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),
  // ...
};
```

**Current Setup Function (Line 25-29)**:
```javascript
function setupAPIKey() {
  const apiKey = 'PASTE_YOUR_NEW_API_KEY_HERE';
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
  Logger.log('API key stored securely in Script Properties');
}
```

**Security Assessment**: ✅ Good foundation, but can be improved

### 4.2 Recommended: Two-Tier Secret Architecture

**Tier 1: Configuration (Non-Sensitive)**
Store in Script Properties:
- Folder IDs
- Model names
- Site URLs
- Boolean flags (GENERATE_IMAGES)

**Tier 2: Secrets (Sensitive)**
Store in Google Secret Manager:
- API keys
- OAuth tokens
- Database passwords

**Implementation Pattern:**

```javascript
// secrets.gs - Separate file for secret handling

function getOpenRouterApiKey() {
  // Try cache first (1 hour TTL)
  const cache = CacheService.getScriptCache();
  let apiKey = cache.get('openrouter_api_key');

  if (apiKey) {
    Logger.log('Using cached API key');
    return apiKey;
  }

  // Try Properties first (fallback for simple deployments)
  apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
  if (apiKey) {
    cache.put('openrouter_api_key', apiKey, 3600); // Cache for 1 hour
    return apiKey;
  }

  // Production: Fetch from Google Secret Manager
  try {
    apiKey = fetchFromSecretManager('openrouter-api-key');
    cache.put('openrouter_api_key', apiKey, 3600);
    return apiKey;
  } catch (error) {
    throw new Error('API key not found. Run setupAPIKey() or configure Secret Manager: ' + error.message);
  }
}

function fetchFromSecretManager(secretName) {
  const projectId = 'YOUR_GCP_PROJECT_ID';
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`;

  const options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error(`Secret Manager error: ${json.error.message}`);
  }

  // Decode base64 payload
  const payload = json.payload.data;
  const decodedString = Utilities.newBlob(Utilities.base64Decode(payload)).getDataAsString();

  return decodedString;
}

// Setup function for one-time configuration
function setupSecrets() {
  const apiKey = 'PASTE_YOUR_NEW_API_KEY_HERE';

  // Store in Properties (simpler for non-production)
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);

  // Alternative: Create in Secret Manager via gcloud CLI
  // gcloud secrets create openrouter-api-key --data-file=- < <(echo -n "YOUR_KEY")

  Logger.log('Secrets configured successfully');
}
```

### 4.3 Security Best Practices

**DO:**
- ✅ Store sensitive keys in Properties Service or Secret Manager
- ✅ Cache decrypted keys in CacheService (only in-memory during execution)
- ✅ Use different keys per environment (dev/production)
- ✅ Rotate keys regularly (monthly recommended)
- ✅ Audit access logs

**DON'T:**
- ❌ Hard-code API keys in source
- ❌ Commit API keys to Git
- ❌ Log API keys or sensitive values
- ❌ Include keys in error messages
- ❌ Share keys between multiple services

**Your Current Risk**:
- `setupAPIKey()` function leaves placeholder visible
- Should be removed after setup

**Improvement**:
```javascript
function setupAPIKey() {
  // This function should only be run ONCE, then deleted
  const apiKey = PropertiesService.getUserProperties().getProperty('MY_OPENROUTER_KEY_BACKUP');

  if (!apiKey) {
    throw new Error('Please set OPENROUTER_API_KEY in your properties first');
  }

  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
  Logger.log('API key configured');

  // After running once, DELETE THIS FUNCTION
}
```

**References:**
- [API Keys Secrets and Secure Configuration in Google Apps Script](https://basescripts.com/api-keys-secrets-and-secure-configuration-in-google-apps-script)
- [Secure Secrets in Google Apps Script](https://dev.to/googleworkspace/secure-secrets-in-google-apps-script-1dhc)

---

## 5. Building Scalable Content Generation Workflows

### 5.1 Workflow Architecture for Podcast Automation

Your current workflow follows a good pattern, but can be enhanced for scale:

**Current Flow** (good):
```
1. List files in input folder
2. For each file:
   - Extract metadata
   - Generate show notes (10 parallel API calls)
   - Create output documents
   - Mark as [PROCESSED]
```

**Recommended Enhancements for Scale:**

```javascript
// Add state tracking for resumable processing
const STATE_KEYS = {
  LAST_PROCESSED_FILE: 'last_processed_file_id',
  FAILED_FILES: 'failed_files_json',
  PROCESSING_STATS: 'processing_stats'
};

function processNewTranscriptsWithState() {
  const inputFolder = DriveApp.getFolderById(CONFIG.INPUT_FOLDER_ID);
  const files = inputFolder.getFilesByType('text/plain');

  const state = getProcessingState();
  const stats = {
    startTime: new Date(),
    filesProcessed: 0,
    filesFailed: 0,
    totalTimeMs: 0
  };

  const failedFiles = state.failedFiles || [];

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    // Skip already processed
    if (fileName.startsWith('[PROCESSED] ') || fileName.startsWith('[FAILED] ')) {
      continue;
    }

    // Skip if recently failed (retry later)
    if (failedFiles.includes(file.getId())) {
      Logger.log('Skipping recently failed file: ' + fileName);
      continue;
    }

    const fileStartTime = new Date();

    try {
      Logger.log('Processing: ' + fileName);

      const transcript = file.getBlob().getDataAsString();
      const metadata = extractMetadata(transcript);
      Logger.log('Detected show: ' + metadata.showType + ', Guest: ' + metadata.guestName);

      const guestFolder = createOutputFolders(metadata.showType, metadata.guestName);
      const showNotes = generateAllShowNotes(transcript, metadata);

      createShowNotesDocs(guestFolder, showNotes, metadata);
      createMasterDoc(guestFolder, showNotes, metadata);

      generateEpisodeArtwork(transcript, metadata, showNotes, guestFolder);

      file.setName('[PROCESSED] ' + fileName);

      stats.filesProcessed++;
      stats.totalTimeMs += (new Date() - fileStartTime);

      Logger.log('Successfully processed: ' + fileName + ' (took ' + Math.round((new Date() - fileStartTime) / 1000) + 's)');

    } catch (error) {
      Logger.log('Error processing ' + fileName + ': ' + error.message);

      // Mark as failed but don't rename yet (give it time to debug)
      failedFiles.push(file.getId());
      stats.filesFailed++;

      // Optional: Re-raise after marking to halt processing if critical
      if (error.message.includes('CRITICAL')) {
        throw error;
      }
    }
  }

  // Save state for next run
  saveProcessingState({
    failedFiles: failedFiles,
    stats: stats
  });

  Logger.log('Batch complete: ' + stats.filesProcessed + ' processed, ' + stats.filesFailed + ' failed');
}

function getProcessingState() {
  const props = PropertiesService.getScriptProperties();
  const stateJson = props.getProperty('PROCESSING_STATE') || '{}';

  try {
    return JSON.parse(stateJson);
  } catch (e) {
    return {};
  }
}

function saveProcessingState(state) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PROCESSING_STATE', JSON.stringify(state));
}
```

### 5.2 Parallel Content Generation (Your Show Notes)

Your current approach generates 10 pieces of content sequentially:
```javascript
showNotes.titles = generateTitles(...);        // API call 1
showNotes.timestamps = generateTimestamps(...); // API call 2
showNotes.keyInsights = generateKeyInsights(...); // API call 3
// ... etc
```

**Optimization: Batch API Calls (Conditional)**

If you have API rate limits, consider batching semantically related tasks:
```javascript
function generateAllShowNotesOptimized(transcript, metadata) {
  const showNotes = {};

  // Batch 1: Content generation (can parallelize concept)
  showNotes.titles = generateTitles(transcript, metadata);
  showNotes.timestamps = generateTimestamps(transcript, metadata);

  // Batch 2: Analysis (different prompts)
  showNotes.keyInsights = generateKeyInsights(transcript, metadata);
  showNotes.keyInsightsYouTube = generateKeyInsights(transcript, metadata, 'youtube');

  // Batch 3: Social & CTAs (depend on clips)
  showNotes.clips = generateClipSuggestions(transcript, metadata);
  showNotes.socialPosts = generateSocialPosts(transcript, metadata, {}, showNotes.clips);

  // Rest...
  showNotes.intro = generateIntro(transcript, metadata);
  showNotes.hashtags = generateHashtags(transcript, metadata);
  showNotes.keywords = generateKeywords(transcript, metadata);
  showNotes.ctas = generateCTAs(transcript, metadata, showNotes.clips);
  showNotes.links = generateLinks(transcript, metadata);

  return showNotes;
}
```

**Note**: Apps Script is single-threaded, so true parallelization isn't possible. Sequential execution is standard.

### 5.3 Content Quality Validation

**Add Validation Layer:**

```javascript
function validateShowNotes(showNotes) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check required fields
  const requiredFields = ['titles', 'timestamps', 'keyInsights', 'intro', 'hashtags'];
  for (const field of requiredFields) {
    if (!showNotes[field] || showNotes[field].trim().length === 0) {
      validation.errors.push(`Missing or empty: ${field}`);
      validation.isValid = false;
    }
  }

  // Check length limits
  if (showNotes.intro && showNotes.intro.length < 50) {
    validation.warnings.push('Intro is quite short');
  }

  if (showNotes.timestamps && showNotes.timestamps.length < 100) {
    validation.warnings.push('Timestamps seem incomplete');
  }

  return validation;
}

// Use in main function
function processNewTranscripts() {
  // ... existing code ...

  const showNotes = generateAllShowNotes(transcript, metadata);
  const validation = validateShowNotes(showNotes);

  if (!validation.isValid) {
    throw new Error('Show notes validation failed: ' + validation.errors.join('; '));
  }

  if (validation.warnings.length > 0) {
    Logger.log('Warnings: ' + validation.warnings.join('; '));
  }

  // Continue with document creation...
}
```

---

## 6. Document Generation and Formatting

### 6.1 Your Current Implementation (Assessment)

**Strengths:**
- ✅ Separate function for each content type
- ✅ Proper heading hierarchy
- ✅ Font size management
- ✅ Markdown bold-to-formatting conversion

**Areas for Enhancement:**

**Current Markdown Handling (Line 496-518):**
```javascript
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
  kiText.setBold(r.start + 2, r.end - 2, true);
  kiText.deleteText(r.end - 1, r.end);       // Remove trailing **
  kiText.deleteText(r.start, r.start + 1);   // Remove leading **
}
```

**Issue**: Complex offset tracking can fail with nested formatting

**Recommended Refactor:**
```javascript
function applyMarkdownFormatting(text) {
  // Replace ** bold ** first
  text = text.replace(/\*\*(.+?)\*\*/g, '<bold>$1</bold>');
  // Replace * italic *
  text = text.replace(/\*(.+?)\*/g, '<italic>$1</italic>');

  return text;
}

function createDocFromMarkdown(folder, slug, title, markdownContent) {
  const doc = DocumentApp.create(slug);
  const body = doc.getBody();

  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Parse markdown-like formatting
  const lines = markdownContent.split('\n');

  for (const line of lines) {
    if (line.trim().length === 0) {
      body.appendParagraph('');
      continue;
    }

    const para = body.appendParagraph('');
    const text = para.editAsText();

    // Simple markdown parser
    const parts = line.split(/(<bold>.*?<\/bold>|<italic>.*?<\/italic>)/g);

    for (const part of parts) {
      if (part.includes('<bold>')) {
        const content = part.replace(/<bold>|<\/bold>/g, '');
        const start = text.getText().length;
        text.appendText(content);
        text.setBold(start, text.getText().length - 1, true);
      } else if (part.includes('<italic>')) {
        const content = part.replace(/<italic>|<\/italic>/g, '');
        const start = text.getText().length;
        text.appendText(content);
        text.setItalic(start, text.getText().length - 1, true);
      } else {
        text.appendText(part);
      }
    }
  }

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}
```

### 6.2 Document Formatting Best Practices

**From Official Google Docs API Documentation:**

**Consistency:**
- ✅ You correctly use heading hierarchy (TITLE → H1 → H2)
- ✅ You maintain consistent font sizes (9pt for content)
- ✅ You use spacing consistently

**Recommended Additions:**

```javascript
function createMasterDocEnhanced(folder, showNotes, metadata) {
  const doc = DocumentApp.create('MASTER - ' + metadata.guestName);
  const body = doc.getBody();

  // Clear default paragraph
  if (body.getNumChildren() > 0 && body.getChild(0).getNumChildren() === 0) {
    body.getChild(0).asElement().removeFromParent();
  }

  // Title with consistent styling
  const titlePara = body.appendParagraph(metadata.guestName + ' - Show Notes');
  titlePara.setHeading(DocumentApp.ParagraphHeading.TITLE);
  titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  // Metadata header
  body.appendParagraph('Show: ' + metadata.showType)
    .setFontSize(10);
  body.appendParagraph('Generated: ' + new Date().toISOString())
    .setFontSize(10);

  // Visual separator
  body.appendHorizontalRule();

  // Table of contents (optional, useful for long docs)
  const toc = body.appendParagraph('Contents')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  toc.setSpacingAfter(12);

  // Use consistent spacing
  const sectionSpacing = 12;

  // Add sections...
  addSection(body, 'INTRO', showNotes.intro, sectionSpacing);
  addSection(body, 'EPISODE TITLES', showNotes.titles, sectionSpacing);
  addSection(body, 'TIMESTAMPS', showNotes.timestamps, sectionSpacing, 9);

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}

function addSection(body, heading, content, spacing, fontSize = 10) {
  const headingPara = body.appendParagraph(heading);
  headingPara.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  headingPara.setSpacingAfter(spacing);

  const contentPara = body.appendParagraph(content);
  contentPara.setFontSize(fontSize);
  contentPara.setSpacingAfter(spacing * 1.5);

  return contentPara;
}
```

**Reference**: [Format Text in Google Docs API](https://developers.google.com/workspace/docs/api/how-tos/format-text)

---

## 7. Batch Processing and Trigger-Based Automation

### 7.1 Your Current Trigger Implementation

**Current Code (Line 814-824):**
```javascript
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('processNewTranscripts')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger created: processNewTranscripts will run every 5 minutes');
}
```

**Assessment**: ✅ Good for your use case

**5-Minute Interval**: Appropriate because:
- Transcripts are added manually, not continuously
- Gives Maria time to review before automation starts
- Balances responsiveness with quota efficiency

### 7.2 Google Apps Script Quotas and Limitations (2026)

**Hard Limits:**
- **Execution Time**: 6 minutes per script run
- **Daily Trigger Quota**: Varies (typically 20K+ for most accounts)
- **Concurrent Executions**: Limited (typically 5-10 per account)
- **External API Calls**: Limited by UrlFetchApp quotas

**Your Current Risk:**

Processing one transcript takes approximately:
- 10 API calls × 10-30 seconds each = 100-300 seconds
- Document creation = 20-50 seconds
- Total: 120-350 seconds (well within 6-minute limit)

**For Multiple Transcripts** (if implemented):
```javascript
// Monitor execution time
function processNewTranscriptsWithTimeLimit() {
  const startTime = new Date();
  const TIME_LIMIT_MS = 300000; // 5 minutes (leave 1 minute buffer)

  const inputFolder = DriveApp.getFolderById(CONFIG.INPUT_FOLDER_ID);
  const files = inputFolder.getFilesByType('text/plain');

  let filesProcessed = 0;

  while (files.hasNext()) {
    // Check if we're running out of time
    const elapsedMs = new Date() - startTime;
    if (elapsedMs > TIME_LIMIT_MS) {
      Logger.log('Time limit approaching. Processed ' + filesProcessed + ' files. Scheduler will resume.');
      return;
    }

    const file = files.next();
    const fileName = file.getName();

    if (fileName.startsWith('[PROCESSED] ') || fileName.startsWith('[FAILED] ')) {
      continue;
    }

    try {
      // Process file
      processTranscriptFile(file);
      filesProcessed++;
    } catch (error) {
      Logger.log('Error processing ' + fileName + ': ' + error.message);
      file.setName('[FAILED] ' + fileName);
    }
  }

  Logger.log('Processed ' + filesProcessed + ' files');
}
```

### 7.3 Trigger Types Available

**Your Current**: Time-based (interval)

**Other Options:**
1. **Time-Based Clock** (what you use): Run on schedule
2. **Time-Based Cron**: Run on specific schedule (more flexible)
3. **Onchange**: Run when document/form changes
4. **Onsave**: Run when document saved

**For Hybrid Approach:**
```javascript
function setupHybridTriggers() {
  // Keep time-based for regular checks
  ScriptApp.newTrigger('processNewTranscripts')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Optional: Add on-change trigger if transcripts saved to a Google Form
  // ScriptApp.newTrigger('processNewTranscripts')
  //   .onFormSubmit()
  //   .forFormId(FORM_ID)
  //   .create();
}
```

**Reference**: [Installable Triggers in Google Apps Script](https://developers.google.com/apps-script/guides/triggers/installable)

---

## 8. Testing Strategies for Google Apps Script

### 8.1 Current Testing: None

**Your Code**: Has `testWithSampleTranscript()` function that just calls main function

**Recommended Testing Framework:**

**Option 1: Jest (for functions without GAS dependencies)**

```javascript
// transcriptParser.test.js (in a Node.js environment)

const { extractMetadata } = require('./Code.gs');

describe('extractMetadata', () => {
  test('should parse Crazy Wisdom episode correctly', () => {
    const transcript = `
      STEWART: Welcome to Crazy Wisdom. Today we have John Smith.
      JOHN: Thanks for having me.
    `;

    const result = extractMetadata(transcript);

    expect(result.showType).toBe('crazy-wisdom');
    expect(result.guestName).toBe('John Smith');
  });

  test('should parse Stewart Squared episode correctly', () => {
    const transcript = `
      STEWART III: Welcome to Stewart Squared.
      STEWART II: Happy to be here.
    `;

    const result = extractMetadata(transcript);

    expect(result.showType).toBe('stewart-squared');
  });
});
```

**Issue**: Apps Script functions call Google services (`PropertiesService`, `UrlFetchApp`), which require special handling.

### 8.2 Recommended: Refactor for Testability

**Current:**
```javascript
function callOpenRouter(prompt, maxTokens) {
  // Directly uses UrlFetchApp
  const response = UrlFetchApp.fetch(url, options);
  // ... processing
}
```

**Testable Version:**
```javascript
// Separate API logic from service calls
function callOpenRouter(prompt, maxTokens, fetchFn = null) {
  const fetch = fetchFn || UrlFetchApp.fetch;  // Inject or use default

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = { /* ... */ };
  const options = { /* ... */ };

  const response = fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error('OpenRouter API error: ' + json.error.message);
  }

  return json.choices[0].message.content;
}

// In test file
function testCallOpenRouter() {
  const mockFetch = (url, options) => ({
    getContentText: () => JSON.stringify({
      choices: [{ message: { content: 'Test response' } }]
    }),
    getResponseCode: () => 200
  });

  const result = callOpenRouter('test prompt', 100, mockFetch);
  expect(result).toBe('Test response');
}
```

### 8.3 Google Apps Script Testing Frameworks

**Available Options:**
1. **GSUnit**: Google Apps Script-native testing (older, but works)
2. **QUnitGS2**: QUnit adapted for Apps Script
3. **Jest**: With Node.js and transpilation setup
4. **TAP (Test Anything Protocol)**: Language-agnostic

**Simple Built-in Testing Pattern:**

```javascript
function runAllTests() {
  Logger.log('=== Starting Tests ===');

  testExtractMetadata();
  testGenerateTitles();
  testFormatting();

  Logger.log('=== All Tests Complete ===');
}

function testExtractMetadata() {
  Logger.log('Testing: extractMetadata');

  const transcript = `
    STEWART: Welcome to Crazy Wisdom.
    GUEST: Thanks for having me.
  `;

  try {
    // Mock the OpenRouter call
    const originalCall = callOpenRouter;
    window.callOpenRouter = () => JSON.stringify({
      guestName: 'Test Guest',
      showType: 'crazy-wisdom'
    });

    const result = extractMetadata(transcript);

    assert(result.guestName !== undefined, 'Guest name missing');
    assert(result.showType !== undefined, 'Show type missing');

    Logger.log('✅ testExtractMetadata passed');
  } catch (error) {
    Logger.log('❌ testExtractMetadata failed: ' + error);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}
```

### 8.4 Integration Testing (Recommended)

**For Your Workflow:**

```javascript
function integrationTest() {
  Logger.log('=== Integration Test ===');

  // Use a test transcript file
  const testFolder = DriveApp.getFolderById('TEST_FOLDER_ID');
  const testFile = testFolder.createFile('test_transcript.txt', 'STEWART: Test...');

  try {
    processNewTranscripts();

    // Verify outputs
    const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    const outputFiles = outputFolder.getFiles();

    if (!outputFiles.hasNext()) {
      throw new Error('No output files created');
    }

    Logger.log('✅ Integration test passed');
  } finally {
    testFile.setTrashed(true);
  }
}
```

**Reference**: [Unit Testing in Google Apps Script](https://medium.com/geekculture/taking-away-the-pain-from-unit-testing-in-google-apps-script-98f2feee281d)

---

## 9. Common Pitfalls to Avoid

### 9.1 Global Services in Loops

**SLOW**:
```javascript
for (let i = 0; i < 1000; i++) {
  SpreadsheetApp.getActiveSheet().getRange(...).setValue(...); // 1000 API calls
}
```

**FAST**:
```javascript
const values = [];
for (let i = 0; i < 1000; i++) {
  values.push([...]);
}
SpreadsheetApp.getActiveSheet().getRange(...).setValues(values); // 1 API call
```

**Your Code**: Generally avoids this, but could batch document operations further.

### 9.2 API Rate Limiting Without Backoff

**FAILS**:
```javascript
// Immediately retries on error
for (let i = 0; i < 10; i++) {
  try {
    return callOpenRouter(prompt, tokens);
  } catch (error) {
    continue; // No wait!
  }
}
```

**WORKS**:
```javascript
// Exponential backoff on retry
for (let i = 0; i < maxRetries; i++) {
  try {
    return callOpenRouter(prompt, tokens);
  } catch (error) {
    Utilities.sleep((2 ** i) * 1000); // Wait before retry
  }
}
```

**Status**: Your code needs this enhancement

### 9.3 Memory Leaks with Large Files

**Your Implementation:**
```javascript
const transcript = file.getBlob().getDataAsString(); // Loads entire file into memory
```

**Risk**: If processing multiple large files, memory can exceed limits

**For Large Files:**
```javascript
function processTranscriptStreaming(file) {
  const blob = file.getBlob();
  const size = blob.getBytes().length;

  if (size > 10 * 1024 * 1024) { // 10MB
    Logger.log('File is large (' + (size / 1024 / 1024).toFixed(1) + 'MB)');
    // Consider processing in chunks or sampling
  }

  const transcript = blob.getDataAsString();
  // ... process
}
```

### 9.4 Unhandled Promise Rejections

**Not Applicable**: Apps Script doesn't use Promises natively, so this isn't an issue for you.

### 9.5 Hardcoded IDs

**Your Code** (Line 10-11):
```javascript
INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
```

**Risk**: IDs are environment-specific

**Better Approach**:
```javascript
// Use configuration file
const CONFIG = {
  INPUT_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('INPUT_FOLDER_ID'),
  OUTPUT_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('OUTPUT_FOLDER_ID'),
  // ...
};

// Setup function
function setupConfig() {
  PropertiesService.getScriptProperties().setProperty('INPUT_FOLDER_ID', 'YOUR_ID_HERE');
  PropertiesService.getScriptProperties().setProperty('OUTPUT_FOLDER_ID', 'YOUR_ID_HERE');
}
```

---

## 10. Production Readiness Checklist

### 10.1 Code Quality

- [ ] Error handling with retry logic for external APIs ← **NEEDS WORK**
- [ ] Proper logging for debugging
- [ ] Configuration externalized from code ← **PARTIAL**
- [ ] Secrets stored securely ← **GOOD**
- [ ] Unit and integration tests ← **MISSING**
- [ ] Code comments for complex logic
- [ ] Consistent formatting and naming

### 10.2 Performance

- [ ] Batch operations where possible ← **GOOD**
- [ ] Caching strategy implemented ← **COULD IMPROVE**
- [ ] Timeouts configured explicitly
- [ ] Memory usage optimized
- [ ] API calls throttled/batched

### 10.3 Reliability

- [ ] Retry logic with exponential backoff ← **NEEDS WORK**
- [ ] Error logging and alerting
- [ ] Graceful degradation (continues on non-critical errors)
- [ ] State tracking for resumable processing ← **MISSING**
- [ ] Idempotent operations (safe to retry)

### 10.4 Security

- [ ] API keys stored securely ← **GOOD**
- [ ] Secrets not logged or exposed ← **GOOD**
- [ ] Minimal OAuth scopes ← **GOOD**
- [ ] Input validation ← **COULD IMPROVE**
- [ ] Rate limiting considered

### 10.5 Maintainability

- [ ] Clear project structure
- [ ] Documentation provided ← **NOW**
- [ ] Configuration management
- [ ] Rollback procedure defined
- [ ] Deployment process documented

### 10.6 Monitoring

- [ ] Execution logs accessible
- [ ] Error alerts configured
- [ ] Performance metrics tracked
- [ ] API quota monitoring ← **COULD ADD**

---

## 11. Recommended Implementation Roadmap

### Phase 1: Immediate (Production-Critical)

**Priority**: Add retry logic for API calls

```javascript
// Replace callOpenRouter with callOpenRouterWithRetry (see Section 3.1)
// Update all references to use retry version
```

**Time**: 1-2 hours

### Phase 2: Short-term (Next Sprint)

1. **Add Input Validation**
```javascript
function validateTranscript(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }
  if (transcript.length > 1000000) {
    throw new Error('Transcript exceeds maximum size');
  }
  return true;
}
```

2. **Implement Caching**
```javascript
// Add cache layer to metadata extraction
function getCachedMetadata(fileId, transcript) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'metadata_' + fileId;

  let cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const metadata = extractMetadata(transcript);
  cache.put(cacheKey, JSON.stringify(metadata), 1800);
  return metadata;
}
```

3. **Add State Tracking**
```javascript
// Implement resumable processing (see Section 5.1)
```

**Time**: 2-4 hours

### Phase 3: Medium-term (Polish)

1. Add unit tests
2. Implement monitoring/alerting
3. Create admin dashboard
4. Document runbooks

**Time**: 4-8 hours

---

## 12. Reference Documentation

### Official Google Resources
- [Google Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices)
- [Drive API Documentation](https://developers.google.com/workspace/drive/api/guides/about-sdk)
- [Google Docs API](https://developers.google.com/workspace/docs/api)
- [HTML Service Best Practices](https://developers.google.com/apps-script/guides/html/best-practices)

### External APIs & Services
- [OpenRouter Error Handling](https://openrouter.ai/docs/api/reference/errors-and-debugging)
- [OpenRouter API Reference](https://openrouter.ai/docs/api)

### Best Practices Articles
- [API Keys Secrets and Secure Configuration in Google Apps Script](https://basescripts.com/api-keys-secrets-and-secure-configuration-in-google-apps-script)
- [Secure Secrets in Google Apps Script](https://dev.to/googleworkspace/secure-secrets-in-google-apps-script-1dhc)
- [Unit Testing in Google Apps Script](https://medium.com/geekculture/taking-away-the-pain-from-unit-testing-in-google-apps-script-98f2feee281d)

### Additional Resources
- [Google Workspace Apps Script Samples](https://github.com/googleworkspace/apps-script-samples)
- [Apps Script Pulse Community](https://pulse.appsscript.info/)
- [AppsScriptPulse News](https://pulse.appsscript.info/)

---

## Conclusion

Your current implementation demonstrates solid Google Apps Script practices with proper secret management, appropriate scoping, and a clean architecture. The primary production-readiness improvements needed are:

1. **Exponential backoff retry logic** for OpenRouter API calls (critical for reliability)
2. **Input validation** on transcripts and responses
3. **Error recovery strategy** for handling transient failures
4. **Testing framework** for ongoing maintenance
5. **State tracking** for resumable batch processing

These enhancements will transform your automation from a functional prototype to a reliable, production-grade system capable of handling edge cases and API failures gracefully.

---

**Document Generated**: January 2026
**Version**: 1.0
**Status**: Ready for Implementation
