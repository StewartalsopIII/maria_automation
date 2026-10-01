# Maria Automation - Setup Instructions

## Security Setup (IMPORTANT - Do This First!)

### 1. Get a New OpenRouter API Key
Your previous API key was exposed publicly on GitHub. You need to rotate it:

1. Go to https://openrouter.ai/keys
2. Identify the exposed key by comparing it privately with its provider record; revoke only that exact record. Never identify a key by its name alone.
3. Create a new API key
4. Copy the new key (you'll need it in the next step)

### 2. Store API Key Securely in Google Apps Script

1. Open your Google Apps Script project: https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit
2. Open **Project Settings → Script Properties**.
3. Set `OPENROUTER_API_KEY` to the replacement key stored in Keypo. Do not paste it into source code, Git, or logs.
4. Save the property. `Code.gs` reads it through `PropertiesService.getScriptProperties()`.
5. Confirm the replacement authenticates before retiring a credential still used by any consumer.

### 3. Deploy the Updated Code

From your local terminal:
```bash
cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/prototypes-2025/maria_automation
clasp push
```

This will upload the updated code to Google Apps Script (now without the API key hardcoded).

## What Changed

### Security Improvements
- ✅ API key no longer hardcoded in source code
- ✅ API key stored in Google Apps Script Properties Service (encrypted)
- ✅ `.gitignore` added to prevent future secret leaks
- Exposed values remain in Git history; provider-side retirement is required.

### New Features Added
- ✅ Image generation support for Stewart Squared episodes
- ✅ YouTube show notes format (5,000 character limit)
- ✅ Separate output documents for different platforms

## Exposed Credentials and Git History

Never rewrite history or force-push. Remove exposed literals from the current tree with an ordinary commit and push. This does not remove historical copies or invalidate a credential.

Before revocation or rotation, prove the exact provider record, identify consumers, and obtain Stewart's approval. Move active consumers to a fresh credential in Keypo and verify them before retiring the exposed credential. A rejected authentication request alone does not identify a deleted provider record.

## Folder Structure

```
maria_automation/
├── .gitignore              (prevents secrets from being committed)
├── SETUP.md                (this file)
├── gas_project/
│   ├── Code.gs            (main script - NO API KEYS)
│   └── appsscript.json
├── Blueprints/            (documentation)
└── src_files/             (walkthrough videos)
```

## Testing

After setup, test the script:
1. Upload a test transcript to the input folder
2. Wait 5 minutes (or run `processNewTranscripts()` manually)
3. Check the output folder for generated documents

## Support

If you encounter issues:
- Check the Google Apps Script logs (View → Logs)
- Verify the API key is stored: `Logger.log(Boolean(PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY')))`
- Ensure all folder IDs are correct in CONFIG
