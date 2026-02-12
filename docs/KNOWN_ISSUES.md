# Known Issues & Troubleshooting

> Current bugs, diagnosed problems, and debugging procedures.
>
> Back to: [CLAUDE.md](../CLAUDE.md) | [README.md](../README.md) | [ARCHITECTURE.md](ARCHITECTURE.md)

## Active Issues

### 1. GAS 6-Minute Execution Time Limit

**Status:** Mitigated (Feb 2026)
**Severity:** High
**Affects:** Image generation for Stewart Squared episodes

**Problem:** Google Apps Script enforces a hard 6-minute execution limit. The pipeline makes 12 sequential API calls to OpenRouter, creates ~13 Google Docs, and generates an image. With long transcripts, this can exceed the limit.

**History:** Image generation originally worked (Dec 2025). Three new API calls were added afterward (`generateKeyInsightsYouTube`, `generateCTAs`, `generateLinks`), pushing total execution time close to the limit. Image generation runs last, so it's the first thing to get cut off.

**Mitigation applied:** Moved `generateEpisodeArtwork()` to run before document creation (Feb 2026, commit after `7360efc`). This saves ~30-60 seconds of doc-creation time.

**If it still fails:**
- Check execution duration in Apps Script > Executions
- If consistently >5 min, consider removing one of the lower-priority API calls
- Or split processing into two runs using a continuation token

**Related code:** `processNewTranscripts()` at Code.gs:35

### 2. Silent Error Swallowing in Image Generation

**Status:** By design (but causes confusion)
**Severity:** Medium
**Affects:** Debugging image generation failures

**Problem:** The `generateEpisodeArtwork()` function (Code.gs:907) catches ALL errors and logs them without re-throwing:

```javascript
} catch (error) {
    Logger.log('Error generating artwork: ' + error.message);
    // Don't throw - just log and continue without image
    return null;
}
```

This means image generation can fail for any reason (timeout, API error, bad response format, insufficient credits) and the script will still succeed — just without the image. The user won't notice unless they check the logs.

**How to debug:** Check Apps Script execution logs for `"Error generating artwork:"` entries.

**Why it's this way:** The design choice is intentional — image generation is supplementary, and a failure shouldn't block all the show notes from being created. But it means you must actively check logs when images are missing.

### 3. API Key Previously Exposed in Git History

**Status:** Mitigated
**Severity:** Low (key has been rotated)

**Problem:** An API key was committed to the repo in early commits. It has since been rotated and the code now uses Properties Service for secure storage.

**Action:** The old key `sk-or-v1-3fe6...` should be revoked at https://openrouter.ai/keys if not already done. See [SETUP.md](../SETUP.md) for key rotation instructions.

---

## Debugging Procedures

### How to Check Execution Logs

1. Open the [Apps Script editor](https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit)
2. Click **Executions** in the left sidebar
3. Click on a specific execution to see its logs
4. Look for:
   - `"Processing: [filename]"` — confirms the file was detected
   - `"Detected show: [type], Guest: [name]"` — metadata extraction worked
   - `"Generating episode artwork..."` — image generation attempted
   - `"Episode artwork generated successfully"` — image generation succeeded
   - `"Error generating artwork: [message]"` — image generation failed (see message)
   - `"Skipping image generation (not Stewart Squared episode)"` — expected for Crazy Wisdom

### Common Error Messages

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `OpenRouter API error: insufficient_credits` | API account out of credits | Add credits at openrouter.ai |
| `OpenRouter API error: model_not_found` | Model name changed | Check current model ID at openrouter.ai |
| `No image data in API response` | Response format changed | Log full response, compare with [ARCHITECTURE.md](ARCHITECTURE.md) expected format |
| `Image URL is undefined` | Response structure mismatch | Check `json.choices[0].message.images[0]` path |
| `base64DataUrl is null or undefined` | API returned null image | Check API credits, try again |
| `Exceeded maximum execution time` | Script hit 6-min limit | Check execution duration, reduce API calls |

### Testing Image Generation in Isolation

To test just the image generation without running the full pipeline:

```javascript
function testImageGeneration() {
  const testPrompt = "Stewart Squared podcast artwork. Modern, vibrant tech-themed abstract illustration. Professional podcast thumbnail design. No text.";
  try {
    const result = callOpenRouterImageAPI(testPrompt);
    Logger.log('Image generated successfully. URL starts with: ' + result.substring(0, 50));
  } catch (error) {
    Logger.log('Image generation failed: ' + error.message);
  }
}
```

Add this to Code.gs temporarily, run it, and check the logs.

### Verifying OpenRouter API Access

```javascript
function testOpenRouterConnection() {
  try {
    const result = callOpenRouter("Say hello in exactly 3 words.", 20);
    Logger.log('Text API works: ' + result);
  } catch (error) {
    Logger.log('Text API failed: ' + error.message);
  }
}
```

---

## Resolved Issues (Archive)

### Image URL Extraction Path (Fixed Dec 2025)

**Commit:** `443e724`
**Problem:** Image response used `image.image_url.url` path, not `image.url`.
**Fix:** Added fallback: `image.image_url ? image.image_url.url : image.url`

### Markdown Bold in YouTube Insights (Fixed Jan 2026)

**Commit:** `4514c59`
**Problem:** `**bold**` markers appeared in YouTube show notes as literal asterisks.
**Fix:** Strip `**` markers with `.replace(/\*\*/g, '')` before writing YouTube notes.

### Clip Parsing Failures (Fixed Jan 2026)

**Commit:** `7360efc`
**Problem:** Clips weren't splitting correctly when LLM used varied heading formats.
**Fix:** Updated regex to handle `CLIP N:`, `## Clip N:`, `CLIP #N` patterns.

---

Back to: [CLAUDE.md](../CLAUDE.md) | [README.md](../README.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [SETUP.md](../SETUP.md)
